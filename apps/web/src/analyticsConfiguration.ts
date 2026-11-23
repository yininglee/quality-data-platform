export const ANALYTICS_REPORTS_STORAGE_KEY = "quality-platform.analytics-reports";
export const ANALYTICS_DASHBOARDS_STORAGE_KEY = "quality-platform.analytics-dashboards";

export type AnalyticsChartType = "kpi" | "table" | "bar";
export type AnalyticsMetric = "record_count" | "status_ratio";
export type AnalyticsReportStatus = "draft" | "active" | "disabled";
export type AnalyticsRecord = {
  id: string;
  businessCode: string;
  businessName: string;
  organizationId: string;
  organizationName: string;
  status: string;
  businessDate: string;
};

export type AnalyticsFilter = {
  organizationId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

export type AnalyticsReportDraft = {
  businessCode: string;
  dimension: "organization" | "status" | "date";
  metric: AnalyticsMetric;
  ratioStatus: string;
  filters: AnalyticsFilter;
  chartType: AnalyticsChartType;
};

export type AnalyticsReportVersion = AnalyticsReportDraft & {
  version: number;
  name: string;
  publishedAt: string;
  publishedBy: string;
};

export type AnalyticsReport = {
  id: string;
  name: string;
  code: string;
  status: AnalyticsReportStatus;
  draft: AnalyticsReportDraft;
  versions: AnalyticsReportVersion[];
  updatedAt: string;
  updatedBy: string;
};

export type AnalyticsDashboardItem = { id: string; reportId: string; title?: string };
export type AnalyticsDashboardDraft = { filters: AnalyticsFilter; items: AnalyticsDashboardItem[] };
export type AnalyticsDashboard = {
  id: string;
  name: string;
  code: string;
  status: "draft" | "active";
  draft: AnalyticsDashboardDraft;
  active: AnalyticsDashboardDraft | null;
  updatedAt: string;
  updatedBy: string;
};

export type AnalyticsQueryResult = {
  records: AnalyticsRecord[];
  groups: Array<{ key: string; label: string; count: number; ratio: number | null }>;
  total: number;
  ratio: number | null;
  numerator: number;
  denominator: number;
};

export const emptyReportDraft = (): AnalyticsReportDraft => ({
  businessCode: "inbound_report",
  dimension: "status",
  metric: "record_count",
  ratioStatus: "approved",
  filters: {},
  chartType: "bar",
});

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function readStored<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch { return []; }
}
function writeStored<T>(key: string, values: T[]): void { window.localStorage.setItem(key, JSON.stringify(values)); }

export function readAnalyticsReports(): AnalyticsReport[] { return readStored<AnalyticsReport>(ANALYTICS_REPORTS_STORAGE_KEY); }
export function readAnalyticsDashboards(): AnalyticsDashboard[] { return readStored<AnalyticsDashboard>(ANALYTICS_DASHBOARDS_STORAGE_KEY); }

export function saveAnalyticsReport(report: AnalyticsReport): AnalyticsReport {
  const next = { ...clone(report), updatedAt: "2026-08-29 16:00" };
  const all = readAnalyticsReports();
  writeStored(ANALYTICS_REPORTS_STORAGE_KEY, [next, ...all.filter((item) => item.id !== next.id)]);
  return next;
}

export function createAnalyticsReport(name: string, code: string): AnalyticsReport {
  const normalizedName = name.trim(); const normalizedCode = code.trim().toUpperCase();
  if (!normalizedName || !normalizedCode) throw new Error("报表名称和编码不能为空");
  if (readAnalyticsReports().some((item) => item.code === normalizedCode)) throw new Error("报表编码已存在");
  return saveAnalyticsReport({ id: `report-${Date.now()}`, name: normalizedName, code: normalizedCode, status: "draft", draft: emptyReportDraft(), versions: [], updatedAt: "2026-08-29 16:00", updatedBy: "平台管理员" });
}

