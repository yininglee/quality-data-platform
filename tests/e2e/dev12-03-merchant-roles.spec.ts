import { expect, test } from "@playwright/test";

const supplierOrganizationId = "00000000-0000-4000-8000-000000000002";
const supplierOperatorRoleId = `${supplierOrganizationId}:supplier_quality_operator`;

async function expectNoPageOverflow(page: Parameters<typeof test>[0]["page"]) {
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth);
}

test.describe("DEV-12-03 商家角色与组织授权", () => {
  test("供应商和工厂角色页面在桌面及移动视口可用", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await page.goto("/app/supplier/roles");

    await expect(page.getByRole("heading", { name: "角色管理" })).toBeVisible();
    await expect(page.getByRole("link", { name: "超级管理员" })).toBeVisible();
    await expect(page.getByRole("button", { name: "编辑" }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "删除" }).first()).toBeDisabled();
    await expectNoPageOverflow(page);
    await page.screenshot({
      path: `docs/previews/DEV-12-03-${testInfo.project.name}-supplier-roles.png`,
      fullPage: true,
    });

    await page.getByRole("link", { name: "工厂用户" }).click();
    await page.goto("/app/factory/roles");
    await expect(page.getByRole("link", { name: "工厂质量工程师" })).toBeVisible();
    await page.getByRole("link", { name: "工厂质量工程师" }).click();
    await expect(page.getByRole("heading", { name: "工厂质量工程师 · 角色权限" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "工厂管理", exact: true })).toBeChecked();
    await expectNoPageOverflow(page);
  });

  test("平台收回授权会清理角色权限并在商家权限树置灰", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "组织授权事务只需在桌面项目验证一次");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/merchants/merchant-supplier-seed");
    await page.getByRole("button", { name: "调整功能权限" }).click();
    await page.getByRole("dialog", { name: "调整功能授权" })
      .getByRole("checkbox", { name: "出货报告-导出" })
      .uncheck();
    await page.getByRole("button", { name: "保存授权" }).click();
    await expect(page.getByRole("status")).toContainText("组织功能授权已更新为 r2");
    await expect(page.getByText("23 项", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "供应商用户" }).click();
    await page.goto(`/app/supplier/roles/${supplierOperatorRoleId}/permissions`);
    const revokedPermission = page.getByRole("checkbox", { name: "出货报告-导出" });
    await expect(revokedPermission).toBeDisabled();
    await expect(revokedPermission).not.toBeChecked();
    await expect(page.getByText("未授权", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-12-03-grant-revoked.png", fullPage: true });
  });

  test("普通成员不能直达角色管理", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "角色路由守卫只需在桌面项目验证一次");
    await page.goto("/");
    await page.evaluate((organizationId) => {
      localStorage.setItem("quality-platform.demo-session", JSON.stringify({
        role: "supplier",
        organizationId,
        userId: "merchant-account-13800138004",
        status: "enabled",
        organizationName: "远航精密供应商",
        userName: "周敏",
      }));
    }, supplierOrganizationId);
    await page.goto("/app/supplier/roles");
    await expect(page.getByRole("heading", { name: "暂无角色管理权限" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "角色管理" })).toHaveCount(0);
  });

  test("撤销出货报告权限后立即限制业务入口，父节点显示半勾选", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "权限撤回链路只需在桌面项目验证一次");
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await page.evaluate((roleId) => {
      const identityKey = "quality-platform.merchant-identities";
      const shipmentPermissions = new Set([
        "merchant.home.shipment_report.read",
        "merchant.business.shipment_report.read",
        "merchant.business.shipment_report.submit",
      ]);
      const store = JSON.parse(localStorage.getItem(identityKey) ?? "{}");
      store.roles = store.roles.map((role: { id: string; permissionCodes: string[] }) => role.id === roleId
        ? { ...role, permissionCodes: role.permissionCodes.filter((code) => !shipmentPermissions.has(code)) }
        : role);
      localStorage.setItem(identityKey, JSON.stringify(store));
    }, supplierOperatorRoleId);

    await page.goto(`/app/supplier/roles/${supplierOperatorRoleId}/permissions`);
    const supplierManagement = page.getByRole("checkbox", { name: "供应商管理", exact: true });
    await expect(supplierManagement).not.toBeChecked();
    await expect(supplierManagement).toBeChecked({ indeterminate: true });
    await page.screenshot({ path: "docs/previews/DEV-12-03-shipment-revoked-indeterminate.png", fullPage: true });

    await page.evaluate((organizationId) => {
      localStorage.setItem("quality-platform.demo-session", JSON.stringify({
        role: "supplier",
        organizationId,
        userId: "merchant-account-13800138004",
        status: "enabled",
        organizationName: "远航精密供应商",
        userName: "周敏",
      }));
    }, supplierOrganizationId);
    await page.goto("/app/supplier");
    await expect(page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "出货报告" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /出货报告/ })).toHaveCount(0);

    await page.goto("/app/supplier/shipment-reports");
    await expect(page.getByRole("heading", { name: "暂无业务权限" })).toBeVisible();
    await page.goto("/app/supplier/shipment-reports/new");
    await expect(page.getByRole("heading", { name: "暂无业务权限" })).toBeVisible();
  });
});
