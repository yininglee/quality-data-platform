import { ArrowDown, ArrowUp, ArrowUpRight, ChevronDown, ClipboardList, Clock3, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import type { Answer, AnswerSection, Evidence } from "./assistant";
import { QualityChart } from "./QualityChart";

type Close = { close?: () => void };

function SourceList({ sources, close }: { sources: Evidence[] } & Close) {
  return <ul className="qe-source-list">{sources.map((source, index) =>
    <li key={`${source.href}-${index}`}>
      <Link to={source.href} onClick={close}>{source.title}<ArrowUpRight size={14} aria-hidden="true" /></Link>
      <p>{source.excerpt}</p>
      <small>{[source.location, source.date].filter(Boolean).join(" · ")}</small>
    </li>)}</ul>;
}

function Sources({ sources, label = "查看来源", open, close }: {
  sources: Evidence[]; label?: string; open?: boolean;
} & Close) {
  if (!sources.length) return null;
  return <details className="qe-disclosure" open={open}>
    <summary>{label}（{sources.length}）</summary>
    <SourceList sources={sources} close={close} />
  </details>;
}

function TaskOverview({ section, tasks, close }: {
  section: AnswerSection; tasks: NonNullable<AnswerSection["tasks"]>;
} & Close) {
  const counters = [
    { label: "平台待办", value: tasks.total, icon: ClipboardList, tone: "total" },
    { label: "已超期", value: tasks.overdue, icon: Clock3, tone: "late" },
    { label: "即将到期", value: tasks.soon, icon: Timer, tone: "soon" },
  ];
  return <>
    <dl className="qe-counters">{counters.map(({ label, value, icon: Icon, tone }) =>
      <div key={label} className={value ? "qe-count-" + tone : undefined}>
        <dt><Icon size={16} aria-hidden="true" />{label}</dt><dd>{value}<small>项</small></dd>
      </div>)}</dl>
    <section className="qe-priority">
      <header><h4>优先处理</h4>
        <Link to="/app/platform/todos" onClick={close}>全部待办 <ArrowUpRight size={14} /></Link>
      </header>
      {section.sources.length > 0
        ? <SourceList sources={section.sources.slice(0, 2)} close={close} />
        : <p>当前没有待处理单据。</p>}
      <div className="qe-task-more">
        <Sources sources={section.sources.slice(2)} label="更多优先单据" close={close} />
        {tasks.categories.length > 0 && <details className="qe-disclosure">
          <summary>按业务类型查看</summary>
          <dl className="qe-categories">{tasks.categories.map(([name, count]) =>
            <div key={name}><dt>{name}</dt><dd>{count} 项</dd></div>)}</dl>
        </details>}
      </div>
    </section>
  </>;
}

function MetricChanges({ sections, title, close }: { sections: AnswerSection[]; title: string } & Close) {
  return <section className="qe-changes">
    <h4>{title}</h4>
    {sections.map(({ label, text, change, sources }, index) => {
      if (!change) return null;
      const [metric, ...scope] = label.split(" · ");
      const Direction = change.delta < 0 ? ArrowDown : ArrowUp;
      return <details key={`${label}-${index}`} className="qe-change">
        <summary>
          <span><strong>{metric}</strong><small>{scope.join(" · ")}</small></span>
          <span className="qe-change-values">本期 {change.current.toFixed(2)}% · 上期 {change.previous.toFixed(2)}%</span>
          {change.delta === 0 ? <b>持平</b> : <b className={change.delta < 0 ? "qe-decrease" : "qe-increase"}><Direction size={14} />
            {Math.abs(change.delta).toFixed(2)} <small>个百分点</small><span className="qe-sr">{change.delta < 0 ? "下降" : "上升"}</span></b>}
          <ChevronDown size={15} className="qe-chevron" aria-hidden="true" />
        </summary>
        <p>{text}</p><SourceList sources={sources} close={close} />
      </details>;
    })}
  </section>;
}

export function AnswerContent({ answer, close }: { answer: Answer } & Close) {
  const task = answer.sections.find((part) => part.tasks);
  const queues = answer.sections.filter((part) => part.recordCount !== undefined);
  const changes = answer.sections.filter((part) => part.change);
  const rest = answer.sections.filter((part) => !part.tasks && part.recordCount === undefined && !part.change);
  const sections = <div className="qe-sections">{rest.map(({ label, text, sources }, index) =>
    <section className="qe-section" key={`${label}-${index}`}>
      {label && <h4>{label}</h4>}<p>{text}</p>
      <Sources sources={sources} open={answer.kind === "knowledge"} close={close} />
    </section>)}</div>;
  return <>
    {answer.charts?.map((chart, index) => <QualityChart key={index} chart={chart} onSource={close} />)}
    {(task || queues.length > 0) && <div className="qe-brief-overview">
      {task?.tasks && <TaskOverview section={task} tasks={task.tasks} close={close} />}
      {queues.length > 0 && <div className="qe-queues">{queues.map(({ label, recordCount, text, sources }) =>
        <section key={label}><h4>{label}</h4><strong>{recordCount}<small>{label === "资料待补" ? "张单据" : "项异常"}</small></strong>
          <Sources sources={sources} label="查看单据" close={close} />
          {!sources.length && <p>{text}</p>}
        </section>)}</div>}
    </div>}
    {changes.length > 0 && <MetricChanges sections={changes} title={answer.kind === "brief" ? "关键指标波动" : "指标对比"} close={close} />}
    {rest.length > 0 && (answer.kind === "report"
      ? <details className="qe-disclosure qe-report-sections"><summary>报告章节与依据（{rest.length}）</summary>{sections}</details>
      : sections)}
  </>;
}
