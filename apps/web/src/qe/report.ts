import { citeSample } from "./evidence";
import { citeRecord, comparison, dayInShanghai, periodText, reportPeriods, shiftDay, type Answer, type AnswerSection, type Period, type QeData, type QeRecord } from "./assistant";

const labels = {
  incoming: "来料检验", material: "物料异常", afterSales: "售后异常", production: "生产检验日报",
  ipqc: "IPQC巡线问题记录", repair: "维修记录", returns: "零星退料记录", inbound: "入库报告",
} as const;

const metricRules: Record<string, string> = {
  order_completion: "完成订单数 / 有生产日报的订单数",
  inspection_first: "（一检检验数 − 一检不良数）/ 一检检验数",
  inspection_second: "（二检检验数 − 二检不良数）/ 二检检验数",
  inbound_pass: "已通过或已完成且工厂自报合格 / 已通过、已驳回、已完成",
  digital_incoming: "已完成且合格 / 已完成及已驳回，平台采购",
  factory_incoming: "已完成且合格 / 已完成及已驳回，工厂采购",
  customer_material: "按 M1 分析口径汇总匹配基础数据的上线量及退料量",
};

const field = (row: QeRecord, label: string) => row.fields.find((value) => value.label === label)?.value;
const sum = (rows: QeRecord[], label: string) => rows.reduce((total, row) => total + Number(field(row, label) ?? 0), 0);
const rate = (n: number, d: number) => d > 0 ? 100 * n / d : null;
const percent = (value: number | null) => value === null ? "暂无样本" : `${value.toFixed(2)}%`;
const ratio = (n: number, d: number) => d > 0 ? `${n}/${d}（${percent(rate(n, d))}）` : "暂无样本";
const isBetween = (date: string, period: Period) => date.slice(0, 10) >= period.start && date.slice(0, 10) <= period.end;
const dateOrder = (a: QeRecord, b: QeRecord) => b.date.localeCompare(a.date) || a.no.localeCompare(b.no);

function group<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const name = key(row);
    const items = groups.get(name);
    if (items) items.push(row);
    else groups.set(name, [row]);
  }
  return [...groups];
}

function factsSection(label: string, text: string, rows: QeRecord[], location = "业务时间、单据字段和状态"): AnswerSection {
  const sample = rows.slice(0, 5);
  return {
    label, text,
    sources: sample.map((row) => citeRecord(row, location, row.statusLabel)),
  };
}

function frequencies(rows: QeRecord[], value: (row: QeRecord) => string) {
  return group(rows, value).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "zh-CN"))
    .map(([name, entries]) => `${name} ${entries.length}`).join(" · ") || "暂无样本";
}

