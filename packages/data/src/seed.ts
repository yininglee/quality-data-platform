import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import {
  FACTORY_MEMBER_PERMISSION_CODES,
  FACTORY_PERMISSION_CODES,
  PERMISSION_CATALOG,
  PLATFORM_PERMISSION_CODES,
  seedManifestSchema,
  SUPPLIER_MEMBER_PERMISSION_CODES,
  SUPPLIER_PERMISSION_CODES,
  type SeedManifest,
} from "@quality-platform/contracts";
import { BUSINESS_TYPE_CATALOG } from "@quality-platform/domain";
import { applyMigrations, defaultDatabasePath, openDatabase } from "./migrate.ts";

const FIXED_NOW = "2026-08-11T00:00:00.000+08:00";
const FIXED_SEED = "quality-platform-dev-20260811-v1";
const SCHEMA_VERSION = "0003_rbac_permission_catalog.sql";
type SqlValue = string | number | null | Uint8Array;

const ids = {
  organization: {
    platform: "00000000-0000-4000-8000-000000000001",
    supplier: "00000000-0000-4000-8000-000000000002",
    factory: "00000000-0000-4000-8000-000000000003",
  },
  user: {
    platform: "00000000-0000-4000-8000-000000000101",
    supplier: "00000000-0000-4000-8000-000000000102",
    factory: "00000000-0000-4000-8000-000000000103",
    supplierMember: "00000000-0000-4000-8000-000000000104",
    factoryMember: "00000000-0000-4000-8000-000000000105",
    multiOrganization: "00000000-0000-4000-8000-000000000106",
  },
  role: {
    platformSuperAdmin: "00000000-0000-4000-8000-000000000201",
    supplierSuperAdmin: "00000000-0000-4000-8000-000000000202",
    factorySuperAdmin: "00000000-0000-4000-8000-000000000203",
    supplierMember: "00000000-0000-4000-8000-000000000204",
    factoryMember: "00000000-0000-4000-8000-000000000205",
  },
  membership: {
    platform: "00000000-0000-4000-8000-000000000c01",
    supplierAdmin: "00000000-0000-4000-8000-000000000c02",
    factoryAdmin: "00000000-0000-4000-8000-000000000c03",
    supplierMember: "00000000-0000-4000-8000-000000000c04",
    factoryMember: "00000000-0000-4000-8000-000000000c05",
    multiSupplier: "00000000-0000-4000-8000-000000000c06",
    multiFactory: "00000000-0000-4000-8000-000000000c07",
  },
  template: {
    shipment: "00000000-0000-4000-8000-000000000301",
    incoming: "00000000-0000-4000-8000-000000000302",
    material: "00000000-0000-4000-8000-000000000303",
  },
  workflow: {
    shipment: "00000000-0000-4000-8000-000000000401",
    incoming: "00000000-0000-4000-8000-000000000402",
    material: "00000000-0000-4000-8000-000000000403",
  },
  record: {
    shipment: "00000000-0000-4000-8000-000000000501",
    incoming: "00000000-0000-4000-8000-000000000502",
    material: "00000000-0000-4000-8000-000000000503",
  },
  scenario: "00000000-0000-4000-8000-000000000a01",
  seedRun: "00000000-0000-4000-8000-000000000b01",
} as const;

