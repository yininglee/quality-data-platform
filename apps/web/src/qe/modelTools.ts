import { citeRecord, comparison, dayInShanghai, metricAnswer, periodText, reportPeriods, shiftDay,
  type Answer, type Evidence, type Period, type QeData, type QeField, type QeRecord } from "./assistant";
import { citeSample } from "./evidence";
import { isEffective, knowledgeAnswer, type IndexedAttachment } from "./knowledge";
import type { ToolCall } from "./modelProtocol";
import { reportAnswer, reportChapter } from "./report";

export type FactData = { label: string; text: string; sources: Evidence[]; value?: number | null; valueText?: string; cumulative?: number };
export type DatasetData = { title: string; unit: string; points: FactData[]; kind?: "pareto" };
export type ReportData = { kind: "week" | "month"; answer: Answer; chapters: Array<{label: string; facts: FactData[]}> };
export type ToolData = { facts: FactData[]; datasets?: DatasetData[]; report?: ReportData; message?: string };
export type ToolContext = {
  data: QeData; record?: QeRecord; defaults: { organizationId?: string; date?: string; metricId?: string; material?: string };
  forced?: { organizationId?: string; date?: string };
  signal: AbortSignal;
  extract: (rows: QeRecord[], signal: AbortSignal, temporary?: boolean) => Promise<{ attachments: IndexedAttachment[]; partial: boolean }>;
};

const validDate = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) &&
  new Date(day).toISOString().slice(0, 10) === day;
const matches = (date: string, { start, end }: Period) => date.slice(0, 10) >= start && date.slice(0, 10) <= end;
const showRate = (value: number | null) => value === null ? "暂无样本" : `${value.toFixed(2)}%`;
const order = (a: QeRecord, b: QeRecord) => b.date.localeCompare(a.date) || a.no.localeCompare(b.no);

function buckets(period: Period, grain: string) {
  if (grain !== "day" && grain !== "week" && grain !== "month") return [period];
  const chunks: Period[] = [];
  for (let start = period.start; start <= period.end; ) {
    const calendarEnd = grain === "day" ? start : reportPeriods(start, grain)[0].end;
    const end = calendarEnd > period.end ? period.end : calendarEnd;
    chunks.push({ start, end });
    if (chunks.length > 62) throw new Error("分组超过 62 个，请缩短期间或选择更粗粒度。");
    start = shiftDay(end, 1);
  }
  return chunks;
}

function factsFromAnswer(answer: Answer) {
  const facts: FactData[] = answer.sections.flatMap(({ label, text, sources }) =>
    sources.length ? [{ label, text, sources }] : []);
  return { facts, message: facts.length ? answer.note : answer.sections.map(({text}) => text).join(" ").slice(0, 320) };
}

function recordFact(row: QeRecord, { label, value }: QeField, maxLength?: number): FactData {
  const source = citeRecord(row, label, String(value));
  if (maxLength && source.excerpt.length > maxLength) source.excerpt = source.excerpt.slice(0, maxLength) + "…";
  return {
    label: `${row.no} · ${label}`, text: `${row.label} · ${row.no} · ${label}：${source.excerpt}`, sources: [source],
    ...(typeof value === "number" ? { value, valueText: source.excerpt } :
      /^-?\d+(?:\.\d+)?%$/.test(source.excerpt) ? { valueText: source.excerpt } : {}),
  };
}

export function documentFacts(record: QeRecord): FactData[] {
  const fields: QeField[] = [
    { label: "当前状态", value: record.statusLabel },
    ...(record.organization ? [{ label: "单据组织", value: record.organization }] : []),
    ...(record.date ? [{ label: "业务日期", value: record.date }] : []),
    ...record.fields.filter(({ label }) => label !== "当前状态").slice(0, 20),
    ...record.history.slice(-5).reverse(),
    ...record.attachments.slice(0, 4).map(({ name }) => ({ label: "附件文件名", value: name })),
    ...(record.missing?.length ? [{ label: "缺少资料", value: record.missing.join("、") }] : []),
  ];
  return fields.map(field => recordFact(record, field, 400));
}

