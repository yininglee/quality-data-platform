import type { AgentFocus } from "./modelProtocol";
import { citeRecord, dailyBrief, dayInShanghai, metricAnswer, redact, type Answer, type Evidence, type Period, type QeData, type QeRecord } from "./assistant";
import { knowledgeAnswer, isEffective, restrictedRequest, unsupportedQuestion, type IndexedAttachment } from "./knowledge";
import { reportDate, selectedPeriods } from "./periods";
import { reportAnswer } from "./report";

export const agentVersion = "qe-agent/2";
export const toolDescriptions = {
  daily_brief: "生成每日简报。用于每日开工、优先待办和临超期。单据历史用检索工具。输入当前权限范围，返回分区汇总与引用。",
  quality_report: "生成周报或月报。用于周期汇报草稿。单据附件用附件解析。输入周期和组织，返回分章草稿与引用。",
  explain_metric: "解释指标变化。用于环比、涨跌和统计贡献。只看原始数据时使用指标明细。输入指标、周期、组织，返回对比与下钻引用。",
  metric_detail: "查指标分子、分母和统计明细。用于追查指标变化的统计范围。单据字段用单据详情。输入指标、周期、组织，返回样本与入口。",
  document_detail: "按编号查字段、状态和流转。先了解当前单据或指定单据时使用。历史 8D 使用专用工具。输入编号，返回可见字段引用。",
  similar_cases: "检索已生效的历史异常和处理记录。用于同物料、同供应商、同缺陷及其他业务历史。读取当前附件请用解析工具。输入问题和当前单据，返回排序后的引用。",
  historical_8d: "检索已通过 8D 的根因、措施和审核结果。用于询问历史 8D。当前未完成 8D 用单据详情或附件。输入问题及当前单据，返回引用。",
  inspection_rules: "查检验标准、缺陷定义和处置规则。仅使用已核实版本的标准与平台规则。历史处理先例用相似案例。输入问题并返回版本及原文位置。",
  current_attachment: "解析当前或指定单据附件。用于文件内容、当前 8D 或页码查找。历史案例用历史检索。输入可见单据编号，返回临时片段与引用。",
} as const;

type Tool = keyof typeof toolDescriptions;
type Call = { tool: Tool; businessNo?: string };
export type Decision = { calls: Call[] } | { finish: true; use?: number[] };
type Outcome = "ok" | "empty" | "failed" | "blocked";
export type Trace = { tool: string; businessNo?: string; outcome: Outcome };
type Observation = Trace & { answer?: Answer };
type Stop = "complete" | "duplicate" | "empty_limit" | "step_limit" | "call_limit" | "blocked" | "decision_failed";
type Settings = { date: string; organizationId: string };
export type AgentResult = {
  answer: Answer; trace: Trace[]; stop: Stop; validation: "passed" | "invalid_structure" | "invalid_citation" | "blocked";
  date: string; organizationId?: string; focus?: AgentFocus;
};
export type PlanningInput = {
  question: string; currentNo?: string; namedNos: string[]; metricId?: string; previousKind?: Answer["kind"];
  observations: Array<Trace & { resultIndex: number; sections: string[]; evidenceCount: number }>;
};
export type Planner = (input: PlanningInput, signal: AbortSignal) => Decision | Promise<Decision>;

export class PlannerError extends Error {}

type AgentInput = {
  data: QeData; question: string; context?: QeRecord; previous?: Answer; params: URLSearchParams;
  activeMetric?: string; settings?: Settings; signal: AbortSignal; planner?: Planner;
  extract: (rows: QeRecord[], signal: AbortSignal, temporary?: boolean) => Promise<{ attachments: IndexedAttachment[]; partial: boolean }>;
};

const fallback = (text: string): Answer => ({
  kind: "clarify", title: "QE 助手", sections: [{ label: "提示", text, sources: [] }],
});
const clarification: Answer = {
  kind: "clarify", title: "想查询哪项质量信息？",
  sections: [{ label: "请补充范围", text: "可以提供单据编号查历史案例、选一个指标查看变化，或指定周期生成周报或月报。", sources: [] }],
};

const wantsReport = (question: string) => /周报|月报|报告草稿|质量总结|周度报告|月度报告|(?:生成|编制|写|整理).{0,8}报告/.test(question);

