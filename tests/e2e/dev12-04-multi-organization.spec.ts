import { expect, test, type Page } from "@playwright/test";

const supplierOrganizationId = "00000000-0000-4000-8000-000000000002";
const factoryOrganizationId = "00000000-0000-4000-8000-000000000003";

async function enterFactoryAndAddSupplierMembership(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "工厂用户" }).click();
  await page.evaluate(({ supplierId }) => {
    const identityKey = "quality-platform.merchant-identities";
    const sessionKey = "quality-platform.demo-session";
    const store = JSON.parse(localStorage.getItem(identityKey) ?? "{}");
    const session = JSON.parse(localStorage.getItem(sessionKey) ?? "{}");
    const supplierRole = store.roles.find((role: { organizationId: string; code: string }) => role.organizationId === supplierId && role.code === "supplier_quality_operator");
    store.memberships.push({
      id: `merchant-membership-${supplierId}-${session.userId}`,
      accountId: session.userId,
      organizationId: supplierId,
      status: "enabled",
      position: "跨组织协同",
      roleIds: [supplierRole.id],
      registrationAdministrator: false,
      createdAt: "2026-08-28 10:00",
      updatedAt: "2026-08-28 10:00",
    });
    localStorage.setItem(identityKey, JSON.stringify(store));
  }, { supplierId: supplierOrganizationId });
}

test.describe("DEV-12-04 多组织边界", () => {
  test("Membership禁用仅阻断当前组织并允许切换", async ({ page }) => {
    await enterFactoryAndAddSupplierMembership(page);
    await page.evaluate(({ factoryId }) => {
      const key = "quality-platform.merchant-identities";
      const store = JSON.parse(localStorage.getItem(key) ?? "{}");
      const session = JSON.parse(localStorage.getItem("quality-platform.demo-session") ?? "{}");
      store.memberships = store.memberships.map((membership: { accountId: string; organizationId: string }) => membership.accountId === session.userId && membership.organizationId === factoryId ? { ...membership, status: "disabled" } : membership);
      localStorage.setItem(key, JSON.stringify(store));
    }, { factoryId: factoryOrganizationId });
    await page.goto("/app/factory");
    await expect(page.getByRole("heading", { name: "当前组织成员已禁用" })).toBeVisible();
    await page.getByRole("button", { name: "切换到远航精密供应商" }).click();
    await expect(page).toHaveURL(/\/app\/supplier$/);
    await expect(page.getByText("远航精密供应商", { exact: true }).first()).toBeVisible();
  });

  test("组织停用显示冻结页且隐藏停用组织上下文", async ({ page }) => {
    await enterFactoryAndAddSupplierMembership(page);
    await page.evaluate(({ factoryId }) => {
      const key = "quality-platform.merchant-applications";
      const applications = [
        { id: "merchant-supplier-seed", merchantType: "supplier", companyName: "远航精密供应商", administratorName: "王晨", administratorPhone: "13800138001", administratorEmail: "wangchen@example.com", reviewStatus: "approved", usageStatus: "active", createdAt: "2026-08-09 09:00", approvedAt: "2026-08-09 14:30" },
        { id: "merchant-factory-seed", merchantType: "factory", companyName: "华南智造 OEM 工厂", administratorName: "陈工", administratorPhone: "13800138002", administratorEmail: "chengong@example.com", reviewStatus: "approved", usageStatus: "inactive", createdAt: "2026-08-08 10:00", approvedAt: "2026-08-08 16:20" },
      ];
      localStorage.setItem(key, JSON.stringify(applications));
      const session = JSON.parse(localStorage.getItem("quality-platform.demo-session") ?? "{}");
      session.organizationId = factoryId;
      localStorage.setItem("quality-platform.demo-session", JSON.stringify(session));
    }, { factoryId: factoryOrganizationId });
    await page.goto("/app/factory");
    await expect(page.getByRole("heading", { name: "当前商家已冻结" })).toBeVisible();
    await page.getByRole("button", { name: "切换到远航精密供应商" }).click();
    await expect(page).toHaveURL(/\/app\/supplier$/);
  });

  test("全局账号禁用拒绝全部组织", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await page.evaluate(() => {
      const key = "quality-platform.merchant-identities";
      const store = JSON.parse(localStorage.getItem(key) ?? "{}");
      const session = JSON.parse(localStorage.getItem("quality-platform.demo-session") ?? "{}");
      store.accounts = store.accounts.map((account: { id: string }) => account.id === session.userId ? { ...account, status: "disabled" } : account);
      localStorage.setItem(key, JSON.stringify(store));
    });
    await page.goto("/app/supplier");
    await expect(page.getByRole("heading", { name: "当前账号已禁用" })).toBeVisible();
    await expect(page.getByText("暂不能访问任何组织")).toBeVisible();
  });

  test("跨组织业务记录ID不可直达", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "工厂用户" }).click();
    await page.evaluate(({ factoryId }) => {
      localStorage.setItem("quality-platform.direct-business-records", JSON.stringify([{ id: "other-factory-record", version: 1, businessNo: "PIR-OTHER", businessType: "production_inspection", status: "completed", factoryOrganizationId: `${factoryId}-other`, factoryOrganization: "其他工厂", businessDate: "2026-08-28", materialNo: "MAT-OTHER", productName: "其他产品", productModel: "OTHER", inspectionProcess: "一检", defectDetails: [], attachmentName: "", remark: "", flowRecords: [], createdAt: "2026-08-28 10:00", updatedAt: "2026-08-28 10:00" }]));
    }, { factoryId: factoryOrganizationId });
    await page.goto("/app/factory/production-inspection-daily/other-factory-record");
    await expect(page).toHaveURL(/\/app\/factory\/production-inspection-daily$/);
    await expect(page.getByRole("heading", { name: "生产检验日报", exact: true })).toBeVisible();
    await expect(page.getByText("PIR-OTHER")).toHaveCount(0);
  });

  test("供应商首页待办与业务列表使用同一业务记录", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await expect(page.getByRole("link", { name: "ME20260810001" })).toBeVisible();
    await page.goto("/app/supplier/material-exceptions");
    await expect(page.getByRole("link", { name: "ME20260810001" })).toBeVisible();
    await page.goto("/app/supplier/after-sales-exception");
    await expect(page.getByRole("link", { name: "SA20260808007" })).toBeVisible();
  });
});
