export type DictionaryStatus = "enabled" | "disabled";
export type DictionaryCategory = "enum";
export type FieldType = "single_line" | "multi_line" | "integer" | "decimal" | "date" | "datetime" | "radio" | "checkbox" | "select" | "multi_select" | "file";

export type ConfigDictionaryItem = {
  code: string;
  name: string;
  value: string;
  sort: number;
  status: DictionaryStatus;
};

export type ConfigDictionary = {
  code: string;
  name: string;
  category: DictionaryCategory;
  description: string;
  items: ConfigDictionaryItem[];
};

export type ValidationSpec = {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  accept?: string[];
};

export type FieldDefinition = {
  code: string;
  name: string;
  type: FieldType;
  validation: ValidationSpec;
  source: "builtin" | "custom";
  status: DictionaryStatus;
  description: string;
  updatedAt: string;
};

export type ConfigSchemaField = { fieldCode: string; required?: boolean; visible?: boolean; label?: string };
export type ConfigSchemaVersion = {
  id: string;
  code: string;
  name: string;
  schemaVersion: number;
  status: "draft" | "published";
  fields: ConfigSchemaField[];
  changeNote: string;
  createdAt: string;
  updatedAt: string;
};

export type FormDesignField = {
  fieldCode: string;
  label: string;
  required: boolean;
  visible: boolean;
  span: 1 | 2;
  validation?: DesignValidation;
  requiredWhen?: RequiredCondition;
};

export type DesignValidation = {
  kind: "none" | "text" | "number" | "date" | "choice" | "file";
  min?: number | string;
  max?: number | string;
  pattern?: string;
  message?: string;
  options?: string[];
  accept?: string[];
  maxFiles?: number;
};

export type RequiredCondition = {
  fieldCode: string;
  operator: "equals" | "not_equals" | "filled";
  value?: string;
};

export type FormDesignGroup = {
  id: string;
  name: string;
  columns: 1 | 2;
  fields: FormDesignField[];
};

export type FormDesignDraft = {
  id: string;
  schemaId: string;
  schemaCode: string;
  groups: FormDesignGroup[];
  updatedAt: string;
};

export type FormDesignVersionRecord = {
  id: string;
  schemaId: string;
  schemaCode: string;
  name: string;
  version: number;
  changeNote: string;
  draft: FormDesignDraft;
  createdAt: string;
  publishedAt: string;
  publishedBy: string;
};

export type BusinessDefinitionStatus = "draft" | "active" | "disabled";
export type BusinessDraftStatus = "none" | "unsaved" | "saved" | "validation_failed";
export type WorkflowNodeType = "start" | "submit" | "approval" | "process" | "condition" | "end";
export type BusinessWorkflowNode = {
  id: string;
  name: string;
  type: WorkflowNodeType;
  statusCode: string;
  organizationRule: "platform" | "submitter" | "supplier" | "factory";
  permissionCode: string;
  actions: string[];
  nextNodeIds?: string[];
};
export type BusinessWorkflow = {
  nodes: BusinessWorkflowNode[];
  defaultBranch: string;
};
export type BusinessPermissionConfig = {
  menuName: string;
  menuLocation: string;
  submitterTypes: Array<"platform" | "supplier" | "factory">;
  dataScope: "organization" | "all";
  initialOrganizations: string[];
  read: boolean;
  submit: boolean;
  handle: boolean;
  export: boolean;
};
export type BusinessAnalysisConfig = {
  listFields: string[];
  dimensions: string[];
  metrics: string[];
};
export type BusinessDefinitionVersion = {
  id: string;
  businessId: string;
  version: number;
  name: string;
  changeNote: string;
  form: FormDesignDraft;
  workflow: BusinessWorkflow;
  permissions: BusinessPermissionConfig;
  analysis: BusinessAnalysisConfig;
  publishedAt: string;
  publishedBy: string;
  active: boolean;
};
export type BusinessDefinitionConfig = {
  businessId: string;
  draft: { form: FormDesignDraft; workflow: BusinessWorkflow; permissions: BusinessPermissionConfig; analysis: BusinessAnalysisConfig; updatedAt: string; updatedBy?: string; revision?: number };
  versions: BusinessDefinitionVersion[];
  draftStatus?: BusinessDraftStatus;
  lastValidationError?: string;
};

export const CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY = "quality-platform.configuration-business-definitions";
export const CONFIG_BUSINESS_VERSIONS_STORAGE_KEY = "quality-platform.configuration-business-versions";

export function createDefaultBusinessWorkflow(code = "business"): BusinessWorkflow {
  return { defaultBranch: "end", nodes: [
    { id: "start", name: "开始", type: "start", statusCode: "draft", organizationRule: "submitter", permissionCode: `merchant.business.${code}.submit`, actions: ["提交"], nextNodeIds: ["approval"] },
    { id: "approval", name: "平台审核", type: "approval", statusCode: "pending_review", organizationRule: "platform", permissionCode: `platform.business.${code}.review`, actions: ["通过", "驳回"], nextNodeIds: ["end"] },
    { id: "end", name: "结束", type: "end", statusCode: "completed", organizationRule: "platform", permissionCode: `merchant.business.${code}.read`, actions: [] },
  ] };
}

export type BusinessWorkflowTemplate = "direct" | "single_approval" | "external" | "multi_stage";

