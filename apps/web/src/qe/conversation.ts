import type { Answer } from "./assistant";
import type { AgentFocus } from "./modelProtocol";

export type QeMessage = {
  id: string; question: string; answer: Answer; draft?: string; context?: string; outputId?: string;
  organizationId?: string; date?: string; focus?: AgentFocus;
};
export type QeConversation = { id: string; updatedAt: number; messages: QeMessage[] };

const legacyId = "legacy";
const legacyKey = (scope: string) => "quality-platform.qe-conversation." + scope;
const prefix = (scope: string) => "quality-platform.qe-conversations." + encodeURIComponent(scope) + ".";
const activeKey = (scope: string) => "quality-platform.qe-active." + encodeURIComponent(scope);
const validId = (id: string) => id === legacyId || /^[a-f0-9-]{36}$/i.test(id);

function readTurns(value: unknown): QeMessage[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string" && typeof item.question === "string" &&
    item.question.trim() && item.answer && typeof item.answer.title === "string" && Array.isArray(item.answer.sections)) : [];
}

export function conversationTitle({ messages }: QeConversation) {
  const question = messages[0]?.question.replace(/\s+/g, " ").trim() ?? "";
  return question.length > 56 ? question.slice(0, 55) + "…" : question;
}

export function createConversationId() {
  return crypto.randomUUID();
}

export function activeConversationId(scope: string): string | undefined {
  try {
    const id = sessionStorage.getItem(activeKey(scope));
    if (id && validId(id)) return id;
  } catch { /* The current page can still keep its selection. */ }
}

export function selectConversation(scope: string, id: string) {
  try { sessionStorage.setItem(activeKey(scope), id); } catch { /* Continue with the in-memory selection. */ }
}

function readThread(scope: string, id: string): QeConversation | undefined {
  try {
    if (!validId(id)) return;
    const stored = JSON.parse(localStorage.getItem(prefix(scope) + id) ?? "null");
    const messages = readTurns(stored?.messages);
    if (messages.length) {
      const updatedAt = typeof stored.updatedAt === "number" && Number.isFinite(new Date(stored.updatedAt).getTime()) ? stored.updatedAt : 0;
      return { id, messages, updatedAt };
    }
    if (id !== legacyId) return;
    const legacy = readTurns(JSON.parse(localStorage.getItem(legacyKey(scope)) ?? "null"));
    if (legacy.length) return { id, messages: legacy, updatedAt: 0 };
  } catch { /* A malformed conversation does not affect other threads. */ }
}

export function readConversations(scope: string) {
  const keyPrefix = prefix(scope);
  try {
    const ids = new Set(Object.keys(localStorage).filter(key => key.startsWith(keyPrefix)).map(key => key.slice(keyPrefix.length)));
    if (localStorage.getItem(legacyKey(scope))) ids.add(legacyId);
    return [...ids].flatMap(id => readThread(scope, id) ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

function save(scope: string, conversation: QeConversation) {
  localStorage.setItem(prefix(scope) + conversation.id, JSON.stringify(conversation));
}

export function migrateConversation(scope: string) {
  const previous = readThread(scope, legacyId);
  if (!previous || !localStorage.getItem(legacyKey(scope))) return;
  save(scope, previous);
  localStorage.removeItem(legacyKey(scope));
}

export function updateConversation(scope: string, current: QeConversation, change: (messages: QeMessage[]) => QeMessage[]) {
  const latest = readThread(scope, current.id);
  const saved = { ...current, updatedAt: Date.now(), messages: change(latest?.messages ?? current.messages) };
  save(scope, saved);
  return saved;
}
