import { expect, test } from "@playwright/test";

test.describe("DEV-11-11 M1 收尾回归", () => {
  test("首页在桌面和移动视口保持可用且指标控件具备语义", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await expect(page.getByRole("heading", { name: "首页总览" })).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth);

    await expect(page.getByRole("combobox", { name: "统计时间" })).toHaveValue("2026");
    await expect(page.getByRole("combobox", { name: "统计组织" })).toBeVisible();
    await expect(page.getByRole("img", { name: "订单完成率趋势折线图" })).toBeVisible();
    await expect(page.getByRole("button", { name: "订单完成率趋势" })).toBeVisible();
    await expect(page.getByRole("button", { name: "年", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "月", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "日", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "月", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "统计时间" })).toHaveValue("2026-08");
    await page.getByRole("button", { name: "日", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "统计时间" })).toHaveValue("2026-08-24");
    await expect(page.getByRole("combobox", { name: "统计时间" }).locator("option")).toHaveCount(100);

    if (test.info().project.name === "mobile") {
      await page.getByRole("button", { name: "打开主导航" }).click();
      await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
      await expect(page.getByRole("button", { name: "关闭导航" })).toBeVisible();
    }
  });
});