export function createBusinessWorkflowTemplate(template: BusinessWorkflowTemplate, code = "business"): BusinessWorkflow {
  const end: BusinessWorkflowNode = { id: "end", name: "结束", type: "end", statusCode: "completed", organizationRule: "platform", permissionCode: `merchant.business.${code}.read`, actions: [] };
  if (template === "direct") {
    return { defaultBranch: "end", nodes: [
      { id: "start", name: "开始", type: "start", statusCode: "draft", organizationRule: "submitter", permissionCode: `merchant.business.${code}.submit`, actions: ["提交"], nextNodeIds: [end.id] },
      end,
    ] };
  }
  if (template === "external") {
    return { defaultBranch: "end", nodes: [
      { id: "start", name: "开始", type: "start", statusCode: "draft", organizationRule: "platform", permissionCode: `platform.business.${code}.create`, actions: ["创建"], nextNodeIds: ["platform_review"] },
      { id: "platform_review", name: "平台审核", type: "approval", statusCode: "pending_platform_review", organizationRule: "platform", permissionCode: `platform.business.${code}.review`, actions: ["通过", "驳回"], nextNodeIds: ["supplier_process"] },
      { id: "supplier_process", name: "供应商处理", type: "process", statusCode: "pending_supplier_process", organizationRule: "supplier", permissionCode: `merchant.business.${code}.handle`, actions: ["处理完成"], nextNodeIds: ["platform_acceptance"] },
      { id: "platform_acceptance", name: "平台验收", type: "approval", statusCode: "pending_platform_acceptance", organizationRule: "platform", permissionCode: `platform.business.${code}.accept`, actions: ["验收通过", "退回"], nextNodeIds: [end.id] },
      end,
    ] };
  }
  if (template === "multi_stage") {
    return { defaultBranch: "end", nodes: [
      { id: "start", name: "开始", type: "start", statusCode: "draft", organizationRule: "submitter", permissionCode: `merchant.business.${code}.submit`, actions: ["提交"], nextNodeIds: ["initial_review"] },
      { id: "initial_review", name: "初审", type: "approval", statusCode: "pending_initial_review", organizationRule: "platform", permissionCode: `platform.business.${code}.review`, actions: ["通过", "驳回"], nextNodeIds: ["process"] },
      { id: "process", name: "业务处理", type: "process", statusCode: "pending_process", organizationRule: "supplier", permissionCode: `merchant.business.${code}.handle`, actions: ["处理完成"], nextNodeIds: ["final_review"] },
      { id: "final_review", name: "终审", type: "approval", statusCode: "pending_final_review", organizationRule: "platform", permissionCode: `platform.business.${code}.approve`, actions: ["通过", "驳回"], nextNodeIds: [end.id] },
      end,
    ] };
  }
  return createDefaultBusinessWorkflow(code);
}

export function createDefaultBusinessPermissions(name: string): BusinessPermissionConfig {
  return { menuName: name, menuLocation: "平台业务", submitterTypes: ["platform", "supplier", "factory"], dataScope: "organization", initialOrganizations: [], read: true, submit: true, handle: true, export: true };
}

export function createDefaultBusinessAnalysis(): BusinessAnalysisConfig {
  return { listFields: ["businessNo", "organization", "businessDate", "status"], dimensions: ["业务分类", "当前状态"], metrics: ["业务记录数"] };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export function readBusinessDefinitionConfigs(): BusinessDefinitionConfig[] {
  const records = parseStored<BusinessDefinitionConfig[]>(CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY, []);
  return Array.isArray(records) ? records : [];
}

export function readBusinessDefinitionConfig(businessId: string, form: FormDesignDraft, code: string, name: string, activeVersion = 0): BusinessDefinitionConfig {
  const existing = readBusinessDefinitionConfigs().find((item) => item.businessId === businessId);
  if (existing) return { ...existing, draft: { ...existing.draft, revision: existing.draft.revision ?? 1, updatedBy: existing.draft.updatedBy ?? "演示管理员" } };
  const draft = { form: clone(form), workflow: createDefaultBusinessWorkflow(code), permissions: createDefaultBusinessPermissions(name), analysis: createDefaultBusinessAnalysis(), updatedAt: "2026-08-29 10:00", updatedBy: "演示管理员", revision: 1 };
  const baseline: BusinessDefinitionVersion[] = activeVersion > 0 ? [{ id: `business-definition-version-${businessId}-${activeVersion}`, businessId, version: activeVersion, name: `${name} V${activeVersion}`, changeNote: "M1 已激活业务基线", form: clone(form), workflow: clone(draft.workflow), permissions: clone(draft.permissions), analysis: clone(draft.analysis), publishedAt: "2026-08-29 09:00", publishedBy: "系统", active: true }] : [];
  return { businessId, draft, versions: baseline };
}

export function saveBusinessDefinitionConfig(config: BusinessDefinitionConfig, expectedRevision?: number): BusinessDefinitionConfig {
  const records = readBusinessDefinitionConfigs();
  const existing = records.find((item) => item.businessId === config.businessId);
  const actualRevision = existing?.draft.revision ?? 0;
  if (expectedRevision !== undefined && existing && actualRevision !== expectedRevision) throw new Error("草稿已被其他页面更新，请刷新后继续编辑或另存副本");
  const next = { ...config, draftStatus: config.draftStatus ?? "saved", draft: { ...config.draft, updatedAt: "2026-08-29 10:00", updatedBy: "演示管理员", revision: actualRevision + 1 } };
  window.localStorage.setItem(CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY, JSON.stringify([next, ...records.filter((item) => item.businessId !== config.businessId)]));
  return next;
}

export function validateBusinessDefinitionConfig(config: BusinessDefinitionConfig): string[] {
  const errors: string[] = [];
  const nodes = config.draft.workflow.nodes;
  if (nodes.filter((node) => node.type === "start").length !== 1) errors.push("流程必须有且仅有一个开始节点");
  if (nodes.filter((node) => node.type === "end").length < 1) errors.push("流程至少需要一个结束节点");
  if (new Set(nodes.map((node) => node.name.trim())).size !== nodes.length || nodes.some((node) => !node.name.trim() || node.name.trim().length > 50)) errors.push("流程节点名称必须在1-50字符内且流程内唯一");
  if (new Set(nodes.map((node) => node.statusCode.trim())).size !== nodes.length || nodes.some((node) => !node.statusCode.trim())) errors.push("每个节点必须配置唯一业务状态码");
  if (nodes.some((node) => (node.type === "approval" || node.type === "process") && !node.permissionCode.trim())) errors.push("处理节点必须配置处理权限");
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodes.some((node) => node.type !== "end" && (!node.nextNodeIds?.length || node.nextNodeIds.some((id) => !nodeIds.has(id))))) errors.push("除结束节点外必须配置有效的流转去向");
  const start = nodes.find((node) => node.type === "start");
  if (start) {
    const reachable = new Set<string>();
    const visit = (id: string): void => { if (reachable.has(id)) return; reachable.add(id); nodes.find((node) => node.id === id)?.nextNodeIds?.forEach(visit); };
    visit(start.id);
    if (reachable.size !== nodes.length) errors.push("流程存在无法从开始节点到达的节点");
    if (!nodes.filter((node) => node.type === "end").some((node) => reachable.has(node.id))) errors.push("流程必须存在从开始节点可达的结束节点");
  }
  if (!config.draft.form.groups.some((group) => group.fields.length > 0)) errors.push("表单至少需要一个字段");
  if (!config.draft.permissions.menuName.trim()) errors.push("权限与入口必须填写菜单名称");
  return errors;
}