export const localPlanner: Planner = ({ question, currentNo, namedNos, metricId, previousKind, observations }) => {
  const asked = (tool: Tool) => observations.some((item) => item.tool === tool);
  const find = (tool: Tool) => observations.find((item) => item.tool === tool && item.outcome === "ok")?.resultIndex;
  const call = (tool: Tool, businessNo?: string): Decision => ({ calls: [{ tool, businessNo }] });
  const finish = (...indices: Array<number | undefined>): Decision => ({ finish: true, use: indices.filter((index): index is number => index !== undefined) });
  const historical = /类似|相似|历史|以前|过去|先例|同类|一般|通常|^还有|^再查|^更多/.test(question);
  const report = wantsReport(question);
  const brief = /简报|今日待办|待办|超期|临期|先.{0,5}处理/.test(question);
  const metric = /指标|百分点|合格率|完成率|环比|波动|率(?:为何|为什么).{0,6}(上升|下降)/.test(question) ||
    (previousKind === "metric" && /为什么|哪些组织|上周|上月|昨天|明细/.test(question));
  if (report || brief || metric) {
    const requested: Tool[] = [];
    if (report) requested.push("quality_report");
    if (brief && (!report || /(?:再|并|同时|以及|然后).{0,6}(待办|简报)/.test(question)) && (!metric || /待办|简报/.test(question))) requested.push("daily_brief");
    if (metric && (!report || /(?:再|并|同时|以及|然后).{0,6}(解释|分析|下钻)/.test(question))) {
      if (!/分子|分母|明细/.test(question) || /为什么|变化|下钻/.test(question)) requested.push("explain_metric");
      if (/分子|分母|下钻|明细|哪些单据|为什么/.test(question)) requested.push("metric_detail");
    }
    const next = requested.find((tool) => !asked(tool));
    if (next) return call(next);
    if (requested.length) return finish(...requested.map(find));
  }

  const standard = /标准|SIP|质量协议|抽样方案|判定规则|缺陷定义|来料.*不合格.*(?:怎么|如何|一般|通常)/i.test(question);
  const eightD = /8d|根因|永久对策/i.test(question);
  const attachment = /附件|原文|OCR|第.{1,3}页|工作表|表格里/i.test(question);
  const compareSources = /一致|冲突|对不上|核对|矛盾|差异/.test(question);
  const target = namedNos[0] ?? currentNo ?? question.match(/\b(?:ME|AS|SA|IQC|PIR|MR|IPQC|IR|RMR|TPS|SR)[-\d][A-Z0-9-]{4,}\b/i)?.[0].toUpperCase();
  const wantsDetail = Boolean(target && !/^还有|^更多|^再找/.test(question));
  const wantsCases = historical || (!target && /异常|料号|MAT-|用量|抽检|出货|来料|维修|巡线|IPQC|单据|订单|退料|入库|试产|供应商|缺陷|不良|物料|产品|审核|状态/i.test(question));
  if (wantsDetail) {
    const targets = namedNos.length ? namedNos : [target];
    const next = targets.find((no) => !observations.some((item) => item.tool === "document_detail" && item.businessNo === no));
    if (next) return call("document_detail", next);
  }
  if (standard && !asked("inspection_rules")) return call("inspection_rules");
  if (eightD && (historical || !target || /供应商.{0,5}(根因|8d)/i.test(question)) && !asked("historical_8d")) return call("historical_8d");
  if ((attachment || (eightD && !historical)) && target && !asked("current_attachment")) return call("current_attachment", target);
  if (wantsCases && !asked("similar_cases") && (!eightD || /也|同时|以及|并查/.test(question))) return call("similar_cases");
  if (standard || eightD || attachment || wantsCases || wantsDetail) {
    const focused = [find("inspection_rules"), find("historical_8d"), find("current_attachment"), find("similar_cases")].filter((index) => index !== undefined);
    const details = observations.filter((item) => item.tool === "document_detail" && item.outcome === "ok").map((item) => item.resultIndex);
    return focused.length ? finish(...(compareSources ? details : []), ...focused)
      : finish(...(wantsDetail && !historical && !standard && !attachment ? details : []));
  }
  if (metricId && /为什么|变化|说明/.test(question)) return asked("explain_metric") ? finish(find("explain_metric")) : call("explain_metric");
  return { finish: true };
};