function insert(database: DatabaseSync, sql: string, values: readonly SqlValue[]): void {
  database.prepare(sql).run(...values);
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function resetSeededData(database: DatabaseSync): void {
  const tables = [
    "seed_runs", "seed_scenarios", "audit_events", "attachments", "todo_tasks", "workflow_events",
    "business_records", "workflow_versions", "form_template_versions", "business_types", "role_permissions",
    "membership_roles", "organization_memberships", "user_roles", "user_organizations", "permissions", "roles",
    "users", "organizations",
  ];
  for (const table of tables) database.exec(`DELETE FROM ${table};`);
}

function seedOrganizationsAndUsers(database: DatabaseSync): void {
  const organizations = [
    [ids.organization.platform, "示例质量运营中心", "platform", null, null, "approved", "enabled"],
    [ids.organization.supplier, "远航精密供应商", "merchant", "supplier", "91440300MA5SUPP001", "approved", "enabled"],
    [ids.organization.factory, "华南智造 OEM 工厂", "merchant", "factory", "91440300MA5FACT001", "approved", "enabled"],
  ] as const;
  for (const row of organizations) {
    insert(database, `INSERT INTO organizations
      (id, name, type, merchant_type, unified_credit_code, audit_status, usage_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...row, FIXED_NOW, FIXED_NOW]);
  }

  const users = [
    [ids.user.platform, "13800000001", "演示管理员", ids.organization.platform, [ids.organization.platform]],
    [ids.user.supplier, "13800000002", "王晨", ids.organization.supplier, [ids.organization.supplier]],
    [ids.user.factory, "13800000003", "陈工", ids.organization.factory, [ids.organization.factory]],
    [ids.user.supplierMember, "13800000004", "周敏", ids.organization.supplier, [ids.organization.supplier]],
    [ids.user.factoryMember, "13800000005", "赵工", ids.organization.factory, [ids.organization.factory]],
    [ids.user.multiOrganization, "13800000006", "孙齐", ids.organization.supplier, [ids.organization.supplier, ids.organization.factory]],
  ] as const;
  for (const [id, mobile, name, organizationId, organizationIds] of users) {
    insert(database, `INSERT INTO users
      (id, mobile, name, status, default_organization_id, created_at, updated_at)
      VALUES (?, ?, ?, 'enabled', ?, ?, ?)`, [id, mobile, name, organizationId, FIXED_NOW, FIXED_NOW]);
    for (const memberOrganizationId of organizationIds) {
      insert(database, "INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)", [id, memberOrganizationId]);
    }
  }

  const roles = [
    [ids.role.platformSuperAdmin, ids.organization.platform, "platform_super_admin", "超级管理员", 1],
    [ids.role.supplierSuperAdmin, ids.organization.supplier, "merchant_super_admin", "超级管理员", 1],
    [ids.role.factorySuperAdmin, ids.organization.factory, "merchant_super_admin", "超级管理员", 1],
    [ids.role.supplierMember, ids.organization.supplier, "supplier_quality_operator", "供应商质量专员", 0],
    [ids.role.factoryMember, ids.organization.factory, "factory_quality_operator", "工厂质量工程师", 0],
  ] as const;
  for (const [id, organizationId, code, name, builtIn] of roles) {
    insert(database, `INSERT INTO roles
      (id, organization_id, code, name, built_in, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, organizationId, code, name, builtIn, FIXED_NOW]);
  }
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.platform, ids.role.platformSuperAdmin]);
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.supplier, ids.role.supplierSuperAdmin]);
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.factory, ids.role.factorySuperAdmin]);
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.supplierMember, ids.role.supplierMember]);
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.factoryMember, ids.role.factoryMember]);
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.multiOrganization, ids.role.supplierMember]);
  insert(database, "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [ids.user.multiOrganization, ids.role.factoryMember]);

  const memberships = [
    [ids.membership.platform, ids.user.platform, ids.organization.platform, "平台管理员"],
    [ids.membership.supplierAdmin, ids.user.supplier, ids.organization.supplier, "质量负责人"],
    [ids.membership.factoryAdmin, ids.user.factory, ids.organization.factory, "质量负责人"],
    [ids.membership.supplierMember, ids.user.supplierMember, ids.organization.supplier, "质量专员"],
    [ids.membership.factoryMember, ids.user.factoryMember, ids.organization.factory, "质量工程师"],
    [ids.membership.multiSupplier, ids.user.multiOrganization, ids.organization.supplier, "供应商协同专员"],
    [ids.membership.multiFactory, ids.user.multiOrganization, ids.organization.factory, "驻厂质量专员"],
  ] as const;
  for (const [id, userId, organizationId, position] of memberships) {
    insert(database, `INSERT INTO organization_memberships
      (id, user_id, organization_id, status, position, created_at, updated_at)
      VALUES (?, ?, ?, 'enabled', ?, ?, ?)`, [id, userId, organizationId, position, FIXED_NOW, FIXED_NOW]);
  }
  const membershipRoles = [
    [ids.membership.platform, ids.role.platformSuperAdmin],
    [ids.membership.supplierAdmin, ids.role.supplierSuperAdmin],
    [ids.membership.factoryAdmin, ids.role.factorySuperAdmin],
    [ids.membership.supplierMember, ids.role.supplierMember],
    [ids.membership.factoryMember, ids.role.factoryMember],
    [ids.membership.multiSupplier, ids.role.supplierMember],
    [ids.membership.multiFactory, ids.role.factoryMember],
  ] as const;
  for (const row of membershipRoles) {
    insert(database, "INSERT INTO membership_roles (membership_id, role_id) VALUES (?, ?)", row);
  }

  for (const permission of PERMISSION_CATALOG) {
    insert(database, "INSERT INTO permissions (code, name) VALUES (?, ?)", [permission.code, permission.name]);
  }
  const rolePermissionSets: ReadonlyArray<readonly [string, readonly string[]]> = [
    [ids.role.platformSuperAdmin, PLATFORM_PERMISSION_CODES],
    [ids.role.supplierSuperAdmin, SUPPLIER_PERMISSION_CODES],
    [ids.role.factorySuperAdmin, FACTORY_PERMISSION_CODES],
    [ids.role.supplierMember, SUPPLIER_MEMBER_PERMISSION_CODES],
    [ids.role.factoryMember, FACTORY_MEMBER_PERMISSION_CODES],
  ];
  for (const [roleId, permissionCodes] of rolePermissionSets) {
    for (const code of permissionCodes) {
      insert(database, "INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)", [roleId, code]);
    }
  }
}

