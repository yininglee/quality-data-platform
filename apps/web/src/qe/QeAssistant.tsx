import { useEffect, useId, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { ArrowUpRight, CircleHelp, FileText, Grip, History, Minus, Pencil, Plus, Send, Sparkles, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { auditAnswer, auditFeedback, type QeActor } from "./audit";
import { dayInShanghai, redact, type Answer, type QeData, type QeRecord } from "./assistant";
import { openAgentBrief, runAgent, safeText, type AgentResult, type Planner } from "./agent";
import type { IndexedAttachment } from "./knowledge";
import type { Fragment } from "./attachments";
import { AnswerContent } from "./AnswerContent";
import { pageDefaults, retainVisibleAnswers, runModelAgent } from "./modelAgent";
import type { ModelDriver } from "./modelProtocol";
import {
  activeConversationId, conversationTitle, createConversationId, migrateConversation, readConversations,
  selectConversation, updateConversation, type QeConversation, type QeMessage,
} from "./conversation";
import "./qe.css";

type Settings = { date: string; organizationId: string };
type QeProps = {
  load: (contextPath?: string) => QeData; scopeKey: string; organization: string; actor: QeActor;
  home?: { metricId: string; search: string };
  planner?: Planner;
  driver?: ModelDriver;
};
type Message = QeMessage;
type CachedAttachment = { url: string; fragments: Fragment[] };

export const qeExportEvent = "quality-platform:export";
export const qeAssistantPath = "/app/platform/assistant";

const feedbackChoices = ["有用", "无用", "已采纳", "已修改"] as const;

function standaloneLabel(answer: Answer) {
  if (answer.kind === "brief") return "简报";
  if (answer.kind !== "report") return;
  const weekly = answer.reportKind === "week" || (!answer.reportKind &&
    (answer.title.includes("周报") || answer.draft?.includes("\n## 当周质量简析")));
  if (weekly) return "周报";
}

function Reply({ message, actor, close, editDraft, editorId, standalone }: {
  message: Message; actor: QeActor; close?: () => void;
  editDraft: () => void; editorId?: string; standalone?: string;
}) {
  const { answer, draft, question, outputId } = message;
  const [choice, setChoice] = useState<typeof feedbackChoices[number]>();
  const [reason, setReason] = useState("");
  const [revision, setRevision] = useState("");
  const [status, setStatus] = useState("");
  const revisionText = (draft ?? revision).trim();
  const modified = choice === "已修改";
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!choice || !outputId) return;
    try {
      auditFeedback(actor, message.context, outputId, choice, reason, modified ? revisionText : "");
      setStatus("反馈已记录");
      setChoice(undefined);
      setReason("");
      setRevision("");
    } catch {
      setStatus("反馈保存失败，请重试。");
    }
  }
  return <div className="qe-turn">
    {question && <p className="qe-question">{question}</p>}
    {standalone ? <div className="qe-answer qe-standalone-link">
      <Link to={qeAssistantPath}>在独立对话页查看{standalone}<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </div> : <article className={`qe-answer qe-answer-${answer.kind}`}>
      {answer.title && <h3>{answer.title}</h3>}
      {answer.note && (answer.kind === "brief"
        ? <details className="qe-disclosure qe-rules"><summary>简报口径</summary><p>{answer.note}</p></details>
        : <p className="qe-note">{answer.note}</p>)}
      {draft !== undefined && <div className="qe-shortcuts qe-report-action">
        <button type="button" aria-expanded={Boolean(editorId)} aria-controls={editorId}
          onClick={editDraft}><Pencil size={14} aria-hidden="true" />编辑草稿</button>
      </div>}
      <AnswerContent answer={answer} close={close} />
      {outputId && <div className="qe-feedback" aria-label="反馈">
        <div>{feedbackChoices.map((item) => <button type="button" key={item} aria-pressed={item === choice}
          onClick={() => { setChoice(item === choice ? undefined : item); setStatus(""); }}>{item}</button>)}</div>
        {choice && <form onSubmit={submit}>
          {modified && answer.draft === undefined && <label>修改后的内容<textarea required maxLength={2000} value={revision} onChange={(event) => setRevision(event.target.value)} /></label>}
          <label>{choice === "无用" ? "原因" : "反馈说明（选填）"}<textarea required={choice === "无用"} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          {modified && answer.draft !== undefined && revisionText === answer.draft.trim() && <small>请先在编辑面板修改草稿。</small>}
          <button type="submit" disabled={(modified && (!revisionText || revisionText === answer.draft?.trim())) || (choice === "无用" && !reason.trim())}>保存反馈</button>
        </form>}
        {status && <p role="status">{status}</p>}
      </div>}
      {!outputId && <p className="qe-note">本次审计记录保存失败，请检查浏览器存储后重试。</p>}
    </article>}
  </div>;
}

