import { Link } from "react-router-dom";
import type { AnswerChart } from "./assistant";

export function QualityChart({ chart, onSource }: { chart: AnswerChart; onSource?: () => void }) {
  const values = chart.points.flatMap(point => point.value === null ? [] : [point.value]);
  if (!values.length) return null;
  const width = Math.max(540, chart.points.length * 58 + 94);
  const graphHeight = 154;
  const bottom = 182;
  const padding = 50;
  const bar = chart.kind !== "line";
  const step = (width - padding * 2) / chart.points.length;
  const x = (i: number) => padding + step * (i + 0.5);
  const maximum = Math.max(1, ...values);
  const floor = bar ? 0 : Math.min(Math.floor(Math.min(...values)), maximum - 1);
  const y = (value: number) => bottom - (value - floor) * graphHeight / (maximum - floor);
  const samples = chart.points.map((point, index) => point.value === null ? null : { index, value: point.value });
  const path = samples.map((point, index) => point
    ? (index > 0 && samples[index - 1] ? "L" : "M") + x(point.index) + " " + y(point.value)
    : "").join(" ");
  const cumulative = chart.kind === "pareto" ? chart.points.map((point, index) =>
    (index ? "L" : "M") + x(index) + " " + (bottom - (point.cumulative ?? 0) * graphHeight / 100)).join(" ") : "";
  const yTicks = Array.from({ length: 4 }, (_, i) => floor + (maximum - floor) * i / 3);
  return <figure className="qe-chart" aria-label={chart.title}>
    <figcaption>{chart.title}</figcaption>
    <div className="qe-chart-scroll">
      <svg viewBox={`0 0 ${width} 218`} style={{ minWidth: width }} role="group" aria-label={`${chart.title}，纵轴单位 ${chart.unit}`}>
        {yTicks.map(tick => <g key={tick} className="qe-chart-tick">
          <line x1={padding - 4} x2={width - padding + 4} y1={y(tick)} y2={y(tick)} />
          <text x={padding - 9} y={y(tick) + 3} textAnchor="end">{Number(tick.toFixed(1))}{chart.unit}</text>
        </g>)}
        {path && !bar && <path d={path} className="qe-chart-line" />}
        {chart.points.map((point, index) => {
          const label = point.label.length > 10 ? point.label.slice(0, 10) : point.label;
          const mark = point.value === null ? null : bar
            ? <rect x={x(index) - Math.min(15, step / 3)} y={y(point.value)} width={Math.min(30, step * 2 / 3)} height={Math.max(1, bottom - y(point.value))} rx={3} />
            : <circle cx={x(index)} cy={y(point.value)} r={5} />;
          return <g key={index}>
            {mark && point.sources[0] && <Link to={point.sources[0].href} onClick={onSource}
              aria-label={point.label + " " + point.valueText + "，查看业务来源"} className="qe-chart-point">
              <title>{point.label} · {point.valueText}</title>{mark}
            </Link>}
            <text className="qe-chart-axis" x={x(index)} y={203} textAnchor="middle">{label}</text>
          </g>;
        })}
        {cumulative && <path d={cumulative} className="qe-chart-cumulative" />}
        {cumulative && <text className="qe-chart-axis" x={width - 6} y={24} textAnchor="end">累计占比</text>}
      </svg>
    </div>
    <details className="qe-disclosure">
      <summary>查看数据及来源</summary>
      <ul className="qe-source-list">{chart.points.map((point, index) => <li key={index}>
        <strong>{point.label} · {point.valueText}{point.cumulative !== undefined && ` · 累计 ${point.cumulative.toFixed(2)}%`}</strong>
        {point.sources.map((source, sourceIndex) => <Link key={sourceIndex} to={source.href} onClick={onSource}>{source.title} · {source.location}</Link>)}
      </li>)}</ul>
    </details>
  </figure>;
}
