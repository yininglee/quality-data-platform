import { beforeEach, describe, expect, it } from "vitest";
import {
  MERCHANT_IDENTITY_STORAGE_KEY,
  deleteOrganizationRole,
  hasMerchantPermission,
  initializeMerchantOrganization,
  readLastOrganization,
  readMerchantIdentityStore,
  readOrganizationGrant,
  readOrganizationMembers,
  readOrganizationRoles,
  saveOrganizationMember,
  saveOrganizationRole,
  saveOrganizationRolePermissions,
  setOrganizationMembershipStatus,
  updateOrganizationGrant,
  writeLastOrganization,
  type MerchantIdentityStore,
  type MerchantOrganizationSource,
} from "./merchantIdentity";

const supplier: MerchantOrganizationSource = {
  id: "supplier-application",
  organizationId: "supplier-organization",
  merchantType: "supplier",
  companyName: "测试供应商",
  administratorName: "同一管理员",
  administratorPhone: "13900139101",
  administratorEmail: "admin@example.com",
  reviewStatus: "approved",
  usageStatus: "active",
  createdAt: "2026-08-27 09:00",
  approvedAt: "2026-08-27 09:30",
};

const factory: MerchantOrganizationSource = {
  ...supplier,
  id: "factory-application",
  organizationId: "factory-organization",
  merchantType: "factory",
  companyName: "测试工厂",
};

const sources = [supplier, factory];

