import { describe, expect, it } from "vitest";
import type { QeData } from "./assistant";
import { runModelAgent } from "./modelAgent";
import type { ModelDriver } from "./modelProtocol";

const data: QeData = {
  now: new Date("2026-09-21T09:00:00+08:00"), organizations: [{ id: "south", name: "华南智造 OEM 工厂" }], records: [],
  metrics: [{ id: "inspection_first", label: "一检生产合格率", href: "/app/platform/business/production-inspection-daily",
    reading: (period, organizationId) => organizationId === "south"
      ? { numerator: period.start.endsWith("07") ? 98 : 96, denominator: 100, rate: period.start.endsWith("07") ? 98 : 96 }
      : { numerator: 73, denominator: 100, rate: 73 },
  }],
};

const run = (driver: ModelDriver, question = "给我看同口径的周趋势") => runModelAgent({
  driver, data, question, defaults: {}, signal: new AbortController().signal,
  history: [{ question: "看华南工厂", answer: { kind: "knowledge", title: "", sections: [] },
    focus: { organizationId: "south", metricId: "inspection_first" } }],
  extract: async () => ({ attachments: [], partial: false }),
});

describe("configured QE model loop", () => {
  it("carries history, returns calculated facts between calls and builds a chart with scoped data links", async () => {
    const result = await run(async input => {
      expect(input.history[0]?.focus?.organizationId).toBe("south");
      if (!input.observations.length) return { calls: [{
        tool: "metric", args: { metricId: "inspection_first", organizationId: "south", start: "2026-09-07", end: "2026-09-20", grain: "week" },
      }] };
      const { facts, datasets } = input.observations[0];
      expect(facts.map(fact => fact.value)).toEqual(["98.00%", "96.00%"]);
      return { final: { title: "质量走势", paragraphs: [{ text: "合格率从 {{F1}} 下降至 {{F2}}。", facts: ["F1", "F2"] }],
        charts: [{ datasetId: datasets![0].id, kind: "line" }],
      } };
    });
    expect(result.answer.title).toBe("质量走势");
    expect(result.answer.sections[0].text).toBe("合格率从 98.00% 下降至 96.00%。");
    expect(result.answer.charts?.[0].points.map(point => point.value)).toEqual([98, 96]);
    expect(result.answer.charts?.[0].points[1].sources[0].href).toContain("organizationId=south");
  });

  it("can revise a failed tool call and omits invented numbers from the result", async () => {
    const result = await run(async input => {
      if (input.observations.length === 0) return { calls: [{ tool: "metric", args: { organizationId: "uncatalogued" } }] };
      if (input.observations.length === 1) {
        expect(input.observations[0].status).toBe("failed");
        return { calls: [{ tool: "metric", args: { organizationId: "south", metricId: "inspection_first", start: "2026-09-14", end: "2026-09-20" } }] };
      }
      return { final: { paragraphs: [{ text: "合格率为 99.99%。", facts: [input.observations[1].facts[0].id] }] } };
    });
    expect(result.trace.map(item => item.outcome)).toEqual(["failed", "ok"]);
    expect(result.validation).toBe("invalid_citation");
    expect(result.answer.sections[0].text).toContain("96.00%");
    expect(result.answer.sections.every(section => !section.text.includes("99.99"))).toBe(true);
  });
});
