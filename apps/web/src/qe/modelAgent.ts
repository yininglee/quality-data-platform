import { safeText, type AgentResult } from "./agent";
import { dayInShanghai, type Answer, type AnswerChart, type AnswerSection, type Evidence, type QeData, type QeRecord } from "./assistant";
import { evidenceVisible } from "./evidence";
import { restrictedRequest } from "./knowledge";
import { isObject, parseToolCall, type AgentFocus, type ModelDriver, type ModelFact, type ModelFinal, type ModelInput, type ToolCall } from "./modelProtocol";
import { documentFacts, executeModelTool, type DatasetData, type FactData, type ReportData, type ToolContext, type ToolData } from "./modelTools";

type History = { question: string; answer: Answer; date?: string; organizationId?: string; focus?: AgentFocus };
type RegisteredFact = FactData & { id: string };
type Dataset = Omit<DatasetData, "points"> & { points: RegisteredFact[] };
type Report = Omit<ReportData, "chapters"> & { chapters: Array<{ id: string; label: string; facts: RegisteredFact[] }> };
type RunInput = ToolContext & { question: string; history: History[]; driver: ModelDriver };

const sourcesOf = (facts: FactData[]) => [...new Map(facts.flatMap(fact => fact.sources)
  .map(source => [source.href + "|" + source.location, source] as const)).values()];

