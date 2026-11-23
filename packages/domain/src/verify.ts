import {
  accountSchema,
  membershipRoleSchema,
  membershipSchema,
  migrateLegacyPermissionCodes,
  type Membership,
  type Organization,
  type Role,
} from "@quality-platform/contracts";
import {
  aggregateOrganizationPermissions,
  chooseDefaultOrganization,
  isMembershipAvailable,
  isRoleAssignmentAllowed,
} from "./index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = "2026-08-27T10:00:00.000+08:00";
const platformId = "00000000-0000-4000-8000-000000000001";
const supplierId = "00000000-0000-4000-8000-000000000002";
const factoryId = "00000000-0000-4000-8000-000000000003";
const userId = "00000000-0000-4000-8000-000000000106";
const supplierRoleId = "00000000-0000-4000-8000-000000000202";
const factoryRoleId = "00000000-0000-4000-8000-000000000203";

const organizations: Organization[] = [
  { id: platformId, name: "示例质量运营中心", type: "platform", merchantType: null, auditStatus: "approved", usageStatus: "enabled" },
  { id: supplierId, name: "远航精密供应商", type: "merchant", merchantType: "supplier", auditStatus: "approved", usageStatus: "enabled" },
  { id: factoryId, name: "华南智造 OEM 工厂", type: "merchant", merchantType: "factory", auditStatus: "approved", usageStatus: "enabled" },
];
const memberships: Membership[] = [
  membershipSchema.parse({ id: "membership-supplier", userId, organizationId: supplierId, status: "enabled", position: "供应商协同专员", createdAt: now, updatedAt: now }),
  membershipSchema.parse({ id: "membership-factory", userId, organizationId: factoryId, status: "enabled", position: "驻厂质量专员", createdAt: now, updatedAt: now }),
];
const platformMembership = membershipSchema.parse({ id: "membership-platform", userId, organizationId: platformId, status: "enabled", position: "平台用户", createdAt: now, updatedAt: now });

assert(accountSchema.safeParse({
  id: userId,
  mobile: "13800000006",
  name: "孙齐",
  email: "sunqi@example.com",
  passwordHash: null,
  status: "enabled",
  defaultOrganizationId: supplierId,
  lastLoginAt: null,
  createdAt: now,
  updatedAt: now,
}).success, "account contract rejected valid input");
assert(membershipRoleSchema.safeParse({ membershipId: memberships[0].id, roleId: supplierRoleId }).success, "membership role contract rejected valid input");
assert(chooseDefaultOrganization(memberships, organizations, factoryId) === factoryId, "previous available organization was not restored");
assert(chooseDefaultOrganization(memberships, organizations, "00000000-0000-4000-8000-000000000099") === supplierId, "first available organization was not selected");
assert(chooseDefaultOrganization([...memberships, platformMembership], organizations, factoryId) === platformId, "platform organization was not prioritized");

const disabledMemberships = memberships.map((membership) => membership.organizationId === supplierId
  ? { ...membership, status: "disabled" as const }
  : membership);
assert(chooseDefaultOrganization(disabledMemberships, organizations, supplierId) === factoryId, "disabled membership remained selectable");
assert(!isMembershipAvailable(memberships[0], { ...organizations[0], usageStatus: "disabled" }), "disabled organization remained selectable");

const roles: Array<Pick<Role, "id" | "organizationId"> & { permissionCodes: readonly string[] }> = [
  { id: supplierRoleId, organizationId: supplierId, permissionCodes: ["merchant.business.shipment_report.read", "merchant.business.shipment_report.submit", "merchant.admin.role.read"] },
  { id: factoryRoleId, organizationId: factoryId, permissionCodes: ["merchant.business.incoming_inspection.read"] },
];
assert(isRoleAssignmentAllowed(memberships[0], roles[0]), "same-organization role assignment was rejected");
assert(!isRoleAssignmentAllowed(memberships[0], roles[1]), "cross-organization role assignment was allowed");
const permissions = aggregateOrganizationPermissions(
  memberships[0],
  roles,
  [supplierRoleId, factoryRoleId],
  ["merchant.business.shipment_report.read", "merchant.admin.role.read"],
);
assert(JSON.stringify(permissions) === JSON.stringify(["merchant.admin.role.read", "merchant.business.shipment_report.read"]), "permission union/intersection is incorrect");
assert(aggregateOrganizationPermissions({ ...memberships[0], status: "disabled" }, roles, [supplierRoleId], ["merchant.business.shipment_report.read"]).length === 0, "disabled membership retained permissions");

const migratedPermissions = migrateLegacyPermissionCodes(["business:read", "role:manage"], { surface: "merchant", merchantType: "supplier" });
assert(migratedPermissions.unknownCodes.length === 0, "known legacy permissions were not migrated");
assert(migratedPermissions.permissionCodes.includes("merchant.business.shipment_report.read"), "legacy business permission did not map to supplier leaf permissions");
assert(migratedPermissions.permissionCodes.includes("merchant.admin.role_permission.update"), "legacy role management permission lost role configuration");
assert(migrateLegacyPermissionCodes(["unknown:permission"], { surface: "platform" }).unknownCodes[0] === "unknown:permission", "unknown legacy permission was not reported");

console.log(JSON.stringify({
  contractValidation: true,
  previousOrganizationRestored: true,
  platformOrganizationPrioritized: true,
  disabledMembershipFiltered: true,
  disabledOrganizationFiltered: true,
  crossOrganizationRoleRejected: true,
  effectivePermissions: permissions,
  legacyPermissionMigration: true,
}, null, 2));
