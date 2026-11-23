import type { BusinessDefinitionVersion, BusinessPermissionConfig, BusinessWorkflow, FormDesignDraft } from "./configuration";

export type DynamicBusinessDefinitionSnapshot = {
  version: number;
  form: FormDesignDraft;
  workflow: BusinessWorkflow;
  permissions: BusinessPermissionConfig;
};

export type DynamicBusinessRecord = {
  id: string;
  businessId: string;
  businessCode: string;
  businessName: string;
  version: number;
  organizationId: string;
  organizationName: string;
  submittedBy: string;
  status: string;
  currentNodeId?: string;
  values: Record<string, string>;
  definitionSnapshot?: DynamicBusinessDefinitionSnapshot;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type DynamicBusinessEvent = {
  id: string;
  recordId: string;
  nodeId: string;
  action: string;
  fromStatus?: string;
  toStatus: string;
  actorName: string;
  actorOrganizationName: string;
  createdAt: string;
};

export type DynamicBusinessTodo = {
  id: string;
  recordId: string;
  businessCode: string;
  businessName: string;
  definitionVersion: number;
  nodeId: string;
  title: string;
  handlerOrganizationId: string;
  handlerOrganizationName: string;
  requiredPermission: string;
  status: "open" | "completed";
  createdAt: string;
  completedAt?: string;
};

export type DynamicBusinessRuntimeStore = {
  records: DynamicBusinessRecord[];
  events: DynamicBusinessEvent[];
  todos: DynamicBusinessTodo[];
};

export const DYNAMIC_BUSINESS_RUNTIME_STORAGE_KEY = "quality-platform.dynamic-business-runtime";
export const PLATFORM_RUNTIME_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const LEGACY_RECORDS_STORAGE_KEY = "quality-platform.dynamic-business-records";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptyStore(): DynamicBusinessRuntimeStore {
  return { records: [], events: [], todos: [] };
}

export function readDynamicBusinessRuntimeStore(): DynamicBusinessRuntimeStore {
  try {
    const raw = window.localStorage.getItem(DYNAMIC_BUSINESS_RUNTIME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DynamicBusinessRuntimeStore>;
      return {
        records: Array.isArray(parsed.records) ? parsed.records : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
        todos: Array.isArray(parsed.todos) ? parsed.todos : [],
      };
    }
    const legacy = window.localStorage.getItem(LEGACY_RECORDS_STORAGE_KEY);
    if (!legacy) return emptyStore();
    const records = JSON.parse(legacy) as DynamicBusinessRecord[];
    return { records: Array.isArray(records) ? records : [], events: [], todos: [] };
  } catch {
    return emptyStore();
  }
}

export function saveDynamicBusinessRuntimeStore(store: DynamicBusinessRuntimeStore): void {
  window.localStorage.setItem(DYNAMIC_BUSINESS_RUNTIME_STORAGE_KEY, JSON.stringify(store));
}

function nextNode(workflow: BusinessWorkflow, nodeId: string) {
  const node = workflow.nodes.find((item) => item.id === nodeId);
  return node?.nextNodeIds?.map((nextId) => workflow.nodes.find((item) => item.id === nextId)).find(Boolean);
}

function handlerFor(rule: DynamicBusinessDefinitionSnapshot["workflow"]["nodes"][number]["organizationRule"], submitted: { id: string; name: string }) {
  if (rule === "platform") return { id: PLATFORM_RUNTIME_ORGANIZATION_ID, name: "质量平台" };
  return submitted;
}

function createTodo(record: DynamicBusinessRecord, node: NonNullable<ReturnType<typeof nextNode>>, now: string): DynamicBusinessTodo {
  const handler = handlerFor(node.organizationRule, { id: record.organizationId, name: record.organizationName });
  return {
    id: `dynamic-todo-${record.id}-${node.id}-${Date.now()}`,
    recordId: record.id,
    businessCode: record.businessCode,
    businessName: record.businessName,
    definitionVersion: record.version,
    nodeId: node.id,
    title: `${record.businessName} · ${node.name}`,
    handlerOrganizationId: handler.id,
    handlerOrganizationName: handler.name,
    requiredPermission: node.permissionCode,
    status: "open",
    createdAt: now,
  };
}

export function createDynamicBusinessSubmission(input: {
  id: string;
  businessId: string;
  businessCode: string;
  businessName: string;
  version: BusinessDefinitionVersion;
  organizationId: string;
  organizationName: string;
  submittedBy: string;
  values: Record<string, string>;
  now: string;
}): { record: DynamicBusinessRecord; event: DynamicBusinessEvent; todo?: DynamicBusinessTodo } {
  const snapshot: DynamicBusinessDefinitionSnapshot = {
    version: input.version.version,
    form: clone(input.version.form),
    workflow: clone(input.version.workflow),
    permissions: clone(input.version.permissions),
  };
  const start = snapshot.workflow.nodes.find((node) => node.type === "start");
  const firstNode = start ? nextNode(snapshot.workflow, start.id) : undefined;
  const archived = !firstNode || firstNode.type === "end";
  const record: DynamicBusinessRecord = {
    id: input.id,
    businessId: input.businessId,
    businessCode: input.businessCode,
    businessName: input.businessName,
    version: snapshot.version,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    submittedBy: input.submittedBy,
    status: firstNode?.statusCode ?? "completed",
    currentNodeId: firstNode?.id,
    values: clone(input.values),
    definitionSnapshot: snapshot,
    createdAt: input.now,
    updatedAt: input.now,
    archivedAt: archived ? input.now : undefined,
  };
  const event: DynamicBusinessEvent = {
    id: `dynamic-event-${record.id}-submitted`,
    recordId: record.id,
    nodeId: firstNode?.id ?? start?.id ?? "start",
    action: archived ? "提交并归档" : "提交",
    toStatus: record.status,
    actorName: input.submittedBy,
    actorOrganizationName: input.organizationName,
    createdAt: input.now,
  };
  return { record, event, todo: firstNode && !archived ? createTodo(record, firstNode, input.now) : undefined };
}

export function transitionDynamicBusinessRecord(input: {
  store: DynamicBusinessRuntimeStore;
  recordId: string;
  actorOrganizationId: string;
  actorOrganizationName: string;
  actorName: string;
  now: string;
}): DynamicBusinessRuntimeStore {
  const record = input.store.records.find((item) => item.id === input.recordId);
  if (!record) throw new Error("未找到业务记录");
  if (record.archivedAt) throw new Error("已归档记录不可继续处理");
  const todo = input.store.todos.find((item) => item.recordId === record.id && item.status === "open");
  if (!todo) throw new Error("当前记录没有待处理任务");
  if (todo.handlerOrganizationId !== input.actorOrganizationId) throw new Error("当前组织不是该待办的处理方");
  const snapshot = record.definitionSnapshot;
  if (!snapshot) throw new Error("历史演示记录没有版本快照，不能继续流转");
  const current = snapshot.workflow.nodes.find((node) => node.id === todo.nodeId);
  if (!current) throw new Error("记录引用的流程节点不存在");
  const next = nextNode(snapshot.workflow, current.id);
  if (!next) throw new Error("当前流程节点没有下一步");
  const archived = next.type === "end";
  const updated: DynamicBusinessRecord = {
    ...record,
    status: next.statusCode,
    currentNodeId: next.id,
    updatedAt: input.now,
    archivedAt: archived ? input.now : undefined,
  };
  const event: DynamicBusinessEvent = {
    id: `dynamic-event-${record.id}-${current.id}-${Date.now()}`,
    recordId: record.id,
    nodeId: next.id,
    action: current.actions[0] ?? "推进流程",
    fromStatus: record.status,
    toStatus: next.statusCode,
    actorName: input.actorName,
    actorOrganizationName: input.actorOrganizationName,
    createdAt: input.now,
  };
  const completed = { ...todo, status: "completed" as const, completedAt: input.now };
  const nextTodo = archived ? undefined : createTodo(updated, next, input.now);
  return {
    records: input.store.records.map((item) => item.id === record.id ? updated : item),
    events: [event, ...input.store.events],
    todos: [
      ...(nextTodo ? [nextTodo] : []),
      ...input.store.todos.map((item) => item.id === todo.id ? completed : item),
    ],
  };
}

export function dynamicRecordsForOrganization(store: DynamicBusinessRuntimeStore, businessCode: string, organizationId: string, isPlatform: boolean): DynamicBusinessRecord[] {
  return store.records.filter((record) => record.businessCode === businessCode && (isPlatform || record.organizationId === organizationId));
}

export function openDynamicTodosForOrganization(store: DynamicBusinessRuntimeStore, organizationId: string): DynamicBusinessTodo[] {
  return store.todos.filter((todo) => todo.status === "open" && todo.handlerOrganizationId === organizationId);
}
