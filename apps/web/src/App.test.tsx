import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes, ApplicationShell, appendAuditLog, assertExpectedVersion, assertIncomingInspectionTransition, assertMaterialTransition, assertShipmentTransition, calculateCustomerMaterialYield, calculateOrderCompletion, canAccessOrganizationRecord, canTriggerMaterialException, createDemoSession, DEMO_SESSION_STORAGE_KEY, exportRowsAsXlsx, filterPermittedTodoCategories, LoginPage, notificationsFromAudit, readAuditLogs, readIncomingInspections, readPlatformRoles, updatePermissionSelection, validateBatchProductionRows, validateIncomingInspectionApproval, validateRepairDetails, writeAfterSalesExceptionsWithQuota, writeMaterialExceptionsWithQuota } from "./App";
import { CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY, readBusinessDefinitionConfigs } from "./configuration";
import { MERCHANT_IDENTITY_STORAGE_KEY, readMerchantIdentityStore, readOrganizationRoles, writeLastOrganization, writeMerchantIdentityStore, type MerchantOrganizationSource } from "./merchantIdentity";

describe("demo baseline", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("offers all three demo roles on the login page", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getAllByRole("button", { name: "平台管理员" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "供应商用户" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "工厂用户" })).toHaveLength(1);
  });

  it("requires the issued demo SMS code for an approved merchant login", () => {
    window.localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: "approved-new-supplier", version: 1, merchantNo: "MC-LOGIN", merchantType: "supplier", companyName: "新登录供应商", creditCode: "91440300MA5LOGIN001", administratorName: "登录用户", administratorPhone: "13900139031", administratorEmail: "login@example.com", reviewStatus: "approved", usageStatus: "active", flowRecords: [], createdAt: "2026-08-13 14:00", updatedAt: "2026-08-13 15:00" }]));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "验证码登录" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13900139031" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    expect(screen.getByRole("alert")).toHaveTextContent("请输入验证码");
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }));
    expect(screen.getByRole("status", { name: "模拟短信验证码" })).toHaveTextContent("246810");
    fireEvent.change(screen.getByLabelText("验证码"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    expect(screen.getByRole("alert")).toHaveTextContent("验证码错误或已过期");
    fireEvent.change(screen.getByLabelText("验证码"), { target: { value: "246810" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"organizationName":"新登录供应商"');
  });

  it("lets a supplier administrator add a user who can log in without management permission", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    const view = render(<MemoryRouter initialEntries={["/app/supplier/users"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "用户管理" })).toBeInTheDocument();
    expect(screen.getByText("138****8001")).toBeInTheDocument();
    expect(screen.getByText("138****8004")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新增用户" }));
    fireEvent.change(screen.getByLabelText("用户姓名"), { target: { value: "新普通用户" } });
    fireEvent.change(screen.getByLabelText("用户手机号码"), { target: { value: "13900139201" } });
    fireEvent.change(screen.getByLabelText("用户邮箱"), { target: { value: "new-member@example.com" } });
    fireEvent.change(screen.getByLabelText("用户职位"), { target: { value: "质量专员" } });
    fireEvent.click(screen.getByRole("dialog", { name: "新增用户" }).querySelector('button[type="submit"]')!);
    expect(screen.getByRole("status")).toHaveTextContent("用户已新增");
    expect(screen.getByText("新普通用户")).toBeInTheDocument();
    view.unmount();

    window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "验证码登录" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13900139201" } });
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }));
    fireEvent.change(screen.getByLabelText("验证码"), { target: { value: "246810" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"userName":"新普通用户"');
    cleanup();
    render(<MemoryRouter initialEntries={["/app/supplier/users"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "暂无用户管理权限" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "用户管理" })).not.toBeInTheDocument();
  });

  it("initializes the merchant administrator and super-admin role when approval succeeds", () => {
    window.localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: "pending-identity-supplier", version: 1, merchantNo: "MC-IDENTITY", merchantType: "supplier", companyName: "待初始化供应商", creditCode: "91440300MA5IDENTITY1", administratorName: "审批管理员", administratorPhone: "13900139202", administratorEmail: "approval@example.com", reviewStatus: "pending", usageStatus: null, flowRecords: [], createdAt: "2026-08-27 09:00", updatedAt: "2026-08-27 09:00" }]));
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/merchant-audits"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "查看" }));
    fireEvent.click(screen.getByRole("button", { name: "审核" }));
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));
    expect(screen.getByRole("status")).toHaveTextContent("管理员账号与超级管理员角色已初始化");
    const store = JSON.parse(window.localStorage.getItem(MERCHANT_IDENTITY_STORAGE_KEY)!) as { accounts: Array<{ phone: string }>; memberships: Array<{ registrationAdministrator: boolean; roleIds: string[] }>; roles: Array<{ code: string }> };
    expect(store.accounts.filter((account) => account.phone === "13900139202")).toHaveLength(1);
    expect(store.memberships).toEqual([expect.objectContaining({ registrationAdministrator: true, roleIds: [expect.stringContaining("merchant_super_admin")] })]);
    expect(store.roles.some((role) => role.code === "merchant_super_admin")).toBe(true);
  });

  it("restores the last active merchant organization for a multi-organization account", () => {
    createDemoSession("supplier");
    const store = JSON.parse(window.localStorage.getItem(MERCHANT_IDENTITY_STORAGE_KEY)!) as { accounts: Array<{ id: string; phone: string }> };
    const account = store.accounts.find((entry) => entry.phone === "13800138001")!;
    writeLastOrganization(account.id, "merchant-multi-org-seed");
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "验证码登录" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13800138001" } });
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }));
    fireEvent.change(screen.getByLabelText("验证码"), { target: { value: "246810" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"role":"factory"');
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"organizationId":"merchant-multi-org-seed"');
  });

  it("prioritizes an enabled platform account over merchant memberships for the same phone", () => {
    const platformMerchant: MerchantOrganizationSource = { id: "platform-phone-merchant", organizationId: "platform-phone-merchant", merchantType: "supplier", companyName: "平台账号关联商家", administratorName: "审核专员", administratorPhone: "13800138992", administratorEmail: "auditor@example.com", reviewStatus: "approved", usageStatus: "active", createdAt: "2026-08-27 09:00", approvedAt: "2026-08-27 09:30" };
    readMerchantIdentityStore([platformMerchant]);
    window.localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: platformMerchant.id, version: 1, merchantNo: "MC-PLATFORM-ACCOUNT", merchantType: "supplier", companyName: platformMerchant.companyName, creditCode: "91440300MA5PLATFORM1", administratorName: platformMerchant.administratorName, administratorPhone: platformMerchant.administratorPhone, administratorEmail: platformMerchant.administratorEmail, reviewStatus: "approved", usageStatus: "active", approvedAt: platformMerchant.approvedAt, flowRecords: [], createdAt: platformMerchant.createdAt, updatedAt: platformMerchant.approvedAt }]));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "验证码登录" }));
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13800138992" } });
    fireEvent.click(screen.getByRole("button", { name: "获取验证码" }));
    fireEvent.change(screen.getByLabelText("验证码"), { target: { value: "246810" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"role":"platform"');
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"userName":"审核专员"');
  });

  it("shows empty organization-scoped data for a newly approved supplier", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({ role: "supplier", organizationId: "approved-new-supplier", userId: "supplier-user", status: "enabled", organizationName: "新登录供应商", userName: "登录用户" }));
    render(<MemoryRouter initialEntries={["/app/supplier"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getAllByText("新登录供应商", { exact: true })).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "全部(0)" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "供应商待办统计" })).toHaveTextContent("待处理任务0本月已完成0平均处理时效—");
    expect(screen.queryByText("ME20260810001")).not.toBeInTheDocument();
    expect(screen.queryByText("SA20260808007")).not.toBeInTheDocument();
  });

  it("allows an organization with no work to be disabled without inheriting demo tasks", () => {
    window.localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: "approved-empty-supplier", version: 1, merchantNo: "MC-EMPTY", merchantType: "supplier", companyName: "空数据供应商", creditCode: "91440300MA5EMPTY001", administratorName: "空数据用户", administratorPhone: "13900139032", administratorEmail: "empty@example.com", reviewStatus: "approved", usageStatus: "active", flowRecords: [], createdAt: "2026-08-13 14:00", updatedAt: "2026-08-13 15:00" }]));
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/merchants/approved-empty-supplier"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "停用" }));
    fireEvent.click(screen.getByRole("button", { name: "确定停用" }));
    expect(screen.getByText("商家已停用")).toBeInTheDocument();
    expect(screen.getByText("已停用", { selector: ".status" })).toBeInTheDocument();
    expect(screen.queryByText(/该商家有 .*待处理任务/)).not.toBeInTheDocument();
  });

  it("renders the platform quality overview", () => {
    render(<MemoryRouter><ApplicationShell role="platform" /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "首页总览" })).toBeInTheDocument();
    expect(screen.queryByText("出货报告待审核")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "进入审核" })).not.toBeInTheDocument();
    expect(screen.getByText("客供物料上线合格率")).toBeInTheDocument();
  });

  it("supports simulated year, month and recent-day metric trends", () => {
    const view = render(<MemoryRouter><ApplicationShell role="platform" /></MemoryRouter>);
    const timeSelect = screen.getByRole("combobox", { name: "统计时间" }) as HTMLSelectElement;
    expect([...timeSelect.options].map((option) => option.value)).toEqual(["2026"]);
    const yearPoints = view.container.querySelector(".trend-line")?.getAttribute("points");
    fireEvent.click(screen.getByRole("button", { name: "月" }));
    expect([...timeSelect.options].map((option) => option.value)).toContain("2026-07");
    fireEvent.change(timeSelect, { target: { value: "2026-07" } });
    expect(screen.getByRole("option", { name: "2026年07月" })).toBeInTheDocument();
    const monthPoints = view.container.querySelector(".trend-line")?.getAttribute("points");
    fireEvent.click(screen.getByRole("button", { name: "日" }));
    expect(timeSelect.options).toHaveLength(100);
    expect(timeSelect.options[0].value).toBe("2026-08-24");
    const dayPoints = view.container.querySelector(".trend-line")?.getAttribute("points");
    expect(new Set([yearPoints, monthPoints, dayPoints]).size).toBeGreaterThan(1);
  });

  it("computes order completion and customer material yield from business records", () => {
    const production = [{ id: "pir", businessType: "production_inspection", factoryOrganizationId: "org", factoryOrganization: "工厂", businessDate: "2026-08-01", businessNo: "PIR-1", orderNo: "PO-1", orderQty: 100, productName: "产品", productModel: "型号" }] as never;
    const inbound = [{ id: "inbound", businessType: "inbound_report", factoryOrganizationId: "org", factoryOrganization: "工厂", businessDate: "2026-08-02", businessNo: "IR-1", orderNo: "PO-1", orderQty: 100, inboundQty: 100, productName: "产品", productModel: "型号", status: "approved", qualifiedType: "qualified" }] as never;
    expect(calculateOrderCompletion(production, inbound, { organizationId: "org", dimension: "year", period: "2026" })[0]).toMatchObject({ completionRate: 100, status: "已完成", inboundQty: 100 });
    const customerRows = calculateCustomerMaterialYield([{ id: "inbound", businessType: "inbound_report", factoryOrganizationId: "org", factoryOrganization: "工厂", materialNo: "12345678", productName: "产品", productModel: "型号", inboundQty: 100, orderNo: "PO-1", status: "approved", qualifiedType: "qualified", businessDate: "2026-08-02", businessNo: "IR-1" }, { id: "return", businessType: "sporadic_return", factoryOrganizationId: "org", factoryOrganization: "工厂", materialNo: "12345678", productName: "产品", productModel: "型号", returnQty: 10, status: "completed", businessDate: "2026-08-03" }] as never, [{ id: "product", organizationId: "org", materialNo: "12345678", materialType: "product", productName: "产品", productModel: "型号", materialQty: 2, status: "enabled", createdAt: "2026-08-01", updatedAt: "2026-08-01" }]);
    expect(customerRows[0]).toMatchObject({ totalQty: 200, returnQty: 10, rate: 95, matched: true });
  });

  it("shows the seeded order-completion demo as two completed orders out of four", () => {
    const rows = calculateOrderCompletion();
    expect(rows).toHaveLength(4);
    expect(rows.filter((row) => row.status === "已完成")).toHaveLength(2);
    expect(rows.map((row) => row.completionRate).sort((left, right) => left - right)).toEqual([60, 33.33, 100, 100].sort((left, right) => left - right));
  });

  it("shows a matched seeded customer-material yield and counts returns by material number", () => {
    const rows = calculateCustomerMaterialYield();
    const matched = rows.find((row) => row.materialNo === "MAT-USB-C-021" && row.matched);
    expect(matched).toMatchObject({ inboundQty: 3000, materialQty: 2, totalQty: 6000, returnQty: 120, rate: 98, matched: true });
    const inbound = [{ id: "inbound", businessType: "inbound_report", factoryOrganizationId: "org", factoryOrganization: "工厂", businessDate: "2026-08-02", businessNo: "IR-1", materialNo: "MAT-1", productName: "产品A", productModel: "A-1", inboundQty: 100, status: "approved", qualifiedType: "qualified" }];
    const returns = [{ id: "return", businessType: "sporadic_return", factoryOrganizationId: "org", factoryOrganization: "工厂", businessDate: "2026-08-03", businessNo: "R-1", materialNo: "MAT-1", productName: "其他名称", productModel: "其他型号", returnQty: 5, status: "completed" }];
    const materialRows = calculateCustomerMaterialYield([...inbound, ...returns] as never, [{ id: "product", organizationId: "org", materialNo: "MAT-1", materialType: "product", productName: "产品A", productModel: "A-1", materialQty: 2, status: "enabled", createdAt: "2026-08-01", updatedAt: "2026-08-01" }]);
    expect(materialRows[0]).toMatchObject({ totalQty: 200, returnQty: 5, rate: 97.5 });
  });

  it("exposes the V1.0.2 analysis and product data routes", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    const view = render(<MemoryRouter initialEntries={["/app/platform/analysis/order-completion"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "订单完成率" })).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={["/app/platform/product-data"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "产品数据" })).toBeInTheDocument();
    expect(screen.getByText("MAT-USB-C-021")).toBeInTheDocument();
  });

  it("moves logout into the user menu", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform"]}><AppRoutes /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "退出" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /用户菜单/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "退出登录" }));
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("opens platform analysis and basic-data second-level menus by default and toggles them", () => {
    render(<MemoryRouter><ApplicationShell role="platform" /></MemoryRouter>);
    const analysis = screen.getByRole("button", { name: "数据分析" });
    const basic = screen.getByRole("button", { name: "基础数据" });
    expect(analysis).toHaveAttribute("aria-expanded", "true");
    expect(basic).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "数据分析二级菜单" })).toHaveTextContent("订单完成率客供物料上线合格率");
    expect(screen.getByRole("navigation", { name: "基础数据二级菜单" })).toHaveTextContent("产品数据");
    fireEvent.click(analysis);
    expect(analysis).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "数据分析二级菜单" })).not.toBeInTheDocument();
  });

  it("exposes the platform configuration center and its four PRD groups", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/businesses"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "业务列表" })).toBeInTheDocument();
    expect(screen.queryByText("CONFIGURATION CENTER / BUSINESS MANAGEMENT")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "配置中心二级菜单" })).toHaveTextContent("业务管理表单资产数据分析配置发布与审计");
    expect(screen.queryByRole("navigation", { name: "配置中心页面切换" })).not.toBeInTheDocument();
    expect(screen.getByText("出货报告")).toBeInTheDocument();
  });

  it("shows independent business status columns and a single dynamic edit entry", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/businesses"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("columnheader", { name: "业务状态" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "激活版本" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "草稿状态" })).toBeInTheDocument();
    const row = screen.getByText("出货报告").closest("tr");
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent("已启用");
    expect(row).toHaveTextContent("v1");
    expect(row).toHaveTextContent("无草稿");
    const moreTrigger = within(row!).getByRole("button", { name: "出货报告 更多操作" });
    expect(within(row!).queryByRole("link", { name: "编辑" })).not.toBeInTheDocument();
    fireEvent.mouseOver(moreTrigger);
    expect(screen.getByRole("link", { name: "编辑" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "版本历史" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "继续草稿" })).not.toBeInTheDocument();
  });

  it("opens the dictionary page directly from the form asset route", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/assets"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "字典管理" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "表单资产" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "表单资产" })).toHaveAttribute("href", "/app/platform/configuration/dictionaries");
    expect(screen.getByRole("navigation", { name: "面包屑" })).toHaveTextContent("配置中心表单资产");
    expect(screen.getByRole("navigation", { name: "表单资产页面切换" })).toHaveTextContent("字典管理字段库");
    cleanup();
    render(<MemoryRouter initialEntries={["/app/platform/configuration/businesses/builtin-shipment_report"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /编辑业务/ })).toBeInTheDocument();
    expect(screen.queryByText("CONFIGURATION CENTER / BUSINESS MANAGEMENT")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeInTheDocument();
  });

  it("saves new business basics and advances to form design", async () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/businesses/new"]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("业务名称"), { target: { value: "质量改善追踪" } });
    fireEvent.change(screen.getByLabelText("业务编码"), { target: { value: "quality_improvement" } });
    fireEvent.change(screen.getByLabelText("业务编号前缀"), { target: { value: "QIT" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步：表单设计/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "编辑业务 · 质量改善追踪" })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "表单设计" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开表单设计器" })).toBeInTheDocument();
  });

  it("keeps the new business step locked when basics are invalid", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/businesses/new"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /下一步：表单设计/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("请先填写业务名称和业务编码");
    expect(screen.getByRole("heading", { name: "新增业务" })).toBeInTheDocument();
  });

  it("binds a published custom business to the runtime menu and organization-scoped list", () => {
    const businessId = "custom-1111";
    const businessCode = "1223";
    window.localStorage.setItem("quality-platform.configuration-businesses", JSON.stringify([{
      id: businessId,
      code: businessCode,
      name: "1111",
      builtIn: false,
      status: "active",
      activeVersion: "v1",
      submitterTypes: ["供应商"],
      category: "自定义",
      numberPrefix: "BIZ",
      dataCount: 2,
      inTransitCount: 1,
    }]));
    const activeVersion = {
      id: `business-definition-version-${businessId}-1`,
      businessId,
      version: 1,
      name: "1111 V1",
      changeNote: "首次发布",
      form: { id: "form-1111", schemaId: "schema-1111", schemaCode: businessCode, groups: [], updatedAt: "2026-08-29 10:00" },
      workflow: { defaultBranch: "end", nodes: [
        { id: "start", name: "开始", type: "start", statusCode: "draft", organizationRule: "submitter", permissionCode: `merchant.business.${businessCode}.submit`, actions: ["提交"], nextNodeIds: ["end"] },
        { id: "end", name: "结束", type: "end", statusCode: "completed", organizationRule: "platform", permissionCode: `merchant.business.${businessCode}.read`, actions: [] },
      ] },
      permissions: { menuName: "1111", menuLocation: "业务管理", submitterTypes: ["supplier"], dataScope: "organization", initialOrganizations: [], read: true, submit: true, handle: true, export: true },
      analysis: { listFields: ["businessNo", "organization", "status"], dimensions: ["当前状态"], metrics: ["业务记录数"] },
      publishedAt: "2026-08-29 10:00",
      publishedBy: "演示管理员",
      active: true,
    };
    window.localStorage.setItem(CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY, JSON.stringify([{
      businessId,
      draft: { form: activeVersion.form, workflow: activeVersion.workflow, permissions: activeVersion.permissions, analysis: activeVersion.analysis, updatedAt: "2026-08-29 10:00" },
      versions: [activeVersion],
      draftStatus: "none",
    }]));
    window.localStorage.setItem("quality-platform.dynamic-business-records", JSON.stringify([
      { id: "BIZ-001", businessId, businessCode, businessName: "1111", version: 1, organizationId: "00000000-0000-4000-8000-000000000002", organizationName: "远航精密供应商", submittedBy: "王晨", status: "completed", values: {}, createdAt: "2026-08-29 09:00", updatedAt: "2026-08-29 09:00" },
      { id: "BIZ-002", businessId, businessCode, businessName: "1111", version: 1, organizationId: "other-organization", organizationName: "其他组织", submittedBy: "其他用户", status: "completed", values: {}, createdAt: "2026-08-29 09:00", updatedAt: "2026-08-29 09:00" },
    ]));
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));

    render(<MemoryRouter initialEntries={[`/app/supplier/business/${businessCode}`]}><AppRoutes /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "1111" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1111" })).toHaveAttribute("href", `/app/supplier/business/${businessCode}`);
    expect(screen.getByText("BIZ-001")).toBeInTheDocument();
    expect(screen.queryByText("BIZ-002")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "编辑配置" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新增提报" })).toHaveAttribute("href", `/app/supplier/business/${businessCode}/new`);

    cleanup();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={[`/app/platform/business/${businessCode}`]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "1111" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1111" })).toHaveAttribute("href", `/app/platform/business/${businessCode}`);
    expect(screen.getByRole("link", { name: "编辑配置" })).toHaveAttribute("href", `/app/platform/configuration/businesses/${businessId}`);
  });

  it("runs a published custom business through supplier submission, organization todos, and archive", async () => {
    const businessId = "custom-runtime-demo";
    const businessCode = "supplier_runtime_demo";
    const form = { id: "form-runtime-demo", schemaId: "schema-runtime-demo", schemaCode: businessCode, updatedAt: "2026-08-29 10:00", groups: [{ id: "main", name: "提报信息", columns: 1, fields: [{ fieldCode: "problem", label: "问题描述", required: true, visible: true, span: 1 }] }] };
    const workflow = {
      defaultBranch: "end",
      nodes: [
        { id: "start", name: "开始", type: "start", statusCode: "draft", organizationRule: "submitter", permissionCode: `merchant.business.${businessCode}.submit`, actions: ["提交"], nextNodeIds: ["platform_review"] },
        { id: "platform_review", name: "平台审核", type: "approval", statusCode: "pending_platform_review", organizationRule: "platform", permissionCode: `platform.business.${businessCode}.review`, actions: ["通过"], nextNodeIds: ["supplier_process"] },
        { id: "supplier_process", name: "供应商处理", type: "process", statusCode: "pending_supplier_process", organizationRule: "supplier", permissionCode: `merchant.business.${businessCode}.handle`, actions: ["处理完成"], nextNodeIds: ["platform_acceptance"] },
        { id: "platform_acceptance", name: "平台验收", type: "approval", statusCode: "pending_platform_acceptance", organizationRule: "platform", permissionCode: `platform.business.${businessCode}.accept`, actions: ["验收通过"], nextNodeIds: ["end"] },
        { id: "end", name: "结束", type: "end", statusCode: "completed", organizationRule: "platform", permissionCode: `merchant.business.${businessCode}.read`, actions: [] },
      ],
    };
    const version = {
      id: `business-definition-version-${businessId}-1`, businessId, version: 1, name: "运行时 Demo V1", changeNote: "首次发布", form, workflow,
      permissions: { menuName: "供应商运行时 Demo", menuLocation: "业务管理", submitterTypes: ["supplier"], dataScope: "organization", initialOrganizations: [], read: true, submit: true, handle: true, export: false },
      analysis: { listFields: ["businessNo", "organization", "status"], dimensions: ["当前状态"], metrics: ["业务记录数"] }, publishedAt: "2026-08-29 10:00", publishedBy: "测试", active: true,
    };
    window.localStorage.setItem("quality-platform.configuration-businesses", JSON.stringify([{ id: businessId, code: businessCode, name: "供应商运行时 Demo", builtIn: false, status: "active", activeVersion: "v1", submitterTypes: ["供应商"], category: "自定义", numberPrefix: "RUN", dataCount: 0, inTransitCount: 0 }]));
    window.localStorage.setItem(CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY, JSON.stringify([{ businessId, draft: { form, workflow, permissions: version.permissions, analysis: version.analysis, updatedAt: "2026-08-29 10:00" }, versions: [version], draftStatus: "none" }]));

    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={[`/app/supplier/business/${businessCode}/new`]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("问题描述"), { target: { value: "来料尺寸异常" } });
    fireEvent.click(screen.getByRole("button", { name: "提交业务" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "供应商运行时 Demo详情" })).toBeInTheDocument());
    const recordId = (JSON.parse(window.localStorage.getItem("quality-platform.dynamic-business-runtime") ?? "{}") as { records: Array<{ id: string }> }).records[0].id;
    expect(screen.getByText("来料尺寸异常")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "通过" })).not.toBeInTheDocument();

    cleanup();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={[`/app/platform/business/${businessCode}/${recordId}`]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /QE 助手/ }));
    const assistant = within(screen.getByRole("complementary", { name: "QE 助手" }));
    fireEvent.change(assistant.getByRole("textbox", { name: "向 QE 助手提问" }), { target: { value: "查看这张单据的状态" } });
    fireEvent.click(assistant.getByRole("button", { name: "发送问题" }));
    expect((await assistant.findAllByRole("link", { name: new RegExp(recordId) }))[0])
      .toHaveAttribute("href", `/app/platform/business/${businessCode}/${recordId}`);
    fireEvent.click(assistant.getByRole("button", { name: "关闭 QE 助手" }));
    expect(screen.getByRole("button", { name: "通过" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "通过" }));

    cleanup();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={[`/app/supplier/business/${businessCode}/${recordId}`]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "处理完成" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "处理完成" }));

    cleanup();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={[`/app/platform/business/${businessCode}/${recordId}`]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "验收通过" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "验收通过" }));

    cleanup();
    render(<MemoryRouter initialEntries={[`/app/platform/business/${businessCode}/${recordId}`]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByText("已归档")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "验收通过" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "流程时间线" })).toBeInTheDocument();
  });

  it("keeps asset routes reachable while following the PRD asset boundary", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/dictionaries"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "字典管理" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "配置中心二级菜单" })).toHaveTextContent("业务管理表单资产数据分析配置发布与审计");
    expect(screen.getByRole("navigation", { name: "表单资产页面切换" })).toHaveTextContent("字典管理字段库");
    expect(screen.getByRole("navigation", { name: "表单资产页面切换" })).not.toHaveTextContent("配置Schema");
    expect(screen.getByRole("navigation", { name: "表单资产页面切换" })).not.toHaveTextContent("表单设计器");
    expect(screen.getByText("OPTION_001")).toBeInTheDocument();
  });

  it("renders the supplier-improvement form designer for platform administrators", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/designer"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "表单设计器" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "字段库面板" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "表单设计画布" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "字段属性面板" })).toBeInTheDocument();
  });

  it("uses the business workbench shell for an existing business designer", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/designer?businessId=builtin-shipment_report"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "编辑业务 · 出货报告" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回业务" })).toBeInTheDocument();
    const workbenchSteps = screen.getByRole("navigation", { name: "业务定义配置步骤" });
    ["基本信息", "表单设计", "流程配置", "权限与入口", "分析设置", "预览与发布"].forEach((step) => expect(workbenchSteps).toHaveTextContent(step));
    expect(screen.getByRole("navigation", { name: "配置中心二级菜单" })).toBeInTheDocument();
    expect(screen.queryByText("CONFIGURATION CENTER")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("设计案例版本")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "表单版本历史" })).not.toBeInTheDocument();
  });

  it("deletes processing workflow nodes and reconnects their predecessor", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/businesses/builtin-material_exception?step=workflow"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "删除节点 平台审核" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除节点 开始" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除节点 结束" })).not.toBeInTheDocument();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "删除节点 平台审核" }));
    expect(screen.queryByText("平台审核")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("流程节点“平台审核”已删除");
    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
    const saved = readBusinessDefinitionConfigs().find((entry) => entry.businessId === "builtin-material_exception");
    expect(saved?.draft.workflow.nodes.map((node) => node.id)).toEqual(["start", "end"]);
    expect(saved?.draft.workflow.nodes.find((node) => node.id === "start")?.nextNodeIds).toEqual(["end"]);
    vi.restoreAllMocks();
  });

  it("renders designer rules and fill preview modes from the same draft", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/designer?mode=rules"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "字段规则配置" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制模板" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发布版本" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox", { name: /校验类型/ }).length).toBeGreaterThan(0);
    expect(screen.getByText("选项配置")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "供应商名称选项1" })).toHaveValue("选项一");
    cleanup();
    render(<MemoryRouter initialEntries={["/app/platform/configuration/designer?mode=preview"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "填写预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "校验预览表单" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "版本名称" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "变更说明" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布版本" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "选项一" })).toBeInTheDocument();
  });

  it("requires a publish change note in preview mode", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/configuration/designer?mode=preview"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "发布版本" }));
    expect(screen.getByText("请填写发布变更说明")).toBeInTheDocument();
  });

  it("keeps shipment reports out of the supplier task-card actions", () => {
    render(<MemoryRouter><ApplicationShell role="supplier" /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "供应商工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "查看出货报告" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "出货报告" })).toBeInTheDocument();
  });

  it("renders the supplier home todo center with business tabs and detail links", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={["/app/supplier"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "供应商工作台" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "供应商待办统计" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "物料异常(1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "售后异常(1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "出货报告(1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SR202608070004" })).toHaveAttribute("href", "/app/supplier/shipment-reports/00000000-0000-4000-8000-000000000504/edit");
    expect(screen.getByRole("link", { name: "ME20260810001" })).toHaveAttribute("href", "/app/supplier/todos/supplier-todo-me-20260810001");
    fireEvent.click(screen.getByRole("tab", { name: "物料异常(1)" }));
    expect(screen.getByRole("link", { name: "ME20260810001" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "SA20260808007" })).not.toBeInTheDocument();
  });

  it("keeps supplier todo business numbers visible in their organization-scoped lists", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    const view = render(<MemoryRouter initialEntries={["/app/supplier/material-exceptions"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "ME20260810001" })).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={["/app/supplier/after-sales-exception"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "SA20260808007" })).toBeInTheDocument();
  });

  it("shows a rejected-business todo on the factory home", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "工厂工作台" })).toBeInTheDocument();
    expect(screen.getByText("来料检验重新提报")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "IQC202608090001" })).toHaveAttribute("href", "/app/factory/incoming-inspections/incoming-inspection-rejected-001/edit");
  });

  it("renders the material exception review and three-role routes", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/material-exceptions"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "物料异常审核" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ME202608121030001" })).toHaveAttribute("href", "/app/platform/business/material-exceptions/material-exception-seed-001");
    expect(screen.getAllByText("待平台审核").length).toBeGreaterThan(0);
  });

  it("separates platform submissions from audit navigation and actions", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    const view = render(<MemoryRouter initialEntries={["/app/platform/platform-business/material-exceptions"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("navigation", { name: "平台业务二级菜单" })).toHaveTextContent("物料异常提报售后异常提报");
    expect(screen.getByRole("navigation", { name: "业务管理二级菜单" })).toHaveTextContent("物料异常审核售后异常审核");
    expect(screen.getByRole("heading", { name: "物料异常提报" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增物料异常" })).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={["/app/platform/business/after-sales-exception"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "售后异常审核" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "新增售后异常" })).not.toBeInTheDocument();
  });

  it("submits a supplier after-sales 8D report with visible workflow feedback", async () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={["/app/supplier/after-sales-exception/after-sales-seed-001"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "提交8D报告" }));
    const file = new File(["demo after-sales 8d"], "after-sales-8d.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("售后异常8D附件"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("after-sales-8d.pdf")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("售后异常8D备注"), { target: { value: "已完成根因分析" } });
    fireEvent.click(screen.getByRole("dialog", { name: "提交8D报告" }).querySelector('button[type="submit"]')!);
    expect(screen.getByText("待审核8D", { selector: ".status" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("8D报告已提交审核");
    expect(screen.getByText("供应商提交8D报告")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "提交8D报告" })).not.toBeInTheDocument();
  });

  it("lets the platform submit a material exception without exposing audit actions", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/platform-business/material-exceptions/new"]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox", { name: /物料料号/ }), { target: { value: "MAT-PLATFORM-001" } });
    fireEvent.change(screen.getByRole("textbox", { name: /物料名称/ }), { target: { value: "平台提报测试物料" } });
    fireEvent.change(screen.getByRole("textbox", { name: /异常描述/ }), { target: { value: "平台抽检发现外观异常" } });
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));
    expect(screen.getByRole("heading", { name: /ME20260813\d+ · 物料异常/ })).toBeInTheDocument();
    expect(screen.getByText("平台提报物料异常")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "审核" })).not.toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem("quality-platform.material-exceptions") || "[]");
    expect(saved.find((item: { materialNo: string }) => item.materialNo === "MAT-PLATFORM-001")).toMatchObject({ reporterOrganization: "示例质量运营中心", reporterOrganizationId: "00000000-0000-4000-8000-000000000001", status: "pending_review" });
  });

  it("lets the platform assign a supplier during material exception approval", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/material-exceptions/material-exception-seed-001"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "审核" }));
    expect(screen.getByRole("dialog", { name: "审核物料异常" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "分配供应商" })).toHaveValue("远航精密供应商");
    fireEvent.click(screen.getByRole("button", { name: "确认提交" }));
    expect(screen.getByText("待供应商处理")).toBeInTheDocument();
  });

  it("routes a rejected material exception todo back to the factory edit form", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    const view = render(<MemoryRouter initialEntries={["/app/platform/business/material-exceptions/material-exception-seed-001"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "审核" }));
    fireEvent.click(screen.getByRole("radio", { name: "驳回" }));
    fireEvent.change(screen.getByLabelText("审核意见"), { target: { value: "补充异常附件后重新提报" } });
    fireEvent.click(screen.getByRole("button", { name: "确认提交" }));
    view.unmount();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "ME202608121030001" })).toHaveAttribute("href", "/app/factory/material-exceptions/material-exception-seed-001/edit");
  });

  it("renders the platform todo center from live shipment states", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/todos"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "待办任务中心" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "出货报告(1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /出货报告待审核-SR202608110001/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "物料异常(1)" })).toBeInTheDocument();
  });

  it("uses the shared UED section layout for shipment forms", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={["/app/supplier/shipment-reports/new"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "新增出货报告" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回列表" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "基础信息",
      "物料信息",
      "订单与出货信息",
      "附件与备注",
    ]);
    expect(screen.getByText("点击或拖拽文件到此区域上传")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交审核" })).toBeInTheDocument();
  });

  it("aligns platform shipment report cells with the supplier column", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/shipment-reports"]}><AppRoutes /></MemoryRouter>);
    const seedRow = screen.getByRole("link", { name: "SR202608110001" }).closest("tr");
    expect(seedRow).not.toBeNull();
    expect(Array.from(seedRow?.querySelectorAll("td") ?? []).map((cell) => cell.textContent)).toEqual([
      "SR202608110001",
      "远航精密供应商",
      "USB-C连接器",
      "MAT-USB-C-001",
      "3,000",
      "2026-08-10",
      "待审核",
      "查看详情",
    ]);
  });

  it("keeps supplier shipment rows aligned without a duplicate supplier column", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={["/app/supplier/shipment-reports"]}><AppRoutes /></MemoryRouter>);
    const seedRow = screen.getByRole("link", { name: "SR202608110001" }).closest("tr");
    expect(Array.from(seedRow?.querySelectorAll("td") ?? []).map((cell) => cell.textContent)).toEqual([
      "SR202608110001",
      "USB-C连接器",
      "MAT-USB-C-001",
      "PO202608001",
      "3,000",
      "2026-08-10",
      "待审核",
      "查看详情",
    ]);
  });

  it("filters todo tabs by the current user's category permissions", () => {
    expect(filterPermittedTodoCategories(["shipment_report", "material_exception"], ["shipment_report"])).toEqual(["shipment_report"]);
  });

  it("manages platform users with super-admin protection and search", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/users"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "用户管理" })).toBeInTheDocument();
    expect(screen.getAllByText("演示管理员").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "禁用" }).some((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.change(screen.getByLabelText("搜索用户"), { target: { value: "审核专员" } });
    expect(screen.getByText("审核专员")).toBeInTheDocument();
    expect(screen.getByRole("table")).not.toHaveTextContent("演示管理员");
  });

  it("creates a role and persists only leaf permission selections", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/roles"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "新增角色" }));
    fireEvent.change(screen.getByLabelText("角色名称"), { target: { value: "质量观察员" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("质量观察员")).toBeInTheDocument();
    const role = readPlatformRoles().find((item) => item.name === "质量观察员")!;
    const home = { id: "home", label: "首页", children: [{ id: "platform.home.shipment_report.read", code: "platform.home.shipment_report.read", label: "子权限" }] };
    expect(updatePermissionSelection([], home, true)).toEqual(["platform.home.shipment_report.read"]);
    expect(updatePermissionSelection(["platform.home.shipment_report.read"], home, false)).toEqual([]);
    const permissionLink = screen.getAllByRole("link", { name: "权限配置" }).find((link) => link.getAttribute("href")?.includes(role.id));
    fireEvent.click(permissionLink!);
    expect(screen.getByRole("heading", { name: /质量观察员 · 角色权限/ })).toBeInTheDocument();
    expect(role.permissionCodes).toEqual([]);
  });

  it("migrates stored platform roles to canonical leaf permissions", () => {
    window.localStorage.setItem("quality-platform.platform-roles", JSON.stringify([{
      id: "legacy-platform-role",
      name: "旧审核角色",
      description: "旧权限码迁移样例",
      system: false,
      permissionCodes: ["home", "business:type:2", "business:view", "roles:edit"],
      createdAt: "2026-08-24 16:00",
      updatedAt: "2026-08-24 16:00",
    }]));
    const role = readPlatformRoles()[0];
    expect(role.permissionCodes).toContain("platform.home.merchant_registration.read");
    expect(role.permissionCodes).toContain("platform.business.material_exception.access");
    expect(role.permissionCodes).toContain("platform.business.record.read");
    expect(role.permissionCodes).toContain("platform.admin.role.update");
    expect(role.permissionCodes.some((code) => code.includes(":"))).toBe(false);
    expect(role.permissionCodes).not.toContain("home");
  });

  it("blocks deleting a role that is assigned to a user", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/roles"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[1]);
    expect(screen.getByRole("alert")).toHaveTextContent("角色已关联用户，不能删除");
  });

  it("manages supplier roles and persists leaf permissions within the organization grant", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={["/app/supplier/roles"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "角色管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "角色管理" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "编辑" }).some((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "新增角色" }));
    fireEvent.change(screen.getByLabelText("角色名称"), { target: { value: "出货只读角色" } });
    fireEvent.change(screen.getByLabelText("角色描述"), { target: { value: "只能查看供应商出货报告" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByRole("status")).toHaveTextContent("角色已新增");
    fireEvent.click(screen.getByRole("link", { name: "出货只读角色" }));
    expect(screen.getByRole("heading", { name: "出货只读角色 · 角色权限" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "出货报告-查看" }));
    fireEvent.click(screen.getByRole("button", { name: "保存权限" }));
    expect(screen.getByRole("status")).toHaveTextContent("角色权限已保存并立即生效");
    const role = readOrganizationRoles([], "00000000-0000-4000-8000-000000000002").find((entry) => entry.name === "出货只读角色")!;
    expect(role.permissionCodes).toEqual(["merchant.business.shipment_report.read"]);
  });

  it("shows an indeterminate merchant permission parent when only part of its enabled leaves are selected", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    const store = readMerchantIdentityStore([]);
    const roleId = "00000000-0000-4000-8000-000000000002:supplier_quality_operator";
    writeMerchantIdentityStore({
      ...store,
      roles: store.roles.map((role) => role.id === roleId
        ? { ...role, permissionCodes: role.permissionCodes.filter((code) => code.startsWith("merchant.business.material_exception.") || code.startsWith("merchant.business.after_sales_exception.")) }
        : role),
    });
    render(<MemoryRouter initialEntries={[`/app/supplier/roles/${roleId}/permissions`]}><AppRoutes /></MemoryRouter>);
    const supplierManagement = screen.getByRole("checkbox", { name: "供应商管理" }) as HTMLInputElement;
    expect(supplierManagement.checked).toBe(false);
    expect(supplierManagement.indeterminate).toBe(true);
  });

  it("enforces revoked shipment-report permissions in supplier navigation, todo, and direct routes", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    const store = readMerchantIdentityStore([]);
    const ordinary = store.accounts.find((account) => account.phone === "13800138004")!;
    const roleId = "00000000-0000-4000-8000-000000000002:supplier_quality_operator";
    const shipmentPermissions = new Set([
      "merchant.home.shipment_report.read",
      "merchant.business.shipment_report.read",
      "merchant.business.shipment_report.submit",
    ]);
    writeMerchantIdentityStore({
      ...store,
      roles: store.roles.map((role) => role.id === roleId
        ? { ...role, permissionCodes: role.permissionCodes.filter((code) => !shipmentPermissions.has(code)) }
        : role),
    });
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({ role: "supplier", organizationId: "00000000-0000-4000-8000-000000000002", userId: ordinary.id, status: "enabled", organizationName: "远航精密供应商", userName: ordinary.name }));

    render(<MemoryRouter initialEntries={["/app/supplier"]}><AppRoutes /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "出货报告" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /出货报告/ })).not.toBeInTheDocument();
    cleanup();

    render(<MemoryRouter initialEntries={["/app/supplier/shipment-reports"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "暂无业务权限" })).toBeInTheDocument();
    cleanup();

    render(<MemoryRouter initialEntries={["/app/supplier/shipment-reports/new"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "暂无业务权限" })).toBeInTheDocument();
  });

  it("updates a merchant organization grant and cleans revoked role permissions", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/merchants/merchant-supplier-seed"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByText("组织功能授权")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "调整功能权限" }));
    const dialog = screen.getByRole("dialog", { name: "调整功能授权" });
    const roleUpdate = dialog.querySelector('input[type="checkbox"]:checked') as HTMLInputElement;
    expect(roleUpdate).toBeTruthy();
    fireEvent.click(roleUpdate);
    fireEvent.click(screen.getByRole("button", { name: "保存授权" }));
    expect(screen.getByRole("status")).toHaveTextContent("越界角色权限已清理");
    const store = JSON.parse(window.localStorage.getItem(MERCHANT_IDENTITY_STORAGE_KEY)!) as { grants: Array<{ organizationId: string; revision: number }>; grantRevisions: unknown[] };
    expect(store.grants.find((grant) => grant.organizationId === "00000000-0000-4000-8000-000000000002")?.revision).toBe(2);
    expect(store.grantRevisions).toHaveLength(1);
  });

  it("denies the merchant role route to an ordinary member", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    const store = readMerchantIdentityStore([]);
    const ordinary = store.accounts.find((account) => account.phone === "13800138004")!;
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({ role: "supplier", organizationId: "00000000-0000-4000-8000-000000000002", userId: ordinary.id, status: "enabled", organizationName: "远航精密供应商", userName: ordinary.name }));
    render(<MemoryRouter initialEntries={["/app/supplier/roles"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "暂无角色管理权限" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "角色管理" })).not.toBeInTheDocument();
  });

  it("validates batch production inspection rows and rejects exact duplicates", () => {
    const row = { id: "row-1", businessDate: "2026-08-24", inspectionProcess: "一检", productName: "连接器", materialNo: "MAT-001", productModel: "M1", orderNo: "PO-1", orderQty: 10, inputQty: 10, inspectionQty: 10, defectDetails: [{ id: "d1", defect: "压接异常", quantity: 1 }], remark: "", attachmentName: "" };
    expect(validateBatchProductionRows([row])).toEqual([]);
    expect(validateBatchProductionRows([row, { ...row, id: "row-2" }])).toContain("第 1、2 行：整行内容完全重复");
    expect(validateBatchProductionRows([{ ...row, inspectionQty: 1, inputQty: 1, defectDetails: [{ id: "d2", defect: "压接异常", quantity: 2 }] }])[0]).toContain("不良数量不能大于检验数量");
  });

  it("exposes batch production entry, export and audit notification routes", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "批量新增" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出" })).toBeInTheDocument();
    expect(readAuditLogs()).toEqual([]);
    expect(() => exportRowsAsXlsx("test", ["字段"], [["值"]])).not.toThrow();
  });

  it("isolates audit notifications by the current organization", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    appendAuditLog({ action: "供应商操作", businessType: "demo", operator: "王晨", organization: "远航精密供应商", organizationId: "00000000-0000-4000-8000-000000000002", time: "2026-08-28 10:00" });
    appendAuditLog({ action: "工厂操作", businessType: "demo", operator: "陈工", organization: "华南智造 OEM 工厂", organizationId: "00000000-0000-4000-8000-000000000003", time: "2026-08-28 10:01" });
    expect(notificationsFromAudit("supplier").map((item) => item.title)).toEqual(["供应商操作"]);
    expect(notificationsFromAudit("factory").map((item) => item.title)).toEqual(["工厂操作"]);
  });

  it("denies merchant records outside the current organization scope", () => {
    const record = { supplierOrganizationId: "supplier-a", reporterOrganizationId: "factory-a", factoryOrganizationId: "factory-a" };
    expect(canAccessOrganizationRecord("platform", "platform", record)).toBe(true);
    expect(canAccessOrganizationRecord("supplier", "supplier-a", record)).toBe(true);
    expect(canAccessOrganizationRecord("supplier", "supplier-b", record)).toBe(false);
    expect(canAccessOrganizationRecord("factory", "factory-a", record)).toBe(true);
    expect(canAccessOrganizationRecord("factory", "factory-b", record)).toBe(false);
  });

  it("rejects stale versions and illegal business transitions", () => {
    expect(() => assertExpectedVersion(3, 2)).toThrow("该单据已被处理，请刷新后查看最新状态");
    expect(() => assertShipmentTransition("approved", "cancelled")).toThrow("当前状态不支持此操作，请刷新后查看最新状态");
    expect(() => assertMaterialTransition("waiting_supplier", "approved")).toThrow("当前状态不支持此操作，请刷新后查看最新状态");
    expect(() => assertShipmentTransition("pending_review", "approved")).not.toThrow();
    expect(() => assertMaterialTransition("pending_8d_review", "approved")).not.toThrow();
    expect(() => assertIncomingInspectionTransition("completed", "cancelled")).toThrow("当前状态不支持此操作，请刷新后查看最新状态");
    expect(() => assertIncomingInspectionTransition("rejected", "pending_review")).not.toThrow();
  });

  it("enforces incoming inspection approval and material-exception trigger rules", () => {
    const records = readIncomingInspections();
    expect(() => validateIncomingInspectionApproval("  ")).toThrow("审核通过时必须填写处理方式");
    expect(() => validateIncomingInspectionApproval("挑选使用")).not.toThrow();
    expect(canTriggerMaterialException(records.find((item) => item.id === "incoming-inspection-pending-001")!)).toBe(false);
    expect(canTriggerMaterialException(records.find((item) => item.id === "incoming-inspection-completed-triggerable")!)).toBe(true);
    expect(canTriggerMaterialException(records.find((item) => item.id === "incoming-inspection-completed-qualified")!)).toBe(false);
  });

  it("compacts older attachment payloads when the material-exception demo store reaches quota", () => {
    let quotaAttempts = 0;
    const originalStorageSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === "quality-platform.material-exceptions" && quotaAttempts++ < 2) {
        throw new DOMException("storage full", "QuotaExceededError");
      }
      originalStorageSetItem.call(this, key, value);
    });
    const records = [{ id: "current", version: 1, attachmentName: "current.png", attachmentDataUrl: "data:image/png;base64,current", eightDAttachmentName: "8d.pdf", eightDAttachmentDataUrl: "data:application/pdf;base64,current8d" }, { id: "old", version: 1, attachmentName: "old.png", attachmentDataUrl: "data:image/png;base64,old", eightDAttachmentName: "old-8d.pdf", eightDAttachmentDataUrl: "data:application/pdf;base64,old8d" }] as never[];
    window.localStorage.setItem("quality-platform.shipment-reports", JSON.stringify([{ attachmentDataUrl: "data:old-shipment" }]));
    window.localStorage.setItem("quality-platform.incoming-inspections", JSON.stringify([{ attachmentDataUrl: "data:old-iqc" }]));
    writeMaterialExceptionsWithQuota(records as never[], "current");
    const saved = JSON.parse(window.localStorage.getItem("quality-platform.material-exceptions") || "[]");
    expect(saved[0].eightDAttachmentDataUrl).toContain("current8d");
    expect(saved[1].attachmentDataUrl).toBeUndefined();
    setItemSpy.mockRestore();
  });

  it("preserves the current after-sales 8D workflow when its demo store reaches quota", () => {
    let quotaAttempts = 0;
    const originalStorageSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === "quality-platform.after-sales-exceptions" && quotaAttempts++ < 3) {
        throw new DOMException("storage full", "QuotaExceededError");
      }
      originalStorageSetItem.call(this, key, value);
    });
    const records = [{ id: "current", version: 2, status: "pending_8d_review", attachmentName: "issue.zip", attachmentDataUrl: "data:application/zip;base64,current", eightDAttachmentName: "8d.pdf", eightDAttachmentDataUrl: "data:application/pdf;base64,current8d", eightDRemark: "root cause", flowRecords: [{ action: "供应商提亨8D报告" }] }, { id: "old", version: 1, attachmentName: "old.zip", attachmentDataUrl: "data:application/zip;base64,old", eightDAttachmentName: "old-8d.pdf", eightDAttachmentDataUrl: "data:application/pdf;base64,old8d", flowRecords: [] }] as never[];
    writeAfterSalesExceptionsWithQuota(records, "current");
    const saved = JSON.parse(window.localStorage.getItem("quality-platform.after-sales-exceptions") || "[]");
    expect(saved[0]).toMatchObject({ status: "pending_8d_review", eightDAttachmentName: "8d.pdf", eightDRemark: "root cause" });
    expect(saved[0].flowRecords[0].action).toBe("供应商提亨8D报告");
    expect(saved[0].eightDAttachmentDataUrl).toBeUndefined();
    expect(saved[1].attachmentDataUrl).toBeUndefined();
    setItemSpy.mockRestore();
  });

  it("renders incoming inspections for factory and platform with organization scope", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    const view = render(<MemoryRouter initialEntries={["/app/factory/incoming-inspections"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "来料检验" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "IQC202608130001" })).toHaveAttribute("href", "/app/factory/incoming-inspections/incoming-inspection-pending-001");
    expect(screen.getByRole("button", { name: "新增来料检验" })).toBeInTheDocument();
    view.unmount();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/incoming-inspections"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "来料检验审核" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "IQC202608130001" })).toHaveAttribute("href", "/app/platform/business/incoming-inspections/incoming-inspection-pending-001");
  });

  it("renders direct-completion business lists and keeps platform view read-only", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    const view = render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "生产检验日报" })).toBeInTheDocument();
    expect(screen.getByText(/当前列表使用版本化 M1 演示数据/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PIR202608130001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增生产检验日报" })).toBeInTheDocument();
    view.unmount();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/ipqc-patrol"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "IPQC巡线问题记录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /新增/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "IPQC202608110003" })).toBeInTheDocument();
  });

  it("shows production inspection order fields on the detail page", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily/direct-pir-seed-001"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByText("订单号")).toBeInTheDocument();
    expect(screen.getByText("PO202608088")).toBeInTheDocument();
    expect(screen.getByText("订单数量")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("投入数量")).toBeInTheDocument();
    expect(screen.getByText("3,000")).toBeInTheDocument();
  });

  it("submits a production inspection directly to completed", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily/new"]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("物料料号"), { target: { value: "MAT-NEW-001" } });
    fireEvent.change(screen.getByLabelText("产品名称"), { target: { value: "新产品" } });
    fireEvent.change(screen.getByLabelText("产品型号"), { target: { value: "NP-01" } });
    fireEvent.change(screen.getByLabelText("订单号"), { target: { value: "PO-NEW-001" } });
    fireEvent.change(screen.getByLabelText("订单数量"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("投入数量"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("检验数量"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "提交并归档" }));
    expect(screen.getByText("已完成", { selector: ".status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /PIR.*生产检验日报/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "审核" })).not.toBeInTheDocument();
  });

  it("writes a new structured defect to the product library and opens a linked repair form", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily/new"]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("物料料号"), { target: { value: "MAT-LIB-001" } });
    fireEvent.change(screen.getByLabelText("产品名称"), { target: { value: "明细库产品" } });
    fireEvent.change(screen.getByLabelText("产品型号"), { target: { value: "LIB-01" } });
    fireEvent.change(screen.getByLabelText("订单号"), { target: { value: "PO-LIB-001" } });
    fireEvent.change(screen.getByLabelText("订单数量"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("投入数量"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("检验数量"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "+ 新增不良项" }));
    fireEvent.change(screen.getByLabelText("不良项第1项"), { target: { value: "端子变形" } });
    fireEvent.change(screen.getByLabelText("不良数量第1项"), { target: { value: "5" } });
    expect(screen.getByLabelText("不良数量")).toHaveValue(5);
    expect(screen.getByLabelText("不良数量")).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "提交并归档" }));
    expect(JSON.parse(window.localStorage.getItem("quality-platform.defect-detail-library") || "[]")).toEqual(expect.arrayContaining([expect.objectContaining({ productName: "明细库产品", defect: "端子变形", quantity: 5 })]));
    fireEvent.click(screen.getByRole("button", { name: "新增维修记录" }));
    expect((screen.getByLabelText("来源生产检验日报第1项") as HTMLSelectElement).value).toContain("direct-production_inspection");
    expect(screen.getByText(/MAT-LIB-001 \/ 明细库产品 \/ LIB-01/)).toBeInTheDocument();
  });

  it("derives the production inspection defect quantity from all defect detail rows", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily/new"]}><AppRoutes /></MemoryRouter>);
    const total = screen.getByLabelText("不良数量");
    expect(total).toHaveValue(0);
    expect(total).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "+ 新增不良项" }));
    fireEvent.click(screen.getByRole("button", { name: "+ 新增不良项" }));
    fireEvent.change(screen.getByLabelText("不良数量第1项"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("不良数量第2项"), { target: { value: "4" } });
    expect(total).toHaveValue(5);
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[1]);
    expect(total).toHaveValue(1);
  });

  it("allows partial repairs across records but rejects an accumulated overrun", () => {
    type Records = Parameters<typeof validateRepairDetails>[1];
    type Details = Parameters<typeof validateRepairDetails>[0];
    const source = { id: "pir-source", version: 1, businessNo: "PIR-SOURCE", businessType: "production_inspection", status: "completed", factoryOrganizationId: "factory-1", factoryOrganization: "测试工厂", businessDate: "2026-08-18", materialNo: "MAT-1", productName: "产品A", productModel: "A-1", inspectionProcess: "一检", defectDetails: [{ id: "defect-1", defect: "外观划伤", quantity: 5 }], attachmentName: "", remark: "", flowRecords: [], createdAt: "2026-08-18 09:00", updatedAt: "2026-08-18 09:00" } as Records[number];
    const historical = { id: "repair-history", version: 1, businessNo: "MR-HISTORY", businessType: "maintenance_record", status: "completed", factoryOrganizationId: "factory-1", factoryOrganization: "测试工厂", businessDate: "2026-08-18", materialNo: "MAT-1", productName: "产品A", productModel: "A-1", repairDetails: [{ id: "history-1", sourceProductionInspectionId: "pir-source", sourceProductionInspectionNo: "PIR-SOURCE", sourceDefectItemId: "defect-1", inspectionProcess: "一检", defect: "外观划伤", quantity: 2, cause: "搬运", method: "抛光", repairer: "张工" }], attachmentName: "", remark: "", flowRecords: [], createdAt: "2026-08-18 10:00", updatedAt: "2026-08-18 10:00" } as Records[number];
    const current = [{ id: "current-1", sourceProductionInspectionId: "pir-source", sourceProductionInspectionNo: "PIR-SOURCE", sourceDefectItemId: "defect-1", inspectionProcess: "一检", defect: "外观划伤", quantity: 3, cause: "周转", method: "抛光", repairer: "李工" }] as Details;
    expect(validateRepairDetails(current, [source, historical], "factory-1")).toBeUndefined();
    expect(validateRepairDetails([{ ...current[0], quantity: 4 }], [source, historical], "factory-1")).toContain("超出1");
  });

  it("does not write the defect library when production inspection validation fails", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/production-inspection-daily/new"]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("物料料号"), { target: { value: "MAT-FAILED-001" } });
    fireEvent.change(screen.getByLabelText("产品名称"), { target: { value: "失败产品" } });
    fireEvent.change(screen.getByLabelText("产品型号"), { target: { value: "FAILED-01" } });
    fireEvent.change(screen.getByLabelText("订单号"), { target: { value: "PO-FAILED" } });
    fireEvent.change(screen.getByLabelText("订单数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("投入数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("检验数量"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "+ 新增不良项" }));
    fireEvent.change(screen.getByLabelText("不良项第1项"), { target: { value: "不应入库" } });
    fireEvent.change(screen.getByLabelText("不良数量第1项"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "提交并归档" }));
    expect(screen.getByRole("alert")).toHaveTextContent("检验数量和不良数量必须符合数量关系");
    expect(window.localStorage.getItem("quality-platform.defect-detail-library")).toBeNull();
  });

  it("does not expose another organization's production inspections as repair sources", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    const session = JSON.parse(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)!) as { organizationId: string };
    window.localStorage.setItem("quality-platform.direct-business-records", JSON.stringify([{ id: "direct-pir-seed-001", version: 1, businessNo: "PIR-OTHER", businessType: "production_inspection", status: "completed", factoryOrganizationId: `${session.organizationId}-other`, factoryOrganization: "其他工厂", businessDate: "2026-08-13", materialNo: "MAT-OTHER", productName: "其他产品", productModel: "OTHER", inspectionProcess: "一检", defectDetails: [{ id: "defect-other", defect: "外观异常", quantity: 1 }], attachmentName: "", remark: "", flowRecords: [], createdAt: "2026-08-13 09:00", updatedAt: "2026-08-13 09:00" }]));
    render(<MemoryRouter initialEntries={["/app/factory/maintenance-record/new?sourceInspectionId=direct-pir-seed-001"]}><AppRoutes /></MemoryRouter>);
    const sourceSelect = screen.getByLabelText("来源生产检验日报第1项") as HTMLSelectElement;
    expect(sourceSelect).toHaveValue("");
    expect([...sourceSelect.options].map((option) => option.value)).not.toContain("direct-pir-seed-001");
  });

  it("requires handling method when approving an incoming inspection", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/incoming-inspections/incoming-inspection-pending-001"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "审核" }));
    const dialog = screen.getByRole("dialog", { name: "来料检验审核" });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));
    expect(dialog).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("处理方式"), { target: { value: "挑选使用，不良品退回供应商" } });
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));
    expect(screen.getByText("已完成", { selector: ".status" })).toBeInTheDocument();
    expect(screen.getByText("审核结果已提交")).toBeInTheDocument();
  });

  it("collects sporadic return and replenish child-form fields before advancing status", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/sporadic-return/audited-return-seed-001"]}><AppRoutes /></MemoryRouter>);
    expect(screen.queryByText("订单号")).not.toBeInTheDocument();
    expect(screen.getByText("退料时间")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "填写退料信息" }));
    expect(screen.getByRole("dialog", { name: "填写退料信息" })).toBeInTheDocument();
    expect(screen.getByText("待退回", { selector: ".status" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("退料快递单号"), { target: { value: "SF-RETURN-001" } });
    fireEvent.change(screen.getByLabelText("退料时间"), { target: { value: "2026-08-20T09:30" } });
    fireEvent.click(screen.getByRole("button", { name: "确认提交" }));
    expect(screen.getByText("待补回", { selector: ".status" })).toBeInTheDocument();
    expect(screen.getByText("SF-RETURN-001")).toBeInTheDocument();
    expect(screen.getByText("2026-08-20 09:30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "填写补回信息" }));
    expect(screen.getByRole("dialog", { name: "填写补回信息" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("物料补回时间"), { target: { value: "2026-08-21T14:10" } });
    fireEvent.click(screen.getByRole("button", { name: "确认提交" }));
    expect(screen.getByText("已完成", { selector: ".status" })).toBeInTheDocument();
    expect(screen.getAllByText("2026-08-21 14:10").length).toBeGreaterThan(0);
  });

  it("renders the inbound report form with only fields declared by its template", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/warehouse-in-report/new"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "新增入库报告" })).toBeInTheDocument();
    expect(screen.getByLabelText("物料料号")).toBeInTheDocument();
    expect(screen.queryByLabelText("物料名称")).not.toBeInTheDocument();
    expect(screen.getByLabelText("产品名称")).toBeInTheDocument();
  });

  it("renders the inbound report detail with only fields declared by its template", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/warehouse-in-report/audited-inbound-seed-001"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /IR202608130002.*入库报告/ })).toBeInTheDocument();
    expect(screen.queryByText("物料名称")).not.toBeInTheDocument();
    expect(screen.getByText("物料料号")).toBeInTheDocument();
    expect(screen.getByText("产品型号")).toBeInTheDocument();
    expect(screen.getByText("FPC-19P-120")).toBeInTheDocument();
    expect(screen.getByText("订单号")).toBeInTheDocument();
  });

  it("shows all inbound report business fields in the list", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/warehouse-in-report"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("table")).toHaveTextContent("物料料号产品名称产品型号订单号入库数量入库合格类型附件备注");
    expect(screen.getByRole("table")).toHaveTextContent("MAT-RELAY-011继电器组件RELAY-01PO202608091400合格入库检验报告_IR202608130007.pdf部分批次已入库。");
  });

  it("triggers one linked material exception only from an eligible completed inspection", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory")));
    render(<MemoryRouter initialEntries={["/app/factory/incoming-inspections/incoming-inspection-completed-triggerable"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "手动触发物料异常" }));
    expect(screen.getByRole("status")).toHaveTextContent(/物料异常 ME.*已生成并进入平台待办/);
    expect(screen.queryByRole("button", { name: "手动触发物料异常" })).not.toBeInTheDocument();
    const inspections = JSON.parse(window.localStorage.getItem("quality-platform.incoming-inspections") || "[]");
    const linked = inspections.find((item: { id: string }) => item.id === "incoming-inspection-completed-triggerable");
    const materials = JSON.parse(window.localStorage.getItem("quality-platform.material-exceptions") || "[]");
    const generated = materials.find((item: { sourceIncomingInspectionId?: string }) => item.sourceIncomingInspectionId === linked.id);
    expect(generated).toMatchObject({ materialNo: "MAT-SHELL-023", inspectionQty: 200, defectQty: 16, sourceIncomingInspectionNo: "IQC202608080003", status: "pending_review" });
    expect(linked.triggeredMaterialExceptionId).toBe(generated.id);
  });

  it("renders unified loading, empty and error list feedback", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    const view = render(<MemoryRouter initialEntries={["/app/platform/business/shipment-reports?demoState=loading"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "数据加载中" })).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={["/app/platform/business/shipment-reports?demoState=empty"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("requires a reason when cancelling a material exception", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/business/material-exceptions/material-exception-seed-001"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    const dialog = screen.getByRole("dialog", { name: "取消物料异常" });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认取消" }));
    expect(dialog).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("取消原因"), { target: { value: "异常记录重复提报" } });
    fireEvent.click(screen.getByRole("button", { name: "确认取消" }));
    expect(screen.getByText("已取消")).toBeInTheDocument();
    expect(screen.getByText("物料异常已取消")).toBeInTheDocument();
  });

  it("falls back to the login page for an unknown route", () => {
    render(<MemoryRouter initialEntries={["/missing"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeInTheDocument();
  });

  it("persists the selected demo session from a quick entry", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    screen.getByRole("button", { name: "工厂用户" }).click();
    expect(window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY)).toContain('"role":"factory"');
  });

  it("blocks a role route when the current session belongs to another organization", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("supplier")));
    render(<MemoryRouter initialEntries={["/app/platform"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "暂无访问权限" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "首页总览" })).not.toBeInTheDocument();
  });

  it("renders the frozen organization boundary page", () => {
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("factory", "disabled")));
    render(<MemoryRouter initialEntries={["/app/factory"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "当前商家已冻结" })).toBeInTheDocument();
    expect(screen.getByText(/华南智造 OEM 工厂/)).toBeInTheDocument();
  });

  it("opens the public merchant registration form from login", () => {
    render(<MemoryRouter initialEntries={["/"]}><AppRoutes /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /申请商家入驻/ }));
    expect(screen.getByRole("heading", { name: "申请商家入驻" })).toBeInTheDocument();
    expect(screen.getByLabelText("商家类型")).toHaveValue("supplier");
  });

  it("submits a merchant registration and adds it to platform todos", () => {
    const view = render(<MemoryRouter initialEntries={["/merchant/register"]}><AppRoutes /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("公司名称"), { target: { value: "新锐电子供应商" } });
    fireEvent.change(screen.getByLabelText("统一社会信用代码"), { target: { value: "91440300MA5NEW0001" } });
    fireEvent.change(screen.getByLabelText("管理员姓名"), { target: { value: "赵敏" } });
    fireEvent.change(screen.getByLabelText("管理员手机号码"), { target: { value: "13900139001" } });
    fireEvent.change(screen.getByLabelText("管理员邮箱"), { target: { value: "zhaomin@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "提交注册" }));
    expect(screen.getByRole("status")).toHaveTextContent("注册申请已提交，请等待平台审核");
    view.unmount();
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    render(<MemoryRouter initialEntries={["/app/platform/todos"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "商家注册(1)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /商家注册待审核-新锐电子供应商/ })).toBeInTheDocument();
  });

  it("separates merchant applications from approved merchant management", () => {
    window.localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([
      { id: "pending-merchant", version: 1, merchantNo: "MC-PENDING", merchantType: "supplier", companyName: "待审核供应商", creditCode: "91440300MA5PEND001", administratorName: "待审用户", administratorPhone: "13900139021", administratorEmail: "pending@example.com", reviewStatus: "pending", usageStatus: null, flowRecords: [], createdAt: "2026-08-13 14:00", updatedAt: "2026-08-13 14:00" },
      { id: "approved-merchant", version: 1, merchantNo: "MC-APPROVED", merchantType: "factory", companyName: "正常工厂", creditCode: "91440300MA5APPR001", administratorName: "正常用户", administratorPhone: "13900139022", administratorEmail: "approved@example.com", reviewStatus: "approved", usageStatus: "active", flowRecords: [], createdAt: "2026-08-12 14:00", updatedAt: "2026-08-12 15:00" },
    ]));
    window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(createDemoSession("platform")));
    const view = render(<MemoryRouter initialEntries={["/app/platform/merchants"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "商家管理" })).toBeInTheDocument();
    expect(screen.getByText("正常工厂")).toBeInTheDocument();
    expect(screen.queryByText("待审核供应商")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /商家注册审核\s*1/ })).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={["/app/platform/merchant-audits"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "商家审核" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /审核中\s*1/ })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "查看" })[0]);
    expect(screen.getByRole("dialog", { name: "商家详情" })).toHaveTextContent("待审核供应商");
  });

  it("does not reuse a previous application when a guest starts a new registration", () => {
    window.localStorage.setItem("quality-platform.merchant-applications", JSON.stringify([{ id: "stale-rejected-application", version: 1, merchantNo: "MC-STALE", merchantType: "supplier", companyName: "历史被驳回商家", creditCode: "91440300MA5STALE01", administratorName: "历史用户", administratorPhone: "13900139999", administratorEmail: "stale@example.com", reviewStatus: "rejected", usageStatus: null, reviewReason: "历史驳回", flowRecords: [], createdAt: "2026-08-01 09:00", updatedAt: "2026-08-01 10:00" }]));
    render(<MemoryRouter initialEntries={["/merchant/register"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "申请商家入驻" })).toBeInTheDocument();
    expect(screen.getByLabelText("公司名称")).toHaveValue("");
    expect(screen.queryByText("修改并重新提交注册")).not.toBeInTheDocument();
  });

  it("does not expose a guest review-progress route", () => {
    render(<MemoryRouter initialEntries={["/merchant/register/progress"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeInTheDocument();
  });
});