export async function executeModelTool(call: ToolCall, context: ToolContext): Promise<ToolData> {
  const { data, defaults, forced, record, signal, extract } = context;
  const { tool, args } = call;
  const arg = (key: string) => typeof args[key] === "string" ? args[key] as string : undefined;
  const requestedNo = arg("businessNo");
  const explicitRecord = requestedNo && (tool === "records" || tool === "knowledge");
  const org = forced?.organizationId || arg("organizationId") || (explicitRecord ? undefined : defaults.organizationId);
  const organizationId = org === "all" ? undefined : org;
  if (organizationId && !data.organizations.some(item => item.id === organizationId)) throw new Error("指定组织不在可查询的范围内。");
  const material = arg("material") ?? (tool === "report" || explicitRecord ? undefined : defaults.material);
  const today = dayInShanghai(data.now);
  const date = forced?.date || arg("date") || defaults.date || today;
  if (!validDate(date)) throw new Error("统计日期须为真实的 YYYY-MM-DD。");
  const [week, lastWeek] = reportPeriods(date, "week");
  const period = { start: arg("start") ?? week.start, end: arg("end") ?? (week.end > today && week.start <= today ? today : week.end) };
  const dayCount = Math.round((Date.parse(period.end) - Date.parse(period.start)) / 86_400_000) + 1;
  if (!validDate(period.start) || !validDate(period.end) || dayCount < 1 || dayCount > 740) throw new Error("请给出有效且不超过 740 天的日期范围。");
  const prior = { start: arg("compareStart") ?? shiftDay(period.start, -dayCount), end: arg("compareEnd") ?? shiftDay(period.start, -1) };
  if (!validDate(prior.start) || !validDate(prior.end) || prior.start > prior.end) throw new Error("比较期间无效。");
  const metricId = arg("metricId") ?? (tool === "investigate" ? defaults.metricId : undefined);
  const metrics = metricId ? data.metrics.filter(m => m.id === metricId) : data.metrics;
  if (metricId && !metrics.length) throw new Error("指标不在可查目录中。请使用指标 ID。");
  const records = data.records.filter(row => (!organizationId || row.organizationId === organizationId) &&
    (!material || row.material?.toUpperCase() === material.toUpperCase()));
  const windowRecords = records.filter(row => !(arg("start") || arg("end")) || matches(row.date, period));
  const scoped = { ...data, records };
  const current = record && records.some(row => row.key === record.key) ? record : undefined;
  const anchor = !requestedNo || current?.no.toUpperCase() === requestedNo.toUpperCase() ? current
    : records.find(row => row.no.toUpperCase() === requestedNo.toUpperCase());

  if (tool === "metric") {
    if (!metrics.length) return { facts: [], message: "当前无可读取指标。" };
    const grain = arg("grain") ?? "";
    if (grain && !["day", "week", "month"].includes(grain)) throw new Error("可用粒度为 day、week、month。");
    const windows = buckets(period, grain);
    if (windows.length * metrics.length > 64) throw new Error("数据点过多，请明确指标或缩小区间。");
    const scope = data.organizations.find(item => item.id === organizationId)?.name ?? "全部可见组织";
    const datasets = metrics.slice(0, grain ? 4 : metrics.length).map(metric => {
      const points = windows.map(window => {
        const reading = comparison(metric, window, window, organizationId, material);
        return {
          label: periodText(window), value: reading.next.rate,
          valueText: showRate(reading.next.rate), text: `${metric.label} · ${scope} · ${periodText(window)} · ${reading.sources[0].excerpt}`,
          sources: reading.next.rate === null ? [] : [reading.sources[0]],
        };
      });
      return { title: `${metric.label} · ${scope}`, unit: "%", points };
    });
    const requestedComparison = arg("compareStart") || arg("compareEnd");
    const comparisons = requestedComparison ? metrics.map(metric => {
      const result = comparison(metric, period, prior, organizationId, material);
      return { label: metric.label, text: result.text, sources: result.sources };
    }) : [];
    return { facts: [...comparisons, ...datasets.flatMap(d => d.points)], datasets,
      message: datasets.every(d => d.points.every(p => p.value === null)) ? "所选范围暂无有效样本。" : undefined };
  }

  if (tool === "scan") {
    const threshold = typeof args.threshold === "number" && args.threshold > 0 && args.threshold <= 100 ? args.threshold : 2;
    const min = typeof args.minSamples === "number" && Number.isInteger(args.minSamples) && args.minSamples >= 1 ? args.minSamples : 3;
    const baseline = arg("compareStart") || arg("compareEnd") ? prior : arg("start") || arg("end") ? prior
      : { ...lastWeek, end: shiftDay(period.end, -7) };
    const readings = data.metrics.map(metric => ({ label: metric.label, ...comparison(metric, period, baseline, organizationId) }));
    const usable = readings.filter(r => r.delta !== null && r.next.denominator >= min && r.base.denominator >= min);
    const notable = usable.filter(r => Math.abs(r.delta!) >= threshold - 1e-9).sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
    return {
      facts: readings.map(r => ({ label: r.label, sources: r.sources, text:
        `${r.text} ${!usable.includes(r) ? "样本不足，未纳入判定。" : notable.includes(r) ? "达到波动阈值。" : "未达波动阈值。"} 规则：变化 ≥ ${threshold} 个百分点，两期样本各至少 ${min}。` })),
      message: notable.length ? `按绝对变化幅度排序：${notable.map(r => r.label).join("、")}` : "可比较指标中无达到阈值的波动。",
    };
  }

  if (tool === "investigate") {
    if (!metricId) throw new Error("请选择要研判的指标 ID。");
    const metric = metrics[0];
    const overall = comparison(metric, period, prior, organizationId, material);
    const summary = metricAnswer(scoped, [period, prior], metricId, organizationId, material);
    const result = factsFromAnswer(summary);
    if (overall.delta === null || Math.min(overall.base.denominator, overall.next.denominator) < 3) {
      return { facts: result.facts.slice(0, 1), message: "样本不足，暂不能给出有依据的候选维度。" };
    }
    if (metricId === "inspection_first" || metricId === "inspection_second") {
      const process = metricId === "inspection_first" ? "一检" : "二检";
      const selected = records.filter(row => row.fields.some(f => f.label === "检验工序" && f.value === process));
      result.facts.push(...defectChanges(selected, period, prior));
    }
    return { ...result, message: "统计贡献及缺陷变化为核查候选。需要匹配批次或已确认的单据才能论证根因。" };
  }

  if (tool === "records") {
    const label = arg("businessType");
    const query = arg("query")?.toLowerCase();
    const requestedFields = Array.isArray(args.fields) ? args.fields : undefined;
    const limit = typeof args.limit === "number" ? Math.max(1, Math.min(Math.floor(args.limit), 12)) : 5;
    if (!requestedNo && !label && !material && !query && !anchor && !arg("start") && !arg("end")) {
      return { facts: [], message: "请指定单据号、业务类型、物料、描述关键词或时间范围中的至少一项。" };
    }
    const candidates = windowRecords.filter(row => (!requestedNo || row.no.toUpperCase() === requestedNo.toUpperCase()) &&
      (!label || row.label === label) && (!query || [row.no, row.label, row.material, ...row.fields.map(f => String(f.value))]
        .some(text => text?.toLowerCase().includes(query)))).sort(order);
    const selected = !requestedNo && !label && !material && !query && !arg("start") && !arg("end") && anchor
      ? candidates.filter(row => row.key === anchor.key) : candidates;
    return {
      facts: selected.slice(0, limit).flatMap(row => {
        const fields = requestedFields ? [...row.fields, ...row.history].filter(f => requestedFields.some(name => f.label.includes(name)))
          : [{ label: "当前状态", value: row.statusLabel }, ...row.fields.filter(f => f.label !== "当前状态")];
        return fields.slice(0, 9).map(field => recordFact(row.key === current?.key ? current : row, field));
      }).slice(0, 42),
      message: selected.length ? undefined : "没有符合当前筛选条件的可见单据。",
    };
  }

  if (tool === "knowledge") {
    const query = arg("query");
    if (!query) throw new Error("请提供检索词。");
    if (requestedNo && !anchor) throw new Error("找不到该可见单据。");
    const collection = arg("collection") ?? "cases";
    if (collection === "attachment" && !anchor) throw new Error("请指定要查附件的业务单号。");
    let pool = collection === "attachment" ? [anchor!] : windowRecords.filter(isEffective);
    if (collection === "8d") pool = pool.filter(row => row.status === "approved" && /物料异常|售后异常/.test(row.label));
    if (collection === "rules") pool = pool.filter(row => row.attachments.some(item => item.approvedStandard)).map(row => ({
      ...row, attachments: row.attachments.filter(item => item.approvedStandard),
    }));
    const ranked = [...pool].filter(row => row.attachments.some(item => item.dataUrl)).sort((a, b) => {
      const rank = (row: QeRecord) => Number(!!row.material && (row.material === anchor?.material || query.includes(row.material)));
      return rank(b) - rank(a) || order(a, b);
    }).slice(0, 8);
    const extraction = await extract(ranked, signal, collection === "attachment");
    if (collection === "attachment") return {
      facts: extraction.attachments.flatMap(({ record: found, fragment, name }) => {
        const source = citeRecord(found, `${name} / ${fragment.location}`, fragment.text.slice(0, 480));
        return source.excerpt ? [{ label: source.location, text: source.excerpt, sources: [source] }] : [];
      }).slice(0, 12),
      message: extraction.partial ? "部分内容未能解析，请在原单据核对。" : undefined,
    };
    if (!["cases", "rules", "8d"].includes(collection)) throw new Error("可用知识集合为 cases、rules、8d、attachment。");
    const answer = knowledgeAnswer(query, pool, anchor, extraction.attachments, {
      mode: collection === "8d" || collection === "rules" ? collection : "history", partialAttachments: extraction.partial,
    });
    const result = factsFromAnswer(answer);
    return { ...result, facts: result.facts.flatMap(fact => fact.sources.map(source => ({
      label: `${source.title} · ${source.location}`, text: source.excerpt, sources: [source],
    }))) };
  }

  if (tool === "defects") {
    const selected = records.filter(row => matches(row.date, period) && row.report?.defects &&
      (!arg("process") || row.fields.some(f => f.label === "检验工序" && f.value === arg("process"))));
    const counts = defectCounts(selected);
    const total = counts.reduce((sum, entry) => sum + entry.count, 0);
    let running = 0;
    const points = counts.slice(0, 12).map(({ label, count, rows }) => {
      running += count;
      const text = `${label} ${count} 件，占 ${(count * 100 / total).toFixed(2)}%，累计 ${(running * 100 / total).toFixed(2)}%。`;
      return { label, value: count, valueText: `${count} 件`, text,
        sources: recordSources(label, text, rows, "日报不良明细"),
        cumulative: 100 * running / total };
    });
    return { facts: points, datasets: [{ title: `生产不良 · ${periodText(period)}`, unit: "件", kind: "pareto", points }],
      message: points.length ? undefined : "期间内无可引用的缺陷明细。" };
  }

  const kind = arg("kind");
  if (kind !== "week" && kind !== "month") throw new Error("报告类型须为 week 或 month。");
  const answer = reportAnswer(scoped, { kind, date, previous: false, organizationId, traceSamples: true });
  const chapters = new Map<string, FactData[]>();
  for (const section of answer.sections) {
    if (kind === "week" && !data.metrics.some(m => m.label === section.label) &&
      !["重点待跟踪问题", "本周业务与待办"].includes(section.label)) continue;
    const label = kind === "month" ? reportChapter(section) : "当周质量简析";
    let facts = chapters.get(label);
    if (!facts) { facts = []; chapters.set(label, facts); }
    facts.push({ label: section.label, text: section.text, sources: section.sources });
  }
  return { facts: [], report: { kind, answer, chapters: [...chapters].map(([label, facts]) => ({ label, facts })) } };
}