function ReportEditor({ id, title, draft, onChange, onClose }: {
  id: string; title: string; draft: string; onChange: (draft: string) => void; onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState("");
  useEffect(() => { closeButton.current?.focus(); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setStatus("草稿已复制");
    } catch {
      setStatus("复制失败，可下载草稿。");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([draft], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <aside id={id} className="qe-panel qe-editor" aria-labelledby={`${id}-title`}
    onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }}>
    <header className="qe-header">
      <h2 id={`${id}-title`}>编辑{title}</h2>
      <button type="button" ref={closeButton} aria-label="关闭编辑面板" onClick={onClose}><X size={18} /></button>
    </header>
    <textarea aria-label="编辑草稿" value={draft} onChange={(event) => {
      setStatus("");
      onChange(event.target.value);
    }} />
    <footer className="qe-editor-actions">
      <span role="status">{status}</span>
      <button className="secondary-button" type="button" onClick={() => void copy()}>复制草稿</button>
      <button className="primary-button" type="button" onClick={download}>下载草稿</button>
    </footer>
  </aside>;
}

function pageMetricId(data: QeData, pathname: string, search: string) {
  const params = new URLSearchParams(search);
  return data.metrics.find((metric) => {
    const [path, query] = metric.href.split("?");
    return pathname === path && [...new URLSearchParams(query)].every(([key, value]) => params.get(key) === value);
  })?.id;
}

async function extractAttachments(records: QeRecord[], cache: Map<string, CachedAttachment>, signal: AbortSignal) {
  const attachments: IndexedAttachment[] = [];
  const files = records.flatMap((record) => record.attachments.map((attachment) => ({ record, attachment })));
  let partial = files.some(({ attachment }) => !attachment.dataUrl);
  const available = files.filter(({ attachment }) => attachment.dataUrl);
  if (!available.length) return { attachments, partial };
  const { readAttachment } = await import("./attachments");
  const timeout = new AbortController();
  const abort = () => timeout.abort(signal.reason);
  const timer = window.setTimeout(() => timeout.abort(), 18_000);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try {
    for (const { record, attachment } of available) {
      if (timeout.signal.aborted) return { attachments, partial: true };
      const key = `${record.key}|${attachment.name}`;
      try {
        const url = attachment.dataUrl!;
        const cached = cache.get(key);
        const result = cached?.url === url ? cached : await readAttachment(attachment, timeout.signal);
        attachments.push(...result.fragments.map((fragment) => ({ record, fragment, name: attachment.name })));
        if (("partial" in result && result.partial) || !result.fragments.length) {
          partial = true;
        } else {
          if (cache.size >= 50 && !cache.has(key)) cache.delete(cache.keys().next().value!);
          cache.set(key, { url, fragments: result.fragments });
        }
      } catch {
        partial = true;
      }
    }
    return { attachments, partial };
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

type FloatingControls = {
  close: () => void; hide: () => void;
  drag: (event: PointerEvent<HTMLElement>) => void; position?: { left: number; top: number }; dragging: boolean;
};

function QeWorkspace({ id, props, location, floating }: {
  id?: string; props: QeProps; location: ReturnType<typeof useLocation>; floating?: FloatingControls;
}) {
  const [conversation, setConversation] = useState<QeConversation>();
  const [history, setHistory] = useState<QeConversation[]>([]);
  const [brief, setBrief] = useState<Message>();
  const [hiddenTurns, setHiddenTurns] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRoot = useRef<HTMLDivElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const historyId = useId();
  const [activeDraftId, setActiveDraftId] = useState<string>();
  const [input, setInput] = useState("");
  const [recordAttached, setRecordAttached] = useState(true);
  const [pageFiltersEnabled, setPageFiltersEnabled] = useState(Boolean(floating));
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>();
  const [dateRange, setDateRange] = useState<{ today: string; newest?: string; organizations: QeData["organizations"] }>();
  const [context, setContext] = useState<QeRecord>();
  const [metricContext, setMetricContext] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const work = useRef<AbortController>(undefined);
  const cache = useRef(new Map<string, CachedAttachment>());
  const settingsQuestion = useRef("");
  const didInitialize = useRef(false);
  const editorId = useId();
  const turns = conversation?.messages ?? [];
  const messages = turns.length || !brief ? turns : [brief];
  const report = turns.find(({ id }) => id === activeDraftId);
  const contextPath = floating ? location.pathname : undefined;

  function currentRecord(data: QeData) {
    if (!contextPath) return;
    const path = contextPath.replace(/\/$/, "");
    const record = data.records.find((row) => row.href === path || row.aliases?.includes(path));
    return record && { ...record, href: path };
  }

  function createMessage(question: string, answer: Answer, record: QeRecord | undefined, result: AgentResult): Message {
    let outputId: string | undefined;
    try { outputId = auditAnswer(props.actor, record?.no, question, answer, result); } catch { /* Keep the business page available. */ }
    let safeQuestion = redact(question);
    if (record?.supplier) safeQuestion = safeQuestion.replaceAll(record.supplier, "供应商（已脱敏）");
    return { id: outputId ?? crypto.randomUUID(), question: safeQuestion, answer, draft: answer.draft, context: record?.no, outputId, organizationId: result.organizationId, date: result.date, focus: result.focus };
  }

  function initialize() {
    try {
      const data = props.load(contextPath);
      const record = currentRecord(data);
      const today = dayInShanghai(data.now);
      const newest = data.records.map((row) => row.date.slice(0, 10)).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today).sort().at(-1);
      setContext(record);
      const metricId = pageFiltersEnabled ? props.home?.metricId ?? pageMetricId(data, location.pathname, location.search) : undefined;
      setMetricContext(data.metrics.find((metric) => metric.id === metricId)?.label ?? "");
      setDateRange({ today, newest, organizations: data.organizations });
      setTimestamp(data.now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }));
      if (!floating) {
        const result = openAgentBrief(data);
        setBrief(createMessage("", result.answer, undefined, result));
      }
      if (!conversation) {
        try { migrateConversation(props.scopeKey); } catch { setHistoryError(true); }
        const saved = readConversations(props.scopeKey);
        const id = activeConversationId(props.scopeKey) ?? saved[0]?.id ?? createConversationId();
        const selected = saved.find(item => item.id === id) ?? { id, updatedAt: 0, messages: [] };
        setHistory(saved);
        if (selected.messages.length) setPageFiltersEnabled(false);
        restore(selected, data);
      }
      setError("");
    } catch {
      setError("暂时无法加载助手，您可以重试或返回原页面。");
    }
  }

  useEffect(() => {
    if (!didInitialize.current) {
      void initialize();
      didInitialize.current = true;
    }
    if (window.innerWidth >= 600) inputRef.current?.focus();
    return () => work.current?.abort();
  // Route and permission changes remount the workspace.
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    const close = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !historyRoot.current?.contains(event.target)) setHistoryOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [historyOpen]);

  useEffect(() => {
    if (messages.length > 1 || busy) transcript.current?.querySelector(".qe-turn:last-child")?.scrollIntoView?.({ block: "start" });
  }, [messages, busy]);

  async function ask(value: string, override?: Settings) {
    const question = value.trim();
    if (!question || work.current || !conversation) return;
    const current = conversation;
    const request = new AbortController();
    work.current = request;
    setBusy(true);
    setInput("");
    setError("");
    try {
      const data = props.load(contextPath);
      const pageRecord = currentRecord(data);
      const record = recordAttached ? pageRecord : undefined;
      setContext(pageRecord);
      const lastMessage = messages.at(-1);
      const previous = record && lastMessage?.context && lastMessage.context !== record.no ? undefined : lastMessage?.answer;
      const params = new URLSearchParams(pageFiltersEnabled ? props.home?.search ?? location.search : "");
      const activeMetric = pageFiltersEnabled ? props.home?.metricId ?? pageMetricId(data, location.pathname, location.search) : undefined;
      const extract: Parameters<typeof runAgent>[0]["extract"] =
        (rows, signal, temporary) => extractAttachments(rows, temporary ? new Map() : cache.current, signal);
      const result = props.driver ? await runModelAgent({
        data, question, record, driver: props.driver, forced: override, signal: request.signal,
        history: retainVisibleAnswers(messages.filter(message => message.question), data),
        defaults: { ...pageDefaults(params, record), metricId: activeMetric }, extract,
      }) : await runAgent({
        data, question, context: record, previous, params, settings: override, signal: request.signal, planner: props.planner,
        activeMetric, extract,
      });
      request.signal.throwIfAborted();
      const standalone = floating && standaloneLabel(result.answer);
      if (standalone) {
        setSelectionOpen(false);
        setActiveDraftId(undefined);
      } else if (["metric", "report"].includes(result.answer.kind)) {
        settingsQuestion.current = question;
        setSettings({ date: result.date, organizationId: override?.organizationId ?? result.organizationId ?? "" });
        setSelectionOpen(true);
      }
      const message = createMessage(safeText(question, data), result.answer, record, result);
      saveTurnChanges(current, (items) => [...items, message], data);
      if (!standalone && message.draft !== undefined) setActiveDraftId(message.id);
      setTimestamp(data.now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }));
    } catch {
      if (!request.signal.aborted) {
        setError("本次查询失败。可以重试，或继续在原页面处理业务。");
        setInput(question);
      }
    } finally {
      if (work.current === request) {
        work.current = undefined;
        if (!request.signal.aborted) setBusy(false);
      }
    }
  }

  function restore(selected: QeConversation, data: QeData) {
    const visible = retainVisibleAnswers(selected.messages, data);
    setConversation({ ...selected, messages: visible });
    setHiddenTurns(visible.length < selected.messages.length);
    selectConversation(props.scopeKey, selected.id);
  }

  function saveTurnChanges(current: QeConversation, change: (items: Message[]) => Message[], data?: QeData) {
    try {
      const saved = updateConversation(props.scopeKey, current, change);
      setConversation({ ...saved, messages: data ? retainVisibleAnswers(saved.messages, data) :
        saved.messages.filter(message => current.messages.some(item => item.id === message.id)) });
      setHistoryError(false);
    } catch {
      setConversation({ ...current, updatedAt: Date.now(), messages: change(current.messages) });
      setHistoryError(true);
    }
  }

  function historyItems() {
    const saved = readConversations(props.scopeKey);
    return conversation?.messages.length && !saved.some(item => item.id === conversation.id) ? [conversation, ...saved] : saved;
  }

  function switchConversation(selected?: QeConversation) {
    setHistoryOpen(false);
    if (selected && selected.id === conversation?.id) {
      inputRef.current?.focus();
      return;
    }
    work.current?.abort();
    work.current = undefined;
    setBusy(false);
    setPageFiltersEnabled(false);
    setActiveDraftId(undefined);
    setSettings(undefined);
    settingsQuestion.current = "";
    setSelectionOpen(false);
    setInput("");
    setError("");
    const next = selected ?? { id: createConversationId(), updatedAt: 0, messages: [] };
    try {
      restore(next, props.load(contextPath));
    } catch {
      setError("暂时无法打开对话，请重试。");
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeEditor() {
    const trigger = transcript.current?.querySelector<HTMLButtonElement>('.qe-report-action button[aria-expanded="true"]');
    setActiveDraftId(undefined);
    requestAnimationFrame(() => trigger?.focus());
  }

  const position = floating?.position;
  return <div id={id} className={`qe-workspace${report ? " qe-with-editor" : ""}${floating?.dragging ? " qe-dragging" : ""}`}
    style={position && {
      left: `clamp(8px, ${position.left}px, calc(100dvw - var(--qe-width) - 8px))`,
      top: position.top,
    }}>
    <section aria-label="QE 助手" role={floating ? "complementary" : undefined} className="qe-panel qe-chat">
      {floating ? <header className="qe-header" onPointerDown={floating.drag}>
        <span className="qe-icon"><Sparkles size={17} aria-hidden="true" /></span>
        <h2>QE 助手</h2>
        <Grip size={16} className="qe-grip" aria-hidden="true" />
        <Link className="qe-open-page" to={qeAssistantPath} aria-label="打开独立对话页" title="打开独立对话页"><ArrowUpRight size={18} /></Link>
        <button type="button" aria-label="收起 QE 助手" onClick={floating.hide}><Minus size={18} /></button>
        <button type="button" aria-label="关闭 QE 助手" onClick={floating.close}><X size={18} /></button>
      </header> : <h1 className="qe-sr">QE 助手</h1>}
      <div className="qe-context">
        {floating && <span className="qe-context-label">{props.organization}{pageFiltersEnabled && metricContext ? ` · ${metricContext}` : ""}</span>}
        <div className="qe-conversation-actions" ref={historyRoot} onKeyDown={(event) => {
          if (event.key === "Escape" && historyOpen) {
            event.stopPropagation();
            setHistoryOpen(false);
            historyToggle.current?.focus();
          }
        }}>
          <button type="button" className="qe-new-conversation" onClick={() => switchConversation()}><Plus size={16} aria-hidden="true" />新对话</button>
          <button type="button" ref={historyToggle} aria-expanded={historyOpen} aria-controls={historyId} onClick={() => {
            if (!historyOpen) setHistory(historyItems());
            setHistoryOpen((value) => !value);
          }}><History size={16} aria-hidden="true" />历史对话</button>
          <section id={historyId} className="qe-history-panel" hidden={!historyOpen} aria-label="历史对话列表">
            {historyOpen && (history.length ? <ul>{history.map(item => {
              const title = conversationTitle(item);
              return <li key={item.id}>
                <button type="button" aria-current={item.id === conversation?.id ? "true" : undefined}
                  onClick={() => switchConversation(item)} title={title}>
                  <span>{title}</span>
                  {item.updatedAt > 0 && <time dateTime={new Date(item.updatedAt).toISOString()}>
                    {new Date(item.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </time>}
                </button>
              </li>;
            })}</ul> : <p>暂无历史对话</p>)}
          </section>
        </div>
        {context && <div className="qe-document-context">
          <FileText size={15} aria-hidden="true" />
          <span>{recordAttached ? `当前单据 · ${context.no}` : `已移除 · ${context.no}`}</span>
          <button type="button" disabled={busy} onClick={() => setRecordAttached((attached) => !attached)}>
            {recordAttached ? "移除单据" : "带入单据"}
          </button>
        </div>}
        {timestamp && <small>数据截至 {timestamp}（北京时间）</small>}
      </div>
      <div className="qe-transcript" ref={transcript} aria-label="助手对话" aria-live="polite">
        {hiddenTurns && <p className="qe-progress">部分历史消息的来源当前不可见。</p>}
        {messages.map((message) => <Reply key={message.id} message={message} actor={props.actor} close={floating?.close}
          standalone={floating ? standaloneLabel(message.answer) : undefined}
          editDraft={() => setActiveDraftId(message.id)} editorId={report?.id === message.id ? editorId : undefined} />)}
        {busy && <p className="qe-progress" role="status">正在检索和核对来源…</p>}
        {error && <div role="alert" className="qe-error"><p>{error}</p><button type="button" onClick={() => input ? void ask(input) : void initialize()}>重试</button></div>}
      </div>
      {selectionOpen && dateRange && <form className="qe-range" aria-label="统计范围" onSubmit={(event) => {
        event.preventDefault();
        const current = settings ?? { date: dateRange.today, organizationId: "" };
        void ask(settingsQuestion.current, current);
      }}>
        <label>统计基准日<input type="date" required value={settings?.date ?? dateRange.today}
          onChange={(event) => setSettings({ date: event.target.value, organizationId: settings?.organizationId ?? "" })} /></label>
        <label>组织<select value={settings?.organizationId ?? ""} onChange={(event) => setSettings({
          date: settings?.date ?? dateRange.today, organizationId: event.target.value,
        })}><option value="">默认范围</option><option value="all">全部可见组织</option>
          {dateRange.organizations.map(({ id: key, name }) => <option key={key} value={key}>{name}</option>)}</select></label>
        <button type="submit" disabled={busy}>更新</button>
        {dateRange.newest && dateRange.newest !== (settings?.date ?? dateRange.today) &&
          <button type="button" disabled={busy} onClick={() => {
            const current = { date: dateRange.newest!, organizationId: settings?.organizationId ?? "" };
            setSettings(current);
            void ask(settingsQuestion.current, current);
          }}>最近有记录的日期</button>}
      </form>}
      {historyError && <p role="status" className="qe-error">浏览器空间不足，本轮对话暂未保存。</p>}
      <footer className="qe-composer">
        {!props.driver && <div className="qe-shortcuts">{["查历史案例", ...(!floating ? ["生成本周周报"] : []), "生成本月月报", "解释指标变化"].map((label) =>
          <button key={label} type="button" disabled={busy} onClick={() => void ask(label)}>{label}</button>)}</div>}
        <form onSubmit={(event) => { event.preventDefault(); void ask(input); }}>
          <input ref={inputRef} aria-label="向 QE 助手提问" value={input} maxLength={500} onChange={(event) => setInput(event.target.value)}
            placeholder={context && recordAttached ? "询问这张单据，或输入其他问题" : "输入问题或业务编号"} />
          <button type="submit" aria-label="发送问题" disabled={!conversation || busy || !input.trim()}><Send size={17} /></button>
        </form>
        <small><CircleHelp size={12} aria-hidden="true" />{props.driver ? "LLM 取证与分析" : props.planner ? "LLM 规划 · 本地检索" : "本地演示"} · 质量判断请核对原始依据</small>
      </footer>
    </section>
    {report?.draft !== undefined && <ReportEditor key={report.id} id={editorId} title={report.answer.title || "报告草稿"}
      draft={report.draft} onClose={closeEditor} onChange={(draft) => {
        if (conversation) saveTurnChanges(conversation, (items) => items.map((message) => message.id === report.id ? { ...message, draft } : message));
      }} />}
  </div>;
}

export function QeAssistantPage(props: QeProps) {
  const location = useLocation();
  return <div className="qe-shell qe-page">
    <QeWorkspace props={props} location={location} />
  </div>;
}

export function QeAssistant(props: QeProps) {
  const location = useLocation();
  const id = useId();
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const [dragging, setDragging] = useState(false);
  const launch = useRef<HTMLButtonElement>(null);
  const dragCleanup = useRef<() => void>(undefined);
  const open = active && !minimized;
  function minimize() {
    setMinimized(true);
    requestAnimationFrame(() => launch.current?.focus());
  }
  function close() {
    setActive(false);
    setMinimized(false);
    requestAnimationFrame(() => launch.current?.focus());
  }
  function drag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || event.pointerType === "touch" || (event.target as Element).closest("button, a") || window.innerWidth < 600) return;
    const rect = event.currentTarget.closest(".qe-workspace")!.getBoundingClientRect();
    const leftOffset = event.clientX - rect.left;
    const topOffset = event.clientY - rect.top;
    const move = (next: globalThis.PointerEvent) => setPosition({
      left: Math.max(8, Math.min(window.innerWidth - rect.width - 8, next.clientX - leftOffset)),
      top: Math.max(8, Math.min(window.innerHeight - rect.height - 8, next.clientY - topOffset)),
    });
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      setDragging(false);
    };
    dragCleanup.current?.();
    dragCleanup.current = stop;
    setDragging(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }
  useEffect(() => {
    const resize = () => setPosition(undefined);
    const minimizeForExport = () => setMinimized(true);
    window.addEventListener("resize", resize);
    window.addEventListener(qeExportEvent, minimizeForExport);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener(qeExportEvent, minimizeForExport);
      dragCleanup.current?.();
    };
  }, []);
  return <div className="qe-shell qe-embedded" onKeyDown={(event) => { if (event.key === "Escape" && open) close(); }}>
    {active && <div hidden={minimized}>
      <QeWorkspace id={id} key={`${props.scopeKey}:${location.pathname}:${location.search}:${props.home?.metricId}:${props.home?.search}`} props={props} location={location}
        floating={{ close, hide: minimize, position, drag, dragging }} />
    </div>}
    {!open && <button type="button" ref={launch} className="qe-launch" aria-expanded={false} aria-controls={active ? id : undefined} onClick={() => {
      setActive(true);
      setMinimized(false);
    }}><Sparkles size={18} aria-hidden="true" />QE 助手</button>}
  </div>;
}
