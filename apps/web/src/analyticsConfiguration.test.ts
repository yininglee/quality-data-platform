import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_DASHBOARDS_STORAGE_KEY,
  ANALYTICS_REPORTS_STORAGE_KEY,
  createAnalyticsDashboard,
  createAnalyticsReport,
  disableAnalyticsReport,
  publishAnalyticsDashboard,
  publishAnalyticsReport,
  queryAnalyticsRecords,
  saveAnalyticsDashboard,
} from "./analyticsConfiguration";

const records = [
  { id: "one", businessCode: "inbound_report", businessName: "入库报告", organizationId: "factory-a", organizationName: "工厂 A", status: "approved", businessDate: "2026-08-10" },
  { id: "two", businessCode: "inbound_report", businessName: "入库报告", organizationId: "factory-a", organizationName: "工厂 A", status: "pending_review", businessDate: "2026-08-11" },
  { id: "three", businessCode: "shipment_report", businessName: "出货报告", organizationId: "factory-b", organizationName: "工厂 B", status: "approved", businessDate: "2026-08-11" },
];

describe("analytics configuration", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses one filtered record range for grouped metrics", () => {
    const result = queryAnalyticsRecords(records, { businessCode: "inbound_report", dimension: "status", metric: "status_ratio", ratioStatus: "approved", filters: { startDate: "2026-08-10", endDate: "2026-08-11" }, chartType: "bar" });
    expect(result.records.map((record) => record.id)).toEqual(["one", "two"]);
    expect(result).toMatchObject({ total: 2, numerator: 1, denominator: 2, ratio: 0.5 });
    expect(result.groups.find((group) => group.key === "approved")).toMatchObject({ count: 1, ratio: 1 });
  });

  it("returns no percentage when a ratio denominator is zero", () => {
    const result = queryAnalyticsRecords(records, { businessCode: "inbound_report", dimension: "status", metric: "status_ratio", ratioStatus: "approved", filters: { organizationId: "missing" }, chartType: "kpi" });
    expect(result).toMatchObject({ total: 0, numerator: 0, denominator: 0, ratio: null });
  });

  it("publishes an immutable report version while keeping the editable draft", () => {
    const report = createAnalyticsReport("入库状态", "INBOUND_STATUS");
    const published = publishAnalyticsReport({ ...report, draft: { ...report.draft, dimension: "organization" } });
    expect(published).toMatchObject({ status: "active", versions: [expect.objectContaining({ version: 1, dimension: "organization" })] });
    const revised = { ...published, draft: { ...published.draft, dimension: "date" as const } };
    expect(revised.versions[0].dimension).toBe("organization");
    expect(JSON.parse(window.localStorage.getItem(ANALYTICS_REPORTS_STORAGE_KEY) ?? "[]")[0].versions[0].dimension).toBe("organization");
  });

  it("prevents disabling a report referenced by a dashboard", () => {
    const report = publishAnalyticsReport(createAnalyticsReport("入库状态", "INBOUND_STATUS"));
    const dashboard = createAnalyticsDashboard("质量总览", "QUALITY_OVERVIEW");
    saveAnalyticsDashboard({ ...dashboard, draft: { filters: {}, items: [{ id: "item-1", reportId: report.id }] } });
    expect(() => disableAnalyticsReport(report)).toThrow("报表已被看板引用");
    expect(publishAnalyticsDashboard({ ...dashboard, draft: { filters: {}, items: [{ id: "item-1", reportId: report.id }] } })).toMatchObject({ status: "active" });
    expect(window.localStorage.getItem(ANALYTICS_DASHBOARDS_STORAGE_KEY)).toContain("QUALITY_OVERVIEW");
  });
});
