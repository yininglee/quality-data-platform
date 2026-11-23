export type PermissionSurface = "platform" | "merchant";
export type PermissionAction = "read" | "create" | "update" | "delete" | "status" | "export" | "submit" | "review" | "assign" | "handle" | "access";

export type PermissionDefinition = Readonly<{
  code: string;
  name: string;
  surface: PermissionSurface;
  module: string;
  resource: string;
  action: PermissionAction;
}>;

export type PermissionGroupDefinition = Readonly<{
  id: string;
  label: string;
  permissionCodes: readonly string[];
}>;

function definePermission(
  surface: PermissionSurface,
  module: string,
  resource: string,
  action: PermissionAction,
  name: string,
): PermissionDefinition {
  return { code: `${surface}.${module}.${resource}.${action}`, name, surface, module, resource, action };
}

function defineResourceActions(
  surface: PermissionSurface,
  module: string,
  resource: string,
  resourceName: string,
  actions: ReadonlyArray<readonly [PermissionAction, string]>,
): PermissionDefinition[] {
  return actions.map(([action, actionName]) => definePermission(surface, module, resource, action, `${resourceName}-${actionName}`));
}

const platformHomePermissions = [
  ["merchant_registration", "商家注册待办"],
  ["shipment_report", "出货报告待办"],
  ["material_exception", "物料异常待办"],
  ["after_sales_exception", "售后异常待办"],
  ["sporadic_return", "零星退料待办"],
  ["inbound_report", "入库报告待办"],
  ["trial_production_summary", "试产及生产总结待办"],
].map(([resource, name]) => definePermission("platform", "home", resource, "read", name));

const platformMerchantPermissions = defineResourceActions("platform", "merchant", "organization", "商家", [
  ["read", "查看"],
  ["review", "审核"],
  ["status", "启用禁用"],
  ["export", "导出"],
]);

const platformSubmissionPermissions = [
  definePermission("platform", "business", "material_exception", "submit", "平台提报物料异常"),
  definePermission("platform", "business", "after_sales_exception", "submit", "平台提报售后异常"),
];

const businessResources = [
  ["shipment_report", "出货报告"],
  ["material_exception", "物料异常"],
  ["after_sales_exception", "售后异常"],
  ["incoming_inspection", "来料检验"],
  ["production_inspection_daily", "生产检验日报"],
  ["repair_record", "维修记录"],
  ["ipqc_inspection", "IPQC巡线问题记录"],
  ["sporadic_return", "零星退料记录"],
  ["inbound_report", "入库报告"],
  ["trial_production_summary", "试产及生产总结"],
] as const;

const platformBusinessAccessPermissions = businessResources.map(([resource, name]) =>
  definePermission("platform", "business", resource, "access", `${name}TAB`));
const platformBusinessRecordPermissions = defineResourceActions("platform", "business", "record", "业务记录", [
  ["read", "查看"],
  ["review", "审核"],
  ["export", "导出"],
]);

const adminActions = [
  ["read", "查看"],
  ["create", "新增"],
  ["update", "编辑"],
  ["delete", "删除"],
  ["status", "启用禁用"],
  ["export", "导出"],
] as const;
const roleActions = [
  ["read", "查看"],
  ["create", "新增"],
  ["update", "编辑"],
  ["delete", "删除"],
  ["export", "导出"],
] as const;

const platformUserPermissions = defineResourceActions("platform", "admin", "user", "平台用户", adminActions);
const platformRolePermissions = [
  ...defineResourceActions("platform", "admin", "role", "平台角色", roleActions),
  definePermission("platform", "admin", "role_permission", "update", "配置平台角色权限"),
];

export const PLATFORM_PERMISSION_DEFINITIONS = [
  ...platformHomePermissions,
  ...platformMerchantPermissions,
  ...platformSubmissionPermissions,
  ...platformBusinessAccessPermissions,
  ...platformBusinessRecordPermissions,
  ...platformUserPermissions,
  ...platformRolePermissions,
] as const satisfies readonly PermissionDefinition[];

