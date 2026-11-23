import type { Evidence, QeRecord } from "./assistant";

export const evidencePath = "/app/platform/assistant/evidence";
const prefix = "quality-platform.qe-evidence.";

type Sample = { label: string; description: string; rows: string[] };
export function readQeSample(id: string): Sample | undefined {
  if (!/^[a-z0-9-]{36}$/i.test(id)) return;
  try {
    const data = JSON.parse(localStorage.getItem(prefix + id) ?? "null");
    if (data && typeof data.label === "string" && typeof data.description === "string" &&
      Array.isArray(data.rows) && data.rows.every((href: unknown) => typeof href === "string")) return data;
  } catch { /* The caller keeps the original sources available. */ }
}

export function citeSample(label: string, excerpt: string, rows: QeRecord[], emptyHref?: string): Evidence | undefined {
  if (!rows.length) return emptyHref ? { href: emptyHref, title: label, location: "统计范围", excerpt } : undefined;
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(prefix + id, JSON.stringify({
      label, description: excerpt, rows: [...new Set(rows.map(({ href }) => href))],
    } satisfies Sample));
    return { title: label, excerpt, location: "统计样本与业务单据", href: `${evidencePath}?id=${id}` };
  } catch { return undefined; }
}

export function evidenceVisible(source: Evidence, data: { records: QeRecord[]; metrics: { href: string }[]; sourcePages?: Record<string, string>; organizations: {id:string}[] }) {
  const [path, query] = source.href.split("?");
  if (!source.href.startsWith("/app/platform/")) return false;
  if (path === evidencePath) {
    const sample = readQeSample(new URLSearchParams(query).get("id") ?? "");
    if (!sample) return false;
    const visible = new Set(data.records.map(({ href }) => href));
    return sample.rows.every(href => visible.has(href));
  }
  const org = new URLSearchParams(query).get("organizationId");
  if (org && org !== "all" && !data.organizations.some(({ id }) => org === id)) return false;
  return data.records.some(row => row.href === source.href || row.aliases?.includes(source.href)) ||
    data.metrics.some(metric => metric.href.split("?")[0] === path) ||
    Object.values(data.sourcePages ?? {}).includes(path);
}
