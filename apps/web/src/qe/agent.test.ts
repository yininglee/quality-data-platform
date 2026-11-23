import { describe, expect, it } from "vitest";
import { runAgent, validateAnswer, type Planner } from "./agent";
import { citeRecord, type QeData, type QeRecord } from "./assistant";

const record: QeRecord = {
  key: "visible-case", no: "ME-DEMO-01", href: "/app/platform/business/material-exceptions/visible-case",
  label: "物料异常", organization: "演示工厂", organizationId: "demo", status: "approved", statusLabel: "已通过",
  date: "2026-09-10", updatedAt: "2026-09-10", fields: [{ label: "不良数量", value: 12 }], history: [], attachments: [],
};
const data: QeData = { records: [record], metrics: [], organizations: [{ id: "demo", name: "演示工厂" }], now: new Date("2026-09-11T10:00:00+08:00") };
const ask = (planner: Planner) => runAgent({
  data, planner, question: "这个单据的不良数量", context: record, params: new URLSearchParams(),
  signal: new AbortController().signal, extract: async () => ({ attachments: [], partial: false }),
});

describe("Agent 调用边界", () => {
  it("stops repeated calls with the same normalized arguments and keeps evidence", async () => {
    const result = await ask(() => ({ calls: [{ tool: "document_detail", businessNo: "me-demo-01" }] }));
    expect(result).toMatchObject({ stop: "duplicate", validation: "passed", trace: [{ tool: "document_detail", outcome: "ok" }] });
    expect(result.answer.sections[0].sources[0].excerpt).toBe("12");
  });

  it("stops after two empty tools and blocks an unregistered action", async () => {
    const result = await ask(() => ({ calls: [{ tool: "current_attachment" }, { tool: "inspection_rules" }, { tool: "document_detail" }] }));
    expect(result).toMatchObject({ stop: "empty_limit", trace: [{ outcome: "empty" }, { outcome: "empty" }] });
    const blocked = await ask(() => ({ calls: [{ tool: "approve" as "document_detail" }] }));
    expect(blocked).toMatchObject({ stop: "blocked", trace: [{ tool: "unregistered", outcome: "blocked" }] });
  });

  it("applies the requested factory's recognizable short name to report calculations and cites that scope", async () => {
    const question = "查一下华南智造的生产合格率，针对这个厂写一份报告";
    const result = await runAgent({
      data: {
        ...data,
        organizations: [
          { id: "south", name: "华南智造 OEM 工厂" },
          { id: "east", name: "华东精工 OEM 工厂（模拟）" },
        ],
        metrics: [{
          id: "inspection_first", label: "一检生产合格率", href: "/app/platform/business/production-inspection-daily",
          reading: (_period, organizationId) => organizationId === "south"
            ? { numerator: 97, denominator: 100, rate: 97 }
            : { numerator: 80, denominator: 100, rate: 80 },
        }],
      },
      question, params: new URLSearchParams({ organizationId: "all" }), signal: new AbortController().signal,
      extract: async () => ({ attachments: [], partial: false }),
    });
    expect(result).toMatchObject({ organizationId: "south", validation: "passed", answer: { kind: "report" } });
    expect(result.answer.draft).toContain("华南智造 OEM 工厂");
    expect(result.answer.draft).toContain("97.00%");
    expect(result.answer.draft).not.toContain("80.00%");
    expect(result.answer.sections.find(({ label }) => label === "一检生产合格率")?.sources[0].href)
      .toContain("organizationId=south");
  });

  it("returns the requested draft when the model calls the metric tool before the report tool", async () => {
    const result = await runAgent({
      data: { ...data, metrics: [{
        id: "inspection_first", label: "一检生产合格率", href: "/app/platform/business/production-inspection-daily",
        reading: () => ({ numerator: 97, denominator: 100, rate: 97 }),
      }] },
      question: "先查生产合格率，然后写一份报告", params: new URLSearchParams(),
      planner: ({ observations }) => observations.length
        ? { finish: true, use: [0, 1] } : { calls: [{ tool: "explain_metric" }, { tool: "quality_report" }] },
      signal: new AbortController().signal, extract: async () => ({ attachments: [], partial: false }),
    });
    expect(result.answer).toMatchObject({ kind: "report", title: "质量周报草稿" });
    expect(result.answer.draft).toContain("质量周报草稿");
  });

  it("applies citation authenticity and scope checks before returning an answer", () => {
    const evidence = citeRecord(record, "不良数量", "12");
    const answer = {
      kind: "knowledge" as const, title: "检索结果",
      sections: [{ label: "事实", text: "抽检结果", sources: [{ ...evidence, excerpt: "99" }] }],
    };
    expect(validateAnswer(answer, [evidence], data)).toMatchObject({
      validation: "invalid_citation", answer: { sections: [{ text: "依据不足。请在原页面核对。", sources: [] }] },
    });
    answer.sections[0].sources[0].href = "/app/platform/business/material-exceptions/hidden-case";
    expect(validateAnswer(answer, [evidence], data).validation).toBe("blocked");
  });
});