const merchantAdminPermissions = [
  ...defineResourceActions("merchant", "admin", "user", "商家用户", adminActions),
  ...defineResourceActions("merchant", "admin", "role", "商家角色", roleActions),
  definePermission("merchant", "admin", "role_permission", "update", "配置商家角色权限"),
];

const supplierHomePermissions = [
  ["shipment_report", "出货报告重新提报待办"],
  ["material_exception", "物料异常待办"],
  ["after_sales_exception", "售后异常任务待办"],
].map(([resource, name]) => definePermission("merchant", "home", resource, "read", name));
const supplierBusinessPermissions = [
  ...defineResourceActions("merchant", "business", "shipment_report", "出货报告", [["read", "查看"], ["submit", "提报"], ["export", "导出"]]),
  ...defineResourceActions("merchant", "business", "material_exception", "物料异常", [["read", "查看"], ["handle", "处理"], ["export", "导出"]]),
  ...defineResourceActions("merchant", "business", "after_sales_exception", "售后异常", [["read", "查看"], ["handle", "处理"], ["export", "导出"]]),
];

const factoryHomeResources = [
  ["material_exception", "物料异常待办"],
  ["incoming_inspection", "被驳回来料检验待办"],
  ["sporadic_return", "被驳回零星退料待办"],
  ["inbound_report", "被驳回入库报告待办"],
  ["trial_production_summary", "被驳回试产及生产总结待办"],
] as const;
const factoryHomePermissions = factoryHomeResources.map(([resource, name]) =>
  definePermission("merchant", "home", resource, "read", name));
const factoryBusinessResources = businessResources.filter(([resource]) => !["shipment_report", "after_sales_exception"].includes(resource));
const factoryBusinessPermissions = factoryBusinessResources.flatMap(([resource, name]) =>
  defineResourceActions("merchant", "business", resource, name, [["read", "查看"], ["submit", "提报"], ["export", "导出"]]));

export const SUPPLIER_PERMISSION_DEFINITIONS = [
  ...supplierHomePermissions,
  ...supplierBusinessPermissions,
  ...merchantAdminPermissions,
] as const satisfies readonly PermissionDefinition[];

export const FACTORY_PERMISSION_DEFINITIONS = [
  ...factoryHomePermissions,
  ...factoryBusinessPermissions,
  ...merchantAdminPermissions,
] as const satisfies readonly PermissionDefinition[];

function uniqueDefinitions(definitions: readonly PermissionDefinition[]): PermissionDefinition[] {
  const unique = new Map<string, PermissionDefinition>();
  for (const definition of definitions) {
    const existing = unique.get(definition.code);
    if (existing && existing.name !== definition.name) throw new Error(`permission definition conflict: ${definition.code}`);
    unique.set(definition.code, existing ?? definition);
  }
  return [...unique.values()];
}

export const PERMISSION_CATALOG = uniqueDefinitions([
  ...PLATFORM_PERMISSION_DEFINITIONS,
  ...SUPPLIER_PERMISSION_DEFINITIONS,
  ...FACTORY_PERMISSION_DEFINITIONS,
]);
export const PLATFORM_PERMISSION_CODES = PLATFORM_PERMISSION_DEFINITIONS.map(({ code }) => code);
export const SUPPLIER_PERMISSION_CODES = SUPPLIER_PERMISSION_DEFINITIONS.map(({ code }) => code);
export const FACTORY_PERMISSION_CODES = FACTORY_PERMISSION_DEFINITIONS.map(({ code }) => code);
export const SUPPLIER_MEMBER_PERMISSION_CODES = supplierHomePermissions.concat(supplierBusinessPermissions).map(({ code }) => code);
export const FACTORY_MEMBER_PERMISSION_CODES = factoryHomePermissions.concat(factoryBusinessPermissions).map(({ code }) => code);