function pareto(details: Array<{ name: string; count: number }>) {
  const totals = group(details, (row) => row.name).map(([name, rows]) => ({
    name, count: rows.reduce((total, row) => total + row.count, 0),
  })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
  const total = totals.reduce((count, row) => count + row.count, 0);
  const top = totals.slice(0, 5);
  const other = total - top.reduce((count, item) => count + item.count, 0);
  const shown = other ? [...top, { name: "其他", count: other }] : top;
  let running = 0;
  return { total, text: shown.map(({ name, count }) => {
    running += count;
    return `${name} · ${count} 件 · 占比 ${percent(rate(count, total))} · 累计 ${percent(rate(running, total))}`;
  }).join("\n") || "暂无样本" };
}

export function reportAnswer(data: QeData, options: { kind: "week" | "month"; date: string; previous: boolean; organizationId?: string; traceSamples?: boolean }): Answer {
  const { kind, date, previous, organizationId } = options;
  const today = dayInShanghai(data.now);
  const [calendar, baseline] = reportPeriods(date, kind, previous);
  const partial = calendar.end > today && calendar.start <= today;
  const period = partial ? { ...calendar, end: today } : calendar;
  const elapsed = Math.round((Date.parse(period.end) - Date.parse(period.start)) / 86_400_000);
  const prior = partial ? { ...baseline, end: [baseline.end, shiftDay(baseline.start, elapsed)].sort()[0] } : baseline;
  const monthly = kind === "month";
  const title = monthly ? "质量月报草稿" : "质量周报草稿";
  const organization = data.organizations.find(({ id }) => id === organizationId)?.name ?? "全部可见组织";
  const readable = (label: string) => !data.readableLabels || data.readableLabels.includes(label);
  const records = data.records.filter((row) => (!organizationId || row.organizationId === organizationId) &&
    row.date.slice(0, 10) <= today && row.updatedAt.slice(0, 10) <= today &&
    row.label !== "基础数据" && row.label !== "商家注册" &&
    (!monthly || (row.label !== "出货报告" && row.label !== "试产及生产总结"))).sort(dateOrder);
  const inPeriod = (range: Period) => records.filter((row) => isBetween(row.date, range));
  const during = inPeriod(period);
  const current = during.filter((row) => row.status !== "cancelled");
  const base = inPeriod(prior).filter((row) => row.status !== "cancelled");
  const byType = (rows: QeRecord[], label: string) => rows.filter((row) => row.label === label);
  const cases = current.filter((row) => row.label === labels.material || row.label === labels.afterSales);
  const asOf = (end: string) => records.filter((row) => row.date.slice(0, 10) <= end && row.status !== "cancelled" &&
    (row.label === labels.material || row.label === labels.afterSales) && row.report?.eightDRequired && row.updatedAt.slice(0, 10) <= end);
  const open = cases.filter((row) => row.followUp);
  const scopedLink = (domain?: string) => domain && data.sourcePages?.[domain]
    ? `${data.sourcePages[domain]}?${new URLSearchParams({ from: period.start, to: period.end, organizationId: organizationId ?? "all" })}` : undefined;
  const summarize = (label: string, text: string, rows: QeRecord[], location?: string, domain?: string): AnswerSection => {
    const result = factsSection(label, text, rows, location);
    const aggregate = options.traceSamples ? citeSample(label, text.slice(0, 360), rows, scopedLink(domain)) : undefined;
    return aggregate ? { ...result, sources: [aggregate, ...result.sources] } : result;
  };
  const scopeText = `${periodText(period)} · ${organization}${partial ? " · 截至今日" : ""}`;
  const note = `${scopeText}。环比窗口 ${periodText(prior)}。状态采用生成时快照，时间为北京时间。`;
  const sections: AnswerSection[] = [{
    label: "统计口径", text: `统计窗口 ${periodText(period)}；比较窗口 ${periodText(prior)}。\n状态数据按生成时点读取，业务数据按所属日期归集。`, sources: [],
  }, {
    label: "编制与签批", text: `编制部门：质量部\n编制人、审核人、批准人：待填写\n状态：草稿\n生成时间：${data.now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}`, sources: [],
  }];
  if (options.traceSamples) {
    const scopeEvidence = citeSample("报告期业务记录", `统计窗口 ${periodText(period)} · ${organization}`, during);
    if (scopeEvidence) for (const section of sections) section.sources = [scopeEvidence];
  }
  if (calendar.start > today) {
    const text = "所选周期尚未开始。请调整统计基准日。";
    return { kind: "report", reportKind: kind, title, sections: [...sections, { label: "暂无数据", text, sources: [] }], draft: `# ${title}\n\n${scopeText}\n\n${text}`, note };
  }

  for (const metric of data.metrics) {
    if (monthly && metric.id === "order_completion") continue;
    const { text, sources } = comparison(metric, period, prior, organizationId);
    sections.push({ label: metric.label, text: `${text}\n口径：${metricRules[metric.id] ?? "M1 首页口径"}`, sources });
  }
  if (!data.metrics.length) sections.push({ label: "核心指标", text: "当前范围没有可读取的首页指标。", sources: [] });
  const production = byType(current, labels.production);
  const repair = byType(current, labels.repair);
  const ipqc = byType(current, labels.ipqc);
  const returns = byType(current, labels.returns);
  const inbound = byType(current, labels.inbound).filter((row) => ["approved", "completed", "rejected"].includes(row.status));
  const material = byType(current, labels.material);
  const afterSales = byType(current, labels.afterSales).filter((row) => row.status === "approved");
  const incoming = byType(current, labels.incoming).filter((row) => ["completed", "rejected"].includes(row.status));
  const incomingBad = incoming.filter((row) => !(row.status === "completed" && field(row, "检验结果") === "合格"));
  const inputTotal = (rows: QeRecord[]) => sum(byType(rows, labels.production), "投入数量");
  const repairTotal = (rows: QeRecord[]) => byType(rows, labels.repair).flatMap((row) => row.report?.repairs ?? []).reduce((n, row) => n + row.count, 0);
  const closed8d = (rows: QeRecord[]) => rows.filter((row) => row.status === "approved").length;
  const formatChange = (next: number | null, prior: number | null, isRate = true) => next === null || prior === null
    ? "依据不足，无法比较。" : `差异 ${next - prior >= 0 ? "+" : ""}${(next - prior).toFixed(isRate ? 2 : 0)}${isRate ? " 个百分点" : ""}。`;
  const add = (required: string, label: string, text: string, rows: QeRecord[], location?: string) => {
    if (readable(required)) sections.push(summarize(label, text, rows, location, required));
  };

  if (monthly) {
    const baseMaterial = byType(base, labels.material);
    const baseIpqc = byType(base, labels.ipqc);
    const baseAfterSales = byType(base, labels.afterSales).filter((row) => row.status === "approved");
    const afterSalesRate = (rows: QeRecord[]) => rate(sum(rows, "不良数量"), sum(rows, "投入数量"));
    // The live store has no historical state snapshot. Display the current backlog and mark the historical comparison unavailable.
    const outstanding = asOf(today);
    add(labels.material, "核心指标 · 物料异常批次",
      `本期 ${material.length}，对比期 ${baseMaterial.length}。只计未取消单据。 ${formatChange(material.length, baseMaterial.length, false)}`, [...material, ...baseMaterial]);
    add(labels.ipqc, "核心指标 · IPQC 异常项",
      `本期 ${ipqc.length}，对比期 ${baseIpqc.length}。 ${formatChange(ipqc.length, baseIpqc.length, false)}`, [...ipqc, ...baseIpqc]);
    if (readable(labels.production)) add(labels.repair, "核心指标 · 产品维修率",
      `本期 ${ratio(repairTotal(current), inputTotal(current))}；对比期 ${ratio(repairTotal(base), inputTotal(base))}。 ${formatChange(rate(repairTotal(current), inputTotal(current)), rate(repairTotal(base), inputTotal(base)))}`, [...repair, ...production, ...byType(base, labels.repair), ...byType(base, labels.production)], "维修明细及日报投入数量");
    add(labels.afterSales, "核心指标 · 售后异常不良率",
      `本期 ${percent(afterSalesRate(afterSales))}；对比期 ${percent(afterSalesRate(baseAfterSales))}。 ${formatChange(afterSalesRate(afterSales), afterSalesRate(baseAfterSales))}`, [...afterSales, ...baseAfterSales]);
    if (readable(labels.material) || readable(labels.afterSales)) sections.push(summarize("核心指标 · 供应商 8D 总关闭率",
      `截至生成时，已通过 8D / 应关闭 ${ratio(closed8d(outstanding), outstanding.length)}。历史冻结值缺失，环比依据不足。`, outstanding, undefined, readable(labels.material) ? labels.material : labels.afterSales));
  }

  const badByMaterial = frequencies(incomingBad, (row) => row.material ?? "无料号");
  const supplierNames = [...new Set(records.flatMap(({ supplier }) => supplier ? [supplier] : []))].sort();
  const supplierId = (row: QeRecord) => row.supplier ? `供应商 ${supplierNames.indexOf(row.supplier) + 1}（已脱敏）` : "未关联供应商";
  const ranking = group(incoming, supplierId).filter(([name]) => name !== "未关联供应商").map(([name, rows]) => ({
    name, rows, bad: rows.filter((row) => incomingBad.includes(row)).length,
  })).sort((a, b) => b.bad / b.rows.length - a.bad / a.rows.length || b.bad - a.bad);
  add(labels.incoming, "供应商与来料质量",
    `来料有效批次 ${incoming.length}，未计入合格分子 ${incomingBad.length} 批。\n${(["platform_purchase", "factory_purchase"] as const).map((method) => {
      const rows = incoming.filter((row) => row.report?.supplyMethod === method);
      return `${method === "platform_purchase" ? "平台采购" : "工厂采购"} · ${ratio(rows.filter((row) => !incomingBad.includes(row)).length, rows.length)}`;
    }).join("\n")}\n未计入合格分子的料号分布：${badByMaterial}\n供应商批次不良率排名：${ranking.slice(0, 5).map(({ name, bad, rows }) => `${name} ${ratio(bad, rows.length)}`).join(" · ") || "暂无样本"}`,
    [...new Set([...incomingBad, ...incoming])], "来料检验结果、采购方式和物料");
  add(labels.material, "物料异常处理",
    `${material.length} 批，已通过 ${material.filter((row) => row.status === "approved").length} 批。\n来源分布：${frequencies(material, (row) => row.report?.exceptionSource ?? "来源未登记")}\n状态分布：${frequencies(material, (row) => row.statusLabel)}`, material);
  const outstanding = asOf(today);
  const open8d = outstanding.filter((row) => row.status !== "approved");
  const submitted8d = records.filter((row) => row.report?.eightDSubmittedAt && isBetween(row.report.eightDSubmittedAt, period));
  if (readable(labels.material) || readable(labels.afterSales)) sections.push(summarize("供应商 8D 跟踪",
    `本期首次提交 ${submitted8d.length} 份；截至生成时未关闭 ${open8d.length} 份。\n${open8d.slice(0, 8).map((row) => `${row.no} · ${row.material ?? row.label} · ${supplierId(row)} · ${row.statusLabel}`).join("\n") || "暂无未关闭记录。"}`,
    [...open8d, ...submitted8d], "首次提交 8D、当前状态和流转记录", readable(labels.material) ? labels.material : labels.afterSales));
  const productionPareto = pareto(production.flatMap((row) => row.report?.defects ?? []));
  const byFactory = group(production, (row) => row.organization || "未登记组织");
  add(labels.production, "代工厂生产与不良柏拉图",
    `日报投入 ${inputTotal(current)} 件，不良明细 ${productionPareto.total} 件。\n${byFactory.map(([name, rows]) => `${name} · 投入 ${sum(rows, "投入数量")} · ${["一检", "二检"].map((process) => {
      const matches = rows.filter((row) => field(row, "检验工序") === process);
      return `${process} ${ratio(sum(matches, "检验数量") - sum(matches, "不良数量"), sum(matches, "检验数量"))}`;
    }).join(" · ")}`).join("\n")}\n${productionPareto.text}`, production, "日报投入、检验和不良明细");
  add(labels.ipqc, "IPQC 巡线与纠正进度", `登记异常 ${ipqc.length} 项。\n问题定位：${frequencies(ipqc, (row) => String(field(row, "问题定位") ?? "未登记"))}\n责任部门：${frequencies(ipqc, (row) => String(field(row, "责任部门") ?? "未登记"))}\n进度：${frequencies(ipqc, (row) => String(field(row, "处理进度") ?? "未登记"))}`, ipqc);
  add(labels.repair, "维修统计", `维修明细数量 ${repairTotal(current)} 件。\n${pareto(repair.flatMap((row) => row.report?.repairs ?? [])).text}`, repair, "来源日报与维修明细");
  add(labels.returns, "零星退料", `非取消退料共 ${sum(returns, "退料数量")} PCS。\n${group(returns, (row) => row.statusLabel)
    .map(([key, rows]) => `${key} · ${rows.length} 张 · ${sum(rows, "退料数量")} PCS`).join("\n") || "暂无样本"}`, returns);
  add(labels.inbound, "入库质量", `审核口径内 ${inbound.length} 批。\n${group(inbound, (row) => row.organization).map(([key, rows]) =>
    `${key} · ${ratio(rows.filter((row) => row.status !== "rejected" && field(row, "入库合格类型") === "合格").length, rows.length)}`).join("\n") || "暂无样本"}`, inbound);
  add(labels.afterSales, "售后质量与问题闭环", `已通过 ${afterSales.length} 起 · 投入 ${sum(afterSales, "投入数量")} 件 · 不良 ${sum(afterSales, "不良数量")} 件。\n${group(afterSales, supplierId)
    .map(([key, rows]) => `${key} · ${rows.length} 起 · 不良 ${sum(rows, "不良数量")} 件`).join("\n") || "暂无已通过样本。"}`, afterSales);
  sections.push(summarize("重点待跟踪问题", open.slice(0, 5).map((row) => `${row.no} · ${row.label} · ${row.statusLabel}`).join("\n") || "暂无本期未闭环异常。", open, undefined, readable(labels.material) ? labels.material : labels.afterSales));
  if (monthly) sections.push(
    { label: "重大质量问题专项说明（人工填写）",
      text: "待填写：问题描述、影响范围、临时措施、进度与根因验证。", sources: [] },
    { label: "改善行动与下月计划（人工填写）",
      text: "待填写：上月对策效果、改善措施、责任人、计划完成日及下月质量目标。", sources: [] },
  );
  else sections.push(summarize("本周业务与待办", `本期 ${current.length} 张业务单据，当前待平台处理 ${current.filter((row) => row.pending).length} 张。\n${frequencies(current, (row) => row.label)}`, [...current.filter((row) => row.pending), ...current]));
  sections.push(summarize("数据完整性与口径声明",
    `生成时快照 · M1 首页口径 · QE 报告模板 v2\n本期取消 ${during.length - current.length} 张；待平台处理 ${current.filter((row) => row.pending).length} 张。\n各厂有效日报天数：${byFactory.map(([name, rows]) =>
      `${name} ${new Set(rows.map((row) => row.date.slice(0, 10))).size} 天`).join(" · ") || "暂无样本"}。实际应排产日待确认。\n历史冻结快照、抽检合格数据和 8D SLA 待接入。`, during, "日报日期、单据状态和统计范围"));

  const render = (section: AnswerSection, depth: string) =>
    `${depth} ${section.label}\n\n${section.text}${section.sources.length
      ? `\n\n参考来源：${section.sources.map((source) =>
        `[${source.title} · ${source.location}](${source.href})`).join("、")}`
      : ""}`;
  const chapters = monthly
    ? group(sections, reportChapter).map(([label, rows]) => `## ${label}\n\n${rows.map((section) => render(section, "###")).join("\n\n")}`)
    : sections.map((section) => render(section, "##"));
  const draft = [`# ${title}`, scopeText, ...chapters].join("\n\n");
  return { kind: "report", reportKind: kind, title, sections, draft, note };
}

export function reportChapter({ label }: AnswerSection) {
    if (label === "统计口径") return "〇、统计口径声明";
    if (label === "编制与签批") return "一、封面与签批栏";
    if (label === "数据完整性与口径声明") return "七、数据完整性与口径声明";
    if (label.startsWith("改善行动")) return "六、改善行动跟踪与下月计划";
    if (label.startsWith("重大质量问题")) return "五、售后质量与问题闭环管理";
    if (["售后质量与问题闭环", "重点待跟踪问题"].includes(label)) return "五、售后质量与问题闭环管理";
    if (["供应商与来料质量", "物料异常处理", "供应商 8D 跟踪"].includes(label)) return "三、供应商与来料质量分析";
    if (["代工厂生产与不良柏拉图", "IPQC 巡线与纠正进度", "维修统计", "零星退料", "入库质量"].includes(label)) return "四、代工厂生产过程质量分析";
    return "二、月度质量核心指标总览";
}