describe("merchant identity repository", () => {
  beforeEach(() => window.localStorage.clear());

  it("initializes one global account with independent memberships and super-admin roles", () => {
    const store = readMerchantIdentityStore(sources);
    expect(store.accounts).toHaveLength(1);
    expect(store.memberships).toHaveLength(2);
    expect(store.memberships.every((membership) => membership.registrationAdministrator)).toBe(true);
    expect(store.roles.filter((role) => role.code === "merchant_super_admin")).toHaveLength(2);
    const again = sources.reduce(initializeMerchantOrganization, store);
    expect(again).toEqual(store);
    expect(JSON.parse(window.localStorage.getItem(MERCHANT_IDENTITY_STORAGE_KEY)!)).toEqual(store);
  });

  it("reuses an account across organizations while rejecting a duplicate membership", () => {
    const supplierRole = readOrganizationRoles(sources, supplier.organizationId).find((role) => role.code === "supplier_quality_operator")!;
    const factoryRole = readOrganizationRoles(sources, factory.organizationId).find((role) => role.code === "factory_quality_operator")!;
    const first = saveOrganizationMember(sources, supplier.organizationId, {
      name: "跨组织用户",
      phone: "13900139102",
      email: "member@example.com",
      position: "供应商协同",
      roleIds: [supplierRole.id],
    });
    const second = saveOrganizationMember(sources, factory.organizationId, {
      name: "跨组织用户",
      phone: "13900139102",
      email: "member@example.com",
      position: "驻厂协同",
      roleIds: [factoryRole.id],
    });
    expect(first.account.id).toBe(second.account.id);
    expect(readMerchantIdentityStore(sources).accounts.filter((account) => account.phone === "13900139102")).toHaveLength(1);
    expect(() => saveOrganizationMember(sources, supplier.organizationId, {
      name: "重复用户",
      phone: "13900139102",
      email: "",
      position: "",
      roleIds: [supplierRole.id],
    })).toThrow("手机号已存在于当前组织");
    expect(() => saveOrganizationMember(sources, supplier.organizationId, {
      name: "跨组织角色",
      phone: "13900139103",
      email: "",
      position: "",
      roleIds: [factoryRole.id],
    })).toThrow("只能分配当前组织的角色");
  });

  it("disables only the selected membership and protects super administrators", () => {
    const supplierRole = readOrganizationRoles(sources, supplier.organizationId).find((role) => role.code === "supplier_quality_operator")!;
    const factoryRole = readOrganizationRoles(sources, factory.organizationId).find((role) => role.code === "factory_quality_operator")!;
    const first = saveOrganizationMember(sources, supplier.organizationId, { name: "双组织用户", phone: "13900139104", email: "", position: "A", roleIds: [supplierRole.id] });
    saveOrganizationMember(sources, factory.organizationId, { name: "双组织用户", phone: "13900139104", email: "", position: "B", roleIds: [factoryRole.id] });
    setOrganizationMembershipStatus(sources, supplier.organizationId, first.id, "disabled");
    expect(readOrganizationMembers(sources, supplier.organizationId).find((member) => member.account.phone === "13900139104")?.status).toBe("disabled");
    expect(readOrganizationMembers(sources, factory.organizationId).find((member) => member.account.phone === "13900139104")?.status).toBe("enabled");
    const administrator = readOrganizationMembers(sources, supplier.organizationId).find((member) => member.registrationAdministrator)!;
    expect(() => setOrganizationMembershipStatus(sources, supplier.organizationId, administrator.id, "disabled")).toThrow("超级管理员不可禁用");
  });

  it("keeps ordinary roles out of user management and persists last organization per account", () => {
    const role = readOrganizationRoles(sources, supplier.organizationId).find((entry) => entry.code === "supplier_quality_operator")!;
    const member = saveOrganizationMember(sources, supplier.organizationId, { name: "普通用户", phone: "13900139105", email: "", position: "质量专员", roleIds: [role.id] });
    expect(hasMerchantPermission(sources, supplier.organizationId, member.account.id, "merchant.admin.user.read")).toBe(false);
    const administrator = readOrganizationMembers(sources, supplier.organizationId).find((entry) => entry.registrationAdministrator)!;
    expect(hasMerchantPermission(sources, supplier.organizationId, administrator.account.id, "merchant.admin.user.read")).toBe(true);
    writeLastOrganization(member.account.id, supplier.organizationId);
    expect(readLastOrganization(member.account.id)).toBe(supplier.organizationId);
  });

  it("preserves future custom roles when built-in roles are synchronized", () => {
    const initial = readMerchantIdentityStore([supplier]);
    const customStore: MerchantIdentityStore = {
      ...initial,
      roles: [...initial.roles, {
        id: "custom-role",
        organizationId: supplier.organizationId,
        code: "supplier_quality_operator",
        name: "自定义只读角色",
        system: false,
        permissionCodes: ["merchant.business.shipment_report.read"],
        createdAt: "2026-08-27 10:00",
        updatedAt: "2026-08-27 10:00",
      }],
    };
    expect(initializeMerchantOrganization(customStore, supplier).roles.some((role) => role.id === "custom-role")).toBe(true);
  });

  it("creates organization roles and only saves granted canonical leaf permissions", () => {
    const role = saveOrganizationRole(sources, supplier.organizationId, {
      name: "供应商只读角色",
      description: "仅查看出货报告",
    });
    const saved = saveOrganizationRolePermissions(sources, supplier.organizationId, role.id, [
      "merchant.business.shipment_report.read",
    ]);
    expect(saved.permissionCodes).toEqual(["merchant.business.shipment_report.read"]);
    expect(() => saveOrganizationRolePermissions(sources, supplier.organizationId, role.id, ["merchant.business.incoming_inspection.read"]))
      .toThrow("角色权限超出当前组织授权上限");
    expect(() => saveOrganizationRole(sources, supplier.organizationId, { name: "供应商只读角色", description: "重名" }))
      .toThrow("角色名称已存在");
  });

  it("cleans role permissions and synchronizes super administrator when a grant is revoked", () => {
    const role = saveOrganizationRole(sources, supplier.organizationId, { name: "临时管理员", description: "用于授权收回测试" });
    saveOrganizationRolePermissions(sources, supplier.organizationId, role.id, [
      "merchant.admin.role.read",
      "merchant.admin.role.update",
      "merchant.business.shipment_report.read",
    ]);
    const grant = readOrganizationGrant(sources, supplier.organizationId);
    const updatedGrant = updateOrganizationGrant(
      sources,
      supplier.organizationId,
      grant.permissionCodes.filter((code) => code !== "merchant.admin.role.update"),
    );
    const store = readMerchantIdentityStore(sources);
    const updatedRole = store.roles.find((entry) => entry.id === role.id)!;
    const superAdmin = store.roles.find((entry) => entry.organizationId === supplier.organizationId && entry.code === "merchant_super_admin")!;
    expect(updatedGrant.revision).toBe(2);
    expect(updatedRole.permissionCodes).not.toContain("merchant.admin.role.update");
    expect(superAdmin.permissionCodes).toEqual(updatedGrant.permissionCodes);
    expect(store.grantRevisions.at(-1)).toEqual(expect.objectContaining({ removedPermissionCodes: ["merchant.admin.role.update"] }));
  });

  it("soft deletes unassigned custom roles and protects linked or system roles", () => {
    const unassigned = saveOrganizationRole(sources, supplier.organizationId, { name: "待删除角色", description: "无成员关联" });
    deleteOrganizationRole(sources, supplier.organizationId, unassigned.id);
    expect(readOrganizationRoles(sources, supplier.organizationId).some((role) => role.id === unassigned.id)).toBe(false);

    const linked = saveOrganizationRole(sources, supplier.organizationId, { name: "有关联角色", description: "不可删除" });
    saveOrganizationMember(sources, supplier.organizationId, {
      name: "关联成员",
      phone: "13900139106",
      email: "",
      position: "测试",
      roleIds: [linked.id],
    });
    expect(() => deleteOrganizationRole(sources, supplier.organizationId, linked.id)).toThrow("角色已关联用户，不能删除");
    const superAdmin = readOrganizationRoles(sources, supplier.organizationId).find((role) => role.code === "merchant_super_admin")!;
    expect(() => deleteOrganizationRole(sources, supplier.organizationId, superAdmin.id)).toThrow("超级管理员角色不可删除");
  });
});