function seedDefinitions(database: DatabaseSync): void {
  for (const businessType of BUSINESS_TYPE_CATALOG) {
    insert(database, `INSERT INTO business_types (code, name, prefix, built_in, created_at)
      VALUES (?, ?, ?, 1, ?)`, [businessType.code, businessType.name, businessType.prefix, FIXED_NOW]);
  }

  const definitionRows = [
    {
      code: "shipment_report",
      templateId: ids.template.shipment,
      workflowId: ids.workflow.shipment,
      fields: ["materialNo", "materialName", "model", "orderNo", "orderQty", "shipmentQty", "businessTime", "FIELD_009", "remark"],
      states: ["draft", "pending_review", "rejected", "approved", "cancelled"],
      transitions: [
        { from: "draft", command: "submit", to: "pending_review", actor: "supplier" },
        { from: "pending_review", command: "approve", to: "approved", actor: "platform" },
        { from: "pending_review", command: "reject", to: "rejected", actor: "platform" },
      ],
    },
    {
      code: "incoming_inspection",
      templateId: ids.template.incoming,
      workflowId: ids.workflow.incoming,
      fields: ["supplierName", "materialNo", "materialName", "model", "inputQty", "inspectionQty", "defectQty", "defectRate", "businessTime", "FIELD_009", "remark"],
      states: ["draft", "pending_review", "rejected", "completed", "cancelled"],
      transitions: [
        { from: "draft", command: "submit", to: "pending_review", actor: "factory" },
        { from: "pending_review", command: "approve", to: "completed", actor: "platform" },
        { from: "pending_review", command: "reject", to: "rejected", actor: "platform" },
      ],
    },
    {
      code: "material_exception",
      templateId: ids.template.material,
      workflowId: ids.workflow.material,
      fields: ["supplierName", "materialNo", "materialName", "model", "inputQty", "inspectionQty", "defectQty", "defectRate", "exceptionDescription", "FIELD_009", "remark"],
      states: ["pending_review", "pending_assignment", "pending_8d", "pending_8d_review", "completed", "rejected", "cancelled"],
      transitions: [
        { from: "pending_review", command: "assign", to: "pending_8d", actor: "platform" },
        { from: "pending_8d", command: "submit_8d", to: "pending_8d_review", actor: "supplier" },
        { from: "pending_8d_review", command: "approve", to: "completed", actor: "platform" },
      ],
    },
  ] as const;

  for (const row of definitionRows) {
    insert(database, `INSERT INTO form_template_versions
      (id, business_type_code, version, status, field_schema_json, layout_json, created_at, published_at)
      VALUES (?, ?, 1, 'published', ?, ?, ?, ?)`, [
      row.templateId,
      row.code,
      json({ fields: row.fields.map((code) => ({ code, required: !["FIELD_009", "remark"].includes(code) })) }),
      json({ columns: 2, groups: [{ title: "基础信息", fields: row.fields }] }),
      FIXED_NOW,
      FIXED_NOW,
    ]);
    insert(database, `INSERT INTO workflow_versions
      (id, business_type_code, version, status, definition_json, created_at, published_at)
      VALUES (?, ?, 1, 'published', ?, ?, ?)`, [
      row.workflowId,
      row.code,
      json({ initialState: row.code === "material_exception" ? "pending_review" : "draft", states: row.states, transitions: row.transitions }),
      FIXED_NOW,
      FIXED_NOW,
    ]);
  }
}

