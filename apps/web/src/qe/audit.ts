import { redact, type Answer } from "./assistant";
import { agentVersion, type AgentResult } from "./agent";

const prefix = "quality-platform.qe-audit.";
const version = agentVersion;
export type QeActor = { id: string; name: string; organizationId: string };
export type QeAuditEntry = {
  id: string;
  actor: QeActor;
  time: string;
  action: string;
  businessNo?: string;
  detail: string;
};

export function readQeAudit(): QeAuditEntry[] {
  try {
    return Object.keys(localStorage).filter((key) => key.startsWith(prefix)).flatMap((key) => {
      try { return [JSON.parse(localStorage.getItem(key)!) as QeAuditEntry]; } catch { return []; }
    }).sort((left, right) => right.time.localeCompare(left.time));
  } catch {
    return [];
  }
}

function saveAudit(entry: Omit<QeAuditEntry, "id" | "time">): string {
  const id = crypto.randomUUID();
  const time = new Date().toISOString();
  const key = prefix + id;
  const toRemove = readQeAudit().slice(149);
  for (const oldEntry of toRemove) localStorage.removeItem(prefix + oldEntry.id);
  localStorage.setItem(key, JSON.stringify({ ...entry, id, time }));
  return id;
}

export function auditAnswer(actor: QeActor, context: string | undefined, question: string, answer: Answer, result: AgentResult): string {
  return saveAudit({
    actor, businessNo: context, action: answer.kind === "brief" ? "查看 QE 简报" : "QE 助手回答",
    detail: JSON.stringify({
      version, question: redact(question), route: answer.kind, title: answer.title, note: answer.note,
      trace: result.trace, stop: result.stop, validation: result.validation, focus: result.focus, charts: answer.charts, draft: answer.draft,
      output: answer.sections.map(({ label, text, sources }) => ({ label, text, sources })),
    }),
  });
}

export function auditFeedback(
  actor: QeActor, context: string | undefined, outputId: string, feedback: string, reason: string, revision: string,
): void {
  saveAudit({
    actor, businessNo: context, action: "QE 助手反馈",
    detail: JSON.stringify({ version, outputId, feedback, reason: redact(reason), revision: redact(revision) }),
  });
}