export const PLATFORM_PERMISSION_GROUPS: readonly PermissionGroupDefinition[] = [
  { id: "platform.home", label: "首页", permissionCodes: platformHomePermissions.map(({ code }) => code) },
  { id: "platform.merchant", label: "商家管理", permissionCodes: platformMerchantPermissions.map(({ code }) => code) },
  { id: "platform.submission", label: "平台业务", permissionCodes: platformSubmissionPermissions.map(({ code }) => code) },
  { id: "platform.business", label: "业务管理", permissionCodes: [...platformBusinessAccessPermissions, ...platformBusinessRecordPermissions].map(({ code }) => code) },
  { id: "platform.user", label: "用户管理", permissionCodes: platformUserPermissions.map(({ code }) => code) },
  { id: "platform.role", label: "角色管理", permissionCodes: platformRolePermissions.map(({ code }) => code) },
];

const merchantUserPermissions = merchantAdminPermissions.filter(({ resource }) => resource === "user");
const merchantRolePermissions = merchantAdminPermissions.filter(({ resource }) => resource === "role" || resource === "role_permission");

export const SUPPLIER_PERMISSION_GROUPS: readonly PermissionGroupDefinition[] = [
  { id: "merchant.home", label: "首页待办", permissionCodes: supplierHomePermissions.map(({ code }) => code) },
  { id: "merchant.business", label: "供应商管理", permissionCodes: supplierBusinessPermissions.map(({ code }) => code) },
  { id: "merchant.user", label: "用户管理", permissionCodes: merchantUserPermissions.map(({ code }) => code) },
  { id: "merchant.role", label: "角色管理", permissionCodes: merchantRolePermissions.map(({ code }) => code) },
];

export const FACTORY_PERMISSION_GROUPS: readonly PermissionGroupDefinition[] = [
  { id: "merchant.home", label: "首页待办", permissionCodes: factoryHomePermissions.map(({ code }) => code) },
  { id: "merchant.business", label: "工厂管理", permissionCodes: factoryBusinessPermissions.map(({ code }) => code) },
  { id: "merchant.user", label: "用户管理", permissionCodes: merchantUserPermissions.map(({ code }) => code) },
  { id: "merchant.role", label: "角色管理", permissionCodes: merchantRolePermissions.map(({ code }) => code) },
];

const catalogByCode = new Map(PERMISSION_CATALOG.map((definition) => [definition.code, definition]));

export function getPermissionDefinition(code: string): PermissionDefinition | undefined {
  return catalogByCode.get(code);
}

export function isCanonicalPermissionCode(code: string): boolean {
  return catalogByCode.has(code);
}

export type PermissionMigrationContext =
  | Readonly<{ surface: "platform" }>
  | Readonly<{ surface: "merchant"; merchantType: "supplier" | "factory" }>;

export type PermissionMigrationResult = Readonly<{
  permissionCodes: string[];
  unknownCodes: string[];
}>;

function codesByPrefix(codes: readonly string[], prefix: string): string[] {
  return codes.filter((code) => code.startsWith(prefix));
}

