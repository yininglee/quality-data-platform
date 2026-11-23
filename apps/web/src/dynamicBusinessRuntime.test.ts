import { describe, expect, it } from "vitest";
import { createDynamicBusinessSubmission, dynamicRecordsForOrganization, openDynamicTodosForOrganization, PLATFORM_RUNTIME_ORGANIZATION_ID, transitionDynamicBusinessRecord, type DynamicBusinessRuntimeStore } from "./dynamicBusinessRuntime";
import { createBusinessWorkflowTemplate, createDefaultBusinessAnalysis, createDefaultBusinessPermissions, type BusinessDefinitionVersion, type FormDesignDraft } from "./configuration";

const form: FormDesignDraft = { id: "form", schemaId: "schema", schemaCode: "supplier_improvement", updatedAt: "2026-08-29 10:00", groups: [{ id: "main", name: "基本信息", columns: 1, fields: [{ fieldCode: "reason", label: "原因", required: true, visible: true, span: 1 }] }] };
const version: BusinessDefinitionVersion = { id: "v1", businessId: "business", version: 1, name: "V1", changeNote: "首次发布", form, workflow: createBusinessWorkflowTemplate("external", "supplier_improvement"), permissions: createDefaultBusinessPermissions("供应商改善追踪"), analysis: createDefaultBusinessAnalysis(), publishedAt: "2026-08-29 10:00", publishedBy: "测试", active: true };

describe("dynamic business runtime", () => {
  it("freezes the submitted definition version and creates a platform todo", () => {
    const result = createDynamicBusinessSubmission({ id: "record-1", businessId: "business", businessCode: "supplier_improvement", businessName: "供应商改善追踪", version, organizationId: "supplier-1", organizationName: "供应商A", submittedBy: "供应商用户", values: { reason: "来料异常" }, now: "2026-08-29 10:00" });
    expect(result.record.version).toBe(1);
    expect(result.record.definitionSnapshot?.form.groups[0].fields[0].label).toBe("原因");
    expect(result.todo).toMatchObject({ handlerOrganizationId: PLATFORM_RUNTIME_ORGANIZATION_ID, nodeId: "platform_review", status: "open" });
  });

  it("completes the current todo, creates the next organization todo, and preserves organization visibility", () => {
    const submission = createDynamicBusinessSubmission({ id: "record-1", businessId: "business", businessCode: "supplier_improvement", businessName: "供应商改善追踪", version, organizationId: "supplier-1", organizationName: "供应商A", submittedBy: "供应商用户", values: { reason: "来料异常" }, now: "2026-08-29 10:00" });
    const store: DynamicBusinessRuntimeStore = { records: [submission.record], events: [submission.event], todos: submission.todo ? [submission.todo] : [] };
    const next = transitionDynamicBusinessRecord({ store, recordId: "record-1", actorOrganizationId: PLATFORM_RUNTIME_ORGANIZATION_ID, actorOrganizationName: "质量平台", actorName: "平台审核员", now: "2026-08-29 10:05" });
    expect(openDynamicTodosForOrganization(next, PLATFORM_RUNTIME_ORGANIZATION_ID)).toHaveLength(0);
    expect(openDynamicTodosForOrganization(next, "supplier-1")[0]).toMatchObject({ nodeId: "supplier_process", status: "open" });
    expect(dynamicRecordsForOrganization(next, "supplier_improvement", "supplier-1", false)).toHaveLength(1);
    expect(dynamicRecordsForOrganization(next, "supplier_improvement", "other-supplier", false)).toHaveLength(0);
  });

  it("archives the record when the final handler completes its todo", () => {
    const submission = createDynamicBusinessSubmission({ id: "record-1", businessId: "business", businessCode: "supplier_improvement", businessName: "供应商改善追踪", version, organizationId: "supplier-1", organizationName: "供应商A", submittedBy: "供应商用户", values: { reason: "来料异常" }, now: "2026-08-29 10:00" });
    let store: DynamicBusinessRuntimeStore = { records: [submission.record], events: [submission.event], todos: submission.todo ? [submission.todo] : [] };
    store = transitionDynamicBusinessRecord({ store, recordId: "record-1", actorOrganizationId: PLATFORM_RUNTIME_ORGANIZATION_ID, actorOrganizationName: "质量平台", actorName: "平台审核员", now: "2026-08-29 10:05" });
    store = transitionDynamicBusinessRecord({ store, recordId: "record-1", actorOrganizationId: "supplier-1", actorOrganizationName: "供应商A", actorName: "供应商用户", now: "2026-08-29 10:10" });
    store = transitionDynamicBusinessRecord({ store, recordId: "record-1", actorOrganizationId: PLATFORM_RUNTIME_ORGANIZATION_ID, actorOrganizationName: "质量平台", actorName: "平台审核员", now: "2026-08-29 10:15" });
    expect(store.records[0]).toMatchObject({ status: "completed", archivedAt: "2026-08-29 10:15" });
    expect(store.todos.filter((todo) => todo.status === "open")).toHaveLength(0);
    expect(store.events).toHaveLength(4);
  });
});