function recordSources(label: string, text: string, rows: QeRecord[], location: string) {
  const sample = citeSample(label, text, rows);
  return [...(sample ? [sample] : []), ...rows.slice(0, 3).map(row =>
    citeRecord(row, location, (row.report?.defects ?? []).filter(item => item.name === label).map(item => `${item.name} ${item.count} 件`).join(" · ") || row.statusLabel))];
}

function defectCounts(records: QeRecord[]) {
  const byDefect = new Map<string, { label: string; count: number; rows: QeRecord[] }>();
  for (const row of records) for (const defect of row.report?.defects ?? []) {
    if (defect.count <= 0) continue;
    const entry = byDefect.get(defect.name) ?? { label: defect.name, count: 0, rows: [] };
    entry.count += defect.count;
    entry.rows.push(row);
    byDefect.set(defect.name, entry);
  }
  return [...byDefect.values()].sort((a, b) => b.count - a.count);
}

function defectChanges(rows: QeRecord[], period: Period, prior: Period): FactData[] {
  const base = new Map(defectCounts(rows.filter(row => matches(row.date, prior))).map(item => [item.label, item]));
  return defectCounts(rows.filter(row => matches(row.date, period))).map(item => {
    const previous = base.get(item.label);
    return { ...item, previous: previous?.count ?? 0, rows: [...item.rows, ...(previous?.rows ?? [])] };
  }).sort((a, b) => (b.count - b.previous) - (a.count - a.previous)).filter(item => item.count > item.previous).slice(0, 4)
    .map(({ label, count, previous, rows }) => {
      const text = `${label}当前 ${count} 件，基线 ${previous} 件。件数受检验量影响，需核对批次和制程。`;
      return { label, text, sources: recordSources(label, text, rows, "日报缺陷明细") };
    });
}