export async function runModelAgent(input: RunInput): Promise<AgentResult> {
  const { data, question, history, driver, signal, record, defaults, forced } = input;
  const trace: AgentResult["trace"] = [];
  let stop: AgentResult["stop"] = "complete";
  let validation: AgentResult["validation"] = "passed";
  const today = dayInShanghai(data.now);
  let organizationId = forced?.organizationId || defaults.organizationId;
  let date = forced?.date || defaults.date || today;
  let focus: AgentFocus | undefined;
  const namedMaterial = (text: string) => {
    const candidates = new Set(text.toUpperCase().match(/\b[A-Z]+-[A-Z0-9-]+\b/g) ?? []);
    const materials = [...new Set(data.records.flatMap(({ material }) => material && candidates.has(material.toUpperCase()) ? [material] : []))];
    return materials.length === 1 ? materials[0] : undefined;
  };
  const facts = new Map<string, RegisteredFact>();
  const datasets = new Map<string, Dataset>();
  const reports = new Map<string, Report>();
  const observations: ModelInput["observations"] = [];
  const fingerprints = new Set<string>();

  const result = (answer: Answer): AgentResult =>
    ({ answer, date, organizationId: organizationId === "all" ? undefined : organizationId, trace, stop, validation, focus });

  if (restrictedRequest(question)) {
    stop = "blocked";
    return result({ kind: "clarify", title: "", sections: [{ label: "", text: "该请求涉及受限动作。可以查询可见质量数据。", sources: [] }] });
  }

  function register(item: FactData): RegisteredFact {
    const clean = { ...item, label: safeText(item.label, data), text: safeText(item.text, data),
      sources: item.sources.filter(source => evidenceVisible(source, data)).map(source => ({
        ...source, title: safeText(source.title, data), excerpt: safeText(source.excerpt, data), location: safeText(source.location, data),
      })) };
    if (clean.valueText !== undefined) clean.valueText = safeText(clean.valueText, data);
    const value = { ...clean, id: "F" + (facts.size + 1) };
    facts.set(value.id, value);
    return value;
  }

  const asModelFact = ({ id, text, label, valueText }: RegisteredFact): ModelFact =>
    ({ id, label, text: text.slice(0, 1150), value: valueText });
  const document = record && {
    businessType: safeText(record.label, data), organizationId: record.organizationId,
    material: record.material && safeText(record.material, data),
    facts: documentFacts(record).map(register).filter(fact => fact.sources.length).map(asModelFact),
  };
  const contextFactCount = facts.size;
  const toolFacts = () => [...facts.values()].slice(contextFactCount).filter(fact => fact.sources.length);

  const toObservation = (call: ToolCall, value: ToolData): ModelInput["observations"][number] => {
    const items = new Map<FactData, RegisteredFact>();
    const lookup = (item: FactData) => {
      const known = items.get(item);
      if (known) return known;
      const registered = register(item);
      items.set(item, registered);
      return registered;
    };
    const plain = value.facts.map(lookup);
    const visualizations = value.datasets?.map(dataset => {
      const id = "D" + (datasets.size + 1);
      const points = dataset.points.map(lookup);
      datasets.set(id, { ...dataset, points });
      return { id, title: safeText(dataset.title, data), unit: dataset.unit, facts: points.map(point => point.id) };
    });
    let report: ModelInput["observations"][number]["report"];
    if (value.report) {
      const id = "R" + (reports.size + 1);
      const chapters = value.report.chapters.map((chapter, index) => ({ ...chapter, id: id + "C" + (index + 1), facts: chapter.facts.map(lookup) }));
      reports.set(id, { ...value.report, chapters });
      report = { id, kind: value.report.kind, chapters: chapters.map(chapter => ({
        id: chapter.id, label: chapter.label, facts: chapter.facts.filter(fact => fact.sources.length).map(fact => fact.id),
      })) };
    }
    return { tool: call.tool, args: call.args, status: report || plain.some(fact => fact.sources.length) ? "ok" : "empty",
      message: value.message && safeText(value.message, data), datasets: visualizations, report,
      facts: [...items.values()].filter(fact => fact.sources.length).map(asModelFact) };
  };

  const past = history.slice(-10).map(({ question: asked, answer, date, organizationId, focus: previousFocus }) => ({
    date, organizationId, artifact: answer.kind, focus: previousFocus,
    question: safeText(asked, data).slice(0, 450),
    answer: safeText([answer.title, answer.note, ...answer.sections.filter(section =>
      section.sources.some(source => evidenceVisible(source, data))).slice(0, 4).map(section => section.text)]
      .filter(Boolean).join(" · "), data).slice(0, 900),
  }));
  const base: Omit<ModelInput, "observations"> = {
    question: safeText(question, data), today,
    context: { ...defaults, ...forced, businessNo: record && safeText(record.no, data), document },
    metrics: data.metrics.map(({id,label}) => ({id,label})),
    organizations: [{ id: "all", name: "公司级汇总（全部可见组织）" },
      ...data.organizations.map(({id,name}) => ({id,name: safeText(name, data)}))],
    businessTypes: data.readableLabels ?? [...new Set(data.records.map(row => row.label))],
    history: past,
  };
  function preservation(text: string) {
    const found = toolFacts().slice(0, 12);
    return result({ kind: "knowledge", title: "", note: text, sections: found.map(({ label, text, sources }) => ({ label, text, sources })) });
  }

  let final: ModelFinal | undefined;
  try {
    for (let step = 0; step < 10; step++) {
      signal.throwIfAborted();
      const decision = await driver({ ...base, observations: budgeted(observations) }, signal);
      signal.throwIfAborted();
      if (isObject(decision) && "clarify" in decision && typeof decision.clarify === "string") {
        const text = safeText(decision.clarify, data).slice(0, 460);
        const questionText = /[？?]/.test(text) ? text : "请补充想查询的指标、业务单据或统计范围。";
        return result({ kind: "clarify", title: "", sections: [{ label: "", text: questionText, sources: [] }] });
      }
      if (isObject(decision) && "final" in decision && isObject(decision.final)) {
        final = decision.final;
        break;
      }
      if (!isObject(decision) || !("calls" in decision) || !Array.isArray(decision.calls)) throw new Error("模型未返回有效决策。");
      for (const raw of decision.calls) {
        if (observations.length >= 18) { stop = "call_limit"; break; }
        const call = parseToolCall(raw);
        if (!call) throw new Error("模型选择了无效工具或参数。");
        const fingerprint = JSON.stringify([call.tool, Object.entries(call.args).sort(([a], [b]) => a.localeCompare(b))]);
        if (fingerprints.has(fingerprint)) {
          observations.push({ tool: call.tool, args: call.args, status: "failed", message: "同参数已查过，请复用结果或调整参数。", facts: [] });
          trace.push({ tool: call.tool, outcome: "empty" });
          continue;
        }
        fingerprints.add(fingerprint);
        try {
          const value = await executeModelTool(call, input);
          const observation = toObservation(call, value);
          observations.push(observation);
          trace.push({ tool: call.tool, outcome: observation.status });
          if (observation.status === "ok") {
            const org = forced?.organizationId || call.args.organizationId;
            if (typeof org === "string") organizationId = org;
            if (call.tool === "report" && typeof call.args.date === "string") date = forced?.date || call.args.date;
            const value = (name: string) => typeof call.args[name] === "string" ? call.args[name] as string : undefined;
            focus = {
              organizationId, metricId: value("metricId") ?? focus?.metricId ?? defaults.metricId,
              material: value("material") ?? namedMaterial(value("query") ?? question) ?? focus?.material,
              start: value("start") ?? focus?.start, end: value("end") ?? focus?.end, date,
            };
          }
        } catch (error) {
          signal.throwIfAborted();
          observations.push({ tool: call.tool, args: call.args, status: "failed", facts: [],
            message: error instanceof Error ? safeText(error.message, data).slice(0, 250) : "工具暂不可用。" });
          trace.push({ tool: call.tool, outcome: "failed" });
        }
      }
      if (stop === "call_limit" || step === 9) {
        if (stop === "complete") stop = "step_limit";
        final = await getFinal(driver, base, observations, signal, "已达到工具预算。使用已有证据交付，标明缺口，直接返回 final。");
        break;
      }
    }
  } catch (error) {
    signal.throwIfAborted();
    stop = "decision_failed";
    return preservation(error instanceof Error && error.name !== "TypeError" ? safeText(error.message, data).slice(0, 180) : "模型暂时无法完成。请重试。");
  }
  if (!final) return preservation("本次未取得可校验的完整答复。");

  const title = typeof final.title === "string" && !/[%<>]|https?:/i.test(final.title)
    ? safeText(final.title.trim(), data).slice(0, 70) : "";
  const paragraphs = Array.isArray(final.paragraphs) ? final.paragraphs.slice(0, 12) : [];
  const bind = (items: unknown[]) => items.flatMap(part => {
    const section = bindParagraph(part, facts, data);
    return section ? [section] : [];
  });
  let written = bind(paragraphs);
  if (written.length !== paragraphs.length && !final.report?.id) {
    try {
      const repair = await getFinal(driver, base, observations, signal,
        "请补回最直接回答用户问题的观点。final.paragraphs 每条引用真实 F ID。只使用引用中的事实，正文可定性概括，删去未经核验的数字、单号和裸链接。已有图表不需重复。");
      const options = Array.isArray(repair?.paragraphs) ? repair.paragraphs.slice(0, 12) : [];
      const corrected = bind(options);
      if (corrected.length && corrected.length === options.length) written = corrected;
      else validation = "invalid_citation";
    } catch {
      signal.throwIfAborted();
      validation = "invalid_citation";
    }
  }
  if (written.length !== paragraphs.length && validation !== "invalid_citation" && final.report?.id) validation = "invalid_citation";
  const charts: AnswerChart[] = Array.isArray(final.charts) ? final.charts.slice(0, 4).flatMap(chart => {
    if (!isObject(chart) || typeof chart.datasetId !== "string" || !["line", "bar", "pareto"].includes(chart.kind)) return [];
    const dataset = datasets.get(chart.datasetId);
    if (!dataset || !dataset.points.some(point => point.value !== null && point.value !== undefined && point.sources.length)) return [];
    const heading = typeof chart.title === "string" && chart.title.trim() && !/[%<>]|https?:/i.test(chart.title)
      ? safeText(chart.title.trim(), data).slice(0, 80) : safeText(dataset.title, data);
    return [{ title: heading, unit: dataset.unit, kind: chart.kind === "pareto" && !dataset.kind ? "bar" as const : chart.kind,
      points: dataset.points.map(point => ({ label: point.label, value: point.sources.length ? point.value ?? null : null,
        valueText: point.sources.length ? point.valueText ?? "" : "暂无样本", cumulative: point.cumulative, sources: point.sources })) }];
  }) : [];

  const selectedReportId = isObject(final.report) && typeof final.report.id === "string" ? final.report.id : undefined;
  const selectedReport = selectedReportId ? reports.get(selectedReportId) : undefined;
  if (selectedReport) {
    const authored = reportAnalyses(final.report?.analyses, selectedReport, data);
    const missing = selectedReport.chapters.filter(chapter => !authored.has(chapter.id));
    if (missing.length) {
      try {
        const supplement = await getFinal(driver, base, observations, signal,
          "只返回 final.report 来补写 " + selectedReportId + " 的章节 " + missing.map(chapter => chapter.id).join("、") +
          "。每章一段简短定性分析，引用本章事实ID；无数据章节用 facts:[]，写待人工确认。不要调工具。分析中不写数字或 {{}}。");
        if (supplement?.report?.id === selectedReportId) {
          for (const [id, section] of reportAnalyses(supplement?.report?.analyses, selectedReport, data)) if (!authored.has(id)) authored.set(id, section);
        }
      } catch { signal.throwIfAborted(); }
    }
    const remaining = selectedReport.chapters.filter(chapter => !authored.has(chapter.id));
    if (remaining.length && !signal.aborted) {
      // Ask for individual paragraphs with only their own evidence when a multi-chapter response misses one.
      for (let offset = 0; offset < remaining.length; offset += 3) {
        await Promise.all(remaining.slice(offset, offset + 3).map(async chapter => {
          const allowed = new Set(chapter.facts.map(fact => fact.id));
          const scoped = observations.filter(observation => observation.report?.id === selectedReportId).map(observation => ({
            ...observation, facts: observation.facts.filter(fact => allowed.has(fact.id)),
            report: observation.report ? { ...observation.report, chapters: observation.report.chapters.filter(item => item.id === chapter.id) } : undefined,
          }));
          try {
            const response = await getFinal(driver, base, scoped, signal, "只为 " + chapter.id + " 撰写一句定性分析，填在 final.report.analyses。引用本章事实，无证据时说明待确认。勿写数字、花括号或其他章节。");
            if (response?.report && response.report.id === selectedReportId) {
              const analysis = reportAnalyses(response.report.analyses, selectedReport, data).get(chapter.id);
              if (analysis) authored.set(chapter.id, analysis);
            }
          } catch { signal.throwIfAborted(); }
        }));
      }
    }
    if (selectedReport.chapters.some(chapter => !authored.has(chapter.id))) validation = "invalid_citation";
    const note = validation === "invalid_citation" ? "部分模型表述未通过引用校验，已保留可核查的数据和来源。" : undefined;
    const draft = ["# " + (title || selectedReport.answer.title), selectedReport.answer.note,
      ...selectedReport.chapters.map(chapter => ["## " + chapter.label,
        ...(selectedReport.kind === "month" ? chapter.facts.map(fact => markdownFact(fact, "###"))
          : [chapter.facts.map(weeklyFact).join("\n")]),
        authored.has(chapter.id) ? markdownFact({ ...authored.get(chapter.id)!, label: "分析" }, "###") : "本章暂无通过校验的分析。",
      ].join("\n\n")),
    ].filter(Boolean).join("\n\n");
    const sections = selectedReport.chapters.flatMap(chapter => {
      const analysis = authored.get(chapter.id);
      return [...chapter.facts.map(({ label, text, sources }) => ({ label, text, sources })),
        ...(analysis ? [{ ...analysis, label: chapter.label + " · 分析" }] : [])];
    });
    return result({ kind: "report", reportKind: selectedReport.kind, title, draft, sections: [...written, ...sections], charts,
      note: [selectedReport.answer.note, note].filter(Boolean).join(" ") });
  }
  if (!written.length && !charts.length) return preservation("未找到足以支持答复的业务依据。可调整查询范围后再试。");
  const verified = validation === "invalid_citation" && !charts.length
    ? toolFacts().slice(0, 8).map(({label,text,sources}) => ({label,text,sources}))
    : [];
  return result({ kind: "knowledge", title, sections: [...written, ...verified], charts, note: validation === "invalid_citation" ? "部分模型表述缺少可核对的引用，已略去。" : undefined });
}