export function publishAnalyticsReport(report: AnalyticsReport): AnalyticsReport {
  if (!report.draft.businessCode) throw new Error("请选择业务数据源");
  const version = report.versions.length + 1;
  const published: AnalyticsReportVersion = { ...clone(report.draft), version, name: `${report.name} V${version}`, publishedAt: "2026-08-29 16:00", publishedBy: "平台管理员" };
  return saveAnalyticsReport({ ...report, status: "active", versions: [published, ...report.versions], updatedBy: "平台管理员" });
}

export function disableAnalyticsReport(report: AnalyticsReport): AnalyticsReport {
  const referenced = readAnalyticsDashboards().some((dashboard) => dashboard.draft.items.some((item) => item.reportId === report.id) || dashboard.active?.items.some((item) => item.reportId === report.id));
  if (referenced) throw new Error("报表已被看板引用，请先移除组件");
  return saveAnalyticsReport({ ...report, status: "disabled", updatedBy: "平台管理员" });
}

export function saveAnalyticsDashboard(dashboard: AnalyticsDashboard): AnalyticsDashboard {
  const next = { ...clone(dashboard), updatedAt: "2026-08-29 16:00" };
  const all = readAnalyticsDashboards();
  writeStored(ANALYTICS_DASHBOARDS_STORAGE_KEY, [next, ...all.filter((item) => item.id !== next.id)]);
  return next;
}

export function createAnalyticsDashboard(name: string, code: string): AnalyticsDashboard {
  const normalizedName = name.trim(); const normalizedCode = code.trim().toUpperCase();
  if (!normalizedName || !normalizedCode) throw new Error("看板名称和编码不能为空");
  if (readAnalyticsDashboards().some((item) => item.code === normalizedCode)) throw new Error("看板编码已存在");
  return saveAnalyticsDashboard({ id: `dashboard-${Date.now()}`, name: normalizedName, code: normalizedCode, status: "draft", draft: { filters: {}, items: [] }, active: null, updatedAt: "2026-08-29 16:00", updatedBy: "平台管理员" });
}

export function publishAnalyticsDashboard(dashboard: AnalyticsDashboard): AnalyticsDashboard {
  if (!dashboard.draft.items.length) throw new Error("请至少添加一个已发布报表组件");
  return saveAnalyticsDashboard({ ...dashboard, status: "active", active: clone(dashboard.draft), updatedBy: "平台管理员" });
}

export function queryAnalyticsRecords(records: AnalyticsRecord[], definition: AnalyticsReportDraft, globalFilters: AnalyticsFilter = {}, permittedOrganizationIds?: string[]): AnalyticsQueryResult {
  const filters = { ...definition.filters, ...Object.fromEntries(Object.entries(globalFilters).filter(([, value]) => value !== undefined && value !== "")) } as AnalyticsFilter;
  const visible = records.filter((record) => record.businessCode === definition.businessCode
    && (!permittedOrganizationIds || permittedOrganizationIds.includes(record.organizationId))
    && (!filters.organizationId || record.organizationId === filters.organizationId)
    && (!filters.status || record.status === filters.status)
    && (!filters.startDate || record.businessDate >= filters.startDate)
    && (!filters.endDate || record.businessDate <= filters.endDate));
  const keyFor = (record: AnalyticsRecord) => definition.dimension === "organization" ? record.organizationId : definition.dimension === "status" ? record.status : record.businessDate;
  const labelFor = (record: AnalyticsRecord) => definition.dimension === "organization" ? record.organizationName : definition.dimension === "status" ? record.status : record.businessDate;
  const grouped = new Map<string, { label: string; count: number; numerator: number }>();
  visible.forEach((record) => { const key = keyFor(record); const current = grouped.get(key) ?? { label: labelFor(record), count: 0, numerator: 0 }; current.count += 1; current.numerator += record.status === definition.ratioStatus ? 1 : 0; grouped.set(key, current); });
  const denominator = visible.length; const numerator = visible.filter((record) => record.status === definition.ratioStatus).length;
  return { records: visible, total: denominator, numerator, denominator, ratio: denominator ? numerator / denominator : null, groups: [...grouped.entries()].map(([key, value]) => ({ key, label: value.label, count: value.count, ratio: value.count ? value.numerator / value.count : null })) };
}
