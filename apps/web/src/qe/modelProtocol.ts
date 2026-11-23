export const modelTools = {
  metric: "按指标 ID、起止日、组织和物料取数。metricId 可省略以查全部可见指标。compareStart、compareEnd 可选。grain 可填 day、week、month 分桶。结果含比率、分子分母、来源及可制图的数据集。",
  scan: "筛查指定范围的指标波动。传 start、end、compareStart、compareEnd、organizationId，可选 threshold（百分点）和 minSamples。返回有样本支持的波动及不可比较项。",
  investigate: "拆解已发现的指标波动，返回组织、物料、供应商和生产缺陷等可用维度的贡献、样本与单据。传 metricId、start、end、compareStart、compareEnd 和可选 organizationId、material。候选维度须人工核实。",
  records: "查可见业务单据和字段。当前单据已随上下文提供常用字段；查询其他单据或补查字段时，可传 businessNo、material、businessType、organizationId、start、end、fields（字段名数组）、query（描述关键词）或 limit。",
  knowledge: "检索有来源的标准、历史案例、经通过的 8D 或指定单据附件。传 query、可选 collection（rules、cases、8d、attachment）、businessNo、material、organizationId、start、end。",
  defects: "按工厂、物料、时期聚合生产日报的不良项和累计占比，适合绘制柏拉图。传 start、end、organizationId、material、process（一检或二检）。",
  report: "按 kind（week 或 month）、date（周期锚点）、organizationId 计算可编辑报告的各章事实和来源，返回报告产物；月报按样例，周报简明。结束时可选报告 ID 并为每章写简短分析。",
} as const;

export type ModelTool = keyof typeof modelTools;
type ArgValue = string | number | string[];
export type ToolCall = { tool: ModelTool; args: Record<string, ArgValue> };
export type ModelParagraph = { text: string; facts: string[] };
export type ModelChart = { datasetId: string; kind: "line" | "bar" | "pareto"; title?: string };
export type ModelFinal = {
  title?: string; paragraphs?: ModelParagraph[]; charts?: ModelChart[];
  report?: { id: string; analyses: Array<ModelParagraph & { chapterId: string }> };
};
export type ModelDecision = { calls: ToolCall[] } | { clarify: string } | { final: ModelFinal };
export type ModelFact = { id: string; label: string; text: string; value?: string };
export type AgentFocus = { organizationId?: string; metricId?: string; material?: string; start?: string; end?: string; date?: string };
export type ModelInput = {
  question: string;
  today: string;
  context: {
    businessNo?: string; metricId?: string; organizationId?: string; date?: string; material?: string;
    document?: { businessType: string; organizationId?: string; material?: string; facts: ModelFact[] };
  };
  metrics: Array<{ id: string; label: string }>;
  organizations: Array<{ id: string; name: string }>;
  businessTypes: string[];
  history: Array<{ question: string; answer: string; date?: string; organizationId?: string; artifact?: string; focus?: AgentFocus }>;
  observations: Array<{
    tool: ModelTool; args: ToolCall["args"]; status: "ok" | "empty" | "failed"; message?: string;
    facts: ModelFact[];
    datasets?: Array<{ id: string; title: string; unit: string; facts: string[] }>;
    report?: { id: string; kind: "week" | "month"; chapters: Array<{ id: string; label: string; facts: string[] }> };
  }>;
  instruction?: string;
};
export type ModelDriver = (input: ModelInput, signal: AbortSignal) => Promise<ModelDecision>;

const allowedArgs: Record<ModelTool, string[]> = {
  metric: ["metricId", "start", "end", "compareStart", "compareEnd", "organizationId", "material", "grain"],
  scan: ["start", "end", "compareStart", "compareEnd", "organizationId", "threshold", "minSamples"],
  investigate: ["metricId", "start", "end", "compareStart", "compareEnd", "organizationId", "material"],
  records: ["businessNo", "material", "businessType", "organizationId", "start", "end", "fields", "query", "limit"],
  knowledge: ["query", "collection", "businessNo", "material", "organizationId", "start", "end"],
  defects: ["start", "end", "organizationId", "material", "process"],
  report: ["kind", "date", "organizationId"],
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseToolCall(value: unknown): ToolCall | undefined {
  if (!isObject(value) || typeof value.tool !== "string" || !Object.hasOwn(modelTools, value.tool)) return;
  const tool = value.tool as ModelTool;
  const raw = value.args ?? {};
  if (!isObject(raw)) return;
  const args: ToolCall["args"] = {};
  for (const [name, arg] of Object.entries(raw)) {
    if (!allowedArgs[tool].includes(name)) return;
    if (typeof arg === "string" && arg.length <= 500) args[name] = arg.trim();
    else if (typeof arg === "number" && Number.isFinite(arg)) args[name] = arg;
    else if (name === "fields" && Array.isArray(arg) && arg.length <= 12 && arg.every(a => typeof a === "string" && a.length <= 80)) args[name] = arg;
    else return;
  }
  return { tool, args };
}