function budgeted(observations: ModelInput["observations"]) {
  let budget = 28_000;
  return observations.map(observation => ({ ...observation, facts: observation.facts.map(fact => {
    const text = fact.text.slice(0, Math.max(0, Math.min(1100, budget)));
    budget -= text.length;
    return { ...fact, text };
  }) }));
}

async function getFinal(driver: ModelDriver, base: Omit<ModelInput, "observations">, observations: ModelInput["observations"],
  signal: AbortSignal, instruction: string) {
  const response = await driver({ ...base, observations: budgeted(observations), instruction }, signal);
  return "final" in response ? response.final : undefined;
}

function reportAnalyses(analyses: unknown, report: Report, data: QeData) {
  const result = new Map<string, AnswerSection>();
  if (!Array.isArray(analyses)) return result;
  for (const part of analyses) {
    if (!isObject(part) || typeof part.chapterId !== "string") continue;
    const chapter = report.chapters.find(item => item.id === part.chapterId);
    if (!chapter) continue;
    const grounded = bindParagraph(part, new Map(chapter.facts.map(fact => [fact.id, fact])), data);
    if (grounded) result.set(chapter.id, grounded);
    else if (!chapter.facts.some(fact => fact.sources.length) && typeof part.text === "string" && part.text.length <= 180 &&
      !/\d|https?:|[<>[\]]/.test(part.text) && /待|不足|暂无|确认|补充/.test(part.text)) {
      result.set(chapter.id, { label: "", text: safeText(part.text, data), sources: [] });
    }
  }
  return result;
}