export function safeText(text: string, data: QeData) {
  for (const supplier of new Set(data.records.flatMap((row) => row.supplier ? [row.supplier] : []))) {
    text = text.replace(new RegExp(supplier.replace(/[.*+?^$${}()|[\]\\]/g, "\\$&"), "gi"), "供应商（已脱敏）");
  }
  return redact(text);
}

function organizationScope(data: QeData, question: string, context: QeRecord | undefined, params: URLSearchParams, settings?: Settings) {
  const visibleId = (candidate: string | undefined | null) =>
    data.organizations.find(({ id }) => id === candidate)?.id;
  if (settings?.organizationId) return { organizationId: visibleId(settings.organizationId) };

  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const query = normalize(question);
  const exact = data.organizations.filter(({ name, id }) => query.includes(normalize(name)) || query.includes(normalize(id)));
  const matches = exact.length ? exact : data.organizations.filter(({ name }) => {
    const short = normalize(name).replace(/\(模拟\)$/, "").replace(/(?:oem工厂|代工厂|工厂)$/, "");
    return short.length >= 3 && query.includes(short);
  });
  if (matches.length > 1) return { choices: matches.map(({ name }) => name) };
  if (matches.length) return { organizationId: matches[0].id };
  if (/公司级|全公司|所有工厂|全部(?:可见)?组织|跨工厂/.test(question)) return {};
  return { organizationId: visibleId(params.get("organizationId") || context?.organizationId) };
}

const sourceKey = (source: Evidence) => JSON.stringify([source.href, source.title, source.location, source.excerpt, source.date]);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object");
const isSource = (value: unknown): value is Evidence => object(value) &&
  ["href", "title", "location", "excerpt"].every((key) => typeof value[key] === "string") &&
  (value.date === undefined || typeof value.date === "string");
const isSection = (value: unknown): value is Answer["sections"][number] => object(value) &&
  typeof value.label === "string" && typeof value.text === "string" && Array.isArray(value.sources) && value.sources.every(isSource);

export function validateAnswer(answer: Answer, evidence: Evidence[], data: QeData) {
  if (!object(answer) || typeof answer.title !== "string" || !answer.title || !Array.isArray(answer.sections) ||
      !answer.sections.length || !answer.sections.every(isSection) || !["brief", "knowledge", "metric", "report", "clarify"].includes(answer.kind) ||
      (answer.kind === "report" && typeof answer.draft !== "string")) {
    return { answer: fallback("暂时无法生成，请查看原页面。"), validation: "invalid_structure" } as const;
  }
  const allowedLinks = new Set(data.records.flatMap((row) => [row.href, ...(row.aliases ?? [])]));
  const metricLinks = data.metrics.map((metric) => metric.href.split("?")[0]);
  const allowedOrganization = (value: string | null) => !value || value === "all" || data.organizations.some(({ id }) => id === value);
  const outOfScope = answer.sections.flatMap((part) => part.sources).some(({ href }) => {
    if (allowedLinks.has(href)) return false;
    const [path, search] = href.split("?");
    return !metricLinks.includes(path) || !allowedOrganization(new URLSearchParams(search).get("organizationId"));
  });
  const display = [answer.title, answer.note, answer.draft, ...answer.sections.flatMap(({ label, text, sources }) =>
    [label, text, ...sources.flatMap((source) => [source.title, source.location, source.excerpt])])];
  if (outOfScope || display.some((value) => value !== undefined && safeText(value, data) !== value)) {
    return { answer: fallback("无权限查看该数据。可返回原页面核对可见范围。"), validation: "blocked" } as const;
  }
  const known = new Set(evidence.map(sourceKey));
  let invalid = false;
  const sections = answer.sections.map((part) => {
    const sources = part.sources.filter((source) => known.has(sourceKey(source)));
    if (sources.length === part.sources.length) return part;
    invalid = true;
    return { label: part.label, sources, text: sources.length ? part.text : "依据不足。请在原页面核对。" };
  });
  if (invalid && answer.draft !== undefined) {
    return { answer: fallback("草稿引用未通过校验，请查看原页面。"), validation: "invalid_citation" } as const;
  }
  return { answer: { ...answer, sections }, validation: invalid ? "invalid_citation" : "passed" } as const;
}

export function openAgentBrief(data: QeData): AgentResult {
  const candidate = dailyBrief(data);
  const result = validateAnswer(candidate, candidate.sections.flatMap(({ sources }) => sources), data);
  return { ...result, trace: [{ tool: "daily_brief", outcome: "ok" as const }], stop: "complete" as const, date: dayInShanghai(data.now), organizationId: undefined };
}

