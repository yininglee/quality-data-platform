import { expect, test } from "@playwright/test";

test.describe("DEV-00-03 application shell baseline", () => {
  test("login and role entry are reachable", async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
    await expect(page.getByRole("button", { name: "平台管理员" })).toBeVisible();
    await expect(page.getByRole("button", { name: "供应商用户" })).toBeVisible();
    await expect(page.getByRole("button", { name: "工厂用户" })).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport.width);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport.width);

    await page.screenshot({
      path: `docs/previews/DEV-00-03-${testInfo.project.name}-login.png`,
      fullPage: true,
    });

    await page.getByRole("button", { name: "工厂用户" }).click();
    await expect(page).toHaveURL(/\/app\/factory$/);
    await expect(page.getByRole("heading", { name: "工厂工作台" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("homepage shipment entry points follow the formal navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "homepage navigation check runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await expect(page.getByRole("heading", { name: "首页总览" })).toBeVisible();
    await expect(page.getByText("出货报告待审核", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "进入审核", exact: true })).toHaveCount(0);
    await page.screenshot({ path: "docs/previews/DEV-10-02-platform-home-no-shipment-shortcut.png", fullPage: true });

    await page.getByRole("button", { name: /示例质量运营中心/ }).click();
    await page.getByRole("menuitem", { name: /供应商用户/ }).click();
    await expect(page.getByRole("heading", { name: "供应商工作台" })).toBeVisible();
    await expect(page.getByRole("link", { name: "查看出货报告", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "出货报告", exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-02-supplier-home-no-shipment-shortcut.png", fullPage: true });
  });

  test("merchant registers, is rejected, registers again and logs in after approval", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "merchant onboarding runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: /申请商家入驻/ }).click();
    await page.getByLabel("公司名称").fill("新锐电子供应商");
    await page.getByLabel("统一社会信用代码").fill("91440300MA5NEW0001");
    await page.getByLabel("管理员姓名").fill("赵敏");
    await page.getByLabel("管理员手机号码").fill("13900139001");
    await page.getByLabel("管理员邮箱").fill("zhaomin@example.com");
    await page.screenshot({ path: "docs/previews/DEV-11-01-merchant-register.png", fullPage: true });
    await page.getByRole("button", { name: "提交注册" }).click();
    await expect(page.getByRole("status")).toContainText("注册申请已提交，请等待平台审核");

    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/todos");
    await expect(page.getByRole("tab", { name: "商家注册(1)" })).toBeVisible();
    await page.getByRole("link", { name: /商家注册待审核-新锐电子供应商/ }).click();
    await expect(page).toHaveURL(/\/app\/platform\/merchant-audits\?application=/);
    await expect(page.getByRole("dialog", { name: "商家详情" })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-01-merchant-audit-dialog.png", fullPage: true });
    await page.getByRole("button", { name: "关闭商家详情" }).click();
    await page.screenshot({ path: "docs/previews/DEV-11-01-merchant-audit-list.png", fullPage: true });
    await page.getByRole("row", { name: /新锐电子供应商/ }).getByRole("button", { name: "查看" }).click();
    await page.getByRole("button", { name: "审核" }).click();
    await page.getByRole("radio", { name: "审核驳回" }).check();
    await page.getByLabel("驳回原因").fill("请核对统一社会信用代码扫描件信息");
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByRole("dialog", { name: "商家详情" }).getByText("已驳回", { exact: true })).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: /申请商家入驻/ }).click();
    await expect(page.getByLabel("公司名称")).toHaveValue("");
    await page.getByLabel("公司名称").fill("新锐电子科技供应商");
    await page.getByLabel("统一社会信用代码").fill("91440300MA5NEW0001");
    await page.getByLabel("管理员姓名").fill("赵敏");
    await page.getByLabel("管理员手机号码").fill("13900139001");
    await page.getByLabel("管理员邮箱").fill("zhaomin@example.com");
    await page.getByRole("button", { name: "提交注册" }).click();
    await expect(page.getByRole("status")).toContainText("注册申请已提交");

    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/todos");
    await page.getByRole("link", { name: /商家注册待审核-新锐电子科技供应商/ }).click();
    await expect(page.getByRole("dialog", { name: "商家详情" })).toBeVisible();
    await page.getByRole("button", { name: "审核" }).click();
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByRole("dialog", { name: "商家详情" })).toContainText("已通过");
    await page.goto("/app/platform/merchants");
    await expect(page.getByText("新锐电子科技供应商", { exact: true })).toBeVisible();
    await expect(page.getByText("新锐电子供应商", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: "docs/previews/DEV-11-01-merchant-management.png", fullPage: true });
    await page.goto("/");
    await page.getByRole("tab", { name: "验证码登录" }).click();
    await page.getByLabel("手机号").fill("13900139001");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByRole("alert")).toHaveText("请输入验证码");
    await page.getByRole("button", { name: "获取验证码" }).click();
    await expect(page.getByRole("status", { name: "模拟短信验证码" })).toContainText("246810");
    await page.screenshot({ path: "docs/previews/DEV-11-01-demo-sms-code.png", fullPage: true });
    await page.getByRole("textbox", { name: "验证码" }).fill("246810");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByRole("heading", { name: "供应商工作台" })).toBeVisible();
    await expect(page.getByRole("button", { name: /新锐电子科技供应商/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "全部(0)" })).toBeVisible();
    await expect(page.getByRole("region", { name: "供应商待办统计" })).toContainText("待处理任务0本月已完成0平均处理时效—");
    await expect(page.getByText("远航精密供应商", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: "docs/previews/DEV-11-01-new-merchant-empty-home.png", fullPage: true });
  });

  test("a fresh guest registration never inherits a previous rejected application", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "guest isolation runs once at desktop size");
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: "stale-rejected-application", version: 1, merchantNo: "MC-STALE", merchantType: "supplier", companyName: "历史被驳回商家", creditCode: "91440300MA5STALE01", administratorName: "历史用户", administratorPhone: "13900139999", administratorEmail: "stale@example.com", reviewStatus: "rejected", usageStatus: null, reviewReason: "历史驳回", flowRecords: [{ id: "stale-flow", kind: "review_rejected", action: "平台审核驳回", time: "2026-08-01 10:00", operator: "平台管理员", organization: "平台" }], createdAt: "2026-08-01 09:00", updatedAt: "2026-08-01 10:00" }]));
    });
    await page.getByRole("button", { name: /申请商家入驻/ }).click();
    await expect(page).toHaveURL(/\/merchant\/register$/);
    await expect(page.getByRole("heading", { name: "申请商家入驻" })).toBeVisible();
    await expect(page.getByLabel("公司名称")).toHaveValue("");
    await expect(page.getByText("历史被驳回商家", { exact: true })).toHaveCount(0);
    await page.goto("/merchant/register/progress");
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("merchant disable guard, freeze and multi-organization switching work", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "merchant lifecycle runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/merchants/merchant-supplier-seed");
    await page.getByRole("button", { name: "停用" }).click();
    await page.getByRole("button", { name: "确定停用" }).click();
    await expect(page.getByRole("alert")).toContainText("待处理任务");

    await page.goto("/app/platform/merchants/merchant-multi-org-seed");
    await page.getByRole("button", { name: "停用" }).click();
    await page.getByRole("button", { name: "确定停用" }).click();
    await expect(page.locator(".status.cancelled").filter({ hasText: "已停用" })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-01-merchant-disabled.png", fullPage: true });

    await page.evaluate(() => window.localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "factory", organizationId: "merchant-multi-org-seed", userId: "00000000-0000-4000-8000-000000000103", status: "enabled", organizationName: "星海电子 OEM 工厂", userName: "王晨" })));
    await page.goto("/app/factory");
    await expect(page.getByRole("heading", { name: "当前商家已冻结" })).toBeVisible();

    await page.evaluate(() => window.localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "platform", organizationId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000101", status: "enabled" })));
    await page.goto("/app/platform/merchants/merchant-multi-org-seed");
    await page.getByRole("button", { name: "启用" }).click();
    await expect(page.locator(".status.approved").filter({ hasText: "正常" })).toBeVisible();
    await page.getByRole("button", { name: /示例质量运营中心/ }).click();
    await page.getByRole("menuitem", { name: /供应商用户/ }).click();
    await page.getByRole("button", { name: /远航精密供应商/ }).click();
    await page.getByRole("menuitem", { name: "星海电子 OEM 工厂" }).click();
    const switchDialog = page.getByRole("dialog", { name: "切换组织" });
    await expect(switchDialog).toContainText("星海电子 OEM 工厂");
    await page.screenshot({ path: "docs/previews/DEV-11-01-organization-switch.png", fullPage: true });
    await switchDialog.getByRole("button", { name: "确认切换" }).click();
    await expect(page.getByRole("heading", { name: "工厂工作台" })).toBeVisible();
    await expect(page.getByRole("button", { name: /星海电子 OEM 工厂/ })).toBeVisible();
  });

  test("a newly approved organization can be disabled when its own work count is zero", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "organization-scoped disable guard runs once at desktop size");
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: "approved-empty-supplier", version: 1, merchantNo: "MC-EMPTY", merchantType: "supplier", companyName: "空数据供应商", creditCode: "91440300MA5EMPTY001", administratorName: "空数据用户", administratorPhone: "13900139032", administratorEmail: "empty@example.com", reviewStatus: "approved", usageStatus: "active", flowRecords: [], createdAt: "2026-08-13 14:00", updatedAt: "2026-08-13 15:00" }]));
      localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "platform", organizationId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000101", status: "enabled" }));
    });
    await page.goto("/app/platform/merchants/approved-empty-supplier");
    await page.getByRole("button", { name: "停用" }).click();
    await page.getByRole("button", { name: "确定停用" }).click();
    await expect(page.getByRole("status")).toHaveText("商家已停用");
    await expect(page.locator(".status.cancelled").filter({ hasText: "已停用" })).toBeVisible();
    await expect(page.getByText(/该商家有 .*待处理任务/)).toHaveCount(0);
    await page.screenshot({ path: "docs/previews/DEV-11-01-empty-merchant-disabled.png", fullPage: true });
  });

  test("supplier home todo center filters by business and opens task detail", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "supplier todo center runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await expect(page.getByRole("heading", { name: "供应商工作台" })).toBeVisible();
    await expect(page.getByRole("region", { name: "供应商待办统计" }).getByText("3")).toBeVisible();
    await expect(page.getByRole("tab", { name: "出货报告(1)" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "物料异常(1)" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "售后异常(1)" })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-03-supplier-home-todos.png", fullPage: true });
    await page.getByRole("tab", { name: "物料异常(1)" }).click();
    await expect(page.getByRole("link", { name: "ME20260810001" })).toBeVisible();
    await expect(page.getByRole("link", { name: "SA20260808007" })).toHaveCount(0);
    await page.getByRole("link", { name: "ME20260810001" }).click();
    await expect(page).toHaveURL(/\/app\/supplier\/todos\/supplier-todo-me-20260810001$/);
    await expect(page.getByRole("heading", { name: "任务信息" })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-03-supplier-todo-detail.png", fullPage: true });
  });

  test("factory home shows rejected-business todo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "factory todo center runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "工厂用户" }).click();
    await expect(page.getByRole("heading", { name: "工厂工作台" })).toBeVisible();
    await expect(page.getByText("来料检验重新提报")).toBeVisible();
    await page.getByRole("link", { name: "IQC202608090001" }).click();
    await expect(page).toHaveURL(/\/app\/factory\/incoming-inspections\/incoming-inspection-rejected-001\/edit$/);
    await expect(page.getByRole("heading", { name: "修改并重新提报来料检验" })).toBeVisible();
  });

  test("incoming inspection review, resubmission and material exception trigger form a closed loop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "incoming inspection workflow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "工厂用户" }).click();
    await page.goto("/app/factory/incoming-inspections/incoming-inspection-rejected-001/edit");
    await expect(page.getByRole("heading", { name: "修改并重新提报来料检验" })).toBeVisible();
    await page.getByLabel("来料检验附件").setInputFiles({ name: "iqc-evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("demo incoming inspection attachment") });
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("待审核", { exact: true })).toBeVisible();

    await page.evaluate(() => localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "platform", organizationId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000101", status: "enabled" })));
    await page.goto("/app/platform/todos");
    await expect(page.getByRole("tab", { name: /来料检验\(/ })).toBeVisible();
    await page.getByRole("link", { name: /来料检验待审核-IQC202608090001/ }).click();
    await page.getByRole("button", { name: "审核" }).click();
    await page.getByLabel("处理方式").fill("挑选使用，不良品退回供应商");
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-02-platform-iqc-review.png", fullPage: true });

    await page.evaluate(() => localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "factory", organizationId: "00000000-0000-4000-8000-000000000003", userId: "00000000-0000-4000-8000-000000000103", status: "enabled" })));
    await page.goto("/app/factory/incoming-inspections/incoming-inspection-rejected-001");
    await page.getByRole("button", { name: "手动触发物料异常" }).click();
    await expect(page.getByRole("status")).toContainText("已生成并进入平台待办");
    const materialLink = page.getByRole("link", { name: /^ME20260813/ });
    await expect(materialLink).toBeVisible();
    await materialLink.click();
    await expect(page.getByText("IQC202608090001", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-02-triggered-material-exception.png", fullPage: true });
  });

  test("direct-completion business flows are available for production inspection, maintenance and IPQC", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "direct-completion business workflow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "工厂用户" }).click();
    await page.goto("/app/factory/production-inspection-daily/new");
    await page.getByLabel("物料料号").fill("MAT-E2E-001");
    await page.getByLabel("产品名称").fill("E2E产品");
    await page.getByLabel("产品型号").fill("E2E-01");
    await page.getByLabel("订单号").fill("PO-E2E-001");
    await page.getByLabel("订单数量").fill("100");
    await page.getByLabel("投入数量").fill("100");
    await page.getByLabel("检验数量").fill("20");
    await page.getByRole("button", { name: "+ 新增不良项" }).click();
    await page.getByLabel("不良项第1项").fill("E2E端子压接不良");
    await page.getByLabel("不良数量第1项").fill("1");
    await expect(page.getByLabel("不良数量", { exact: true })).toHaveValue("1");
    await expect(page.getByLabel("不良数量", { exact: true })).toHaveAttribute("readonly", "");
    await page.getByRole("button", { name: "提交并归档" }).click();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "审核" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "新增维修记录" }).click();
    await expect(page.getByLabel("来源生产检验日报第1项")).not.toHaveValue("");
    await page.getByLabel("维修不良项第1项").selectOption({ index: 1 });
    await page.getByLabel("维修数量第1项").fill("1");
    await page.getByLabel("不良原因第1项").fill("治具偏移");
    await page.getByLabel("维修方法第1项").fill("校正治具后返修");
    await page.getByLabel("维修人第1项").fill("陈工");
    await page.getByRole("button", { name: "提交并归档" }).click();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^PIR/ })).toBeVisible();

    await page.goto("/app/factory/ipqc-patrol/new");
    await page.getByLabel("班组/线体").fill("SMT-03线");
    await page.getByLabel("问题提出者").fill("陈工");
    await page.getByLabel("责任部门").fill("生产部");
    await page.getByLabel("问题定位").fill("首站");
    await page.getByLabel("质量跟进人").fill("赵敏");
    await page.getByLabel("巡线事项描述").fill("E2E巡线问题");
    await page.getByRole("button", { name: "提交并归档" }).click();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-03-ipqc-detail.png", fullPage: true });
    await page.evaluate(() => localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "platform", organizationId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000101", status: "enabled" })));
    await page.goto("/app/platform/business/production-inspection-daily");
    await expect(page.getByRole("heading", { name: "生产检验日报", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /新增/ })).toHaveCount(0);
  });

  test("audited warehouse, sporadic return, trial summary and after-sales flows are available", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "extended DEV-11 workflow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/business/warehouse-in-report");
    await page.getByRole("link", { name: "IR202608130002" }).click();
    await page.getByRole("button", { name: "审核" }).click();
    await page.getByRole("button", { name: "确认提交" }).click();
    await expect(page.getByText("已通过", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-05-warehouse-in-approved.png", fullPage: true });

    await page.evaluate(() => localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "factory", organizationId: "00000000-0000-4000-8000-000000000003", userId: "00000000-0000-4000-8000-000000000103", status: "enabled" })));
    await page.goto("/app/factory/sporadic-return/audited-return-seed-001");
    await page.getByRole("button", { name: "填写退料信息" }).click();
    await expect(page.getByRole("dialog", { name: "填写退料信息" })).toBeVisible();
    await page.getByLabel("退料快递单号").fill("SF-E2E-RETURN-001");
    await page.getByLabel("退料时间").fill("2026-08-20T09:30");
    await page.getByRole("button", { name: "确认提交" }).click();
    await expect(page.getByText("待补回", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "填写补回信息" }).click();
    await expect(page.getByRole("dialog", { name: "填写补回信息" })).toBeVisible();
    await page.getByLabel("物料补回时间").fill("2026-08-21T14:10");
    await page.getByRole("button", { name: "确认提交" }).click();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-04-sporadic-return-completed.png", fullPage: true });

    await page.goto("/app/factory/warehouse-in-report/new");
    await page.getByLabel("物料料号").fill("MAT-INBOUND-E2E");
    await page.getByLabel("订单号").fill("PO-INBOUND-E2E");
    await page.getByLabel("订单数量").fill("100");
    await page.getByLabel("入库数量").fill("95");
    await page.getByLabel("入库合格类型").selectOption("unqualified");
    await page.getByRole("button", { name: "提交" }).click();
    await expect(page.getByText("已完成", { exact: true })).toBeVisible();

    await page.goto("/app/factory/trial-production-summary/new");
    await page.getByLabel("物料料号").fill("MAT-TRIAL-E2E");
    await page.getByLabel("产品名称").fill("E2E试产产品");
    await page.getByLabel("订单号").fill("PO-TRIAL-E2E");
    await page.getByLabel("试产信息").fill("试产总结与问题闭环");
    await page.getByRole("button", { name: "提交" }).click();
    await expect(page.getByText("待审核", { exact: true })).toBeVisible();

    await page.evaluate(() => localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "supplier", organizationId: "00000000-0000-4000-8000-000000000002", userId: "00000000-0000-4000-8000-000000000102", status: "enabled" })));
    await page.goto("/app/supplier/after-sales-exception/after-sales-seed-001");
    await page.getByRole("button", { name: "提交8D报告" }).click();
    await page.getByLabel("售后异常8D附件").setInputFiles({ name: "after-sales-8d.pdf", mimeType: "application/pdf", buffer: Buffer.from("demo after sales 8d") });
    await page.getByRole("dialog").getByRole("button", { name: "提交8D报告" }).click();
    await expect(page.getByText("待审核8D", { exact: true })).toBeVisible();

    await page.evaluate(() => localStorage.setItem("quality-platform.demo-session", JSON.stringify({ role: "platform", organizationId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000101", status: "enabled" })));
    await page.goto("/app/platform/business/after-sales-exception/after-sales-seed-001");
    await page.getByRole("button", { name: "审核8D" }).click();
    await page.getByRole("button", { name: "确认提交" }).click();
    await expect(page.getByText("已通过", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-11-06-after-sales-approved.png", fullPage: true });
  });

  test("factory material exception flows through platform assignment and supplier 8D", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "material exception workflow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "工厂用户" }).click();
    await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "物料异常", exact: true }).click();
    await page.getByRole("link", { name: "ME202608121030001" }).click();
    await expect(page.getByText("待平台审核", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /华南智造 OEM 工厂/ }).click();
    await page.getByRole("menuitem", { name: /平台管理员/ }).click();
    await page.goto("/app/platform/todos");
    await expect(page.getByRole("tab", { name: "物料异常(1)" })).toBeVisible();
    await page.getByRole("link", { name: /物料异常待审核-ME202608121030001/ }).click();
    await page.getByRole("button", { name: "审核", exact: true }).click();
    await page.getByRole("combobox", { name: "分配供应商" }).selectOption({ label: "远航精密供应商" });
    await page.getByRole("button", { name: "确认提交" }).click();
    await expect(page.getByText("待供应商处理", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /示例质量运营中心/ }).click();
    await page.getByRole("menuitem", { name: /供应商用户/ }).click();
    await page.goto("/app/supplier");
    await expect(page.getByRole("link", { name: "ME202608121030001" })).toBeVisible();
    await page.getByRole("link", { name: "ME202608121030001" }).click();
    await page.getByRole("button", { name: "提交8D报告" }).first().click();
    await page.getByLabel("8D附件").setInputFiles({ name: "8D报告_ME202608121030001.pdf", mimeType: "application/pdf", buffer: Buffer.from("demo 8d report") });
    await page.getByRole("dialog", { name: "提交8D报告" }).getByRole("button", { name: "提交8D报告" }).click();
    await expect(page.getByText("待平台审核8D", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /远航精密供应商/ }).click();
    await page.getByRole("menuitem", { name: /平台管理员/ }).click();
    await page.goto("/app/platform/todos");
    await page.getByRole("link", { name: /物料异常8D待审核-ME202608121030001/ }).click();
    await page.getByRole("button", { name: "审核8D" }).click();
    await page.getByRole("button", { name: "确认提交" }).click();
    await expect(page.getByText("已通过", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "下载 8D报告_ME202608121030001.pdf" })).toBeVisible();
  });

  test("rejected material exception returns to the factory for attachment upload and resubmission", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "material rejection workflow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/business/material-exceptions/material-exception-seed-001");
    await page.getByRole("button", { name: "审核", exact: true }).click();
    await page.getByRole("radio", { name: "驳回" }).check();
    await page.getByLabel("审核意见").fill("请补充现场附件后重新提报");
    await page.getByRole("button", { name: "确认提交" }).click();
    await page.getByRole("button", { name: /示例质量运营中心/ }).click();
    await page.getByRole("menuitem", { name: /工厂用户/ }).click();
    await page.goto("/app/factory");
    const todo = page.getByRole("link", { name: "ME202608121030001" });
    await expect(todo).toHaveAttribute("href", "/app/factory/material-exceptions/material-exception-seed-001/edit");
    await todo.click();
    await expect(page.getByRole("heading", { name: "修改并重新提报物料异常" })).toBeVisible();
    await page.getByLabel("物料异常附件").setInputFiles({ name: "异常现场照片.png", mimeType: "image/png", buffer: Buffer.from("demo image") });
    await expect(page.getByText("异常现场照片.png")).toBeVisible();
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("待平台审核", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "下载 异常现场照片.png" })).toBeVisible();
    await page.getByRole("button", { name: /华南智造 OEM 工厂/ }).click();
    await page.getByRole("menuitem", { name: /平台管理员/ }).click();
    await page.goto("/app/platform/todos");
    await expect(page.getByRole("link", { name: /物料异常待审核-ME202608121030001/ })).toBeVisible();
  });

  test("platform shipment list keeps headers and row values aligned", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "shipment list field mapping runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/business/shipment-reports");
    const seedRow = page.getByRole("link", { name: "SR202608110001" }).locator("xpath=ancestor::tr");
    await expect(seedRow.locator("td")).toHaveText([
      "SR202608110001",
      "远航精密供应商",
      "USB-C连接器",
      "MAT-USB-C-001",
      "3,000",
      "2026-08-10",
      "待审核",
      "查看详情",
    ]);
    await page.screenshot({ path: "docs/previews/DEV-10-03-platform-shipment-list-fields.png", fullPage: true });
  });

  test("unified list states and material cancellation are observable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "DEV-10-05 feedback preview runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/business/shipment-reports?demoState=loading");
    await expect(page.getByRole("status", { name: "数据加载中" })).toBeVisible();
    await page.goto("/app/platform/business/shipment-reports?demoState=empty");
    await expect(page.getByText("暂无数据", { exact: true })).toBeVisible();
    await page.goto("/app/platform/business/shipment-reports?demoState=error");
    await expect(page.getByText("数据加载失败，请刷新重试", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-05-page-states.png", fullPage: true });

    await page.goto("/app/platform/business/material-exceptions/material-exception-seed-001");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "取消物料异常" });
    await dialog.getByRole("button", { name: "确认取消" }).click();
    await expect(dialog).toBeVisible();
    await page.getByLabel("取消原因").fill("演示取消原因：异常记录重复提报");
    await page.screenshot({ path: "docs/previews/DEV-10-05-material-cancel-dialog.png", fullPage: true });
    await dialog.getByRole("button", { name: "确认取消" }).click();
    await expect(page.getByText("物料异常已取消", { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "业务流程记录" }).getByText("演示取消原因：异常记录重复提报", { exact: true })).toBeVisible();
  });

  test("a stale shipment review cannot overwrite a newer decision", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "optimistic locking runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    const stalePage = await context.newPage();
    const detailUrl = "/app/platform/business/shipment-reports/00000000-0000-4000-8000-000000000501";
    await page.goto(detailUrl);
    await stalePage.goto(detailUrl);
    await stalePage.getByRole("button", { name: "审核", exact: true }).click();

    await page.getByRole("button", { name: "审核", exact: true }).click();
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("已通过", { exact: true })).toBeVisible();

    await stalePage.getByLabel("审核驳回").check();
    await stalePage.getByLabel("驳回原因").fill("旧页面尝试覆盖最新审核结果");
    await stalePage.getByRole("button", { name: "提交审核" }).click();
    await expect(stalePage.getByRole("alert")).toContainText("该单据已被处理，请刷新后查看最新状态");
    await expect(stalePage.getByText("已驳回", { exact: true })).toHaveCount(0);
    await stalePage.screenshot({ path: "docs/previews/DEV-10-05-optimistic-lock.png", fullPage: true });
    await stalePage.getByRole("button", { name: "刷新数据" }).click();
    await expect(stalePage.getByText("已通过", { exact: true })).toBeVisible();
  });

  test("platform todo center tracks pending shipment reviews", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "todo workflow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "待办任务", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/platform\/todos$/);
    await expect(page.getByRole("heading", { name: "待办任务中心" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "出货报告(1)" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "物料异常(1)" })).toBeVisible();
    await expect(page.getByRole("article").filter({ hasText: "待办任务" }).getByRole("strong")).toContainText("3");
    await page.screenshot({ path: "docs/previews/DEV-10-03-platform-todos.png", fullPage: true });

    await page.getByRole("link", { name: /出货报告待审核-SR202608110001/ }).click();
    await expect(page.getByRole("heading", { name: /SR202608110001 · 出货报告/ })).toBeVisible();
    await page.getByRole("button", { name: "审核", exact: true }).click();
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("已通过", { exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "待办任务", exact: true }).click();
    await expect(page.getByRole("tab", { name: "物料异常(1)" })).toBeVisible();
    await expect(page.getByRole("article").filter({ hasText: "待办任务" }).getByRole("strong")).toContainText("2");
    await page.reload();
    await expect(page.getByRole("tab", { name: "物料异常(1)" })).toBeVisible();
  });

  test("mobile navigation opens without covering the page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-specific check");
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/app/platform");
    await expect(page.getByRole("heading", { name: "首页总览" })).toBeVisible();
    await expect(page.getByText("出货报告待审核", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "进入审核", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "打开主导航" }).click();
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
    await page.waitForTimeout(500);
    const sidebar = await page.locator(".sidebar").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    });
    expect(Math.abs(sidebar.x)).toBeLessThanOrEqual(1);
    expect(sidebar.width).toBeGreaterThanOrEqual(220);
    await page.screenshot({
      path: `docs/previews/DEV-00-03-${testInfo.project.name}-nav.png`,
      fullPage: true,
    });
    expect(consoleErrors).toEqual([]);
  });

  test("session context survives refresh and blocks a mismatched role route", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "boundary flow runs once at desktop size");

    await page.goto("/");
    await page.getByRole("button", { name: "工厂用户" }).click();
    await expect(page).toHaveURL(/\/app\/factory$/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "工厂工作台" })).toBeVisible();

    await page.getByRole("button", { name: /华南智造 OEM 工厂/ }).click();
    await expect(page.getByRole("menu", { name: "切换演示身份" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /工厂用户/ })).toBeVisible();

    await page.goto("/app/platform");
    await expect(page.getByRole("heading", { name: "暂无访问权限" })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-01-permission-denied.png", fullPage: true });

    await page.goto("/app/frozen");
    await expect(page.getByRole("heading", { name: "当前商家已冻结" })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-01-frozen.png", fullPage: true });
  });

  test("supplier submits, platform rejects, supplier resubmits, platform approves", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "business flow runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await page.goto("/app/supplier/shipment-reports/new");
    await expect(page.getByRole("heading", { name: "新增出货报告" })).toBeVisible();
    await expect(page.getByRole("button", { name: "返回列表" })).toBeVisible();
    await expect(page.locator(".form-section-card")).toHaveCount(4);
    await expect(page.getByText("点击或拖拽文件到此区域上传")).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-form-ued.png", fullPage: true });
    await page.getByLabel("物料料号").fill("MAT-DEMO-002");
    await page.getByLabel("物料名称").fill("演示电源模块");
    await page.getByLabel("物料型号").fill("PWR-02");
    await page.getByLabel("订单号").fill("PO-DEMO-002");
    await page.getByLabel("订单数量").fill("1200");
    await page.getByLabel("出货数量").fill("800");
    await page.getByLabel("出货报告附件").setInputFiles({ name: "出货检验报告_DEMO.pdf", mimeType: "application/pdf", buffer: Buffer.from("demo shipment report") });
    await expect(page.getByText("出货检验报告_DEMO.pdf")).toBeVisible();
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page).toHaveURL(/\/app\/supplier\/shipment-reports\/shipment-/);
    const reportUrl = page.url();
    const reportId = reportUrl.split("/").pop() ?? "";
    const businessNo = (await page.getByRole("heading", { level: 1 }).innerText()).split(" · ")[0];
    await expect(page.getByText("待审核", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "下载 出货检验报告_DEMO.pdf" })).toBeVisible();

    await page.getByRole("button", { name: /远航精密供应商/ }).click();
    await page.getByRole("menuitem", { name: /平台管理员/ }).click();
    await page.goto("/app/platform/business/shipment-reports");
    await expect(page.getByRole("navigation", { name: "业务管理二级菜单" }).getByText("出货报告审核", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: businessNo, exact: true }).click();
    const breadcrumb = page.getByRole("navigation", { name: "面包屑" });
    await expect(breadcrumb.getByText("业务管理", { exact: true })).toBeVisible();
    await expect(breadcrumb.getByText("出货报告审核", { exact: true })).toBeVisible();
    await expect(breadcrumb.getByText("详情", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-detail-ued.png", fullPage: true });
    await page.getByRole("button", { name: "审核", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "出货报告审核" })).toBeVisible();
    await page.getByLabel("审核驳回").check();
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-review-dialog.png", fullPage: true });
    await page.getByLabel("驳回原因").fill("请补充出货检验报告并核对数量");
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("已驳回", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "下载 出货检验报告_DEMO.pdf" })).toBeVisible();
    const rejectedFlow = page.getByRole("list", { name: "业务流程记录" });
    await expect(rejectedFlow.getByText("请补充出货检验报告并核对数量", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "审核意见", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: /示例质量运营中心/ }).click();
    await page.getByRole("menuitem", { name: /供应商用户/ }).click();
    await page.goto(`/app/supplier/shipment-reports/${reportId}`);
    await page.getByRole("button", { name: "修改并重新提报" }).click();
    await expect(page.getByText("出货检验报告_DEMO.pdf")).toBeVisible();
    await page.getByLabel("备注").fill("已补充检验报告，重新提报。");
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("待审核", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /远航精密供应商/ }).click();
    await page.getByRole("menuitem", { name: /平台管理员/ }).click();
    await page.goto(`/app/platform/business/shipment-reports/${reportId}`);
    await page.getByRole("button", { name: "审核", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "出货报告审核" })).toBeVisible();
    await page.getByRole("button", { name: "提交审核" }).click();
    await expect(page.getByText("已通过", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "下载 出货检验报告_DEMO.pdf" })).toBeVisible();
    const flow = page.getByRole("list", { name: "业务流程记录" });
    await expect(flow.getByText("提交出货报告", { exact: true })).toBeVisible();
    await expect(flow.getByText("平台审核驳回", { exact: true })).toBeVisible();
    await expect(flow.getByText("重新提交", { exact: true })).toBeVisible();
    await expect(flow.getByText("平台审核通过", { exact: true })).toBeVisible();
    const actions = await flow.locator(".flow-event-content > strong").allTextContents();
    expect(actions).toEqual(["提交出货报告", "平台审核驳回", "重新提交", "平台审核通过"]);
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-flow-platform.png", fullPage: true });
    await page.getByRole("button", { name: /示例质量运营中心/ }).click();
    await page.getByRole("menuitem", { name: /供应商用户/ }).click();
    await page.goto(`/app/supplier/shipment-reports/${reportId}`);
    const supplierFlow = page.getByRole("list", { name: "业务流程记录" });
    expect(await supplierFlow.locator(".flow-event-content > strong").allTextContents()).toEqual(actions);
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-flow-supplier.png", fullPage: true });
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-approved.png", fullPage: true });
  });

  test("supplier cancels a pending shipment report with a required reason", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "supplier cancellation runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "供应商用户" }).click();
    await page.goto("/app/supplier/shipment-reports/00000000-0000-4000-8000-000000000501");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "取消出货报告" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "确认取消" }).click();
    await expect(dialog).toBeVisible();
    await page.getByLabel("取消原因").fill("供应商出货计划调整，本批次不再发货");
    await dialog.getByRole("button", { name: "确认取消" }).click();
    await expect(page.getByText("已取消", { exact: true })).toBeVisible();
    const supplierCancelFlow = page.getByRole("list", { name: "业务流程记录" });
    await expect(supplierCancelFlow.getByText("供应商出货计划调整，本批次不再发货")).toBeVisible();
    await expect(supplierCancelFlow.getByText("供应商取消", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "取消记录", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "取消", exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("已取消", { exact: true })).toBeVisible();
  });

  test("platform cancels a pending shipment report and records the actor", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "platform cancellation runs once at desktop size");
    await page.goto("/");
    await page.getByRole("button", { name: "平台管理员" }).click();
    await page.goto("/app/platform/business/shipment-reports/00000000-0000-4000-8000-000000000501");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "取消出货报告" });
    await expect(dialog.getByText("取消后将模拟通知供应商")).toBeVisible();
    await page.getByLabel("取消原因").fill("平台发现订单信息作废，终止本次审核");
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-cancel-dialog.png", fullPage: true });
    await dialog.getByRole("button", { name: "确认取消" }).click();
    await expect(page.getByText("已取消", { exact: true })).toBeVisible();
    const platformCancelFlow = page.getByRole("list", { name: "业务流程记录" });
    await expect(platformCancelFlow.getByText("平台取消", { exact: true })).toBeVisible();
    await expect(platformCancelFlow.getByText("平台发现订单信息作废，终止本次审核", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "取消记录", exact: true })).toHaveCount(0);
    await page.screenshot({ path: "docs/previews/DEV-10-02-shipment-cancelled.png", fullPage: true });
  });
});