function bindParagraph(value: unknown, facts: Map<string, RegisteredFact>, data: QeData): AnswerSection | undefined {
  if (!isObject(value) || typeof value.text !== "string" || !value.text.trim() || value.text.length > 650 ||
      !Array.isArray(value.facts) || value.facts.length < 1 || value.facts.length > 12) return;
  const used: RegisteredFact[] = [];
  for (const id of value.facts) {
    const fact = facts.get(id);
    if (!fact?.sources.length) return;
    used.push(fact);
  }
  const evidence = used.map(fact => fact.label + " " + fact.text).join(" ");
  const raw = safeText(value.text, data);
  if (/https?:|\/app\/|[<>]/i.test(raw)) return;
  let invalid = false;
  const text = raw.replace(/\{\{(F\d+)\}\}/g, (_match, id: string) => {
    const fact = used.find(item => item.id === id);
    if (!fact?.valueText) { invalid = true; return ""; }
    return fact.valueText;
  });
  // Recognize date components and numerically equivalent spellings such as 80% and 80.00%.
  const numeric = (value: string) => new Set((value.normalize("NFKC").match(/\d+(?:\.\d+)?%?/g) ?? [])
    .map(token => String(Number.parseFloat(token)) + (token.endsWith("%") ? "%" : "")));
  const available = numeric(evidence);
  const remainder = raw.replace(/\{\{F\d+\}\}/g, "").replace(/8D/gi, "");
  if ([...numeric(remainder)].some(token => !available.has(token))) invalid = true;
  if (invalid || /\{\{|\}\}/.test(text)) return;
  return { label: "", text: text.trim(), sources: sourcesOf(used) };
}