function seedBusinessFacts(database: DatabaseSync): void {
  const records = [
    {
      id: ids.record.shipment,
      no: "SR202608110001",
      type: "shipment_report",
      submitter: ids.organization.supplier,
      handler: ids.organization.platform,
      template: ids.template.shipment,
      workflow: ids.workflow.shipment,
      source: null,
      state: "pending_review",
      data: { materialNo: "MAT-USB-C-001", materialName: "USB-C连接器", model: "UC24-PRO", orderNo: "PO202608001", orderQty: 5000, shipmentQty: 3000, businessTime: "2026-08-10T15:30:00.000+08:00" },
    },
    {
      id: ids.record.incoming,
      no: "IQC202608090001",
      type: "incoming_inspection",
      submitter: ids.organization.factory,
      handler: null,
      template: ids.template.incoming,
      workflow: ids.workflow.incoming,
      source: null,
      state: "completed",
      data: { supplierName: "远航精密供应商", materialNo: "MAT-USB-C-001", materialName: "USB-C连接器", model: "UC24-PRO", inputQty: 1200, inspectionQty: 120, defectQty: 9, defectRate: 0.075, exceptionDescription: "端子压接高度偏差", handlingMethod: "触发物料异常并要求供应商提交8D" },
    },
    {
      id: ids.record.material,
      no: "ME202608100001",
      type: "material_exception",
      submitter: ids.organization.factory,
      handler: ids.organization.supplier,
      template: ids.template.material,
      workflow: ids.workflow.material,
      source: ids.record.incoming,
      state: "pending_8d",
      data: { supplierName: "远航精密供应商", materialNo: "MAT-USB-C-001", materialName: "USB-C连接器", model: "UC24-PRO", inputQty: 1200, inspectionQty: 120, defectQty: 9, defectRate: 0.075, exceptionDescription: "端子压接高度偏差", triggerMode: "manual_after_incoming_inspection_approved" },
    },
  ] as const;

  for (const row of records) {
    insert(database, `INSERT INTO business_records
      (id, business_no, business_type_code, submitter_organization_id, current_handler_organization_id,
       form_template_version_id, workflow_version_id, source_record_id, state, form_data_json, version, submitted_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`, [
      row.id, row.no, row.type, row.submitter, row.handler, row.template, row.workflow, row.source,
      row.state, json(row.data), FIXED_NOW, FIXED_NOW,
    ]);
  }

  const events = [
    ["00000000-0000-4000-8000-000000000601", ids.record.shipment, "draft", "pending_review", "submit", ids.user.supplier, ids.organization.supplier, ids.workflow.shipment, "2026-08-10T15:30:00.000+08:00", {}],
    ["00000000-0000-4000-8000-000000000602", ids.record.incoming, "draft", "pending_review", "submit", ids.user.factory, ids.organization.factory, ids.workflow.incoming, "2026-08-09T09:20:00.000+08:00", {}],
    ["00000000-0000-4000-8000-000000000603", ids.record.incoming, "pending_review", "completed", "approve", ids.user.platform, ids.organization.platform, ids.workflow.incoming, "2026-08-09T10:10:00.000+08:00", { handlingMethod: "触发物料异常并要求供应商提交8D" }],
    ["00000000-0000-4000-8000-000000000604", ids.record.material, "completed", "pending_8d", "trigger_material_exception", ids.user.factory, ids.organization.factory, ids.workflow.material, "2026-08-10T10:32:00.000+08:00", { sourceRecordId: ids.record.incoming }],
  ] as const;
  for (const row of events) {
    const [id, recordId, fromState, toState, command, actorUserId, actorOrganizationId, workflowVersionId, occurredAt, payload] = row;
    insert(database, `INSERT INTO workflow_events
      (id, record_id, from_state, to_state, command, actor_user_id, actor_organization_id, workflow_version_id, occurred_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, recordId, fromState, toState, command, actorUserId, actorOrganizationId, workflowVersionId, occurredAt, json(payload)]);
  }

  const tasks = [
    ["00000000-0000-4000-8000-000000000701", ids.record.shipment, "review", "审核出货报告-远航精密供应商-SR202608110001", "platform", ids.organization.platform, "pending", FIXED_NOW, null],
    ["00000000-0000-4000-8000-000000000702", ids.record.incoming, "review", "审核来料检验-IQC202608090001", "platform", ids.organization.platform, "completed", "2026-08-09T09:20:00.000+08:00", "2026-08-09T10:10:00.000+08:00"],
    ["00000000-0000-4000-8000-000000000703", ids.record.material, "submit_8d", "提交物料异常8D-ME202608100001", "merchant", ids.organization.supplier, "pending", "2026-08-10T10:32:00.000+08:00", null],
  ] as const;
  for (const row of tasks) {
    insert(database, `INSERT INTO todo_tasks
      (id, record_id, task_type, title, handler_type, handler_organization_id, status, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, row);
  }

  const attachments = [
    ["00000000-0000-4000-8000-000000000801", ids.record.shipment, "出货检验报告_SR202608110001.pdf", "application/pdf", 248320, "demo/shipment/SR202608110001.pdf", ids.user.supplier],
    ["00000000-0000-4000-8000-000000000802", ids.record.incoming, "来料异常照片_IQC202608090001.png", "image/png", 638412, "demo/incoming/IQC202608090001.png", ids.user.factory],
  ] as const;
  for (const row of attachments) {
    insert(database, `INSERT INTO attachments
      (id, record_id, field_code, file_name, mime_type, size_bytes, storage_key, uploader_user_id, created_at)
      VALUES (?, ?, 'FIELD_009', ?, ?, ?, ?, ?, ?)`, [...row.slice(0, 2), ...row.slice(2), FIXED_NOW]);
  }

  for (const [index, event] of events.entries()) {
    insert(database, `INSERT INTO audit_events
      (id, organization_id, actor_user_id, action, entity_type, entity_id, occurred_at, trace_id, detail_json)
      VALUES (?, ?, ?, ?, 'business_record', ?, ?, ?, ?)`, [
      `00000000-0000-4000-8000-00000000090${index + 1}`,
      event[6], event[5], event[4], event[1], event[8], `seed-trace-00${index + 1}`, json({ workflowEventId: event[0] }),
    ]);
  }
}

function buildManifest(database: DatabaseSync): SeedManifest {
  const countTables = [
    "organizations", "users", "organization_memberships", "membership_roles", "roles", "permissions", "business_types", "form_template_versions",
    "workflow_versions", "business_records", "workflow_events", "todo_tasks", "attachments", "audit_events", "seed_scenarios",
  ];
  const counts = Object.fromEntries(countTables.map((table) => {
    const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
    return [table, Number(row.count)];
  }));
  return seedManifestSchema.parse({
    seed: FIXED_SEED,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: FIXED_NOW,
    timezone: "Asia/Shanghai",
    counts,
    scenarios: [{
      id: ids.scenario,
      code: "incoming-defect-triggers-material-exception",
      anomalyLabel: "incoming_defect_rate_spike",
      rootCauseCode: "terminal_crimp_height_deviation",
    }],
  });
}

export function seedDatabase(database: DatabaseSync): SeedManifest {
  applyMigrations(database);
  database.exec("BEGIN IMMEDIATE");
  try {
    resetSeededData(database);
    seedOrganizationsAndUsers(database);
    seedDefinitions(database);
    seedBusinessFacts(database);
    insert(database, `INSERT INTO seed_scenarios
      (id, code, seed, period_start, period_end, organization_ids_json, anomaly_label, root_cause_code, expected_truth_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      ids.scenario,
      "incoming-defect-triggers-material-exception",
      FIXED_SEED,
      "2026-08-09T00:00:00.000+08:00",
      "2026-08-11T23:59:59.999+08:00",
      json([ids.organization.factory, ids.organization.supplier]),
      "incoming_defect_rate_spike",
      "terminal_crimp_height_deviation",
      json({ sourceBusinessNo: "IQC202608090001", triggeredBusinessNo: "ME202608100001", defectRate: 0.075 }),
    ]);
    const manifest = buildManifest(database);
    const manifestHash = createHash("sha256").update(json(manifest)).digest("hex");
    insert(database, `INSERT INTO seed_runs
      (id, seed, schema_version, generated_at, timezone, manifest_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [ids.seedRun, FIXED_SEED, SCHEMA_VERSION, FIXED_NOW, "Asia/Shanghai", json({ ...manifest, manifestHash })]);
    database.exec("COMMIT");
    return manifest;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function isMainModule(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const databasePath = process.env.QUALITY_PLATFORM_DB_PATH ?? defaultDatabasePath;
  const manifestPath = process.env.QUALITY_PLATFORM_SEED_MANIFEST_PATH
    ?? resolve(dirname(databasePath), "seed-manifest.json");
  const database = openDatabase(databasePath);
  const manifest = seedDatabase(database);
  database.close();
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ databasePath, manifestPath, manifest }, null, 2));
}