export function copyBusinessDefinitionDraft(source: BusinessDefinitionConfig, businessId: string, form: FormDesignDraft): BusinessDefinitionConfig {
  return {
    businessId,
    draft: {
      form: clone(form),
      workflow: clone(source.draft.workflow),
      permissions: clone(source.draft.permissions),
      analysis: clone(source.draft.analysis),
      updatedAt: "2026-08-29 10:00",
      updatedBy: "演示管理员",
      revision: 1,
    },
    versions: [],
  };
}

export type BusinessDefinitionDiff = { added: string[]; changed: string[]; removed: string[] };

export function diffBusinessDefinition(config: BusinessDefinitionConfig): BusinessDefinitionDiff {
  const active = config.versions.find((version) => version.active);
  if (!active) return { added: ["首次发布的业务定义"], changed: [], removed: [] };
  const diff = (before: Array<[string, string]>, after: Array<[string, string]>, label: string): BusinessDefinitionDiff => {
    const oldItems = new Map(before);
    const newItems = new Map(after);
    return {
      added: [...newItems.keys()].filter((key) => !oldItems.has(key)).map((key) => `${label}：${key}`),
      changed: [...newItems.keys()].filter((key) => oldItems.has(key) && oldItems.get(key) !== newItems.get(key)).map((key) => `${label}：${key}`),
      removed: [...oldItems.keys()].filter((key) => !newItems.has(key)).map((key) => `${label}：${key}`),
    };
  };
  const formBefore = active.form.groups.flatMap((group) => group.fields.map((field) => [field.fieldCode, JSON.stringify(field)] as [string, string]));
  const formAfter = config.draft.form.groups.flatMap((group) => group.fields.map((field) => [field.fieldCode, JSON.stringify(field)] as [string, string]));
  const flowBefore = active.workflow.nodes.map((node) => [node.id, JSON.stringify(node)] as [string, string]);
  const flowAfter = config.draft.workflow.nodes.map((node) => [node.id, JSON.stringify(node)] as [string, string]);
  const formDiff = diff(formBefore, formAfter, "字段");
  const flowDiff = diff(flowBefore, flowAfter, "流程节点");
  return { added: [...formDiff.added, ...flowDiff.added], changed: [...formDiff.changed, ...flowDiff.changed], removed: [...formDiff.removed, ...flowDiff.removed] };
}

export function publishBusinessDefinition(config: BusinessDefinitionConfig, name: string, changeNote: string, publishedBy = "演示管理员"): BusinessDefinitionVersion {
  const note = changeNote.trim();
  if (!note) throw new Error("发布变更说明不能为空");
  if (note.length > 500) throw new Error("发布变更说明不能超过500个字符");
  const errors = validateBusinessDefinitionConfig(config);
  if (errors.length) throw new Error(errors.join("；"));
  const version = Math.max(0, ...config.versions.map((item) => item.version)) + 1;
  const saved: BusinessDefinitionVersion = { id: `business-definition-version-${config.businessId}-${version}`, businessId: config.businessId, version, name: name.trim() || `版本 ${version}`, changeNote: note, form: clone(config.draft.form), workflow: clone(config.draft.workflow), permissions: clone(config.draft.permissions), analysis: clone(config.draft.analysis), publishedAt: "2026-08-29 10:00", publishedBy, active: true };
  const versions = config.versions.map((item) => ({ ...item, active: false }));
  saveBusinessDefinitionConfig({ ...config, draftStatus: "none", lastValidationError: undefined, versions: [saved, ...versions] });
  return saved;
}

export function rollbackBusinessDefinition(config: BusinessDefinitionConfig, version: BusinessDefinitionVersion): BusinessDefinitionConfig {
  return saveBusinessDefinitionConfig({ ...config, draftStatus: "saved", lastValidationError: undefined, draft: { form: clone(version.form), workflow: clone(version.workflow), permissions: clone(version.permissions), analysis: clone(version.analysis), updatedAt: "2026-08-29 10:00" } });
}

export function discardBusinessDefinitionDraft(config: BusinessDefinitionConfig): BusinessDefinitionConfig {
  const active = config.versions.find((version) => version.active);
  if (!active) throw new Error("尚未发布的业务可直接删除，无需放弃草稿");
  return saveBusinessDefinitionConfig({ ...config, draftStatus: "none", lastValidationError: undefined, draft: { form: clone(active.form), workflow: clone(active.workflow), permissions: clone(active.permissions), analysis: clone(active.analysis), updatedAt: "2026-08-29 10:00", updatedBy: "演示管理员" } });
}

export const CONFIG_DICTIONARIES_STORAGE_KEY = "quality-platform.config-dictionaries";
export const CONFIG_FIELDS_STORAGE_KEY = "quality-platform.config-fields";
export const CONFIG_SCHEMAS_STORAGE_KEY = "quality-platform.config-schemas";
export const CONFIG_FORM_DESIGNS_STORAGE_KEY = "quality-platform.config-form-designs";
export const CONFIG_FORM_DESIGN_VERSIONS_STORAGE_KEY = "quality-platform.config-form-design-versions";

