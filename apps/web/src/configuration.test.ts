import { beforeEach, describe, expect, it } from "vitest";
import {
  CONFIG_FORM_DESIGNS_STORAGE_KEY,
  CONFIG_SCHEMAS_STORAGE_KEY,
  CONFIG_FORM_DESIGN_VERSIONS_STORAGE_KEY,
  addDesignField,
  addDesignGroup,
  createFormDesignDraft,
  isDesignFieldRequired,
  normalizeFormDesignDraft,
  moveDesignField,
  readConfigDictionaries,
  readConfigSchemas,
  readFieldDefinitions,
  readFormDesignDraft,
  removeDesignGroup,
  saveConfigSchemaJson,
  saveFormDesignDraft,
  saveFormDesignVersion,
  readFormDesignVersions,
  copyConfigSchemaVersion,
  saveCopiedFormDesignDraft,
  saveFieldDefinition,
  setDictionaryItemStatus,
  validateConfigSchemaInput,
  validateDesignPreview,
  getBusinessSchema,
  createDefaultBusinessAnalysis,
  createDefaultBusinessPermissions,
  createDefaultBusinessWorkflow,
  publishBusinessDefinition,
  readBusinessDefinitionConfig,
  rollbackBusinessDefinition,
  saveBusinessDefinitionConfig,
  validateBusinessDefinitionConfig,
  createBusinessWorkflowTemplate,
  diffBusinessDefinition,
} from "./configuration";