async function requestDecision(planner: Planner, input: PlanningInput, signal: AbortSignal) {
  signal.throwIfAborted();
  const controller = new AbortController();
  const stop = () => controller.abort(signal.reason);
  signal.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("Agent decision timed out")), 12_000);
  let abort: () => void = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(controller.signal.reason);
    controller.signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([Promise.resolve().then(() => planner(input, controller.signal)), interrupted]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
    controller.signal.removeEventListener("abort", abort);
  }
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { data, question, context, previous, params, settings, signal, extract } = input;
  const today = dayInShanghai(data.now);
  const date = settings?.date || reportDate(question, today);
  const namedRows = data.records.filter(({ no, label }) => label !== "基础数据" && no.length >= 5 && question.toUpperCase().includes(no.toUpperCase()));
  const named = namedRows[0];
  const { organizationId, choices } = organizationScope(data, question, named ? undefined : context, params, settings);
  if (choices) {
    return {
      answer: fallback(`问题涉及多个可见组织。请指定一个完整组织名（${choices.join("、")}），或明确选择全部可见组织。`),
      trace: [], stop: "complete", validation: "passed", date,
    };
  }
  const metricAliases: Record<string, RegExp> = {
    inspection_first: /一检/, inspection_second: /二检/, inbound_pass: /入库.*合格率/,
    digital_incoming: /平台.*来料/, factory_incoming: /工厂.*来料.*合格率/, customer_material: /客供.*上线/, order_completion: /订单.*完成率/,
  };
  const namedMetric = data.metrics.find(({ label }) => question.includes(label)) ??
    data.metrics.find(({ id }) => metricAliases[id]?.test(question));
  const metricId = namedMetric?.id ??
    (previous?.kind === "metric" ? previous.metricId : undefined) ?? input.activeMetric;
  const periods: [Period, Period] = selectedPeriods(question, date, settings ? new URLSearchParams() : params);
  const requestedMaterial = question.match(/\bMAT-[A-Z0-9-]+\b/i)?.[0];
  const material = (requestedMaterial ? data.records.find(({ material }) => material?.toUpperCase() === requestedMaterial.toUpperCase())?.material
    ?? requestedMaterial.toUpperCase() : data.records.find(({ material }) => material && question.toUpperCase().includes(material.toUpperCase()))?.material)
    ?? params.get("material") ?? undefined;
  const records = data.records.filter((row) => !organizationId || row.organizationId === organizationId);
  const scoped = { ...data, records };
  const observations: Observation[] = [];
  const used = new Set<string>();
  let stop: Stop = "complete";
  let planningError: string | undefined;
  let selected: number[] | undefined;
  let planned = false;
  const resolve = ({ businessNo }: Call) => businessNo
    ? records.find((row) => row.no.toUpperCase() === businessNo.toUpperCase())
    : (named ?? context) && records.find((row) => row.key === (named ?? context)?.key);
  const anchor = resolve({ tool: "document_detail" });

  const execute: Record<Tool, (call: Call) => Answer | Promise<Answer>> = {
    daily_brief: () => dailyBrief(organizationId ? { ...scoped, organizations: data.organizations.filter((org) => org.id === organizationId),
      metrics: data.metrics.map((metric) => ({ ...metric, defaultOrganizationId: organizationId, reading: (period, org, material) => metric.reading(period, org ?? organizationId, material) })) } : data),
    quality_report: () => reportAnswer(scoped, { kind: /月报|月度|(?:上|本)月.{0,8}报告/.test(question) ? "month" : "week", date,
      previous: /上周|上月/.test(question) && !/\d{4}\s*[-年]/.test(question), organizationId }),
    explain_metric: () => metricAnswer(scoped, periods, metricId, organizationId, material),
    metric_detail: () => {
      const result = metricAnswer(scoped, periods, metricId, organizationId, material);
      return { ...result, title: "指标明细", sections: result.sections.map((part) => ({
        ...part, text: part.sources.map((source) => `${source.location} · ${source.excerpt}`).join("\n"),
      })) };
    },
    document_detail: (call) => knowledgeAnswer(question, records, resolve(call), [], { previous, mode: "detail" }),
    similar_cases: async () => {
      const eligible = records.filter(isEffective);
      const result = await extract(attachmentCandidates(eligible, question, anchor).slice(0, 8), signal);
      return knowledgeAnswer(question, eligible, anchor, result.attachments, { previous, partialAttachments: result.partial, mode: "history" });
    },
    historical_8d: async () => {
      const eligible = records.filter((row) => row.status === "approved" && ["物料异常", "售后异常"].includes(row.label));
      const result = await extract(attachmentCandidates(eligible, question, anchor).slice(0, 8), signal);
      return knowledgeAnswer(question, eligible, anchor, result.attachments, { previous, partialAttachments: result.partial, mode: "8d" });
    },
    inspection_rules: async () => {
      const eligible = records.filter(isEffective).filter((row) => row.attachments.some((item) => item.approvedStandard));
      const result = await extract(eligible.map((row) => ({ ...row, attachments: row.attachments.filter((item) => item.approvedStandard) })), signal);
      return knowledgeAnswer(question, eligible, anchor, result.attachments, { previous, partialAttachments: result.partial, mode: "rules" });
    },
    current_attachment: async (call) => {
      const row = resolve(call);
      if (!row || row.status === "cancelled") return unsupportedQuestion("");
      const result = await extract([row], signal, true);
      const fragments = result.attachments.filter(({ fragment }) => fragment.text.trim()).slice(0, 6);
      return { kind: "knowledge", title: "当前单据附件", sections: fragments.length ? fragments.map(({ name, fragment }) => ({
        label: "附件原文", text: row.no, sources: [citeRecord(row, `${name} / ${fragment.location}`, fragment.text.slice(0, 420))],
      })) : unsupportedQuestion("").sections, note: result.partial ? "部分附件内容未提取，可从原单据打开文件。" : undefined };
    },
  };

  if (restrictedRequest(question)) {
    return { answer: unsupportedQuestion(question), trace: [], stop: "blocked" as const, validation: "passed", date, organizationId };
  }
  let empties = 0;
  for (let step = 0; step < 6; step++) {
    signal.throwIfAborted();
    let decision: Decision;
    try {
      const planning: PlanningInput = {
        question: input.planner ? safeText(question, data) : question, currentNo: anchor?.no, namedNos: namedRows.filter((row) => records.includes(row)).map((row) => row.no),
        metricId, previousKind: previous?.kind,
        observations: observations.map(({ answer, ...entry }, resultIndex) => ({
          ...entry, businessNo: input.planner ? (entry.outcome === "ok" && entry.businessNo ? safeText(entry.businessNo, data) : undefined) : entry.businessNo,
          resultIndex, sections: answer?.sections.map(({ label }) => safeText(label, data)) ?? [],
          evidenceCount: answer?.sections.reduce((count, section) => count + section.sources.length, 0) ?? 0,
        })),
      };
      decision = input.planner ? await requestDecision(input.planner, planning, signal) : await localPlanner(planning, signal);
      if (!object(decision) || (!("finish" in decision && decision.finish === true) && !("calls" in decision && Array.isArray(decision.calls)))) throw new Error("Invalid Agent decision");
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof PlannerError) planningError = error.message;
      stop = "decision_failed";
      break;
    }
    planned = true;
    if ("finish" in decision) {
      selected = Array.isArray(decision.use) ? decision.use.filter(Number.isInteger) : undefined;
      break;
    }
    if (!decision.calls.length) break;
    for (const call of decision.calls) {
      if (observations.length >= 8) { stop = "call_limit"; break; }
      if (!object(call) || typeof call.tool !== "string" || !Object.hasOwn(execute, call.tool) ||
        (call.businessNo !== undefined && (typeof call.businessNo !== "string" || call.businessNo.length > 80))) {
        stop = "blocked";
        observations.push({ tool: "unregistered", outcome: "blocked" });
        break;
      }
      const businessNo = call.tool === "document_detail" || call.tool === "current_attachment" ? call.businessNo?.trim().toUpperCase() : undefined;
      const fingerprint = JSON.stringify([call.tool, businessNo ?? anchor?.no.toUpperCase()]);
      if (used.has(fingerprint)) { stop = "duplicate"; break; }
      used.add(fingerprint);
      try {
        const answer = await execute[call.tool]({ tool: call.tool, businessNo });
        signal.throwIfAborted();
        const outcome = answer.kind === "report" || answer.kind === "brief" || answer.sections.some(({ sources }) => sources.length) ? "ok" : "empty";
        observations.push({ tool: call.tool, businessNo: businessNo ?? anchor?.no, outcome, answer });
        empties = outcome === "empty" ? empties + 1 : 0;
      } catch {
        signal.throwIfAborted();
        observations.push({ tool: call.tool, outcome: "failed" });
        empties = 0;
      }
      if (empties >= 2) { stop = "empty_limit"; break; }
    }
    if (stop !== "complete") break;
    if (step === 5) stop = "step_limit";
  }

  const valid = observations.filter((entry) => entry.outcome === "ok" && entry.answer);
  const chosen = (selected ? [...new Set(selected)].flatMap((index) => {
    const item = observations[index];
    return item?.outcome === "ok" && item.answer ? [item.answer] : [];
  }) : valid.flatMap(({ answer }) => answer ? [answer] : []));
  const requestedReport = wantsReport(question) ? valid.find(({ answer }) => answer?.kind === "report")?.answer : undefined;
  const included = requestedReport ? [requestedReport, ...chosen.filter((answer) => answer !== requestedReport)] : chosen;
  const primary = included[0];
  const empty = observations.filter((item) => item.outcome === "empty").at(-1)?.answer;
  const conflict = /一致|冲突|对不上|核对|矛盾|差异/.test(question) ? compareDefectEvidence(included) : undefined;
  let candidate = primary ? {
    ...primary, sections: [...(conflict ? [conflict] : []), ...included.flatMap(({ sections }) => sections)],
    caseKeys: [...new Set(included.flatMap(({ caseKeys }) => caseKeys ?? []))],
    topic: safeText(primary.topic ?? question, data),
  } : empty ?? (observations.length ? unsupportedQuestion("") : clarification);
  if (stop === "decision_failed" || stop === "blocked") candidate = fallback(stop === "blocked"
    ? "该工具超出助手权限，可在原页面继续操作。" : planningError ?? (input.planner
      ? "模型规划暂不可用。请检查本地模型配置和网络后重试。" : "暂时无法生成，请查看原页面。"));
  else if (planned && (stop !== "complete" || observations.some((item) => item.outcome === "failed" || (primary && item.outcome === "empty")))) {
    candidate = { ...candidate, note: [candidate.note, "部分数据未获取。可核对编号、周期或返回原页面。"].filter(Boolean).join(" ") };
  }
  const checked = validateAnswer(candidate, observations.flatMap(({ answer }) => answer?.sections.flatMap(({ sources }) => sources) ?? []), data);
  return { ...checked, trace: observations.map(({ answer: _answer, ...entry }) => ({ ...entry, businessNo: entry.businessNo && safeText(entry.businessNo, data) })), stop, date, organizationId };
}