const seededEnumDictionaries: ConfigDictionary[] = [
  ["OPTION_001", "检验结果", ["合格", "不合格"], "检验物料是否合格"],
  ["OPTION_002", "物料供货方式", ["工厂采购", "平台采购"], "物料供货方式"],
  ["OPTION_003", "巡线问题责任部门", ["生产", "工程", "品质", "计划", "平台"], "IPQC巡线责任归属"],
  ["OPTION_004", "巡线问题定位", ["现场5S问题", "执行问题", "人员问题", "物料问题", "治具问题", "管理问题", "文件问题"], "IPQC巡线问题分类"],
  ["OPTION_005", "巡线问题处理进度", ["及时纠正", "延迟纠正", "未纠正"], "IPQC巡线整改进度"],
  ["OPTION_006", "退料进展", ["已退料", "未退料", "已补回"], "零星退料状态"],
  ["OPTION_007", "入库合格类型", ["合格", "不合格"], "入库报告流转规则"],
].map(([code, name, values, description]) => ({
  code: code as string,
  name: name as string,
  category: "enum" as const,
  description: description as string,
  items: (values as string[]).map((value, index) => ({ code: `${code}_${String(index + 1).padStart(3, "0")}`, name: value, value, sort: index + 1, status: "enabled" as const })),
}));

