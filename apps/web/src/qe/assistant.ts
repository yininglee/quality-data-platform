export type Evidence = {
  title: string;
  href: string;
  location: string;
  excerpt: string;
  date?: string;
};

export type QeField = { label: string; value: string | number };
export type QeAttachment = { name: string; dataUrl?: string; approvedStandard?: boolean };
export type QeRecord = {
  key: string;
  href: string;
  aliases?: string[];
  no: string;
  label: string;
  status: string;
  statusLabel: string;
  date: string;
  updatedAt: string;
  organizationId?: string;
  organization: string;
  material?: string;
  supplier?: string;
  fields: QeField[];
  history: QeField[];
  attachments: QeAttachment[];
  pending?: boolean;
  followUp?: boolean;
  missing?: string[];
  report?: {
    supplyMethod?: "factory_purchase" | "platform_purchase";
    exceptionSource?: string;
    eightDRequired?: boolean;
    eightDSubmittedAt?: string;
    defects?: Array<{ name: string; count: number }>;
    repairs?: Array<{ name: string; count: number }>;
  };
};

export type Period = { start: string; end: string };
export type MetricReading = { numerator: number; denominator: number; rate: number | null };
export type Metric = { id: string; label: string; href: string; defaultOrganizationId?: string; reading: (period: Period, organizationId?: string, materialNo?: string, supplier?: string) => MetricReading };
export type Scope = { id: string; name: string };
export type QeData = {
  records: QeRecord[];
  metrics: Metric[];
  organizations: Scope[];
  now: Date;
  readableLabels?: string[];
  sourcePages?: Record<string, string>;
};

export type AnswerSection = {
  label: string; text: string; sources: Evidence[];
  tasks?: { total: number; overdue: number; soon: number; categories: [string, number][] };
  recordCount?: number;
  change?: { current: number; previous: number; delta: number };
};
export type AnswerChart = {
  title: string; unit: string; kind: "line" | "bar" | "pareto";
  points: { label: string; value: number | null; valueText: string; cumulative?: number; sources: Evidence[] }[];
};
export type Answer = {
  kind: "brief" | "knowledge" | "metric" | "report" | "clarify";
  title: string;
  sections: AnswerSection[];
  note?: string;
  draft?: string;
  reportKind?: "week" | "month";
  caseKeys?: string[];
  topic?: string;
  metricId?: string;
  charts?: AnswerChart[];
};

export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[邮箱已隐藏]")
    .replace(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/g, "[手机号已隐藏]")
    .replace(/(?<![A-Za-z0-9])\d{17}[0-9Xx](?![A-Za-z0-9])/g, "[证件号已隐藏]")
    .replace(/((?:供应商|客户)(?:名称|信息|姓名)?|单价|成本|报价|联系人|收件人|联系电话|地址|运单号|supplier|customer|unit price)[ \t]*[：:=][^\n；;，,。|]+/gi, "$1：[已隐藏]");
}

export function dayInShanghai(now: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(now);
}

