import { describe, expect, it } from "vitest";
import { calculateInspectionYield, reconcileLocalFirstInspection } from "./App";
import { buildFirstInspectionCandidate } from "./productionInspectionSlice";
import productionInspectionDemo from "./demo/production-inspection.json";
import demoManifest from "./demo/production-inspection-manifest.json";

const organizationId = "00000000-0000-4000-8000-000000000003";
const scope = { organizationId, materialNo: "MAT-USB-C-021", startDate: "2026-08-01", endDate: "2026-08-31" };
type M1Record = NonNullable<Parameters<typeof calculateInspectionYield>[0]>[number];
const generatedRecords = productionInspectionDemo.records as unknown as M1Record[];
const first: M1Record = {
  id: "direct-pir-seed-001", businessNo: "PIR202608130001", businessType: "production_inspection",
  status: "completed", factoryOrganizationId: organizationId, businessDate: "2026-08-13",
  materialNo: scope.materialNo, inspectionProcess: "一检", inspectionQty: 500, defectQty: 12,
  version: 1, factoryOrganization: "华南智造 OEM 工厂", productName: "USB-C连接器", productModel: "UC24-PRO",
  attachmentName: "", remark: "", flowRecords: [], createdAt: "2026-08-13 09:10", updatedAt: "2026-08-13 09:10",
};

describe("M1 production first-inspection candidate", () => {
  it("reconciles inspected pieces and evidence with the existing M1 dashboard formula", () => {
    const records = [first, { ...first, id: "second", businessNo: "PIR202608140001", businessDate: "2026-08-14", inspectionQty: 100, defectQty: 5 }];
    const candidate = buildFirstInspectionCandidate(records, scope);
    const dashboard = calculateInspectionYield(records, "一检", { organizationId, dimension: "month", period: "2026-08" });
    expect(candidate).toMatchObject({ numerator: 583, denominator: 600, recordCount: 2, rate: dashboard.rate });
    expect(candidate.evidence).toEqual([
      { recordId: first.id, businessNo: first.businessNo, businessDate: "2026-08-13", organizationId, materialNo: scope.materialNo, inspectionQty: 500, defectQty: 12, qualifiedQty: 488 },
      { recordId: "second", businessNo: "PIR202608140001", businessDate: "2026-08-14", organizationId, materialNo: scope.materialNo, inspectionQty: 100, defectQty: 5, qualifiedQty: 95 },
    ]);
    expect(dashboard).toMatchObject({ numerator: 583, denominator: 600 });
  });

  it("excludes second inspections, unrelated records, status, organizations, materials and outside dates", () => {
    const records = [first,
      { ...first, id: "second", inspectionProcess: "二检" },
      { ...first, id: "repair", businessType: "maintenance_record" },
      { ...first, id: "inactive", status: "cancelled" },
      { ...first, id: "other-org", factoryOrganizationId: "another-org" },
      { ...first, id: "other-material", materialNo: "MAT-FPC-019" },
      { ...first, id: "before", businessDate: "2026-07-31" },
      { ...first, id: "after", businessDate: "2026-09-01" },
    ];
    expect(buildFirstInspectionCandidate(records, scope)).toMatchObject({ numerator: 488, denominator: 500, rate: 97.6, recordCount: 1 });
  });

  it("preserves no-data and rejects invalid scope or quantity instead of manufacturing a value", () => {
    expect(buildFirstInspectionCandidate([], scope)).toEqual({ numerator: 0, denominator: 0, rate: null, recordCount: 0, evidence: [] });
    expect(() => buildFirstInspectionCandidate([first], { ...scope, startDate: "2026-08-32" })).toThrow();
    expect(() => buildFirstInspectionCandidate([first], { ...scope, organizationId: "" })).toThrow();
    expect(() => buildFirstInspectionCandidate([{ ...first, defectQty: 501 }], scope)).toThrow();
    expect(() => buildFirstInspectionCandidate([{ ...first, inspectionQty: Number.NaN }], scope)).toThrow();
  });

  it("reconciles generated M1 records with the versioned August truth", () => {
    const candidate = buildFirstInspectionCandidate(generatedRecords, scope);
    const dashboard = calculateInspectionYield(generatedRecords, "一检", { organizationId, dimension: "month", period: "2026-08" });
    const expected = demoManifest.expectedQueries.primaryAugust;
    expect(candidate).toMatchObject({ numerator: expected.numerator, denominator: expected.denominator, recordCount: expected.recordCount });
    expect(candidate.rate).toBeCloseTo(expected.ratePercent, 4);
    expect(dashboard).toMatchObject({ numerator: demoManifest.expectedQueries.allMaterialsAugust.numerator, denominator: demoManifest.expectedQueries.allMaterialsAugust.denominator });
    expect(dashboard.rate).toBeCloseTo(demoManifest.expectedQueries.allMaterialsAugust.ratePercent!, 4);
    expect(candidate.evidence[0]).toMatchObject({ businessDate: "2026-08-01", materialNo: scope.materialNo });
    expect(candidate.evidence.at(-1)).toMatchObject({ businessDate: "2026-08-31", materialNo: scope.materialNo });
  });

  it("excludes generated second inspections and returns no data outside the seed window", () => {
    const fullWindow = buildFirstInspectionCandidate(generatedRecords, { organizationId, materialNo: scope.materialNo, startDate: "2026-06-03", endDate: "2026-08-31" });
    const expected = demoManifest.expectedQueries.primaryFullWindow;
    expect(fullWindow).toMatchObject({ numerator: expected.numerator, denominator: expected.denominator, recordCount: expected.recordCount });
    expect(fullWindow.rate).toBeCloseTo(expected.ratePercent!, 4);
    expect(fullWindow.evidence.every((item) => generatedRecords.find((record) => record.id === item.recordId)?.inspectionProcess === "一检")).toBe(true);
    expect(buildFirstInspectionCandidate(generatedRecords, { organizationId, materialNo: scope.materialNo, startDate: "2026-09-01", endDate: "2026-09-07" })).toEqual({ numerator: 0, denominator: 0, rate: null, recordCount: 0, evidence: [] });
  });

  it("reads the actual local M1 business record store including a saved override without contacting Coze", () => {
    const original = window.localStorage.getItem("quality-platform.direct-business-records");
    try {
      window.localStorage.setItem("quality-platform.direct-business-records", JSON.stringify([
        { ...first, inspectionQty: 550, defectQty: 11 },
      ]));
      const candidate = reconcileLocalFirstInspection({ ...scope, startDate: "2026-08-13", endDate: "2026-08-13" });
      expect(candidate).toMatchObject({ numerator: 539, denominator: 550, recordCount: 1 });
      expect(candidate.evidence[0]).toMatchObject({ recordId: first.id, businessNo: first.businessNo, qualifiedQty: 539 });
      expect(calculateInspectionYield([{ ...first, inspectionQty: 550, defectQty: 11 }], "一检", {
        organizationId, dimension: "month", period: "2026-08",
      })).toMatchObject({ numerator: candidate.numerator, denominator: candidate.denominator, rate: candidate.rate });
    } finally {
      if (original === null) window.localStorage.removeItem("quality-platform.direct-business-records");
      else window.localStorage.setItem("quality-platform.direct-business-records", original);
    }
  });
});