const fieldSeedRows: Array<[string, string, FieldType, ValidationSpec, string]> = [
  ["FIELD_001", "供应商名称", "select", { required: true }, "关联供应商列表"],
  ["FIELD_002", "物料料号", "single_line", { required: true, pattern: "数字，8位整数" }, "产品/物料编码"],
  ["FIELD_003", "物料名称", "single_line", { required: true, min: 1, max: 100 }, "物料名称"],
  ["FIELD_004", "物料型号", "single_line", { required: true, pattern: "字母数字" }, "物料型号"],
  ["FIELD_005", "订单号", "single_line", { required: true, pattern: "字母数字" }, "出货/入库订单号"],
  ["FIELD_006", "订单数量", "integer", { required: true, min: 1 }, "出货/入库订单数量"],
  ["FIELD_007", "出货数量", "integer", { required: true, min: 1 }, "供应商出货数量"],
  ["FIELD_008", "入库数量", "integer", { required: true, min: 1 }, "工厂入库数量"],
  ["FIELD_009", "附件", "file", { accept: ["JPG", "PNG", "GIF", "PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "ZIP", "RAR"], max: 10 }, "统一附件字段，单文件≤10MB"],
  ["FIELD_010", "产品名称", "single_line", { required: true, min: 1, max: 100 }, "最终成品名称"],
  ["FIELD_011", "产品型号", "single_line", { required: true, pattern: "字母数字" }, "产品型号"],
  ["FIELD_012", "业务时间", "date", { required: true }, "前端可按业务显示为出货/检验等时间"],
  ["FIELD_013", "投入数量", "integer", { required: true, min: 1 }, "样本总数"],
  ["FIELD_014", "检验数量", "integer", { required: true, min: 1 }, "参与检验数量"],
  ["FIELD_015", "不良数量", "integer", { required: true, min: 0 }, "生产日报中为不良明细合计只读字段"],
  ["FIELD_016", "不良率", "decimal", {}, "不良数量/检验数量×100%，保留2位小数"],
  ["FIELD_017", "异常描述", "multi_line", { required: true, min: 1, max: 500 }, "不良问题描述"],
  ["FIELD_018", "返回供应数量", "integer", { min: 0 }, "售后异常返回供应商的不良品数量"],
  ["FIELD_019", "处理方式", "single_line", { max: 200 }, "来料检验审核通过时必填"],
  ["FIELD_020", "检验工序", "single_line", { required: true, min: 1, max: 50 }, "抽检、一检、二检、外观等"],
  ["FIELD_021", "不良明细", "multi_line", {}, "对象数组：不良项与数量"],
  ["FIELD_022", "维修明细", "multi_line", { required: true }, "对象数组：关联来源日报与不良项"],
  ["FIELD_023", "维修方法", "multi_line", { required: true, min: 1, max: 500 }, "维修方法"],
  ["FIELD_024", "维修人", "single_line", { required: true, min: 1, max: 50 }, "维修人"],
  ["FIELD_025", "工厂名称", "select", { required: true }, "关联工厂列表"],
  ["FIELD_026", "班组/线体", "single_line", { required: true, min: 1, max: 50 }, "巡线班组/线体"],
  ["FIELD_027", "巡线问题提出者", "single_line", { required: true, min: 1, max: 50 }, "巡线问题提出者"],
  ["FIELD_028", "巡线事项描述", "multi_line", { required: true, min: 1, max: 500 }, "巡线问题事项描述"],
  ["FIELD_029", "巡线问题改善措施", "multi_line", { required: true, min: 1, max: 500 }, "巡线改善措施"],
  ["FIELD_030", "质量跟进人", "single_line", { required: true, min: 1, max: 50 }, "巡线问题跟进人"],
  ["FIELD_031", "组装总数", "integer", { required: true, min: 1 }, "组装产品物料总数"],
  ["FIELD_032", "退料原因", "single_line", { required: true, min: 1, max: 200 }, "退料原因"],
  ["FIELD_033", "退料数量", "integer", { required: true, min: 1 }, "退料数量"],
  ["FIELD_034", "退料快递单号", "single_line", { required: true, pattern: "字母数字" }, "退料快递单号"],
  ["FIELD_035", "退料时间", "datetime", {}, "退料时间"],
  ["FIELD_036", "物料补回时间", "datetime", {}, "物料补回时间"],
  ["FIELD_037", "备注", "multi_line", { max: 500 }, "备注"],
];

export const fieldTypeLabels: Record<FieldType, string> = {
  single_line: "单行文本", multi_line: "多行文本", integer: "数字（整数）", decimal: "数字（小数）", date: "日期", datetime: "日期时间", radio: "单选按钮组", checkbox: "复选框", select: "下拉选择（单选）", multi_select: "下拉选择（多选）", file: "文件上传",
};

const seededFields: FieldDefinition[] = fieldSeedRows.map(([code, name, type, validation, description]) => ({ code, name, type, validation, description, source: "builtin", status: "enabled", updatedAt: "2026-08-25 10:00" }));

const seededDictionaries = seededEnumDictionaries;

const seededSchemas: ConfigSchemaVersion[] = [{
  id: "schema-supplier-improvement-tracking-v1",
  code: "supplier_improvement_tracking",
  name: "供应商改善追踪",
  schemaVersion: 1,
  status: "draft",
  fields: [
    { fieldCode: "FIELD_001", required: true },
    { fieldCode: "FIELD_003", required: true },
    { fieldCode: "FIELD_004", required: true },
    { fieldCode: "FIELD_017", required: true, label: "改善问题描述" },
    { fieldCode: "FIELD_009", label: "改善附件" },
    { fieldCode: "FIELD_037", label: "跟进备注" },
  ],
  changeNote: "M2 Pilot初始配置schema",
  createdAt: "2026-08-25 10:00",
  updatedAt: "2026-08-25 10:00",
}];

const designTimestamp = "2026-08-25 12:00";

function parseStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

export function readConfigDictionaries(): ConfigDictionary[] {
  const records = parseStored<ConfigDictionary[]>(CONFIG_DICTIONARIES_STORAGE_KEY, seededDictionaries);
  const enumDictionaries = Array.isArray(records) ? records.filter((record) => record.category === "enum") : [];
  return enumDictionaries.length ? enumDictionaries : seededDictionaries;
}

export function setDictionaryItemStatus(dictionaryCode: string, itemCode: string, status: DictionaryStatus): ConfigDictionary[] {
  const dictionaries = readConfigDictionaries();
  const dictionary = dictionaries.find((item) => item.code === dictionaryCode);
  if (!dictionary || dictionary.category !== "enum") throw new Error("仅枚举字典项支持停用或启用");
  const found = dictionary.items.some((item) => item.code === itemCode);
  if (!found) throw new Error("未找到字典项");
  const next = dictionaries.map((item) => item.code !== dictionaryCode ? item : { ...item, items: item.items.map((entry) => entry.code === itemCode ? { ...entry, status } : entry) });
  window.localStorage.setItem(CONFIG_DICTIONARIES_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function readFieldDefinitions(): FieldDefinition[] {
  const records = parseStored<FieldDefinition[]>(CONFIG_FIELDS_STORAGE_KEY, seededFields);
  return Array.isArray(records) && records.length ? records : seededFields;
}

export function formatValidation(validation: ValidationSpec): string {
  const labels: string[] = [];
  if (validation.required) labels.push("必填");
  if (validation.min !== undefined) labels.push(`最小值/长度 ${validation.min}`);
  if (validation.max !== undefined) labels.push(validation.accept ? `单文件≤${validation.max}MB` : `最大值/长度 ${validation.max}`);
  if (validation.pattern) labels.push(validation.pattern);
  if (validation.accept?.length) labels.push(validation.accept.join("/"));
  return labels.length ? labels.join("；") : "无";
}

export function validateFieldDefinition(input: Omit<FieldDefinition, "source" | "status" | "updatedAt">, existing: FieldDefinition[], editingCode?: string): string | undefined {
  if (!/^[A-Z][A-Z0-9_]{2,49}$/.test(input.code)) return "字段编码需为3-50位大写字母、数字或下划线，且以字母开头";
  if (!input.name.trim() || input.name.trim().length > 100) return "字段名称不能为空且不能超过100个字符";
  if (!fieldTypeLabels[input.type]) return "字段类型无效";
  if (existing.some((field) => field.code === input.code && field.code !== editingCode)) return "字段编码已存在，请使用其他编码";
  if (input.validation.min !== undefined && input.validation.max !== undefined && input.validation.min > input.validation.max) return "最小值不能大于最大值";
  return undefined;
}

export function saveFieldDefinition(input: Omit<FieldDefinition, "source" | "status" | "updatedAt">, editingCode?: string): FieldDefinition[] {
  const fields = readFieldDefinitions();
  const error = validateFieldDefinition(input, fields, editingCode);
  if (error) throw new Error(error);
  if (editingCode) {
    const target = fields.find((field) => field.code === editingCode);
    if (!target || target.source !== "custom") throw new Error("仅自定义字段可以编辑");
    const next = fields.map((field) => field.code === editingCode ? { ...field, ...input, code: editingCode, updatedAt: "2026-08-25 11:00" } : field);
    window.localStorage.setItem(CONFIG_FIELDS_STORAGE_KEY, JSON.stringify(next));
    return next;
  }
  const next = [...fields, { ...input, code: input.code.trim(), name: input.name.trim(), description: input.description.trim(), source: "custom" as const, status: "enabled" as const, updatedAt: "2026-08-25 11:00" }];
  window.localStorage.setItem(CONFIG_FIELDS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function setFieldStatus(code: string, status: DictionaryStatus): FieldDefinition[] {
  const fields = readFieldDefinitions();
  const field = fields.find((item) => item.code === code);
  if (!field) throw new Error("未找到字段");
  const next = fields.map((item) => item.code === code ? { ...item, status, updatedAt: "2026-08-25 11:00" } : item);
  window.localStorage.setItem(CONFIG_FIELDS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

type ConfigSchemaInput = Pick<ConfigSchemaVersion, "code" | "name" | "status" | "fields" | "changeNote">;

export function validateConfigSchemaInput(input: ConfigSchemaInput, fields = readFieldDefinitions()): string | undefined {
  if (!/^[a-z][a-z0-9_]{2,49}$/.test(input.code)) return "schema编码需为3-50位小写字母、数字或下划线，且以字母开头";
  if (!input.name.trim()) return "schema名称不能为空";
  if (input.status !== "draft" && input.status !== "published") return "schema状态无效";
  if (!Array.isArray(input.fields) || input.fields.length === 0) return "schema至少需要一个字段";
  const codes = input.fields.map((field) => field.fieldCode);
  if (new Set(codes).size !== codes.length) return "schema不能重复引用同一个字段";
  const known = new Set(fields.map((field) => field.code));
  if (codes.some((code) => !known.has(code))) return "schema引用了字段库中不存在的字段";
  return undefined;
}

export function readConfigSchemas(): ConfigSchemaVersion[] {
  const records = parseStored<ConfigSchemaVersion[]>(CONFIG_SCHEMAS_STORAGE_KEY, seededSchemas);
  return Array.isArray(records) && records.length ? records : seededSchemas;
}

/** Returns a stable schema namespace for an existing business even before a persisted schema exists. */
export function getBusinessSchema(businessCode: string, businessName: string, _status: ConfigSchemaVersion["status"] = "draft"): ConfigSchemaVersion {
  const existing = readConfigSchemas().find((schema) => schema.code === businessCode);
  if (existing && existing.status === "draft") return existing;
  const template = existing ?? seededSchemas[0];
  const nextVersion = existing ? existing.schemaVersion + 1 : 1;
  return {
    ...template,
    id: `business-schema-${businessCode}-v${nextVersion}`,
    code: businessCode,
    name: businessName,
    schemaVersion: nextVersion,
    status: "draft",
    changeNote: existing ? `基于 v${existing.schemaVersion} 创建草稿` : "现有业务表单草稿",
    createdAt: "2026-08-29 10:00",
    updatedAt: "2026-08-29 10:00",
  };
}

export function saveConfigSchemaJson(raw: string): ConfigSchemaVersion {
  let input: ConfigSchemaInput;
  try { input = JSON.parse(raw) as ConfigSchemaInput; } catch { throw new Error("配置JSON格式错误"); }
  const validationError = validateConfigSchemaInput(input);
  if (validationError) throw new Error(validationError);
  const schemas = readConfigSchemas();
  const version = Math.max(0, ...schemas.filter((schema) => schema.code === input.code).map((schema) => schema.schemaVersion)) + 1;
  const saved: ConfigSchemaVersion = { ...input, id: `schema-${input.code}-v${version}`, schemaVersion: version, createdAt: "2026-08-25 11:00", updatedAt: "2026-08-25 11:00" };
  window.localStorage.setItem(CONFIG_SCHEMAS_STORAGE_KEY, JSON.stringify([saved, ...schemas]));
  return saved;
}

export function setConfigSchemaStatus(schemaId: string, status: ConfigSchemaVersion["status"]): ConfigSchemaVersion {
  const schemas = readConfigSchemas();
  const target = schemas.find((schema) => schema.id === schemaId);
  if (!target) throw new Error("配置版本不存在");
  const next = { ...target, status, updatedAt: "2026-08-26 10:00" };
  window.localStorage.setItem(CONFIG_SCHEMAS_STORAGE_KEY, JSON.stringify(schemas.map((schema) => schema.id === schemaId ? next : schema)));
  return next;
}

export function configSchemaJson(schema: ConfigSchemaVersion): string {
  return JSON.stringify({ code: schema.code, name: schema.name, status: schema.status, fields: schema.fields, changeNote: schema.changeNote }, null, 2);
}

function designFieldFromSchema(schemaField: ConfigSchemaField, fields: FieldDefinition[]): FormDesignField {
  const field = fields.find((entry) => entry.code === schemaField.fieldCode);
  return {
    fieldCode: schemaField.fieldCode,
    label: schemaField.label ?? field?.name ?? schemaField.fieldCode,
    required: schemaField.required ?? Boolean(field?.validation.required),
    visible: schemaField.visible ?? true,
    span: schemaField.fieldCode === "FIELD_017" ? 2 : 1,
    validation: designValidationFromField(field),
  };
}

function designValidationFromField(field?: FieldDefinition): DesignValidation {
  if (!field) return { kind: "none" };
  const kind = field.type === "integer" || field.type === "decimal" ? "number" : field.type === "date" || field.type === "datetime" ? "date" : field.type === "single_line" || field.type === "multi_line" ? "text" : field.type === "select" || field.type === "radio" || field.type === "checkbox" || field.type === "multi_select" ? "choice" : field.type === "file" ? "file" : "none";
  return { kind, min: field.validation.min, max: field.validation.max, pattern: field.validation.pattern, accept: field.validation.accept, options: kind === "choice" ? ["选项一", "选项二"] : undefined, maxFiles: kind === "file" ? 1 : undefined };
}

function normalizeDesignValidation(validation: DesignValidation | undefined, field?: FieldDefinition): DesignValidation {
  const fallback = designValidationFromField(field);
  const next = validation ?? fallback;
  if (field && next.kind !== fallback.kind) return normalizeDesignValidation({ ...next, kind: fallback.kind }, field);
  if (next.kind === "choice" && (!next.options || next.options.length === 0)) return { ...next, options: fallback.options ?? ["选项一", "选项二"] };
  if (next.kind === "file" && next.maxFiles === undefined) return { ...next, accept: next.accept ?? fallback.accept, maxFiles: fallback.maxFiles ?? 1 };
  return next;
}

export function normalizeFormDesignDraft(draft: FormDesignDraft, fields = readFieldDefinitions()): FormDesignDraft {
  return {
    ...draft,
    groups: (Array.isArray(draft.groups) ? draft.groups : []).map((group) => ({
      ...group,
      columns: group.columns === 1 ? 1 : 2,
      fields: (Array.isArray(group.fields) ? group.fields : []).map((field) => ({
        ...field,
        required: Boolean(field.required),
        visible: field.visible !== false,
        span: field.span === 2 ? 2 : 1,
        validation: normalizeDesignValidation(field.validation, fields.find((entry) => entry.code === field.fieldCode)),
      })),
    })),
  };
}

export function createFormDesignDraft(schema: ConfigSchemaVersion, fields = readFieldDefinitions()): FormDesignDraft {
  const schemaFields = schema.fields.map((field) => designFieldFromSchema(field, fields));
  const basicCodes = new Set(["FIELD_001", "FIELD_003", "FIELD_004"]);
  const basicFields = schemaFields.filter((field) => basicCodes.has(field.fieldCode));
  const detailFields = schemaFields.filter((field) => !basicCodes.has(field.fieldCode));
  return {
    id: `form-design-${schema.id}`,
    schemaId: schema.id,
    schemaCode: schema.code,
    groups: [
      { id: "group-basic", name: "基础信息", columns: 2 as const, fields: basicFields },
      { id: "group-detail", name: "改善信息", columns: 1 as const, fields: detailFields },
    ].filter((group) => group.fields.length > 0),
    updatedAt: designTimestamp,
  };
}

export function readFormDesignDraft(schema: ConfigSchemaVersion, fields = readFieldDefinitions()): FormDesignDraft {
  const drafts = parseStored<FormDesignDraft[]>(CONFIG_FORM_DESIGNS_STORAGE_KEY, []);
  const stored = Array.isArray(drafts) ? drafts.find((draft) => draft.schemaId === schema.id) : undefined;
  return stored ? normalizeFormDesignDraft(stored, fields) : createFormDesignDraft(schema, fields);
}

export function saveFormDesignDraft(draft: FormDesignDraft): FormDesignDraft {
  const drafts = parseStored<FormDesignDraft[]>(CONFIG_FORM_DESIGNS_STORAGE_KEY, []);
  const next = { ...draft, updatedAt: designTimestamp };
  const previous = Array.isArray(drafts) ? drafts : [];
  window.localStorage.setItem(CONFIG_FORM_DESIGNS_STORAGE_KEY, JSON.stringify([next, ...previous.filter((entry) => entry.schemaId !== draft.schemaId)]));
  return next;
}

export function readFormDesignVersions(schemaCode?: string): FormDesignVersionRecord[] {
  const records = parseStored<FormDesignVersionRecord[]>(CONFIG_FORM_DESIGN_VERSIONS_STORAGE_KEY, []);
  const normalized = Array.isArray(records) ? records : [];
  return schemaCode ? normalized.filter((record) => record.schemaCode === schemaCode).sort((a, b) => b.version - a.version) : normalized;
}

export function copyConfigSchemaVersion(source: ConfigSchemaVersion, name?: string): ConfigSchemaVersion {
  return saveConfigSchemaJson(JSON.stringify({
    code: source.code,
    name: name?.trim() || `${source.name}（副本）`,
    status: "draft",
    fields: source.fields,
    changeNote: `复制自 v${source.schemaVersion}`,
  }));
}

export function saveFormDesignVersion(schema: ConfigSchemaVersion, draft: FormDesignDraft, changeNote: string, versionName?: string): FormDesignVersionRecord {
  const records = readFormDesignVersions();
  if (records.some((record) => record.schemaId === schema.id)) throw new Error("该版本已经发布，不能重复发布");
  const normalizedChangeNote = changeNote.trim();
  if (!normalizedChangeNote) throw new Error("发布变更说明不能为空");
  if (normalizedChangeNote.length > 500) throw new Error("发布变更说明不能超过 500 个字符");
  const saved: FormDesignVersionRecord = {
    id: `form-design-version-${schema.id}`,
    schemaId: schema.id,
    schemaCode: schema.code,
    name: versionName?.trim() || schema.name,
    version: schema.schemaVersion,
    changeNote: normalizedChangeNote,
    draft: JSON.parse(JSON.stringify(draft)) as FormDesignDraft,
    createdAt: schema.createdAt,
    publishedAt: "2026-08-26 10:00",
    publishedBy: "演示管理员",
  };
  window.localStorage.setItem(CONFIG_FORM_DESIGN_VERSIONS_STORAGE_KEY, JSON.stringify([saved, ...records]));
  return saved;
}

export function saveCopiedFormDesignDraft(source: FormDesignDraft, schema: ConfigSchemaVersion): FormDesignDraft {
  const copied = JSON.parse(JSON.stringify(source)) as FormDesignDraft;
  return saveFormDesignDraft({ ...copied, id: `form-design-${schema.id}`, schemaId: schema.id, schemaCode: schema.code });
}

export function designContainsField(draft: FormDesignDraft, fieldCode: string): boolean {
  return draft.groups.some((group) => group.fields.some((field) => field.fieldCode === fieldCode));
}

export function addDesignField(draft: FormDesignDraft, field: FieldDefinition, groupId: string): FormDesignDraft {
  if (field.status !== "enabled") throw new Error("停用字段不能加入表单");
  if (designContainsField(draft, field.code)) throw new Error("同一字段只能在表单中出现一次");
  const target = draft.groups.find((group) => group.id === groupId);
  if (!target) throw new Error("未找到目标分组");
  const designField: FormDesignField = { fieldCode: field.code, label: field.name, required: Boolean(field.validation.required), visible: true, span: 1, validation: designValidationFromField(field) };
  return { ...draft, groups: draft.groups.map((group) => group.id === groupId ? { ...group, fields: [...group.fields, designField] } : group) };
}

export function isDesignFieldRequired(field: FormDesignField, values: Record<string, string>): boolean {
  if (field.required) return true;
  const condition = field.requiredWhen;
  if (!condition) return false;
  const current = values[condition.fieldCode] ?? "";
  if (condition.operator === "filled") return current.trim().length > 0;
  return condition.operator === "equals" ? current === (condition.value ?? "") : current !== (condition.value ?? "");
}

export function validateDesignPreview(draft: FormDesignDraft, values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields = draft.groups.flatMap((group) => group.fields).filter((field) => field.visible !== false);
  fields.forEach((field) => {
    const value = values[field.fieldCode] ?? "";
    const validation = field.validation ?? { kind: "none" as const };
    if (isDesignFieldRequired(field, values) && !value.trim()) { errors[field.fieldCode] = validation.message || "此字段为必填项"; return; }
    if (!value.trim()) return;
    if (validation.kind === "text") {
      if (typeof validation.min === "number" && value.length < validation.min) errors[field.fieldCode] = validation.message || `至少填写${validation.min}个字符`;
      if (typeof validation.max === "number" && value.length > validation.max) errors[field.fieldCode] = validation.message || `最多填写${validation.max}个字符`;
    }
    if (validation.kind === "number") {
      const number = Number(value);
      if (Number.isNaN(number)) errors[field.fieldCode] = validation.message || "请输入有效数字";
      else if (validation.min !== undefined && number < Number(validation.min)) errors[field.fieldCode] = validation.message || `数值不能小于${validation.min}`;
      else if (validation.max !== undefined && number > Number(validation.max)) errors[field.fieldCode] = validation.message || `数值不能大于${validation.max}`;
    }
    if (validation.kind === "date") {
      if (validation.min && value < String(validation.min)) errors[field.fieldCode] = validation.message || `日期不能早于${validation.min}`;
      else if (validation.max && value > String(validation.max)) errors[field.fieldCode] = validation.message || `日期不能晚于${validation.max}`;
    }
    if (validation.kind === "choice") {
      const options = validation.options ?? [];
      const selected = definitionValues(value);
      if (options.length && selected.some((entry) => !options.includes(entry))) errors[field.fieldCode] = validation.message || "请选择有效选项";
    }
    if (validation.kind === "file" && validation.maxFiles !== undefined) {
      const files = definitionValues(value);
      if (files.length > validation.maxFiles) errors[field.fieldCode] = validation.message || `最多上传${validation.maxFiles}个文件`;
    }
    if (!errors[field.fieldCode] && validation.pattern && /^[^数字字母]+$/.test(validation.pattern) === false) {
      if (validation.pattern === "字母数字" && !/^[A-Za-z0-9]+$/.test(value)) errors[field.fieldCode] = validation.message || "仅支持字母和数字";
      else if (validation.pattern === "数字，8位整数" && !/^\d{8}$/.test(value)) errors[field.fieldCode] = validation.message || "请输入8位数字";
    }
  });
  return errors;
}

function definitionValues(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function formatDesignValidation(validation?: DesignValidation): string {
  if (!validation || validation.kind === "none") return "无额外校验";
  const parts = [validation.kind === "text" ? "文本" : validation.kind === "number" ? "数字" : validation.kind === "date" ? "日期" : validation.kind === "choice" ? "选项" : "附件"];
  if (validation.min !== undefined) parts.push(`最小${validation.min}`);
  if (validation.max !== undefined) parts.push(`最大${validation.max}`);
  if (validation.pattern) parts.push(validation.pattern);
  if (validation.options?.length) parts.push(`${validation.options.length}个选项`);
  if (validation.accept?.length) parts.push(`支持${validation.accept.join("/")}`);
  if (validation.maxFiles !== undefined) parts.push(`最多${validation.maxFiles}个文件`);
  return parts.join(" · ");
}

export function moveDesignField(draft: FormDesignDraft, fieldCode: string, targetGroupId: string, targetIndex?: number): FormDesignDraft {
  const currentGroup = draft.groups.find((group) => group.fields.some((field) => field.fieldCode === fieldCode));
  const target = draft.groups.find((group) => group.id === targetGroupId);
  if (!currentGroup || !target) throw new Error("未找到待移动字段或目标分组");
  const designField = currentGroup.fields.find((field) => field.fieldCode === fieldCode)!;
  const groupsWithoutField = draft.groups.map((group) => group.id === currentGroup.id ? { ...group, fields: group.fields.filter((field) => field.fieldCode !== fieldCode) } : group);
  return {
    ...draft,
    groups: groupsWithoutField.map((group) => {
      if (group.id !== targetGroupId) return group;
      const insertAt = Math.max(0, Math.min(targetIndex ?? group.fields.length, group.fields.length));
      return { ...group, fields: [...group.fields.slice(0, insertAt), designField, ...group.fields.slice(insertAt)] };
    }),
  };
}

export function removeDesignField(draft: FormDesignDraft, fieldCode: string): FormDesignDraft {
  return { ...draft, groups: draft.groups.map((group) => ({ ...group, fields: group.fields.filter((field) => field.fieldCode !== fieldCode) })) };
}

export function updateDesignField(draft: FormDesignDraft, fieldCode: string, update: Partial<Omit<FormDesignField, "fieldCode">>): FormDesignDraft {
  return { ...draft, groups: draft.groups.map((group) => ({ ...group, fields: group.fields.map((field) => field.fieldCode === fieldCode ? { ...field, ...update } : field) })) };
}

export function addDesignGroup(draft: FormDesignDraft, name: string): FormDesignDraft {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) throw new Error("分组名称不能为空且不能超过50个字符");
  if (draft.groups.some((group) => group.name === trimmed)) throw new Error("分组名称已存在");
  const id = `group-${draft.groups.length + 1}-${Date.now()}`;
  return { ...draft, groups: [...draft.groups, { id, name: trimmed, columns: 2, fields: [] }] };
}

export function updateDesignGroup(draft: FormDesignDraft, groupId: string, update: Partial<Pick<FormDesignGroup, "name" | "columns">>): FormDesignDraft {
  const target = draft.groups.find((group) => group.id === groupId);
  if (!target) throw new Error("未找到分组");
  const nextName = update.name?.trim();
  if (nextName !== undefined && (!nextName || nextName.length > 50)) throw new Error("分组名称不能为空且不能超过50个字符");
  if (nextName && draft.groups.some((group) => group.id !== groupId && group.name === nextName)) throw new Error("分组名称已存在");
  return { ...draft, groups: draft.groups.map((group) => group.id === groupId ? { ...group, ...update, ...(nextName !== undefined ? { name: nextName } : {}) } : group) };
}

export function removeDesignGroup(draft: FormDesignDraft, groupId: string): FormDesignDraft {
  const target = draft.groups.find((group) => group.id === groupId);
  if (!target) throw new Error("未找到分组");
  if (target.fields.length) throw new Error("请先移出分组内字段，再删除分组");
  return { ...draft, groups: draft.groups.filter((group) => group.id !== groupId) };
}