function legacyPlatformPermissionMap(): Record<string, readonly string[]> {
  const businessAccess = codesByPrefix(PLATFORM_PERMISSION_CODES, "platform.business.").filter((code) => code.endsWith(".access"));
  const userPermissions = codesByPrefix(PLATFORM_PERMISSION_CODES, "platform.admin.user.");
  const rolePermissions = codesByPrefix(PLATFORM_PERMISSION_CODES, "platform.admin.role");
  const todoCodes = platformHomePermissions.map(({ code }) => code);
  const businessTypes = businessResources.map(([resource]) => `platform.business.${resource}.access`);
  return {
    home: todoCodes,
    "todo:merchant_registration": ["platform.home.merchant_registration.read"],
    "todo:shipment_report": ["platform.home.shipment_report.read"],
    "todo:material_exception": ["platform.home.material_exception.read"],
    "todo:after_sales_exception": ["platform.home.after_sales_exception.read"],
    "todo:sporadic_return": ["platform.home.sporadic_return.read"],
    "todo:inbound_report": ["platform.home.inbound_report.read"],
    "todo:trial_summary": ["platform.home.trial_production_summary.read"],
    merchant: platformMerchantPermissions.map(({ code }) => code),
    "merchant:view": ["platform.merchant.organization.read"],
    "merchant:review": ["platform.merchant.organization.review"],
    "merchant:toggle": ["platform.merchant.organization.status"],
    "merchant:export": ["platform.merchant.organization.export"],
    "platform-business": platformSubmissionPermissions.map(({ code }) => code),
    "platform-business:material": ["platform.business.material_exception.submit"],
    "platform-business:after-sales": ["platform.business.after_sales_exception.submit"],
    business: [...businessAccess, ...platformBusinessRecordPermissions.map(({ code }) => code)],
    "business:view": ["platform.business.record.read"],
    "business:review": ["platform.business.record.review"],
    "business:export": ["platform.business.record.export"],
    users: userPermissions,
    "users:view": ["platform.admin.user.read"],
    "users:create": ["platform.admin.user.create"],
    "users:edit": ["platform.admin.user.update"],
    "users:delete": ["platform.admin.user.delete"],
    "users:toggle": ["platform.admin.user.status"],
    "users:export": ["platform.admin.user.export"],
    roles: rolePermissions,
    "roles:view": ["platform.admin.role.read"],
    "roles:create": ["platform.admin.role.create"],
    "roles:edit": ["platform.admin.role.update"],
    "roles:delete": ["platform.admin.role.delete"],
    "roles:export": ["platform.admin.role.export"],
    "dashboard:read": todoCodes,
    "todo:read": todoCodes,
    "business:read": [...businessAccess, "platform.business.record.read"],
    "business:submit": platformSubmissionPermissions.map(({ code }) => code),
    "business:assign": ["platform.business.material_exception.access", "platform.business.record.review"],
    "user:manage": userPermissions,
    "role:manage": rolePermissions,
    ...Object.fromEntries(businessTypes.map((code, index) => [`business:type:${index + 1}`, [code]])),
  };
}

function legacyMerchantPermissionMap(merchantType: "supplier" | "factory"): Record<string, readonly string[]> {
  const allCodes = merchantType === "supplier" ? SUPPLIER_PERMISSION_CODES : FACTORY_PERMISSION_CODES;
  const memberCodes = merchantType === "supplier" ? SUPPLIER_MEMBER_PERMISSION_CODES : FACTORY_MEMBER_PERMISSION_CODES;
  const homeCodes = codesByPrefix(allCodes, "merchant.home.");
  const businessReadCodes = codesByPrefix(allCodes, "merchant.business.").filter((code) => code.endsWith(".read"));
  const businessSubmitCodes = codesByPrefix(allCodes, "merchant.business.").filter((code) => code.endsWith(".submit"));
  const userPermissions = codesByPrefix(allCodes, "merchant.admin.user.");
  const rolePermissions = codesByPrefix(allCodes, "merchant.admin.role");
  return {
    "dashboard:read": homeCodes,
    "todo:read": homeCodes,
    "business:read": businessReadCodes,
    "business:submit": businessSubmitCodes,
    "business:submit-8d": merchantType === "supplier" ? ["merchant.business.material_exception.handle"] : [],
    "user:manage": userPermissions,
    "role:manage": rolePermissions,
    member: memberCodes,
  };
}

export function migrateLegacyPermissionCodes(
  codes: readonly string[],
  context: PermissionMigrationContext,
): PermissionMigrationResult {
  const mapping = context.surface === "platform"
    ? legacyPlatformPermissionMap()
    : legacyMerchantPermissionMap(context.merchantType);
  const migrated = new Set<string>();
  const unknownCodes: string[] = [];
  for (const code of codes) {
    if (isCanonicalPermissionCode(code)) {
      migrated.add(code);
      continue;
    }
    const replacements = mapping[code];
    if (!replacements) {
      unknownCodes.push(code);
      continue;
    }
    replacements.forEach((replacement) => migrated.add(replacement));
  }
  return { permissionCodes: [...migrated].sort(), unknownCodes: [...new Set(unknownCodes)].sort() };
}