export function shiftDay(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function reportPeriods(date: string, kind: "week" | "month", previous = false): [Period, Period] {
  if (kind === "week") {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    const start = shiftDay(date, 1 - (day || 7) - (previous ? 7 : 0));
    return [{ start, end: shiftDay(start, 6) }, { start: shiftDay(start, -7), end: shiftDay(start, -1) }];
  }
  const [year, month] = date.split("-").map(Number);
  const start = (offset: number) => new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
  const offset = previous ? -1 : 0;
  return [
    { start: start(offset), end: shiftDay(start(offset + 1), -1) },
    { start: start(offset - 1), end: shiftDay(start(offset), -1) },
  ];
}

export function citeRecord(record: QeRecord, location: string, excerpt: string, date = record.date): Evidence {
  let safeExcerpt = redact(excerpt);
  if (record.supplier) safeExcerpt = safeExcerpt.replaceAll(record.supplier, "供应商（已脱敏）");
  let safeLocation = redact(location);
  if (record.supplier) safeLocation = safeLocation.replaceAll(record.supplier, "供应商（已脱敏）");
  return { title: `${record.label} · ${record.no}`, href: record.href, location: safeLocation, excerpt: safeExcerpt, date };
}

const rateText = (rate: number | null) => rate === null ? "暂无样本" : `${rate.toFixed(2)}%`;
const deltaText = (delta: number) => `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} 个百分点`;
export const periodText = (period: Period) => period.start === period.end ? period.start : `${period.start} 至 ${period.end}`;

export function comparison(metric: Metric, current: Period, prior: Period, organizationId?: string, materialNo?: string, supplier?: string) {
  const next = metric.reading(current, organizationId, materialNo, supplier);
  const base = metric.reading(prior, organizationId, materialNo, supplier);
  const delta = next.rate === null || base.rate === null ? null : next.rate - base.rate;
  const source = (period: Period, value: MetricReading): Evidence => ({
    title: metric.label,
    href: `${metric.href}${metric.href.includes("?") ? "&" : "?"}${new URLSearchParams({
      from: period.start, to: period.end, organizationId: organizationId ?? metric.defaultOrganizationId ?? "all",
      ...(materialNo ? { material: materialNo } : {}),
    })}`,
    location: `${periodText(period)} · 首页统计口径`,
    excerpt: value.rate === null ? "暂无样本" : `${rateText(value.rate)}（${value.numerator}/${value.denominator}）`,
  });
  const change = next.rate !== null && base.rate !== null && delta !== null
    ? { current: next.rate, previous: base.rate, delta } : undefined;
  return { next, base, delta, change, sources: [source(current, next), source(prior, base)], text: delta === null
    ? `${periodText(current)} ${rateText(next.rate)}；${periodText(prior)} ${rateText(base.rate)}。依据不足，无法比较。`
    : `${periodText(current)} ${rateText(next.rate)}，较 ${periodText(prior)}（${rateText(base.rate)}）${deltaText(delta)}。` };
}

function taskAge(record: QeRecord, now: Date): number | undefined {
  const value = record.updatedAt;
  const local = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(value);
  const timestamp = Date.parse(local ? `${value.replace(" ", "T")}${value.length === 10 ? "T00:00" : ""}+08:00` : value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime() ? (now.getTime() - timestamp) / 3_600_000 : undefined;
}

export function dailyBrief(data: QeData): Answer {
  const today = dayInShanghai(data.now);
  const yesterday = shiftDay(today, -1);
  const beforeYesterday = shiftDay(today, -2);
  const [week, lastWeek] = reportPeriods(today, "week");
  const priorWeekToDate = { ...lastWeek, end: shiftDay(today, -7) };
  const tasks = data.records.filter((record) => record.pending).map((record) => ({ record, age: taskAge(record, data.now) }))
    .sort((left, right) => (right.age ?? -1) - (left.age ?? -1));
  const counts = new Map<string, number>();
  for (const { record } of tasks) counts.set(record.label, (counts.get(record.label) ?? 0) + 1);
  const overdue = tasks.filter(({ age = -1 }) => age >= 48).length;
  const soon = tasks.filter(({ age = -1 }) => age >= 36 && age < 48).length;
  const taskSource = ({ record, age }: typeof tasks[number]) => {
    const elapsed = age === undefined ? "" : age >= 48
      ? `停留 ${Math.floor(age / 24)} 天 ${Math.floor(age % 24)} 小时`
      : `停留 ${Math.floor(age)} 小时`;
    const urgency = age === undefined || age < 36 ? "" : age >= 48 ? "超期" : "临期";
    return citeRecord(record, "最近流转", [record.statusLabel, elapsed, urgency].filter(Boolean).join(" · "), record.updatedAt);
  };
  const followUps = data.records.filter((record) => record.followUp)
    .map((record) => ({ record, age: taskAge(record, data.now) })).sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
  const gaps = data.records.filter((record) => (record.pending || record.followUp) && record.missing?.length);
  const scopes: Array<{ id?: string; name: string }> = [{ name: "" }, ...data.organizations];
  const changes = data.metrics.flatMap((metric) => scopes.flatMap(({ id, name }) => [
    { periodLabel: "昨日", ...comparison(metric, { start: yesterday, end: yesterday }, { start: beforeYesterday, end: beforeYesterday }, id) },
    { periodLabel: "本周", ...comparison(metric, { ...week, end: today }, priorWeekToDate, id) },
  ].map(({ periodLabel, ...value }) => ({
    label: [metric.label, periodLabel, name].filter(Boolean).join(" · "), ...value,
  }))));
  const fluctuations = changes.filter(({ delta }) => delta !== null && Math.abs(delta) >= 2 - 1e-9)
    .sort((left, right) => Math.abs(right.delta!) - Math.abs(left.delta!));
  return {
    kind: "brief", title: "今日简报",
    note: "演示规则 · 最近流转后满 48 小时为超期，满 36 小时为临期。指标变化达到 2 个百分点时提示。",
    sections: [
      { label: "平台待办", tasks: { total: tasks.length, overdue, soon, categories: [...counts] }, text: `${tasks.length} 项待办 · ${overdue} 项超期 · ${soon} 项临期${counts.size ? `\n${[...counts].map(([label, count]) => `${label} ${count}`).join(" · ")}` : ""}`, sources: tasks.slice(0, 5).map(taskSource) },
      { label: "异常跟踪", recordCount: followUps.length, text: followUps.length ? `${followUps.length} 项物料或售后异常待跟踪，按停留时长排序。` : "暂无待跟踪异常。", sources: followUps.slice(0, 4).map(taskSource) },
      { label: "资料待补", recordCount: gaps.length, text: gaps.length ? `${gaps.length} 张待处理单据存在缺项。` : "当前待处理单据暂无已识别缺项。", sources: gaps.slice(0, 4).map((record) => citeRecord(record, "待核对字段", record.missing!.join("、"))) },
      ...fluctuations.slice(0, 5).map(({ label, text, sources, change }) => ({ label, text, sources, change })),
      ...(!fluctuations.length ? [{ label: "关键指标波动", text: changes.some(({ delta }) => delta !== null)
        ? "昨日和本周已具备对比数据的指标未达到波动阈值。"
        : "昨日和本周缺少可比较的指标样本。", sources: [] }] : []),
    ],
  };
}

function metricBreakdown(total: ReturnType<typeof comparison>, groups: Array<{ label: string } & ReturnType<typeof comparison>>, dimension: string): AnswerSection[] {
  const partitionMatches = total.delta !== null &&
    (["next", "base"] as const).every((period) =>
      (["numerator", "denominator"] as const).every((part) =>
        groups.reduce((sum, group) => sum + group[period][part], 0) === total[period][part]));
  if (partitionMatches) {
    return groups.map((group) => ({
      ...group,
      contribution: 100 * (group.next.numerator / total.next.denominator - group.base.numerator / total.base.denominator),
    })).filter(({ contribution }) => Math.abs(contribution) >= 0.005)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 3)
      .map((group) => ({ label: `${group.label} · ${dimension}统计贡献`,
        text: `${deltaText(group.contribution)}。按该组分子占各周期总分母的变化计算。 ${group.text}`, sources: group.sources }));
  }
  return groups.filter(({ delta }) => delta !== null).sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!))
    .slice(0, 3).map(({ label, text, sources }) => ({ label, text, sources }));
}

