import {
  FACTORY_MEMBER_PERMISSION_CODES,
  FACTORY_PERMISSION_CODES,
  isCanonicalPermissionCode,
  migrateLegacyPermissionCodes,
  SUPPLIER_MEMBER_PERMISSION_CODES,
  SUPPLIER_PERMISSION_CODES,
} from "@quality-platform/contracts";

export type MerchantType = "supplier" | "factory";
export type MembershipStatus = "enabled" | "disabled";

export type MerchantOrganizationSource = Readonly<{
  id: string;
  organizationId: string;
  merchantType: MerchantType;
  companyName: string;
  administratorName: string;
  administratorPhone: string;
  administratorEmail: string;
  reviewStatus: string;
  usageStatus: "active" | "inactive" | null;
  createdAt: string;
  approvedAt?: string;
}>;

export type MerchantAccount = {
  id: string;
  phone: string;
  name: string;
  email: string;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type MerchantRole = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  system: boolean;
  permissionCodes: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type MerchantOrganizationGrant = {
  organizationId: string;
  merchantType: MerchantType;
  permissionCodes: string[];
  revision: number;
  updatedAt: string;
};

export type MerchantGrantRevision = {
  id: string;
  organizationId: string;
  revision: number;
  permissionCodes: string[];
  removedPermissionCodes: string[];
  createdAt: string;
};

export type MerchantMembership = {
  id: string;
  accountId: string;
  organizationId: string;
  status: MembershipStatus;
  position: string;
  roleIds: string[];
  registrationAdministrator: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MerchantIdentityStore = {
  version: 1;
  accounts: MerchantAccount[];
  memberships: MerchantMembership[];
  roles: MerchantRole[];
  grants: MerchantOrganizationGrant[];
  grantRevisions: MerchantGrantRevision[];
};

export type OrganizationMember = MerchantMembership & {
  account: MerchantAccount;
  roles: MerchantRole[];
};

export type MerchantMemberInput = Readonly<{
  name: string;
  phone: string;
  email: string;
  position: string;
  roleIds: string[];
}>;

export type MerchantRoleInput = Readonly<{
  name: string;
  description: string;
}>;

export const MERCHANT_IDENTITY_STORAGE_KEY = "quality-platform.merchant-identities";
export const LAST_ORGANIZATION_STORAGE_KEY = "quality-platform.last-organizations";
export const MERCHANT_IDENTITY_CHANGE_EVENT = "quality-platform:merchant-identity-change";

const SEEDED_SUPPLIER_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000002";
const SEEDED_FACTORY_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000003";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function permissionCodesForMerchantType(merchantType: MerchantType): string[] {
  return [...(merchantType === "supplier" ? SUPPLIER_PERMISSION_CODES : FACTORY_PERMISSION_CODES)];
}

function memberPermissionCodesForMerchantType(merchantType: MerchantType): string[] {
  return [...(merchantType === "supplier" ? SUPPLIER_MEMBER_PERMISSION_CODES : FACTORY_MEMBER_PERMISSION_CODES)];
}

function sourceForOrganization(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
): MerchantOrganizationSource {
  const source = sources.find((entry) => entry.organizationId === organizationId && entry.reviewStatus === "approved");
  if (!source) throw new Error("当前商家组织不存在或未通过审批");
  return source;
}

function roleId(organizationId: string, code: string): string {
  return `${organizationId}:${code}`;
}

function accountId(phone: string): string {
  return `merchant-account-${phone}`;
}

function membershipId(organizationId: string, account: MerchantAccount): string {
  return `merchant-membership-${organizationId}-${account.id}`;
}

function rolesForOrganization(source: MerchantOrganizationSource): MerchantRole[] {
  const timestamp = source.approvedAt ?? source.createdAt;
  const operatorCode = source.merchantType === "supplier" ? "supplier_quality_operator" : "factory_quality_operator";
  return [
    {
      id: roleId(source.organizationId, "merchant_super_admin"),
      organizationId: source.organizationId,
      code: "merchant_super_admin",
      name: "超级管理员",
      description: "系统内置角色，权限同步当前组织授权上限",
      system: true,
      permissionCodes: permissionCodesForMerchantType(source.merchantType),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: roleId(source.organizationId, operatorCode),
      organizationId: source.organizationId,
      code: operatorCode,
      name: source.merchantType === "supplier" ? "供应商质量专员" : "工厂质量工程师",
      description: source.merchantType === "supplier" ? "负责供应商质量业务处理" : "负责工厂质量业务提报",
      system: false,
      permissionCodes: memberPermissionCodesForMerchantType(source.merchantType),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export function initializeMerchantOrganization(
  store: MerchantIdentityStore,
  source: MerchantOrganizationSource,
): MerchantIdentityStore {
  if (source.reviewStatus !== "approved") return store;
  const defaultRoles = rolesForOrganization(source);
  const builtInRoleIds = new Set(defaultRoles.map((role) => role.id));
  const applicableCodes = permissionCodesForMerchantType(source.merchantType);
  const existingGrant = store.grants.find((grant) => grant.organizationId === source.organizationId);
  const grantedCodes = unique((existingGrant?.permissionCodes ?? applicableCodes).filter((code) => applicableCodes.includes(code))).sort();
  const grant: MerchantOrganizationGrant = existingGrant
    ? { ...existingGrant, merchantType: source.merchantType, permissionCodes: grantedCodes }
    : {
        organizationId: source.organizationId,
        merchantType: source.merchantType,
        permissionCodes: grantedCodes,
        revision: 1,
        updatedAt: source.approvedAt ?? source.createdAt,
      };
  const synchronizedRoles = defaultRoles.map((defaultRole) => {
    const existingRole = store.roles.find((role) => role.id === defaultRole.id);
    if (defaultRole.code === "merchant_super_admin") {
      return { ...defaultRole, createdAt: existingRole?.createdAt ?? defaultRole.createdAt, updatedAt: existingRole?.updatedAt ?? defaultRole.updatedAt, permissionCodes: grantedCodes };
    }
    if (!existingRole) {
      return { ...defaultRole, permissionCodes: defaultRole.permissionCodes.filter((code) => grantedCodes.includes(code)) };
    }
    return {
      ...existingRole,
      organizationId: source.organizationId,
      system: false,
      permissionCodes: existingRole.permissionCodes.filter((code) => grantedCodes.includes(code)),
    };
  });
  const customRoles = store.roles
    .filter((role) => role.organizationId === source.organizationId && !builtInRoleIds.has(role.id))
    .map((role) => {
      const migrated = migrateLegacyPermissionCodes(role.permissionCodes, { surface: "merchant", merchantType: source.merchantType });
      if (migrated.unknownCodes.length) throw new Error(`unknown permission codes: ${migrated.unknownCodes.join(", ")}`);
      return {
        ...role,
        description: role.description ?? "",
        permissionCodes: migrated.permissionCodes.filter((code) => grantedCodes.includes(code)),
      };
    });
  const existingAccount = store.accounts.find((entry) => entry.phone === source.administratorPhone);
  const timestamp = source.approvedAt ?? source.createdAt;
  const administrator: MerchantAccount = existingAccount ?? {
    id: accountId(source.administratorPhone),
    phone: source.administratorPhone,
    name: source.administratorName,
    email: source.administratorEmail,
    status: "enabled",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const existingMembership = store.memberships.find((entry) =>
    entry.accountId === administrator.id && entry.organizationId === source.organizationId);
  const administratorMembership: MerchantMembership = existingMembership
    ? {
        ...existingMembership,
        roleIds: unique([...existingMembership.roleIds, roleId(source.organizationId, "merchant_super_admin")]),
        registrationAdministrator: true,
      }
    : {
        id: membershipId(source.organizationId, administrator),
        accountId: administrator.id,
        organizationId: source.organizationId,
        status: "enabled",
        position: "质量负责人",
        roleIds: [roleId(source.organizationId, "merchant_super_admin")],
        registrationAdministrator: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
  return {
    version: 1,
    accounts: existingAccount ? store.accounts : [...store.accounts, administrator],
    memberships: existingMembership
      ? store.memberships.map((entry) => entry.id === existingMembership.id ? administratorMembership : entry)
      : [...store.memberships, administratorMembership],
    roles: [
      ...store.roles.filter((entry) => entry.organizationId !== source.organizationId),
      ...customRoles,
      ...synchronizedRoles,
    ],
    grants: [
      ...store.grants.filter((entry) => entry.organizationId !== source.organizationId),
      grant,
    ],
    grantRevisions: store.grantRevisions,
  };
}

function addSeededOrdinaryMember(
  store: MerchantIdentityStore,
  source: MerchantOrganizationSource,
  input: Pick<MerchantAccount, "phone" | "name" | "email"> & Pick<MerchantMembership, "position">,
): MerchantIdentityStore {
  if (store.memberships.some((entry) => entry.organizationId === source.organizationId
    && store.accounts.find((account) => account.id === entry.accountId)?.phone === input.phone)) return store;
  const timestamp = source.approvedAt ?? source.createdAt;
  const account: MerchantAccount = {
    id: accountId(input.phone),
    phone: input.phone,
    name: input.name,
    email: input.email,
    status: "enabled",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const operatorCode = source.merchantType === "supplier" ? "supplier_quality_operator" : "factory_quality_operator";
  return {
    ...store,
    accounts: [...store.accounts, account],
    memberships: [...store.memberships, {
      id: membershipId(source.organizationId, account),
      accountId: account.id,
      organizationId: source.organizationId,
      status: "enabled",
      position: input.position,
      roleIds: [roleId(source.organizationId, operatorCode)],
      registrationAdministrator: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
  };
}

function createSeedStore(sources: readonly MerchantOrganizationSource[]): MerchantIdentityStore {
  let store: MerchantIdentityStore = { version: 1, accounts: [], memberships: [], roles: [], grants: [], grantRevisions: [] };
  for (const source of sources) store = initializeMerchantOrganization(store, source);
  const supplier = sources.find((source) => source.organizationId === SEEDED_SUPPLIER_ORGANIZATION_ID);
  if (supplier) store = addSeededOrdinaryMember(store, supplier, {
    phone: "13800138004",
    name: "周敏",
    email: "zhoumin@example.com",
    position: "质量专员",
  });
  const factory = sources.find((source) => source.organizationId === SEEDED_FACTORY_ORGANIZATION_ID);
  if (factory) store = addSeededOrdinaryMember(store, factory, {
    phone: "13800138005",
    name: "赵工",
    email: "zhaogong@example.com",
    position: "质量工程师",
  });
  return store;
}

function normalizeStore(value: unknown): MerchantIdentityStore | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<MerchantIdentityStore>;
  if (!Array.isArray(candidate.accounts) || !Array.isArray(candidate.memberships) || !Array.isArray(candidate.roles)) return undefined;
  return {
    version: 1,
    accounts: candidate.accounts,
    memberships: candidate.memberships,
    roles: candidate.roles.map((role) => ({ ...role, description: role.description ?? "" })),
    grants: Array.isArray(candidate.grants) ? candidate.grants : [],
    grantRevisions: Array.isArray(candidate.grantRevisions) ? candidate.grantRevisions : [],
  };
}

export function writeMerchantIdentityStore(store: MerchantIdentityStore): void {
  const accountPhones = store.accounts.map((account) => account.phone);
  if (new Set(accountPhones).size !== accountPhones.length) throw new Error("手机号必须对应唯一全局账号");
  if (new Set(store.roles.map((role) => role.id)).size !== store.roles.length) throw new Error("角色ID必须唯一");
  for (const grant of store.grants) {
    const applicable = permissionCodesForMerchantType(grant.merchantType);
    if (grant.permissionCodes.some((code) => !applicable.includes(code))) throw new Error("组织授权包含不适用权限");
  }
  for (const role of store.roles.filter((entry) => !entry.deletedAt)) {
    const grant = store.grants.find((entry) => entry.organizationId === role.organizationId);
    if (!grant) throw new Error("角色所属组织缺少授权上限");
    if (role.permissionCodes.some((code) => !isCanonicalPermissionCode(code) || !grant.permissionCodes.includes(code))) {
      throw new Error("角色权限超出当前组织授权上限");
    }
  }
  for (const membership of store.memberships) {
    if (!store.accounts.some((account) => account.id === membership.accountId)) throw new Error("Membership关联账号不存在");
    if (store.memberships.some((entry) => entry.id !== membership.id
      && entry.accountId === membership.accountId && entry.organizationId === membership.organizationId)) {
      throw new Error("账号已加入当前组织");
    }
    if (membership.roleIds.some((id) => !store.roles.some((role) => role.id === id && role.organizationId === membership.organizationId && !role.deletedAt))) {
      throw new Error("角色不属于当前组织");
    }
  }
  window.localStorage.setItem(MERCHANT_IDENTITY_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(MERCHANT_IDENTITY_CHANGE_EVENT));
}

export function readMerchantIdentityStore(sources: readonly MerchantOrganizationSource[]): MerchantIdentityStore {
  try {
    const raw = window.localStorage.getItem(MERCHANT_IDENTITY_STORAGE_KEY);
    let store = raw ? normalizeStore(JSON.parse(raw)) : undefined;
    if (!store) store = createSeedStore(sources);
    const hydrated = sources.reduce(initializeMerchantOrganization, store);
    if (!raw || JSON.stringify(hydrated) !== JSON.stringify(store)) writeMerchantIdentityStore(hydrated);
    return hydrated;
  } catch {
    return createSeedStore(sources);
  }
}

export function readOrganizationRoles(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
): MerchantRole[] {
  return readMerchantIdentityStore(sources).roles.filter((role) => role.organizationId === organizationId && !role.deletedAt);
}

export function readOrganizationGrant(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
): MerchantOrganizationGrant {
  const store = readMerchantIdentityStore(sources);
  const grant = store.grants.find((entry) => entry.organizationId === organizationId);
  if (!grant) throw new Error("当前组织授权上限不存在");
  return grant;
}

function validateRoleInput(input: MerchantRoleInput): void {
  const name = input.name.trim();
  if (!name || name.length > 50) throw new Error("角色名称必填，长度为1-50个字符");
  if (input.description.trim().length > 200) throw new Error("角色描述不能超过200个字符");
}

export function saveOrganizationRole(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  input: MerchantRoleInput,
  existingRoleId?: string,
): MerchantRole {
  validateRoleInput(input);
  sourceForOrganization(sources, organizationId);
  const store = readMerchantIdentityStore(sources);
  const existingRole = existingRoleId
    ? store.roles.find((role) => role.id === existingRoleId && role.organizationId === organizationId && !role.deletedAt)
    : undefined;
  if (existingRoleId && !existingRole) throw new Error("当前组织角色不存在");
  if (existingRole?.system) throw new Error("超级管理员角色不可编辑");
  const name = input.name.trim();
  if (store.roles.some((role) => role.organizationId === organizationId && !role.deletedAt && role.name === name && role.id !== existingRole?.id)) {
    throw new Error("角色名称已存在");
  }
  const now = "2026-08-27 11:00";
  const customRoleSequence = store.roles.filter((role) => role.organizationId === organizationId && role.code.startsWith("custom_")).length + 1;
  const role: MerchantRole = existingRole
    ? { ...existingRole, name, description: input.description.trim(), updatedAt: now }
    : {
        id: `merchant-role-${organizationId}-custom-${customRoleSequence}`,
        organizationId,
        code: `custom_${customRoleSequence}`,
        name,
        description: input.description.trim(),
        system: false,
        permissionCodes: [],
        createdAt: now,
        updatedAt: now,
      };
  writeMerchantIdentityStore({
    ...store,
    roles: existingRole
      ? store.roles.map((entry) => entry.id === existingRole.id ? role : entry)
      : [...store.roles, role],
  });
  return role;
}

export function saveOrganizationRolePermissions(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  roleIdValue: string,
  permissionCodes: readonly string[],
): MerchantRole {
  const store = readMerchantIdentityStore(sources);
  const role = store.roles.find((entry) => entry.id === roleIdValue && entry.organizationId === organizationId && !entry.deletedAt);
  if (!role) throw new Error("当前组织角色不存在");
  if (role.system) throw new Error("超级管理员角色权限不可修改");
  const grant = store.grants.find((entry) => entry.organizationId === organizationId);
  if (!grant) throw new Error("当前组织授权上限不存在");
  const selected = unique([...permissionCodes]).sort();
  if (selected.some((code) => !grant.permissionCodes.includes(code) || !isCanonicalPermissionCode(code))) {
    throw new Error("角色权限超出当前组织授权上限");
  }
  const updated = { ...role, permissionCodes: selected, updatedAt: "2026-08-27 11:00" };
  writeMerchantIdentityStore({
    ...store,
    roles: store.roles.map((entry) => entry.id === role.id ? updated : entry),
  });
  return updated;
}

export function deleteOrganizationRole(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  roleIdValue: string,
): void {
  const store = readMerchantIdentityStore(sources);
  const role = store.roles.find((entry) => entry.id === roleIdValue && entry.organizationId === organizationId && !entry.deletedAt);
  if (!role) throw new Error("当前组织角色不存在");
  if (role.system) throw new Error("超级管理员角色不可删除");
  if (store.memberships.some((membership) => membership.organizationId === organizationId && membership.roleIds.includes(role.id))) {
    throw new Error("角色已关联用户，不能删除");
  }
  const deleted = { ...role, deletedAt: "2026-08-27 11:00", updatedAt: "2026-08-27 11:00" };
  writeMerchantIdentityStore({
    ...store,
    roles: store.roles.map((entry) => entry.id === role.id ? deleted : entry),
  });
}

export function countOrganizationRoleMembers(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  roleIdValue: string,
): number {
  return readMerchantIdentityStore(sources).memberships.filter((membership) =>
    membership.organizationId === organizationId && membership.roleIds.includes(roleIdValue)).length;
}

export function updateOrganizationGrant(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  permissionCodes: readonly string[],
): MerchantOrganizationGrant {
  const source = sourceForOrganization(sources, organizationId);
  const applicable = permissionCodesForMerchantType(source.merchantType);
  const selected = unique([...permissionCodes]).sort();
  if (selected.some((code) => !applicable.includes(code))) throw new Error("只能授予当前商家类型适用的权限");
  const store = readMerchantIdentityStore(sources);
  const current = store.grants.find((entry) => entry.organizationId === organizationId);
  if (!current) throw new Error("当前组织授权上限不存在");
  const now = "2026-08-27 11:00";
  const removedPermissionCodes = current.permissionCodes.filter((code) => !selected.includes(code));
  const grant: MerchantOrganizationGrant = {
    ...current,
    merchantType: source.merchantType,
    permissionCodes: selected,
    revision: current.revision + 1,
    updatedAt: now,
  };
  const roles = store.roles.map((role) => {
    if (role.organizationId !== organizationId || role.deletedAt) return role;
    if (role.code === "merchant_super_admin") return { ...role, permissionCodes: selected, updatedAt: now };
    return { ...role, permissionCodes: role.permissionCodes.filter((code) => selected.includes(code)), updatedAt: now };
  });
  const revision: MerchantGrantRevision = {
    id: `merchant-grant-${organizationId}-${grant.revision}`,
    organizationId,
    revision: grant.revision,
    permissionCodes: selected,
    removedPermissionCodes,
    createdAt: now,
  };
  writeMerchantIdentityStore({
    ...store,
    roles,
    grants: store.grants.map((entry) => entry.organizationId === organizationId ? grant : entry),
    grantRevisions: [...store.grantRevisions, revision],
  });
  return grant;
}

export function readOrganizationMembers(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
): OrganizationMember[] {
  const store = readMerchantIdentityStore(sources);
  return store.memberships
    .filter((membership) => membership.organizationId === organizationId)
    .map((membership) => ({
      ...membership,
      account: store.accounts.find((account) => account.id === membership.accountId)!,
      roles: membership.roleIds.map((id) => store.roles.find((role) => role.id === id)!).filter(Boolean),
    }))
    .filter((membership) => Boolean(membership.account));
}

function validateMemberInput(input: MerchantMemberInput): void {
  if (!input.name.trim() || input.name.trim().length > 50) throw new Error("用户姓名必填，长度为1-50个字符");
  if (!/^1\d{10}$/.test(input.phone.trim())) throw new Error("手机号码必须为11位数字");
  if (input.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) throw new Error("邮箱格式错误");
  if (input.position.trim().length > 50) throw new Error("职位长度不能超过50个字符");
  if (!input.roleIds.length) throw new Error("请选择至少一个角色");
}

export function saveOrganizationMember(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  input: MerchantMemberInput,
  existingMembershipId?: string,
): OrganizationMember {
  validateMemberInput(input);
  const store = readMerchantIdentityStore(sources);
  const roles = store.roles.filter((role) => input.roleIds.includes(role.id) && !role.deletedAt);
  if (roles.length !== unique(input.roleIds).length || roles.some((role) => role.organizationId !== organizationId)) {
    throw new Error("只能分配当前组织的角色");
  }
  const existingMembership = existingMembershipId
    ? store.memberships.find((membership) => membership.id === existingMembershipId && membership.organizationId === organizationId)
    : undefined;
  if (existingMembershipId && !existingMembership) throw new Error("当前组织用户不存在");
  const phone = input.phone.trim();
  const phoneOwner = store.accounts.find((account) => account.phone === phone);
  const account = existingMembership
    ? store.accounts.find((entry) => entry.id === existingMembership.accountId)!
    : phoneOwner ?? {
        id: accountId(phone),
        phone,
        name: input.name.trim(),
        email: input.email.trim(),
        status: "enabled" as const,
        createdAt: "2026-08-27 10:00",
        updatedAt: "2026-08-27 10:00",
      };
  if (existingMembership && phoneOwner && phoneOwner.id !== account.id) throw new Error("手机号码已存在");
  const duplicateMembership = store.memberships.find((membership) =>
    membership.accountId === account.id && membership.organizationId === organizationId && membership.id !== existingMembership?.id);
  if (duplicateMembership) throw new Error("手机号已存在于当前组织");
  const now = "2026-08-27 10:00";
  const superAdminRole = store.roles.find((role) => role.organizationId === organizationId && role.code === "merchant_super_admin");
  const nextRoleIds = existingMembership?.registrationAdministrator && superAdminRole
    ? unique([...input.roleIds, superAdminRole.id])
    : unique(input.roleIds);
  const nextAccount: MerchantAccount = {
    ...account,
    phone,
    name: input.name.trim(),
    email: input.email.trim(),
    updatedAt: now,
  };
  const membership: MerchantMembership = existingMembership
    ? { ...existingMembership, position: input.position.trim(), roleIds: nextRoleIds, updatedAt: now }
    : {
        id: membershipId(organizationId, account),
        accountId: account.id,
        organizationId,
        status: "enabled",
        position: input.position.trim(),
        roleIds: nextRoleIds,
        registrationAdministrator: false,
        createdAt: now,
        updatedAt: now,
      };
  const nextStore: MerchantIdentityStore = {
    ...store,
    accounts: store.accounts.some((entry) => entry.id === account.id)
      ? store.accounts.map((entry) => entry.id === account.id ? nextAccount : entry)
      : [...store.accounts, nextAccount],
    memberships: existingMembership
      ? store.memberships.map((entry) => entry.id === existingMembership.id ? membership : entry)
      : [...store.memberships, membership],
  };
  writeMerchantIdentityStore(nextStore);
  return {
    ...membership,
    account: nextAccount,
    roles: nextRoleIds.map((id) => nextStore.roles.find((role) => role.id === id)!).filter(Boolean),
  };
}

export function setOrganizationMembershipStatus(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  membershipIdValue: string,
  status: MembershipStatus,
): MerchantMembership {
  const store = readMerchantIdentityStore(sources);
  const membership = store.memberships.find((entry) => entry.id === membershipIdValue && entry.organizationId === organizationId);
  if (!membership) throw new Error("当前组织用户不存在");
  const membershipRoles = membership.roleIds.map((id) => store.roles.find((role) => role.id === id));
  if (status === "disabled" && (membership.registrationAdministrator || membershipRoles.some((role) => role?.code === "merchant_super_admin"))) {
    throw new Error("超级管理员不可禁用");
  }
  const updated = { ...membership, status, updatedAt: "2026-08-27 10:00" };
  writeMerchantIdentityStore({
    ...store,
    memberships: store.memberships.map((entry) => entry.id === membership.id ? updated : entry),
  });
  return updated;
}

export function hasMerchantPermission(
  sources: readonly MerchantOrganizationSource[],
  organizationId: string,
  accountIdValue: string,
  permissionCode: string,
): boolean {
  const store = readMerchantIdentityStore(sources);
  const membership = store.memberships.find((entry) =>
    entry.organizationId === organizationId && entry.accountId === accountIdValue && entry.status === "enabled");
  if (!membership) return false;
  const grant = store.grants.find((entry) => entry.organizationId === organizationId);
  if (!grant?.permissionCodes.includes(permissionCode)) return false;
  return membership.roleIds.some((id) => store.roles.find((role) => role.id === id && !role.deletedAt)?.permissionCodes.includes(permissionCode));
}

export function readLastOrganization(accountIdValue: string): string | undefined {
  try {
    const raw = window.localStorage.getItem(LAST_ORGANIZATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string> : {};
    return parsed[accountIdValue];
  } catch {
    return undefined;
  }
}

export function writeLastOrganization(accountIdValue: string, organizationId: string): void {
  let preferences: Record<string, string> = {};
  try {
    const raw = window.localStorage.getItem(LAST_ORGANIZATION_STORAGE_KEY);
    preferences = raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch {
    preferences = {};
  }
  window.localStorage.setItem(LAST_ORGANIZATION_STORAGE_KEY, JSON.stringify({ ...preferences, [accountIdValue]: organizationId }));
}
