export type ProductionInspectionSource = {
  id: string;
  businessNo: string;
  businessType: string;
  status: string;
  factoryOrganizationId: string;
  businessDate: string;
  materialNo: string;
  inspectionProcess?: string;
  inspectionQty?: number;
  defectQty?: number;
};

export type FirstInspectionEvidence = {
  recordId: string;
  businessNo: string;
  businessDate: string;
  organizationId: string;
  materialNo: string;
  inspectionQty: number;
  defectQty: number;
  qualifiedQty: number;
};

export type FirstInspectionSlice = {
  numerator: number;
  denominator: number;
  rate: number | null;
  recordCount: number;
  evidence: FirstInspectionEvidence[];
};

export type FirstInspectionScope = {
  organizationId: string;
  materialNo: string;
  startDate: string;
  endDate: string;
};

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function aggregateInspectionQuantities(records: readonly Pick<ProductionInspectionSource, "inspectionQty" | "defectQty">[]): Pick<FirstInspectionSlice, "numerator" | "denominator" | "rate"> {
  const denominator = records.reduce((total, record) => total + Number(record.inspectionQty || 0), 0);
  const numerator = records.reduce((total, record) => total + Number(record.inspectionQty || 0) - Number(record.defectQty || 0), 0);
  return { numerator, denominator, rate: denominator > 0 ? Math.min(100, Math.max(0, numerator / denominator * 100)) : null };
}

// A local M1 reconciliation primitive, not a server authorization or Coze data adapter.
export function aggregateFirstInspection(records: readonly ProductionInspectionSource[]): FirstInspectionSlice {
  const evidence = records
    .filter((record) => record.businessType === "production_inspection" && record.status === "completed" && record.inspectionProcess === "一检")
    .map((record) => {
      const inspectionQty = record.inspectionQty;
      const defectQty = record.defectQty;
      if (!record.id || !record.businessNo || !validDate(record.businessDate) ||
          typeof inspectionQty !== "number" || typeof defectQty !== "number" ||
          !Number.isSafeInteger(inspectionQty) || !Number.isSafeInteger(defectQty) ||
          inspectionQty < 0 || defectQty < 0 || defectQty > inspectionQty) {
        throw new Error("生产一检来源记录缺少有效的单据、日期或检验数量，不能生成候选指标。");
      }
      return {
        recordId: record.id,
        businessNo: record.businessNo,
        businessDate: record.businessDate,
        organizationId: record.factoryOrganizationId,
        materialNo: record.materialNo,
        inspectionQty,
        defectQty,
        qualifiedQty: inspectionQty - defectQty,
      };
    });
  return {
    ...aggregateInspectionQuantities(evidence),
    recordCount: evidence.length,
    evidence,
  };
}

export function buildFirstInspectionCandidate(records: readonly ProductionInspectionSource[], scope: FirstInspectionScope): FirstInspectionSlice {
  if (!scope.organizationId || !scope.materialNo || !validDate(scope.startDate) || !validDate(scope.endDate) || scope.startDate > scope.endDate) {
    throw new Error("生产一检候选指标需要单组织、单物料及有效的绝对日期范围。");
  }
  return aggregateFirstInspection(records.filter((record) =>
    record.factoryOrganizationId === scope.organizationId &&
    record.materialNo === scope.materialNo &&
    record.businessDate >= scope.startDate && record.businessDate <= scope.endDate));
}