function markdownLinks(sources: Evidence[], compact = false) {
  return sources.map((source, index) => {
    const title = compact ? `来源 ${index + 1}` : source.title.replace(/[\]<>[\r\n]/g, "");
    const href = typeof window === "undefined" ? source.href : new URL(source.href, window.location.origin).href;
    return "[" + title + "](<" + href + ">)";
  }).join("、");
}

function weeklyFact({ label, text, sources }: FactData) {
  const line = text.split("\n")[0];
  return "- **" + label + "** " + line + (sources.length ? " · " + markdownLinks(sources.slice(0, 2), true) : "");
}

function markdownFact(fact: {label:string; text:string; sources:Evidence[]}, depth: string) {
  return depth + " " + fact.label + "\n\n" + fact.text + (fact.sources.length ? "\n\n依据 " + markdownLinks(fact.sources) : "");
}

export function retainVisibleAnswers<T extends {answer:Answer}>(messages: T[], data: QeData): T[] {
  return messages.filter(message => [
    ...message.answer.sections.flatMap(section => section.sources),
    ...(message.answer.charts ?? []).flatMap(chart => chart.points.flatMap(point => point.sources)),
  ].every(source => evidenceVisible(source, data)));
}

export function pageDefaults(params: URLSearchParams, record?: QeRecord) {
  return {
    organizationId: params.get("organizationId") ?? record?.organizationId,
    date: params.get("to") ?? undefined,
    material: params.get("material") ?? undefined,
  };
}