function compareDefectEvidence(results: Answer[]) {
  const evidence = results.flatMap(({ sections }) => sections.flatMap(({ sources }) => sources));
  const defectCounts = evidence.flatMap((source) => {
    const quantity = source.location === "不良数量" ? source.excerpt.match(/^\d+$/)?.[0] :
      source.excerpt.match(/(?:首次登记不良|不良数量\s*[：:]?)\s*(\d+)\s*件/)?.[1];
    return quantity === undefined ? [] : [{ source, quantity: Number(quantity) }];
  });
  const pair = defectCounts.flatMap((left, index) => defectCounts.slice(index + 1)
    .filter((right) => left.source.href === right.source.href && left.quantity !== right.quantity)
    .map((right) => [left, right]))[0];
  return pair && {
    label: "来源冲突", text: `同一单据的不良数量分别为 ${pair[0].quantity} 件和 ${pair[1].quantity} 件，请核对字段和附件原文。`,
    sources: pair.map(({ source }) => source),
  };
}

function attachmentCandidates(rows: QeRecord[], question: string, context?: QeRecord) {
  const query = question.toUpperCase();
  return rows.filter(({ attachments }) => attachments.some(({ dataUrl }) => dataUrl)).map((row) => ({
    row, rank: (query.includes(row.no.toUpperCase()) ? 100 : 0) +
      (row.material && (context?.material === row.material || query.includes(row.material.toUpperCase())) ? 40 : 0) +
      (row.supplier && context?.supplier === row.supplier ? 20 : 0),
  })).sort((a, b) => b.rank - a.rank || b.row.date.localeCompare(a.row.date)).map(({ row }) => row);
}