describe("configuration foundation", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps a disabled built-in dictionary item for historical lookups", () => {
    const dictionary = readConfigDictionaries().find((item) => item.code === "OPTION_001")!;
    const item = dictionary.items[0];
    const next = setDictionaryItemStatus(dictionary.code, item.code, "disabled");
    expect(next.find((entry) => entry.code === dictionary.code)?.items[0]).toMatchObject({ name: item.name, status: "disabled" });
    expect(readConfigDictionaries().find((entry) => entry.code === dictionary.code)?.items[0]).toMatchObject({ name: item.name, status: "disabled" });
  });

  it("rejects custom-field codes that collide with built-in fields", () => {
    expect(() => saveFieldDefinition({ code: "FIELD_001", name: "重复字段", type: "single_line", validation: {}, description: "" })).toThrow("字段编码已存在");
    expect(() => saveFieldDefinition({ code: "custom_001", name: "格式错误", type: "single_line", validation: {}, description: "" })).toThrow("字段编码需为");
    const next = saveFieldDefinition({ code: "CUSTOM_PRIORITY", name: "改善优先级", type: "select", validation: { required: true }, description: "供应商改善跟踪自定义字段" });
    expect(next.find((field) => field.code === "CUSTOM_PRIORITY")).toMatchObject({ source: "custom", status: "enabled" });
  });

  it("blocks invalid schemas and saves valid JSON as a new version", () => {
    const invalid = { code: "supplier_improvement_tracking", name: "供应商改善追踪", status: "draft" as const, fields: [{ fieldCode: "MISSING_FIELD" }], changeNote: "错误引用" };
    expect(validateConfigSchemaInput(invalid, readFieldDefinitions())).toBe("schema引用了字段库中不存在的字段");
    expect(() => saveConfigSchemaJson(JSON.stringify({ ...invalid, fields: [{ fieldCode: "FIELD_017" }, { fieldCode: "FIELD_017" }] }))).toThrow("不能重复引用");
    const saved = saveConfigSchemaJson(JSON.stringify({ code: "supplier_improvement_tracking", name: "供应商改善追踪", status: "draft", fields: [{ fieldCode: "FIELD_001", required: true }, { fieldCode: "FIELD_017", required: true }], changeNote: "新增改善说明字段" }));
    expect(saved.schemaVersion).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(CONFIG_SCHEMAS_STORAGE_KEY) ?? "[]")[0]).toMatchObject({ id: saved.id, schemaVersion: 2 });
    expect(readConfigSchemas()[0].schemaVersion).toBe(2);
  });

  it("keeps each enabled field unique when adding it to a design", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const field = readFieldDefinitions().find((entry) => entry.code === "FIELD_005")!;
    const added = addDesignField(draft, field, draft.groups[0].id);
    expect(added.groups[0].fields.at(-1)).toMatchObject({ fieldCode: "FIELD_005", label: "订单号" });
    expect(() => addDesignField(added, field, added.groups[0].id)).toThrow("同一字段只能在表单中出现一次");
  });

  it("moves fields across groups in the requested position and only removes empty groups", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const withGroup = addDesignGroup(draft, "审核信息");
    const targetGroup = withGroup.groups.at(-1)!;
    const moved = moveDesignField(withGroup, "FIELD_003", targetGroup.id, 0);
    expect(moved.groups.find((group) => group.id === targetGroup.id)?.fields).toMatchObject([{ fieldCode: "FIELD_003" }]);
    expect(() => removeDesignGroup(moved, targetGroup.id)).toThrow("请先移出分组内字段");
    const movedBack = moveDesignField(moved, "FIELD_003", moved.groups[0].id);
    expect(removeDesignGroup(movedBack, targetGroup.id).groups.some((group) => group.id === targetGroup.id)).toBe(false);
  });

  it("persists an unpublished design draft independently from schema versions", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const updated = addDesignField(draft, readFieldDefinitions().find((entry) => entry.code === "FIELD_005")!, draft.groups[0].id);
    saveFormDesignDraft(updated);
    expect(readFormDesignDraft(schema).groups[0].fields.some((field) => field.fieldCode === "FIELD_005")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(CONFIG_FORM_DESIGNS_STORAGE_KEY) ?? "[]")[0]).toMatchObject({ schemaId: schema.id });
    expect(readConfigSchemas()).toHaveLength(1);
  });

  it("creates an isolated draft namespace from an active business schema", () => {
    const schema = getBusinessSchema("shipment_report", "出货报告", "published");
    expect(schema).toMatchObject({ code: "shipment_report", name: "出货报告", status: "draft", schemaVersion: 1 });
    const draft = saveFormDesignDraft(createFormDesignDraft(schema));
    expect(readFormDesignDraft(schema).id).toBe(draft.id);
    expect(readConfigSchemas().some((entry) => entry.code === "shipment_report")).toBe(false);
  });

  it("normalizes legacy drafts and validates conditional required fields", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const fields = draft.groups.flatMap((group) => group.fields);
    const source = fields[0];
    const target = { ...fields[1], required: false, requiredWhen: { fieldCode: source.fieldCode, operator: "equals" as const, value: "触发" }, validation: { kind: "text" as const, min: 3, max: 5 } };
    const normalized = normalizeFormDesignDraft({ ...draft, groups: [{ ...draft.groups[0], fields: [source, target] }] });
    expect(normalized.groups[0].fields[0].validation).toBeDefined();
    expect(isDesignFieldRequired(target, { [source.fieldCode]: "触发" })).toBe(true);
    expect(validateDesignPreview(normalized, { [source.fieldCode]: "触发", [target.fieldCode]: "ab" })[target.fieldCode]).toContain("至少");
    expect(validateDesignPreview(normalized, { [source.fieldCode]: "未触发", [target.fieldCode]: "" })[target.fieldCode]).toBeUndefined();
  });

  it("normalizes choice rules with editable options and validates selected values", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const supplierField = draft.groups.flatMap((group) => group.fields).find((field) => field.fieldCode === "FIELD_001")!;
    expect(supplierField.validation).toMatchObject({ kind: "choice", options: ["选项一", "选项二"] });
    const configured = normalizeFormDesignDraft({ ...draft, groups: draft.groups.map((group) => ({ ...group, fields: group.fields.map((field) => field.fieldCode === "FIELD_001" ? { ...field, validation: { kind: "choice" as const, options: ["供应商A", "供应商B"] } } : field) })) });
    expect(validateDesignPreview(configured, { FIELD_001: "供应商C" }).FIELD_001).toContain("有效选项");
    expect(validateDesignPreview(configured, { FIELD_001: "供应商A" }).FIELD_001).toBeUndefined();
  });

  it("normalizes file rules with accepted types and a maximum file count", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const fileField = { fieldCode: "FIELD_009", label: "附件", required: false, visible: true, span: 1 as const, validation: { kind: "file" as const, accept: ["PDF"], maxFiles: 2 } };
    const configured = normalizeFormDesignDraft({ ...draft, groups: [{ ...draft.groups[0], fields: [...draft.groups[0].fields, fileField] }] });
    expect(configured.groups[0].fields.at(-1)?.validation).toMatchObject({ kind: "file", accept: ["PDF"], maxFiles: 2 });
    expect(validateDesignPreview(configured, { FIELD_009: "a.pdf,b.pdf,c.pdf" }).FIELD_009).toContain("最多上传2个文件");
  });

  it("copies, publishes, and keeps immutable form design versions", () => {
    const schema = readConfigSchemas()[0];
    const draft = createFormDesignDraft(schema);
    const copiedSchema = copyConfigSchemaVersion(schema, "供应商改善追踪试验版");
    const copiedDraft = saveCopiedFormDesignDraft(draft, copiedSchema);
    const published = saveFormDesignVersion(copiedSchema, copiedDraft, "首版发布", "供应商改善追踪 V2");
    expect(published.version).toBe(2);
    expect(published.name).toBe("供应商改善追踪 V2");
    expect(readFormDesignVersions(schema.code)).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem(CONFIG_FORM_DESIGN_VERSIONS_STORAGE_KEY) ?? "[]")[0]).toMatchObject({ changeNote: "首版发布", version: 2 });
    expect(() => saveFormDesignVersion(copiedSchema, copiedDraft, "重复发布")).toThrow("不能重复发布");
    expect(() => saveFormDesignVersion({ ...copiedSchema, id: "unpublished-schema" }, copiedDraft, " ")).toThrow("变更说明不能为空");
  });

  it("publishes one complete business-definition snapshot and preserves its historical version", () => {
    const schema = getBusinessSchema("shipment_report", "出货报告");
    const form = createFormDesignDraft(schema);
    const base = readBusinessDefinitionConfig("builtin-shipment_report", form, "shipment_report", "出货报告");
    expect(validateBusinessDefinitionConfig(base)).toEqual([]);
    const published = publishBusinessDefinition(base, "出货报告 V2", "补充流程与入口配置");
    const stored = readBusinessDefinitionConfig("builtin-shipment_report", form, "shipment_report", "出货报告");
    expect(published).toMatchObject({ version: 1, active: true, name: "出货报告 V2" });
    expect(stored.versions).toHaveLength(1);
    expect(stored.versions[0].workflow.nodes).toHaveLength(3);
    const nextDraft = rollbackBusinessDefinition(stored, stored.versions[0]);
    expect(nextDraft.draft.permissions.menuName).toBe("出货报告");
    expect(nextDraft.versions[0]).toMatchObject({ version: 1, active: true });
  });

  it("blocks business publishing when a required workflow endpoint is missing", () => {
    const schema = getBusinessSchema("supplier_improvement_tracking", "供应商改善追踪");
    const form = createFormDesignDraft(schema);
    const base = readBusinessDefinitionConfig("custom-supplier-improvement", form, "supplier_improvement_tracking", "供应商改善追踪");
    const invalid = saveBusinessDefinitionConfig({ ...base, draft: { ...base.draft, workflow: { ...createDefaultBusinessWorkflow("supplier_improvement_tracking"), nodes: createDefaultBusinessWorkflow("supplier_improvement_tracking").nodes.filter((node) => node.type !== "end") }, permissions: createDefaultBusinessPermissions("供应商改善追踪"), analysis: createDefaultBusinessAnalysis() } });
    expect(validateBusinessDefinitionConfig(invalid)).toContain("流程至少需要一个结束节点");
    expect(() => publishBusinessDefinition(invalid, "供应商改善追踪 V1", "首次发布")).toThrow("流程至少需要一个结束节点");
  });

  it("creates valid PRD workflow templates with distinct stages", () => {
    for (const template of ["direct", "single_approval", "external", "multi_stage"] as const) {
      const workflow = createBusinessWorkflowTemplate(template, "CUSTOM_FLOW");
      const config = { businessId: `custom-${template}`, draft: { form: createFormDesignDraft(getBusinessSchema("supplier_improvement_tracking", "供应商改善追踪")), workflow, permissions: createDefaultBusinessPermissions("供应商改善追踪"), analysis: createDefaultBusinessAnalysis(), updatedAt: "2026-08-29" }, versions: [] };
      expect(validateBusinessDefinitionConfig(config)).toEqual([]);
      expect(workflow.nodes.find((node) => node.type === "start")?.nextNodeIds?.length).toBeGreaterThan(0);
      expect(workflow.nodes.filter((node) => node.type === "end")).toHaveLength(1);
    }
    expect(createBusinessWorkflowTemplate("external", "x").nodes.map((node) => node.name)).toContain("供应商处理");
    expect(createBusinessWorkflowTemplate("multi_stage", "x").nodes.filter((node) => node.type === "approval")).toHaveLength(2);
  });

  it("uses the existing active version as the next publish baseline and detects stale drafts", () => {
    const schema = getBusinessSchema("shipment_report", "出货报告");
    const form = createFormDesignDraft(schema);
    const base = readBusinessDefinitionConfig("builtin-shipment_report", form, "shipment_report", "出货报告", 1);
    expect(base.versions[0]).toMatchObject({ version: 1, active: true });
    const saved = saveBusinessDefinitionConfig(base);
    saveBusinessDefinitionConfig({ ...saved, draft: { ...saved.draft, analysis: { ...saved.draft.analysis, metrics: ["并发指标"] } } }, saved.draft.revision);
    expect(() => saveBusinessDefinitionConfig({ ...saved, draft: { ...saved.draft, analysis: { ...saved.draft.analysis, metrics: ["修改指标"] } } }, saved.draft.revision)).toThrow("草稿已被其他页面更新");
    const published = publishBusinessDefinition(saved, "出货报告 V2", "调整分析指标");
    expect(published.version).toBe(2);
  });

  it("reports field and workflow changes against the active snapshot", () => {
    const schema = getBusinessSchema("shipment_report", "出货报告");
    const form = createFormDesignDraft(schema);
    const base = readBusinessDefinitionConfig("builtin-shipment_report", form, "shipment_report", "出货报告", 1);
    const changed = { ...base, draft: { ...base.draft, form: { ...base.draft.form, groups: base.draft.form.groups.map((group) => ({ ...group, fields: group.fields.map((field) => field.fieldCode === "FIELD_003" ? { ...field, label: "新物料名称" } : field) })) }, workflow: { ...base.draft.workflow, nodes: base.draft.workflow.nodes.map((node) => node.id === "approval" ? { ...node, name: "质量审核" } : node) } } };
    const diff = diffBusinessDefinition({ ...changed, versions: [{ ...base.versions[0], form: base.draft.form, workflow: base.draft.workflow }] });
    expect(diff.changed.some((item) => item.includes("字段：FIELD_003"))).toBe(true);
    expect(diff.changed.some((item) => item.includes("流程节点：approval"))).toBe(true);
  });
});