export function metricAnswer(data: QeData, periods: [Period, Period], metricId?: string, organizationId?: string, materialNo?: string): Answer {
  const metrics = data.metrics.filter((metric) => !metricId || metric.id === metricId);
  const sections: AnswerSection[] = metrics.map((metric) => {
    const result = comparison(metric, ...periods, organizationId, materialNo);
    return { label: metric.label, text: result.text, sources: result.sources, change: result.change };
  });
  const selected = metrics.length === 1 ? metrics[0] : undefined;
  if (selected) {
    const total = comparison(selected, ...periods, organizationId, materialNo);
    if (!organizationId) {
      sections.push(...metricBreakdown(total, data.organizations.map((org) => ({
        label: org.name, ...comparison(selected, ...periods, org.id, materialNo),
      })), "组织"));
    }
    const materialSet = new Set(data.records.filter((row) => row.material && (!organizationId || row.organizationId === organizationId) &&
      periods.some((period) => row.date.slice(0, 10) >= period.start && row.date.slice(0, 10) <= period.end)).map((row) => row.material!));
    if (total.delta !== null && !materialNo) {
      sections.push(...metricBreakdown(total, [...materialSet].map((material) => ({
        label: material, ...comparison(selected, ...periods, organizationId, material),
      })), "物料"));
    }
    if (total.delta !== null && ["factory_incoming", "digital_incoming"].includes(selected.id)) {
      const method = selected.id === "factory_incoming" ? "factory_purchase" : "platform_purchase";
      const matching = data.records.filter((row) => row.label === "来料检验" && row.report?.supplyMethod === method &&
        ["completed", "rejected"].includes(row.status) && (!organizationId || row.organizationId === organizationId) &&
        (!materialNo || row.material === materialNo) && periods.some((period) => row.date >= period.start && row.date <= period.end));
      const suppliers = [...new Set(matching.flatMap((row) => row.supplier ? [row.supplier] : []))].sort();
      sections.push(...metricBreakdown(total, suppliers.map((supplier, index) => {
        const result = comparison(selected, ...periods, organizationId, materialNo, supplier);
        const sourceRecords = matching.filter((row) => row.supplier === supplier);
        return {
          ...result, label: `供应商 ${index + 1}（已脱敏）`,
          sources: periods.flatMap((period) => sourceRecords.filter((row) => row.date >= period.start && row.date <= period.end)
            .slice(0, 2).map((row) => citeRecord(row, "来料检验结果及审核状态",
              `${row.statusLabel} · ${row.fields.find(({ label }) => label === "检验结果")?.value ?? "结果未登记"}`))),
        };
      }), "供应商"));
    }
  }
  return { kind: "metric", title: "指标变化摘要", sections, metricId,
    note: "统计贡献用于定位下钻范围。判断成因需核对分子、分母和相关单据。" };
}
