import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { PERMISSION_CATALOG } from "@quality-platform/contracts";
import { applyMigrations, defaultMigrationsDirectory, openDatabase } from "./migrate.ts";
import { seedDatabase } from "./seed.ts";

type MembershipMatrixRow = {
  mobile: string;
  userName: string;
  organizationName: string;
  merchantType: string | null;
  membershipStatus: string;
  position: string;
  roles: string;
  roleCodes: string;
  managementPermissionCount: number;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectSqlFailure(action: () => void, expectedMessage?: string): void {
  try {
    action();
  } catch (error) {
    if (expectedMessage && !(error instanceof Error && error.message.includes(expectedMessage))) {
      throw new Error(`unexpected SQLite error: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }
  throw new Error("expected SQLite constraint failure");
}

function snapshot(database: DatabaseSync): string {
  const facts = database.prepare(`
    SELECT business_no, business_type_code, state, submitter_organization_id,
           current_handler_organization_id, source_record_id, form_data_json
    FROM business_records
    ORDER BY business_no
  `).all();
  const tasks = database.prepare(`
    SELECT record_id, task_type, handler_organization_id, status
    FROM todo_tasks
    ORDER BY id
  `).all();
  const memberships = database.prepare(`
    SELECT user_id, organization_id, status, position
    FROM organization_memberships
    ORDER BY user_id, organization_id
  `).all();
  const membershipRoles = database.prepare(`
    SELECT membership_id, role_id
    FROM membership_roles
    ORDER BY membership_id, role_id
  `).all();
  const roles = database.prepare(`
    SELECT organization_id, code, name, built_in
    FROM roles
    ORDER BY organization_id, code
  `).all();
  const rolePermissions = database.prepare(`
    SELECT role_id, permission_code
    FROM role_permissions
    ORDER BY role_id, permission_code
  `).all();
  return JSON.stringify({ facts, tasks, memberships, membershipRoles, roles, rolePermissions });
}

function readMembershipMatrix(database: DatabaseSync): MembershipMatrixRow[] {
  return database.prepare(`
    SELECT u.mobile AS mobile,
           u.name AS userName,
           o.name AS organizationName,
           o.merchant_type AS merchantType,
           m.status AS membershipStatus,
           m.position AS position,
           COALESCE((
             SELECT GROUP_CONCAT(ordered_roles.name, ', ')
             FROM (
               SELECT r.name AS name
               FROM membership_roles AS mr
               JOIN roles AS r ON r.id = mr.role_id
               WHERE mr.membership_id = m.id
               ORDER BY r.name
             ) AS ordered_roles
           ), '') AS roles,
           COALESCE((
             SELECT GROUP_CONCAT(ordered_roles.code, ', ')
             FROM (
               SELECT r.code AS code
               FROM membership_roles AS mr
               JOIN roles AS r ON r.id = mr.role_id
               WHERE mr.membership_id = m.id
               ORDER BY r.code
             ) AS ordered_roles
           ), '') AS roleCodes,
           (
             SELECT COUNT(*)
             FROM membership_roles AS mr
             JOIN role_permissions AS rp ON rp.role_id = mr.role_id
             WHERE mr.membership_id = m.id
               AND rp.permission_code LIKE 'merchant.admin.%'
           ) AS managementPermissionCount
    FROM organization_memberships AS m
    JOIN users AS u ON u.id = m.user_id
    JOIN organizations AS o ON o.id = m.organization_id
    ORDER BY u.mobile, o.name
  `).all() as MembershipMatrixRow[];
}

function verifyLegacyMigration(temporaryDirectory: string): void {
  const database = openDatabase(join(temporaryDirectory, "legacy-migration.sqlite"));
  const now = "2026-08-27T00:00:00.000+08:00";
  try {
    database.exec(readFileSync(join(defaultMigrationsDirectory, "0001_initial.sql"), "utf8"));
    database.exec(`
      CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations (version, applied_at) VALUES ('0001_initial.sql', '${now}');
      INSERT INTO organizations
        (id, name, type, merchant_type, audit_status, usage_status, created_at, updated_at)
      VALUES
        ('legacy-org-a', '旧供应商组织', 'merchant', 'supplier', 'approved', 'enabled', '${now}', '${now}'),
        ('legacy-org-b', '旧工厂组织', 'merchant', 'factory', 'approved', 'enabled', '${now}', '${now}');
      INSERT INTO users
        (id, mobile, name, status, default_organization_id, created_at, updated_at)
      VALUES ('legacy-user', '13900000001', '旧版用户', 'enabled', 'legacy-org-a', '${now}', '${now}');
      INSERT INTO roles (id, organization_id, code, name, built_in, created_at)
      VALUES
        ('legacy-role-a', 'legacy-org-a', 'legacy_supplier', '旧供应商角色', 0, '${now}'),
        ('legacy-role-b', 'legacy-org-b', 'legacy_factory', '旧工厂角色', 0, '${now}');
      INSERT INTO user_organizations (user_id, organization_id) VALUES ('legacy-user', 'legacy-org-a');
      INSERT INTO user_roles (user_id, role_id) VALUES ('legacy-user', 'legacy-role-b');
      INSERT INTO permissions (code, name) VALUES
        ('business:read', '旧查看业务'),
        ('role:manage', '旧管理角色');
      INSERT INTO role_permissions (role_id, permission_code) VALUES
        ('legacy-role-a', 'business:read'),
        ('legacy-role-a', 'role:manage');
    `);

    expectSqlFailure(() => applyMigrations(database));
    database.exec(`
      DELETE FROM user_roles;
      INSERT INTO user_roles (user_id, role_id) VALUES ('legacy-user', 'legacy-role-a');
    `);
    const applied = applyMigrations(database);
    assert(JSON.stringify(applied) === JSON.stringify(["0002_organization_memberships.sql", "0003_rbac_permission_catalog.sql"]), "legacy migrations did not apply exactly once");
    const migrated = database.prepare(`
      SELECT m.user_id AS userId, m.organization_id AS organizationId, r.organization_id AS roleOrganizationId
      FROM organization_memberships AS m
      JOIN membership_roles AS mr ON mr.membership_id = m.id
      JOIN roles AS r ON r.id = mr.role_id
    `).get() as { userId: string; organizationId: string; roleOrganizationId: string } | undefined;
    assert(migrated?.userId === "legacy-user", "legacy membership was not migrated");
    assert(migrated.organizationId === "legacy-org-a" && migrated.roleOrganizationId === "legacy-org-a", "legacy role organization changed during migration");
    const migratedPermissionCodes = (database.prepare(`
      SELECT permission_code AS permissionCode
      FROM role_permissions
      WHERE role_id = 'legacy-role-a'
      ORDER BY permission_code
    `).all() as Array<{ permissionCode: string }>).map(({ permissionCode }) => permissionCode);
    assert(migratedPermissionCodes.includes("merchant.business.shipment_report.read"), "legacy business permission was not expanded to supplier leaves");
    assert(migratedPermissionCodes.includes("merchant.admin.role_permission.update"), "legacy role management permission lost permission configuration");
    assert(!migratedPermissionCodes.includes("business:read") && !migratedPermissionCodes.includes("role:manage"), "legacy permission codes remained assigned");
  } finally {
    database.close();
  }
}

function verifyUnknownPermissionMigration(temporaryDirectory: string): void {
  const database = openDatabase(join(temporaryDirectory, "unknown-permission.sqlite"));
  const now = "2026-08-27T00:00:00.000+08:00";
  try {
    database.exec(readFileSync(join(defaultMigrationsDirectory, "0001_initial.sql"), "utf8"));
    database.exec(`
      CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations (version, applied_at) VALUES ('0001_initial.sql', '${now}');
      INSERT INTO organizations
        (id, name, type, merchant_type, audit_status, usage_status, created_at, updated_at)
      VALUES ('unknown-org', '未知权限组织', 'merchant', 'supplier', 'approved', 'enabled', '${now}', '${now}');
      INSERT INTO roles (id, organization_id, code, name, built_in, created_at)
      VALUES ('unknown-role', 'unknown-org', 'unknown_role', '未知权限角色', 0, '${now}');
      INSERT INTO permissions (code, name) VALUES ('unknown:permission', '未知权限');
      INSERT INTO role_permissions (role_id, permission_code) VALUES ('unknown-role', 'unknown:permission');
    `);
    expectSqlFailure(() => applyMigrations(database));
    const applied = (database.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as Array<{ version: string }>).map(({ version }) => version);
    assert(applied.includes("0002_organization_memberships.sql") && !applied.includes("0003_rbac_permission_catalog.sql"), "unknown permission migration did not roll back at the catalog boundary");
  } finally {
    database.close();
  }
}

function verifyMembershipConstraints(database: DatabaseSync): void {
  expectSqlFailure(() => database.prepare(`
    INSERT INTO users (id, mobile, name, status, default_organization_id, created_at, updated_at)
    VALUES ('duplicate-mobile-user', '13800000006', '重复手机号', 'enabled',
            '00000000-0000-4000-8000-000000000002', '2026-08-27T00:00:00.000+08:00', '2026-08-27T00:00:00.000+08:00')
  `).run());
  expectSqlFailure(() => database.prepare(`
    INSERT INTO organization_memberships
      (id, user_id, organization_id, status, position, created_at, updated_at)
    VALUES ('duplicate-membership', '00000000-0000-4000-8000-000000000106',
            '00000000-0000-4000-8000-000000000002', 'enabled', '',
            '2026-08-27T00:00:00.000+08:00', '2026-08-27T00:00:00.000+08:00')
  `).run());
  expectSqlFailure(() => database.prepare(`
    INSERT INTO membership_roles (membership_id, role_id)
    VALUES ('00000000-0000-4000-8000-000000000c06', '00000000-0000-4000-8000-000000000203')
  `).run(), "membership role organization mismatch");
  expectSqlFailure(() => database.prepare(`
    UPDATE membership_roles
    SET role_id = '00000000-0000-4000-8000-000000000203'
    WHERE membership_id = '00000000-0000-4000-8000-000000000c06'
  `).run(), "membership role organization mismatch");
  expectSqlFailure(() => database.prepare(`
    UPDATE organization_memberships
    SET organization_id = '00000000-0000-4000-8000-000000000003'
    WHERE id = '00000000-0000-4000-8000-000000000c06'
  `).run(), "membership role organization mismatch");
  expectSqlFailure(() => database.prepare(`
    UPDATE roles
    SET organization_id = '00000000-0000-4000-8000-000000000003'
    WHERE id = '00000000-0000-4000-8000-000000000204'
  `).run(), "membership role organization mismatch");

  database.exec("SAVEPOINT membership_status_check");
  try {
    database.prepare(`
      UPDATE organization_memberships SET status = 'disabled'
      WHERE id = '00000000-0000-4000-8000-000000000c06'
    `).run();
    const statuses = database.prepare(`
      SELECT organization_id AS organizationId, status
      FROM organization_memberships
      WHERE user_id = '00000000-0000-4000-8000-000000000106'
      ORDER BY organization_id
    `).all() as Array<{ organizationId: string; status: string }>;
    assert(statuses.length === 2, "multi-organization seed user is incomplete");
    assert(statuses[0].status === "disabled" && statuses[1].status === "enabled", "membership status leaked across organizations");
  } finally {
    database.exec("ROLLBACK TO membership_status_check; RELEASE membership_status_check");
  }
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "quality-platform-data-verify-"));
const databasePath = join(temporaryDirectory, "verify.sqlite");
const database = openDatabase(databasePath);

try {
  verifyLegacyMigration(temporaryDirectory);
  verifyUnknownPermissionMigration(temporaryDirectory);
  const firstApplied = applyMigrations(database);
  const secondApplied = applyMigrations(database);
  assert(JSON.stringify(firstApplied) === JSON.stringify(["0001_initial.sql", "0002_organization_memberships.sql", "0003_rbac_permission_catalog.sql"]), `unexpected migrations: ${firstApplied.join(", ")}`);
  assert(secondApplied.length === 0, `migration idempotency failed: second=${secondApplied.length}`);

  const firstManifest = seedDatabase(database);
  const firstSnapshot = snapshot(database);
  const secondManifest = seedDatabase(database);
  const secondSnapshot = snapshot(database);
  assert(JSON.stringify(firstManifest) === JSON.stringify(secondManifest) && firstSnapshot === secondSnapshot, "deterministic seed verification failed");

  const integrity = database.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  assert(integrity.integrity_check === "ok", `SQLite integrity check failed: ${integrity.integrity_check}`);
  const linkedRecord = database.prepare(`
    SELECT source.business_no AS source_no, triggered.business_no AS triggered_no
    FROM business_records AS triggered
    JOIN business_records AS source ON source.id = triggered.source_record_id
    WHERE triggered.business_type_code = 'material_exception'
  `).get() as { source_no: string; triggered_no: string } | undefined;
  assert(linkedRecord?.source_no === "IQC202608090001" && linkedRecord.triggered_no === "ME202608100001", "incoming inspection to material exception link is missing");

  verifyMembershipConstraints(database);
  const membershipMatrix = readMembershipMatrix(database);
  assert(membershipMatrix.filter((row) => row.mobile === "13800000006").length === 2, "multi-organization account is missing from membership matrix");
  const merchantAdmins = membershipMatrix.filter((row) => ["13800000002", "13800000003"].includes(row.mobile));
  assert(merchantAdmins.length === 2 && merchantAdmins.every((row) => row.roleCodes === "merchant_super_admin"), "merchant administrators are not bound to organization super-admin roles");
  const ordinaryMembers = membershipMatrix.filter((row) => ["13800000004", "13800000005", "13800000006"].includes(row.mobile));
  assert(ordinaryMembers.length === 4 && ordinaryMembers.every((row) => !row.roleCodes.includes("merchant_super_admin") && row.managementPermissionCount === 0), "ordinary merchant members received management permissions");
  const comparePermissionCode = (left: { code: string }, right: { code: string }): number =>
    left.code < right.code ? -1 : left.code > right.code ? 1 : 0;
  const persistedPermissionCatalog = (database.prepare(`
    SELECT code, name
    FROM permissions
  `).all() as Array<{ code: string; name: string }>).sort(comparePermissionCode);
  const sharedPermissionCatalog = PERMISSION_CATALOG
    .map(({ code, name }) => ({ code, name }))
    .sort(comparePermissionCode);
  const persistedByCode = new Map(persistedPermissionCatalog.map((permission) => [permission.code, permission.name]));
  const sharedByCode = new Map(sharedPermissionCatalog.map((permission) => [permission.code, permission.name]));
  const permissionCatalogDifferences = [
    ...sharedPermissionCatalog
      .filter(({ code, name }) => persistedByCode.get(code) !== name)
      .map(({ code, name }) => ({ code, expectedName: name, actualName: persistedByCode.get(code) ?? null })),
    ...persistedPermissionCatalog
      .filter(({ code }) => !sharedByCode.has(code))
      .map(({ code, name }) => ({ code, expectedName: null, actualName: name })),
  ];
  assert(
    JSON.stringify(persistedPermissionCatalog) === JSON.stringify(sharedPermissionCatalog),
    `SQLite permission catalog differs from shared contracts catalog: ${JSON.stringify(permissionCatalogDifferences)}`,
  );
  const accountColumns = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  for (const column of ["email", "password_hash", "last_login_at"]) {
    assert(accountColumns.some((entry) => entry.name === column), `account column ${column} is missing`);
  }

  console.log(JSON.stringify({
    migrationIdempotent: true,
    legacyMigrationRejectsCrossOrganizationRole: true,
    legacyPermissionCodesMigrated: true,
    unknownPermissionMigrationRejected: true,
    deterministicSeed: true,
    sqliteIntegrity: integrity.integrity_check,
    sourceLink: linkedRecord,
    accountMobileUnique: true,
    membershipUniquePerOrganization: true,
    crossOrganizationRoleRejected: true,
    crossOrganizationRoleUpdatesRejected: true,
    membershipStatusIsOrganizationScoped: true,
    merchantSuperAdminsScopedPerOrganization: true,
    ordinaryMembersHaveNoManagementPermissions: true,
    permissionCatalogCount: persistedPermissionCatalog.length,
    permissionCatalogMatchesContracts: true,
    accountProfileColumnsPresent: true,
    manifestHash: createHash("sha256").update(JSON.stringify(firstManifest)).digest("hex"),
    counts: firstManifest.counts,
    membershipMatrix,
  }, null, 2));
} finally {
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
