import { QeAssistant, QeAssistantPage, qeAssistantPath, qeExportEvent } from "./qe/QeAssistant";
import { configuredLlmDriver } from "./qe/llmPlanner";
import { evidencePath, readQeSample } from "./qe/evidence";
import { type Period, type QeAttachment, type QeData, type QeField, type QeRecord, redact } from "./qe/assistant";
import { readQeAudit } from "./qe/audit";
import { makeQeDemoFixtures } from "./qe/demoFixtures";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentType, type DragEvent, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { aggregateInspectionQuantities, buildFirstInspectionCandidate, type FirstInspectionScope } from "./productionInspectionSlice";
import productionInspectionDemo from "./demo/production-inspection.json";
import { createPortal } from "react-dom";
import { Link, Navigate, Route, Routes, matchPath, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  Factory,
  FileCheck2,
  Gauge,
  House,
  KeyRound,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  FACTORY_PERMISSION_GROUPS,
  getPermissionDefinition,
  migrateLegacyPermissionCodes,
  PLATFORM_PERMISSION_CODES,
  PLATFORM_PERMISSION_GROUPS,
  SUPPLIER_PERMISSION_GROUPS,
} from "@quality-platform/contracts";
import {
  MERCHANT_IDENTITY_STORAGE_KEY,
  MERCHANT_IDENTITY_CHANGE_EVENT,
  countOrganizationRoleMembers,
  deleteOrganizationRole,
  hasMerchantPermission,
  initializeMerchantOrganization,
  readLastOrganization,
  readMerchantIdentityStore,
  readOrganizationGrant,
  readOrganizationMembers,
  readOrganizationRoles,
  saveOrganizationMember,
  saveOrganizationRole,
  saveOrganizationRolePermissions,
  setOrganizationMembershipStatus,
  updateOrganizationGrant,
  writeLastOrganization,
  writeMerchantIdentityStore,
  type MerchantAccount,
  type MerchantIdentityStore,
  type MerchantMembership,
  type MerchantOrganizationSource,
  type MerchantRole,
  type OrganizationMember,
} from "./merchantIdentity";
import {
  configSchemaJson,
  addDesignField,
  addDesignGroup,
  designContainsField,
  fieldTypeLabels,
  getBusinessSchema,
  moveDesignField,
  removeDesignField,
  removeDesignGroup,
  readFormDesignDraft,
  readFormDesignVersions,
  saveFormDesignDraft,
  saveCopiedFormDesignDraft,
  saveFormDesignVersion,
  copyConfigSchemaVersion,
  setConfigSchemaStatus,
  type FieldDefinition,
  type FieldType,
  type DesignValidation,
  type FormDesignDraft,
  type FormDesignVersionRecord,
  formatValidation,
  formatDesignValidation,
  isDesignFieldRequired,
  validateDesignPreview,
  readConfigDictionaries,
  readConfigSchemas,
  readFieldDefinitions,
  saveConfigSchemaJson,
  saveFieldDefinition,
  setDictionaryItemStatus,
  setFieldStatus,
  updateDesignField,
  updateDesignGroup,
  readBusinessDefinitionConfig,
  readBusinessDefinitionConfigs,
  saveBusinessDefinitionConfig,
  publishBusinessDefinition,
  rollbackBusinessDefinition,
  discardBusinessDefinitionDraft,
  validateBusinessDefinitionConfig,
  copyBusinessDefinitionDraft,
  diffBusinessDefinition,
  createBusinessWorkflowTemplate,
  createDefaultBusinessWorkflow,
  createDefaultBusinessPermissions,
  createDefaultBusinessAnalysis,
  CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY,
  type BusinessDefinitionConfig,
  type BusinessDraftStatus,
  type BusinessWorkflowNode,
  type ConfigDictionary,
  type DictionaryStatus,
} from "./configuration";
import {
  createDynamicBusinessSubmission,
  dynamicRecordsForOrganization,
  openDynamicTodosForOrganization,
  PLATFORM_RUNTIME_ORGANIZATION_ID,
  readDynamicBusinessRuntimeStore,
  saveDynamicBusinessRuntimeStore,
  transitionDynamicBusinessRecord,
  type DynamicBusinessRecord,
} from "./dynamicBusinessRuntime";
import {
  createAnalyticsDashboard,
  createAnalyticsReport,
  disableAnalyticsReport,
  publishAnalyticsDashboard,
  publishAnalyticsReport,
  queryAnalyticsRecords,
  readAnalyticsDashboards,
  readAnalyticsReports,
  saveAnalyticsDashboard,
  saveAnalyticsReport,
  type AnalyticsDashboard,
  type AnalyticsDashboardDraft,
  type AnalyticsFilter,
  type AnalyticsRecord,
  type AnalyticsReport,
  type AnalyticsReportDraft,
} from "./analyticsConfiguration";

export type DemoRole = "platform" | "supplier" | "factory";

type DemoSession = {
  role: DemoRole;
  organizationId: string;
  userId: string;
  status: "enabled" | "disabled";
  organizationName?: string;
  userName?: string;
  membershipId?: string;
};

type PermissionNode = { id: string; code?: string; label: string; children?: PermissionNode[] };
export type PlatformRoleRecord = { id: string; name: string; description: string; system: boolean; permissionCodes: string[]; createdAt: string; updatedAt: string };
export type PlatformUserRecord = { id: string; name: string; phone: string; email: string; position: string; organizationIds: string[]; roleIds: string[]; status: "enabled" | "disabled"; createdAt: string; updatedAt: string };

type ShipmentStatus = "pending_review" | "rejected" | "approved" | "cancelled";

type FlowRecordKind = "submitted" | "review_rejected" | "resubmitted" | "review_approved" | "assigned" | "submitted_8d" | "cancelled" | "enabled" | "disabled" | "triggered";

type FlowRecord = {
  id: string;
  kind: FlowRecordKind;
  action: string;
  time: string;
  operator: string;
  organization: string;
  detail?: string;
};

type MerchantReviewStatus = "pending" | "approved" | "rejected" | "cancelled";
type MerchantUsageStatus = "active" | "inactive" | null;
type MerchantApplication = {
  id: string;
  version: number;
  merchantNo: string;
  merchantType: "supplier" | "factory";
  companyName: string;
  creditCode: string;
  administratorName: string;
  administratorPhone: string;
  administratorEmail: string;
  reviewStatus: MerchantReviewStatus;
  usageStatus: MerchantUsageStatus;
  reviewReason?: string;
  approvedAt?: string;
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

type ShipmentReport = {
  id: string;
  version: number;
  businessNo: string;
  status: ShipmentStatus;
  supplierOrganizationId: string;
  supplierName: string;
  materialNo: string;
  materialName: string;
  model: string;
  orderNo: string;
  orderQty: number;
  shipmentQty: number;
  shipmentDate: string;
  attachmentName: string;
  attachmentDataUrl?: string;
  remark: string;
  reviewReason?: string;
  cancelReason?: string;
  cancelledBy?: "supplier" | "platform";
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

type MaterialExceptionStatus = "pending_review" | "rejected" | "waiting_supplier" | "pending_8d_review" | "rejected_8d" | "approved" | "cancelled";

type MaterialException = {
  id: string;
  version: number;
  businessNo: string;
  status: MaterialExceptionStatus;
  reporterOrganizationId: string;
  reporterOrganization: string;
  supplierOrganizationId?: string;
  supplierName: string;
  materialNo: string;
  materialName: string;
  model: string;
  businessDate: string;
  inputQty: number;
  inspectionQty: number;
  defectQty: number;
  description: string;
  attachmentName: string;
  attachmentDataUrl?: string;
  remark: string;
  reviewReason?: string;
  assignmentNote?: string;
  eightDRemark?: string;
  eightDAttachmentName?: string;
  eightDAttachmentDataUrl?: string;
  sourceIncomingInspectionId?: string;
  sourceIncomingInspectionNo?: string;
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

export type IncomingInspectionStatus = "pending_review" | "rejected" | "completed" | "cancelled";
export type IncomingInspection = {
  id: string;
  version: number;
  businessNo: string;
  status: IncomingInspectionStatus;
  factoryOrganizationId: string;
  factoryOrganization: string;
  supplierName: string;
  materialNo: string;
  materialName: string;
  model: string;
  inspectionDate: string;
  inputQty: number;
  inspectionQty: number;
  defectQty: number;
  inspectionResult: "qualified" | "unqualified";
  supplyMethod: "factory_purchase" | "platform_purchase";
  attachmentName: string;
  attachmentDataUrl?: string;
  defectDescription: string;
  remark: string;
  handlingMethod?: string;
  reviewReason?: string;
  cancelReason?: string;
  triggeredMaterialExceptionId?: string;
  triggeredMaterialExceptionNo?: string;
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

type DirectBusinessType = "production_inspection" | "maintenance_record" | "ipqc_patrol";
type DefectDetail = {
  id: string;
  libraryItemId?: string;
  defect: string;
  quantity: number;
};
type RepairDetail = {
  id: string;
  sourceProductionInspectionId: string;
  sourceProductionInspectionNo: string;
  sourceDefectItemId: string;
  inspectionProcess: string;
  defect: string;
  quantity: number;
  cause: string;
  method: string;
  repairer: string;
};
type DefectLibraryItem = {
  id: string;
  organizationId: string;
  productKey: string;
  materialNo: string;
  productName: string;
  productModel: string;
  defect: string;
  quantity: number;
};
export type BatchProductionInspectionRow = {
  id: string; businessDate: string; inspectionProcess: string; productName: string; materialNo: string; productModel: string; orderNo: string; orderQty: number | ""; inputQty: number | ""; inspectionQty: number | ""; defectDetails: DefectDetail[]; remark: string; attachmentName: string; attachmentDataUrl?: string;
};
type DirectBusinessRecord = {
  id: string;
  version: number;
  businessNo: string;
  businessType: DirectBusinessType;
  status: "completed";
  factoryOrganizationId: string;
  factoryOrganization: string;
  businessDate: string;
  materialNo: string;
  productName: string;
  productModel: string;
  orderNo?: string;
  orderQty?: number;
  inputQty?: number;
  inspectionQty?: number;
  defectQty?: number;
  inspectionProcess?: string;
  defectDetails?: DefectDetail[];
  repairDetails?: RepairDetail[];
  teamLine?: string;
  issueReporter?: string;
  issueDescription?: string;
  responsibleDepartment?: string;
  improvementMeasure?: string;
  issueLocation?: string;
  issueCategory?: string;
  qualityFollower?: string;
  progress?: "pending" | "processing" | "completed";
  attachmentName: string;
  attachmentDataUrl?: string;
  remark: string;
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

type AuditedBusinessType = "sporadic_return" | "inbound_report" | "trial_summary";
type AuditedBusinessStatus = "pending_review" | "rejected" | "pending_return" | "pending_replenish" | "completed" | "approved" | "cancelled";
type AuditedBusinessRecord = {
  id: string;
  version: number;
  businessNo: string;
  businessType: AuditedBusinessType;
  status: AuditedBusinessStatus;
  factoryOrganizationId: string;
  factoryOrganization: string;
  businessDate: string;
  materialNo: string;
  materialName: string;
  materialModel: string;
  productName: string;
  productModel: string;
  orderNo: string;
  orderQty: number;
  assemblyQty: number;
  inboundQty: number;
  returnReason: string;
  returnQty: number;
  qualifiedType: "qualified" | "unqualified";
  trialInfo: string;
  attachmentName: string;
  attachmentDataUrl?: string;
  courierNo?: string;
  returnDate?: string;
  replenishDate?: string;
  replenishAttachmentName?: string;
  replenishAttachmentDataUrl?: string;
  remark: string;
  reviewReason?: string;
  cancelReason?: string;
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

type AfterSalesStatus = "pending_supplier" | "pending_8d_review" | "rejected_8d" | "approved" | "cancelled";
type AfterSalesException = {
  id: string;
  version: number;
  businessNo: string;
  status: AfterSalesStatus;
  reporterOrganization: string;
  supplierOrganizationId: string;
  supplierName: string;
  materialNo: string;
  materialName: string;
  model: string;
  businessDate: string;
  inputQty: number;
  defectQty: number;
  description: string;
  returnQty: number;
  attachmentName: string;
  attachmentDataUrl?: string;
  remark: string;
  eightDRemark?: string;
  eightDAttachmentName?: string;
  eightDAttachmentDataUrl?: string;
  reviewReason?: string;
  flowRecords: FlowRecord[];
  createdAt: string;
  updatedAt: string;
};

type LocalAttachment = { name: string; dataUrl: string };
export type AttachmentRef = LocalAttachment & { mimeType?: string; size?: number };
type AuditLogRecord = { id: string; action: string; businessType: string; businessNo?: string; operator: string; organization: string; organizationId?: string; time: string; detail?: string };
type DemoNotification = { id: string; title: string; detail: string; time: string; read: boolean };
const MATERIAL_ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar";
const MATERIAL_ATTACHMENT_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function readLocalAttachment(file: File): Promise<AttachmentRef> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!MATERIAL_ATTACHMENT_EXTENSIONS.includes(extension)) { reject(new Error("文件格式错误")); return; }
    if (file.size > MAX_ATTACHMENT_BYTES) { reject(new Error("单个文件大小超过10MB")); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(createAttachmentRef(file, String(reader.result)));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

export function createAttachmentRef(file: File, dataUrl: string): AttachmentRef { return { name: file.name, dataUrl, mimeType: file.type || undefined, size: file.size }; }
export function exportRowsAsXlsx(filename: string, headers: string[], rows: Array<Array<string | number | undefined>>): void {
  window.dispatchEvent(new Event(qeExportEvent));
  const escape = (value: string | number | undefined): string => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = `\ufeff${[headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8" });
  const link = document.createElement("a"); const objectUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; link.href = objectUrl; link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`; link.click(); if (objectUrl.startsWith("blob:") && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(objectUrl);
}

const AUDIT_LOG_STORAGE_KEY = "quality-platform.audit-logs";
export function readAuditLogs(): AuditLogRecord[] { try { const raw = window.localStorage.getItem(AUDIT_LOG_STORAGE_KEY); const parsed = raw ? JSON.parse(raw) as AuditLogRecord[] : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export function appendAuditLog(entry: Omit<AuditLogRecord, "id">): void {
  const records = readAuditLogs();
  const session = readDemoSession();
  const organizationId = entry.organizationId ?? session?.organizationId ?? (entry.organization === roleProfiles.platform.organization ? roleProfiles.platform.organizationId : undefined);
  records.unshift({ ...entry, organizationId, id: `audit-${Date.now()}-${records.length}` });
  window.localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(records.slice(0, 500)));
}
export function notificationsFromAudit(role?: DemoRole): DemoNotification[] {
  const session = readDemoSession();
  const currentRole = role ?? session?.role;
  const organizationId = currentRole === "platform" ? roleProfiles.platform.organizationId : session && session.role === currentRole ? session.organizationId : currentRole ? roleProfiles[currentRole].organizationId : undefined;
  return readAuditLogs()
    .filter((entry) => Boolean(organizationId && entry.organizationId === organizationId))
    .slice(0, 30)
    .map((entry) => ({ id: entry.id, title: `${entry.action}${entry.businessNo ? ` · ${entry.businessNo}` : ""}`, detail: `${entry.operator} · ${entry.organization}${entry.detail ? ` · ${entry.detail}` : ""}`, time: entry.time, read: false }));
}
function MerchantBusinessExportButton({ permissionCode, filename, headers, rows }: {
  permissionCode: string;
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | undefined>>;
}) {
  const session = readDemoSession();
  if (!session || session.role === "platform" || !hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, permissionCode)) return null;
  return <button className="secondary-button" onClick={() => exportRowsAsXlsx(`${session.organizationName ?? "商家"}-${filename}`, headers, rows)}><Download size={15} />导出</button>;
}
function hasCurrentMerchantPermission(permissionCode: string): boolean {
  const session = readDemoSession();
  return Boolean(session && session.role !== "platform" && hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, permissionCode));
}
function auditSavedRecord(record: { businessNo?: string; flowRecords?: FlowRecord[] }, businessType: string): void { const latest = record.flowRecords?.[record.flowRecords.length - 1]; if (!latest) return; appendAuditLog({ action: latest.action, businessType, businessNo: record.businessNo, operator: latest.operator, organization: latest.organization, time: latest.time, detail: latest.detail }); }

function downloadLocalAttachment(attachment: LocalAttachment): void {
  const link = document.createElement("a");
  link.href = attachment.dataUrl;
  link.download = attachment.name;
  link.click();
}

export const DEMO_SESSION_STORAGE_KEY = "quality-platform.demo-session";
const SHIPMENT_REPORT_STORAGE_KEY = "quality-platform.shipment-reports";
const MATERIAL_EXCEPTION_STORAGE_KEY = "quality-platform.material-exceptions";
const INCOMING_INSPECTION_STORAGE_KEY = "quality-platform.incoming-inspections";
const DIRECT_BUSINESS_STORAGE_KEY = "quality-platform.direct-business-records";
const DEFECT_LIBRARY_STORAGE_KEY = "quality-platform.defect-detail-library";
const AUDITED_BUSINESS_STORAGE_KEY = "quality-platform.audited-business-records";
const AFTER_SALES_STORAGE_KEY = "quality-platform.after-sales-exceptions";
const MERCHANT_APPLICATION_STORAGE_KEY = "quality-platform.merchant-applications";
export const PRODUCT_DATA_STORAGE_KEY = "quality-platform.product-data";
export const PLATFORM_USERS_STORAGE_KEY = "quality-platform.platform-users";
export const PLATFORM_ROLES_STORAGE_KEY = "quality-platform.platform-roles";
const DEMO_SMS_CODE = "246810";
const supplierOrganizationId = "00000000-0000-4000-8000-000000000002";
const factoryOrganizationId = "00000000-0000-4000-8000-000000000003";

export const platformPermissionTree: PermissionNode[] = [
  ...PLATFORM_PERMISSION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.permissionCodes.map((code) => ({
      id: code,
      code,
      label: getPermissionDefinition(code)?.name ?? code,
    })),
  })),
];

function merchantPermissionTree(merchantType: "supplier" | "factory"): PermissionNode[] {
  const groups = merchantType === "supplier" ? SUPPLIER_PERMISSION_GROUPS : FACTORY_PERMISSION_GROUPS;
  return groups.map((group) => ({
    id: `${merchantType}.${group.id}`,
    label: group.label,
    children: group.permissionCodes.map((code) => ({
      id: `${merchantType}.${code}`,
      code,
      label: getPermissionDefinition(code)?.name ?? code,
    })),
  }));
}

function flattenPermissionCodes(nodes: PermissionNode[]): string[] { return nodes.flatMap((node) => [...(node.code ? [node.code] : []), ...(node.children ? flattenPermissionCodes(node.children) : [])]); }
const allPlatformPermissionCodes = [...PLATFORM_PERMISSION_CODES];
const platformAuditorPermissionCodes = PLATFORM_PERMISSION_CODES.filter((code) =>
  code.startsWith("platform.home.")
  || [
    "platform.merchant.organization.read",
    "platform.merchant.organization.review",
    "platform.business.record.read",
    "platform.business.record.review",
  ].includes(code)
  || code.endsWith(".access"));
const platformOperatorPermissionCodes = PLATFORM_PERMISSION_CODES.filter((code) =>
  code.startsWith("platform.home.")
  || code.endsWith(".submit")
  || code.endsWith(".access")
  || code === "platform.business.record.read");
const seededPlatformRoles: PlatformRoleRecord[] = [
  { id: "platform-role-super-admin", name: "超级管理员", description: "拥有平台全部管理权限", system: true, permissionCodes: allPlatformPermissionCodes, createdAt: "2026-08-08 09:00", updatedAt: "2026-08-08 09:00" },
  { id: "platform-role-auditor", name: "平台审核用户", description: "负责业务审核与待办处理", system: false, permissionCodes: platformAuditorPermissionCodes, createdAt: "2026-08-08 09:10", updatedAt: "2026-08-08 09:10" },
  { id: "platform-role-operator", name: "平台业务用户", description: "负责平台侧异常提报", system: false, permissionCodes: platformOperatorPermissionCodes, createdAt: "2026-08-08 09:20", updatedAt: "2026-08-08 09:20" },
];
const seededPlatformUsers: PlatformUserRecord[] = [
  { id: "platform-user-super-admin", name: "演示管理员", phone: "13800138991", email: "platform-admin@example.com", position: "平台管理员", organizationIds: ["00000000-0000-4000-8000-000000000001"], roleIds: ["platform-role-super-admin"], status: "enabled", createdAt: "2026-08-08 09:00", updatedAt: "2026-08-08 09:00" },
  { id: "platform-user-auditor", name: "审核专员", phone: "13800138992", email: "auditor@example.com", position: "质量审核", organizationIds: ["00000000-0000-4000-8000-000000000001"], roleIds: ["platform-role-auditor"], status: "enabled", createdAt: "2026-08-08 09:10", updatedAt: "2026-08-08 09:10" },
];

function migratePlatformRole(record: PlatformRoleRecord): PlatformRoleRecord {
  const migrated = migrateLegacyPermissionCodes(record.permissionCodes, { surface: "platform" });
  if (migrated.unknownCodes.length) throw new Error(`unknown permission codes: ${migrated.unknownCodes.join(", ")}`);
  return { ...record, permissionCodes: record.system ? allPlatformPermissionCodes : migrated.permissionCodes };
}
export function readPlatformRoles(): PlatformRoleRecord[] { try { const raw = window.localStorage.getItem(PLATFORM_ROLES_STORAGE_KEY); if (!raw) return seededPlatformRoles; const parsed = JSON.parse(raw) as PlatformRoleRecord[]; return Array.isArray(parsed) && parsed.length ? parsed.map(migratePlatformRole) : seededPlatformRoles; } catch { return seededPlatformRoles; } }
export function readPlatformUsers(): PlatformUserRecord[] { try { const raw = window.localStorage.getItem(PLATFORM_USERS_STORAGE_KEY); if (!raw) return seededPlatformUsers; const parsed = JSON.parse(raw) as PlatformUserRecord[]; return Array.isArray(parsed) && parsed.length ? parsed : seededPlatformUsers; } catch { return seededPlatformUsers; } }
function savePlatformRoles(records: PlatformRoleRecord[]): void { window.localStorage.setItem(PLATFORM_ROLES_STORAGE_KEY, JSON.stringify(records)); window.dispatchEvent(new Event(qePlatformPermissionsEvent)); }
function savePlatformUsers(records: PlatformUserRecord[]): void { window.localStorage.setItem(PLATFORM_USERS_STORAGE_KEY, JSON.stringify(records)); window.dispatchEvent(new Event(qePlatformPermissionsEvent)); }
export function updatePermissionSelection(selected: string[], node: PermissionNode, checked: boolean): string[] { const next = new Set(selected); const codes = flattenPermissionCodes([node]); codes.forEach((code) => checked ? next.add(code) : next.delete(code)); return [...next]; }
function updateGrantedPermissionSelection(selected: string[], node: PermissionNode, checked: boolean, grantedCodes: readonly string[]): string[] { const next = new Set(selected); const codes = flattenPermissionCodes([node]).filter((code) => grantedCodes.includes(code)); codes.forEach((code) => checked ? next.add(code) : next.delete(code)); return [...next]; }

const seededMerchantApplications: MerchantApplication[] = [
  { id: "merchant-supplier-seed", version: 1, merchantNo: "MC202608090001", merchantType: "supplier", companyName: "远航精密供应商", creditCode: "91440300MA5DEMO001", administratorName: "王晨", administratorPhone: "13800138001", administratorEmail: "wangchen@example.com", reviewStatus: "approved", usageStatus: "active", approvedAt: "2026-08-09 14:30", createdAt: "2026-08-09 09:00", updatedAt: "2026-08-09 14:30", flowRecords: [{ id: "merchant-supplier-approved", kind: "review_approved", action: "平台审核通过", time: "2026-08-09 14:30", operator: "演示管理员", organization: "示例质量运营中心" }] },
  { id: "merchant-factory-seed", version: 1, merchantNo: "MC202608080002", merchantType: "factory", companyName: "华南智造 OEM 工厂", creditCode: "91440300MA5DEMO002", administratorName: "陈工", administratorPhone: "13800138002", administratorEmail: "chengong@example.com", reviewStatus: "approved", usageStatus: "active", approvedAt: "2026-08-08 16:20", createdAt: "2026-08-08 10:00", updatedAt: "2026-08-08 16:20", flowRecords: [{ id: "merchant-factory-approved", kind: "review_approved", action: "平台审核通过", time: "2026-08-08 16:20", operator: "演示管理员", organization: "示例质量运营中心" }] },
  { id: "merchant-multi-org-seed", version: 1, merchantNo: "MC202608070003", merchantType: "factory", companyName: "星海电子 OEM 工厂", creditCode: "91440300MA5DEMO003", administratorName: "王晨", administratorPhone: "13800138001", administratorEmail: "wangchen@example.com", reviewStatus: "approved", usageStatus: "active", approvedAt: "2026-08-07 15:10", createdAt: "2026-08-07 09:40", updatedAt: "2026-08-07 15:10", flowRecords: [{ id: "merchant-multi-approved", kind: "review_approved", action: "平台审核通过", time: "2026-08-07 15:10", operator: "演示管理员", organization: "示例质量运营中心" }] },
];

function readMerchantApplications(): MerchantApplication[] {
  try {
    const raw = window.localStorage.getItem(MERCHANT_APPLICATION_STORAGE_KEY);
    if (!raw) return seededMerchantApplications;
    const parsed = JSON.parse(raw) as MerchantApplication[];
    return Array.isArray(parsed) ? parsed.map((item) => ({ ...item, version: item.version || 1, flowRecords: item.flowRecords || [] })) : seededMerchantApplications;
  } catch { return seededMerchantApplications; }
}

function saveMerchantApplication(application: MerchantApplication, expectedVersion?: number): MerchantApplication {
  const applications = readMerchantApplications();
  const index = applications.findIndex((item) => item.id === application.id);
  const saved = index < 0 ? { ...application, version: 1 } : (() => { assertExpectedVersion(applications[index].version, expectedVersion ?? application.version); return { ...application, version: applications[index].version + 1 }; })();
  if (index < 0) applications.unshift(saved); else applications[index] = saved;
  window.localStorage.setItem(MERCHANT_APPLICATION_STORAGE_KEY, JSON.stringify(applications));
  return saved;
}

function merchantReviewLabel(status: MerchantReviewStatus): string { return { pending: "待审核", approved: "已通过", rejected: "已驳回", cancelled: "已取消" }[status]; }
function merchantRole(type: MerchantApplication["merchantType"]): DemoRole { return type === "supplier" ? "supplier" : "factory"; }
function merchantOrganizationId(application: MerchantApplication): string {
  if (application.id === "merchant-supplier-seed") return supplierOrganizationId;
  if (application.id === "merchant-factory-seed") return factoryOrganizationId;
  return application.id;
}

function merchantIdentitySources(applications = readMerchantApplications()): MerchantOrganizationSource[] {
  return applications.map((application) => ({
    id: application.id,
    organizationId: merchantOrganizationId(application),
    merchantType: application.merchantType,
    companyName: application.companyName,
    administratorName: application.administratorName,
    administratorPhone: application.administratorPhone,
    administratorEmail: application.administratorEmail,
    reviewStatus: application.reviewStatus,
    usageStatus: application.usageStatus,
    createdAt: application.createdAt,
    approvedAt: application.approvedAt,
  }));
}

export function initializeApprovedMerchantIdentity(application: MerchantApplication): MerchantIdentityStore {
  const applications = readMerchantApplications();
  const sources = merchantIdentitySources([
    ...applications.filter((entry) => entry.id !== application.id),
    application,
  ]);
  const store = initializeMerchantOrganization(readMerchantIdentityStore(sources), sources.find((source) => source.id === application.id)!);
  writeMerchantIdentityStore(store);
  return store;
}

function saveMerchantApprovalAtomically(application: MerchantApplication, expectedVersion: number): MerchantApplication {
  const applicationSnapshot = window.localStorage.getItem(MERCHANT_APPLICATION_STORAGE_KEY);
  const identitySnapshot = window.localStorage.getItem(MERCHANT_IDENTITY_STORAGE_KEY);
  try {
    const saved = saveMerchantApplication(application, expectedVersion);
    initializeApprovedMerchantIdentity(saved);
    return saved;
  } catch (error) {
    if (applicationSnapshot === null) window.localStorage.removeItem(MERCHANT_APPLICATION_STORAGE_KEY);
    else window.localStorage.setItem(MERCHANT_APPLICATION_STORAGE_KEY, applicationSnapshot);
    if (identitySnapshot === null) window.localStorage.removeItem(MERCHANT_IDENTITY_STORAGE_KEY);
    else window.localStorage.setItem(MERCHANT_IDENTITY_STORAGE_KEY, identitySnapshot);
    throw error;
  }
}

const seededShipmentReport: ShipmentReport = {
  id: "00000000-0000-4000-8000-000000000501",
  version: 1,
  businessNo: "SR202608110001",
  status: "pending_review",
  supplierOrganizationId,
  supplierName: "远航精密供应商",
  materialNo: "MAT-USB-C-001",
  materialName: "USB-C连接器",
  model: "UC24-PRO",
  orderNo: "PO202608001",
  orderQty: 5000,
  shipmentQty: 3000,
  shipmentDate: "2026-08-10",
  attachmentName: "出货检验报告_SR202608110001.pdf",
  remark: "首批出货，随货附检验报告。",
  flowRecords: [{ id: "flow-seed-submitted", kind: "submitted", action: "提交出货报告", time: "2026-08-10 15:30", operator: "王晨", organization: "远航精密供应商" }],
  createdAt: "2026-08-10 15:30",
  updatedAt: "2026-08-10 15:30",
};

const seededApprovedShipmentReport: ShipmentReport = {
  ...seededShipmentReport,
  id: "00000000-0000-4000-8000-000000000502",
  businessNo: "SR202608090002",
  status: "approved",
  materialNo: "MAT-FPC-008",
  materialName: "FPC连接排线",
  model: "FPC-08P-120",
  orderNo: "PO202607182",
  orderQty: 2400,
  shipmentQty: 2400,
  shipmentDate: "2026-08-09",
  attachmentName: "出货检验报告_SR202608090002.pdf",
  remark: "复检合格后出货。",
  flowRecords: [
    { id: "flow-seed-approved-submitted", kind: "submitted", action: "提交出货报告", time: "2026-08-09 09:00", operator: "王晨", organization: "远航精密供应商" },
    { id: "flow-seed-approved", kind: "review_approved", action: "平台审核通过", time: "2026-08-09 12:30", operator: "演示管理员", organization: "示例质量运营中心", detail: "检验报告及数量核对无误。" },
  ],
  createdAt: "2026-08-09 09:00",
  updatedAt: "2026-08-09 12:30",
};

const seededCancelledShipmentReport: ShipmentReport = {
  ...seededShipmentReport,
  id: "00000000-0000-4000-8000-000000000503",
  businessNo: "SR202608080003",
  status: "cancelled",
  materialNo: "MAT-SHELL-014",
  materialName: "铝合金外壳",
  model: "AL-14-S",
  orderNo: "PO202607156",
  orderQty: 1800,
  shipmentQty: 900,
  shipmentDate: "2026-08-08",
  attachmentName: "",
  remark: "",
  cancelReason: "采购订单调整，平台终止本批次审核。",
  cancelledBy: "platform",
  flowRecords: [
    { id: "flow-seed-cancelled-submitted", kind: "submitted", action: "提交出货报告", time: "2026-08-08 10:00", operator: "王晨", organization: "远航精密供应商" },
    { id: "flow-seed-cancelled", kind: "cancelled", action: "平台取消", time: "2026-08-08 15:30", operator: "演示管理员", organization: "示例质量运营中心", detail: "采购订单调整，平台终止本批次审核。" },
  ],
  createdAt: "2026-08-08 10:00",
  updatedAt: "2026-08-08 15:30",
};

const seededRejectedShipmentReport: ShipmentReport = {
  ...seededShipmentReport,
  id: "00000000-0000-4000-8000-000000000504",
  businessNo: "SR202608070004",
  status: "rejected",
  materialNo: "MAT-USB-C-009",
  materialName: "USB-C连接器",
  orderNo: "PO202607199",
  shipmentQty: 1200,
  shipmentDate: "2026-08-07",
  reviewReason: "请补充出货检验报告并核对出货数量。",
  flowRecords: [
    { id: "flow-seed-rejected-submitted", kind: "submitted", action: "提交出货报告", time: "2026-08-07 09:00", operator: "王晨", organization: "远航精密供应商" },
    { id: "flow-seed-rejected", kind: "review_rejected", action: "平台审核驳回", time: "2026-08-07 14:30", operator: "演示管理员", organization: "示例质量运营中心", detail: "请补充出货检验报告并核对出货数量。" },
  ],
  createdAt: "2026-08-07 09:00",
  updatedAt: "2026-08-07 14:30",
};

const seededShipmentReports = [seededShipmentReport, seededApprovedShipmentReport, seededCancelledShipmentReport, seededRejectedShipmentReport];

function legacyFlowRecords(report: Omit<ShipmentReport, "flowRecords"> & { flowRecords?: FlowRecord[] }): FlowRecord[] {
  if (Array.isArray(report.flowRecords) && report.flowRecords.length > 0) return report.flowRecords;
  const records: FlowRecord[] = [{ id: `${report.id}-submitted`, kind: "submitted", action: "提交出货报告", time: report.createdAt, operator: "王晨", organization: report.supplierName }];
  if (report.status === "rejected") records.push({ id: `${report.id}-rejected`, kind: "review_rejected", action: "平台审核驳回", time: report.updatedAt, operator: "演示管理员", organization: "示例质量运营中心", detail: report.reviewReason });
  if (report.status === "approved") records.push({ id: `${report.id}-approved`, kind: "review_approved", action: "平台审核通过", time: report.updatedAt, operator: "演示管理员", organization: "示例质量运营中心", detail: report.reviewReason });
  if (report.status === "cancelled") records.push({ id: `${report.id}-cancelled`, kind: "cancelled", action: "取消出货报告", time: report.updatedAt, operator: report.cancelledBy === "platform" ? "演示管理员" : "王晨", organization: report.cancelledBy === "platform" ? "示例质量运营中心" : report.supplierName, detail: report.cancelReason });
  return records;
}

function normalizeShipmentReport(report: ShipmentReport): ShipmentReport {
  return { ...report, version: Number.isInteger(report.version) && report.version > 0 ? report.version : 1, flowRecords: legacyFlowRecords(report) };
}

function readShipmentReports(): ShipmentReport[] {
  try {
    const raw = window.localStorage.getItem(SHIPMENT_REPORT_STORAGE_KEY);
    if (!raw) return seededShipmentReports;
    const parsed = JSON.parse(raw) as ShipmentReport[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(normalizeShipmentReport) : seededShipmentReports;
  } catch {
    return seededShipmentReports;
  }
}

function writeShipmentReports(reports: ShipmentReport[]): void {
  window.localStorage.setItem(SHIPMENT_REPORT_STORAGE_KEY, JSON.stringify(reports));
}

export class OptimisticLockError extends Error {
  constructor() {
    super("该单据已被处理，请刷新后查看最新状态");
    this.name = "OptimisticLockError";
  }
}

export class InvalidTransitionError extends Error {
  constructor() {
    super("当前状态不支持此操作，请刷新后查看最新状态");
    this.name = "InvalidTransitionError";
  }
}

export function assertExpectedVersion(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) throw new OptimisticLockError();
}

const shipmentTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending_review: ["approved", "rejected", "cancelled"],
  rejected: ["pending_review", "cancelled"],
  approved: [],
  cancelled: [],
};

const materialTransitions: Record<MaterialExceptionStatus, MaterialExceptionStatus[]> = {
  pending_review: ["rejected", "waiting_supplier", "cancelled"],
  rejected: ["pending_review", "cancelled"],
  waiting_supplier: ["pending_8d_review", "cancelled"],
  pending_8d_review: ["rejected_8d", "approved", "cancelled"],
  rejected_8d: ["pending_8d_review", "cancelled"],
  approved: [],
  cancelled: [],
};

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (from !== to && !shipmentTransitions[from].includes(to)) throw new InvalidTransitionError();
}

export function assertMaterialTransition(from: MaterialExceptionStatus, to: MaterialExceptionStatus): void {
  if (from !== to && !materialTransitions[from].includes(to)) throw new InvalidTransitionError();
}

function saveShipmentReport(report: ShipmentReport, expectedVersion?: number): ShipmentReport {
  const reports = readShipmentReports();
  const index = reports.findIndex((item) => item.id === report.id);
  let saved: ShipmentReport;
  if (index === -1) {
    saved = { ...report, version: 1 };
    reports.unshift(saved);
  } else {
    const current = reports[index];
    assertExpectedVersion(current.version, expectedVersion ?? report.version);
    assertShipmentTransition(current.status, report.status);
    saved = { ...report, version: current.version + 1 };
    reports[index] = saved;
  }
  writeShipmentReports(reports);
  auditSavedRecord(saved, "出货报告");
  return saved;
}

function getShipmentReport(id: string): ShipmentReport | undefined {
  return readShipmentReports().find((report) => report.id === id);
}

const seededIncomingInspections: IncomingInspection[] = [
  {
    id: "incoming-inspection-pending-001", version: 1, businessNo: "IQC202608130001", status: "pending_review",
    factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", supplierName: "远航精密供应商",
    materialNo: "MAT-USB-C-031", materialName: "USB-C连接器", model: "UC24-PRO", inspectionDate: "2026-08-13",
    inputQty: 3000, inspectionQty: 500, defectQty: 12, inspectionResult: "unqualified", supplyMethod: "platform_purchase",
    attachmentName: "来料检验记录_IQC202608130001.pdf", defectDescription: "抽检发现端子压接高度超差。", remark: "待平台确认处理方式。",
    flowRecords: [{ id: "iqc-pending-submitted", kind: "submitted", action: "工厂提交来料检验", time: "2026-08-13 09:20", operator: "陈工", organization: "华南智造 OEM 工厂" }],
    createdAt: "2026-08-13 09:20", updatedAt: "2026-08-13 09:20",
  },
  {
    id: "incoming-inspection-rejected-001", version: 1, businessNo: "IQC202608090001", status: "rejected",
    factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", supplierName: "远航精密供应商",
    materialNo: "MAT-FPC-019", materialName: "FPC连接排线", model: "FPC-19P-120", inspectionDate: "2026-08-09",
    inputQty: 2400, inspectionQty: 300, defectQty: 9, inspectionResult: "unqualified", supplyMethod: "platform_purchase",
    attachmentName: "", defectDescription: "排线金手指存在氧化。", remark: "",
    reviewReason: "请补充检验附件并核对不良描述。",
    flowRecords: [
      { id: "iqc-rejected-submitted", kind: "submitted", action: "工厂提交来料检验", time: "2026-08-09 08:40", operator: "陈工", organization: "华南智造 OEM 工厂" },
      { id: "iqc-rejected-reviewed", kind: "review_rejected", action: "平台审核驳回", time: "2026-08-11 09:20", operator: "演示管理员", organization: "示例质量运营中心", detail: "请补充检验附件并核对不良描述。" },
    ], createdAt: "2026-08-09 08:40", updatedAt: "2026-08-11 09:20",
  },
  {
    id: "incoming-inspection-completed-triggerable", version: 1, businessNo: "IQC202608080003", status: "completed",
    factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", supplierName: "远航精密供应商",
    materialNo: "MAT-SHELL-023", materialName: "铝合金外壳", model: "AL-23-S", inspectionDate: "2026-08-08",
    inputQty: 1800, inspectionQty: 200, defectQty: 16, inspectionResult: "unqualified", supplyMethod: "platform_purchase",
    attachmentName: "来料不良照片.zip", defectDescription: "表面划伤比例超过抽检标准。", remark: "建议供应商开展原因分析。", handlingMethod: "挑选使用，不良品退回供应商",
    flowRecords: [
      { id: "iqc-completed-submitted", kind: "submitted", action: "工厂提交来料检验", time: "2026-08-08 10:00", operator: "陈工", organization: "华南智造 OEM 工厂" },
      { id: "iqc-completed-reviewed", kind: "review_approved", action: "平台审核通过", time: "2026-08-08 13:30", operator: "演示管理员", organization: "示例质量运营中心", detail: "处理方式：挑选使用，不良品退回供应商" },
    ], createdAt: "2026-08-08 10:00", updatedAt: "2026-08-08 13:30",
  },
  {
    id: "incoming-inspection-completed-qualified", version: 1, businessNo: "IQC202608070004", status: "completed",
    factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", supplierName: "远航精密供应商",
    materialNo: "MAT-PACK-007", materialName: "包装彩盒", model: "PK-07", inspectionDate: "2026-08-07",
    inputQty: 1000, inspectionQty: 100, defectQty: 0, inspectionResult: "qualified", supplyMethod: "factory_purchase",
    attachmentName: "", defectDescription: "", remark: "来料抽检合格。", handlingMethod: "正常入库",
    flowRecords: [
      { id: "iqc-qualified-submitted", kind: "submitted", action: "工厂提交来料检验", time: "2026-08-07 09:00", operator: "陈工", organization: "华南智造 OEM 工厂" },
      { id: "iqc-qualified-reviewed", kind: "review_approved", action: "平台审核通过", time: "2026-08-07 11:00", operator: "演示管理员", organization: "示例质量运营中心", detail: "处理方式：正常入库" },
    ], createdAt: "2026-08-07 09:00", updatedAt: "2026-08-07 11:00",
  },
];

export function readIncomingInspections(): IncomingInspection[] {
  try {
    const raw = window.localStorage.getItem(INCOMING_INSPECTION_STORAGE_KEY);
    if (!raw) return seededIncomingInspections;
    const parsed = JSON.parse(raw) as IncomingInspection[];
    return Array.isArray(parsed) ? parsed.map((item) => ({ ...item, version: item.version || 1, flowRecords: item.flowRecords || [] })) : seededIncomingInspections;
  } catch { return seededIncomingInspections; }
}

const incomingInspectionTransitions: Record<IncomingInspectionStatus, IncomingInspectionStatus[]> = {
  pending_review: ["rejected", "completed", "cancelled"], rejected: ["pending_review", "cancelled"], completed: [], cancelled: [],
};

export function assertIncomingInspectionTransition(from: IncomingInspectionStatus, to: IncomingInspectionStatus): void {
  if (from !== to && !incomingInspectionTransitions[from].includes(to)) throw new InvalidTransitionError();
}

function saveIncomingInspection(record: IncomingInspection, expectedVersion?: number): IncomingInspection {
  const records = readIncomingInspections();
  const index = records.findIndex((item) => item.id === record.id);
  let saved: IncomingInspection;
  if (index < 0) { saved = { ...record, version: 1 }; records.unshift(saved); }
  else { const current = records[index]; assertExpectedVersion(current.version, expectedVersion ?? record.version); assertIncomingInspectionTransition(current.status, record.status); saved = { ...record, version: current.version + 1 }; records[index] = saved; }
  window.localStorage.setItem(INCOMING_INSPECTION_STORAGE_KEY, JSON.stringify(records));
  auditSavedRecord(saved, "来料检验");
  return saved;
}

function getIncomingInspection(id: string): IncomingInspection | undefined { return readIncomingInspections().find((item) => item.id === id); }

export function canTriggerMaterialException(record: IncomingInspection): boolean {
  return record.status === "completed" && record.inspectionResult === "unqualified" && record.supplyMethod === "platform_purchase" && !record.triggeredMaterialExceptionId;
}

export function validateIncomingInspectionApproval(handlingMethod: string): void {
  if (!handlingMethod.trim()) throw new Error("审核通过时必须填写处理方式");
}

function incomingInspectionStatusLabel(status: IncomingInspectionStatus): string { return { pending_review: "待审核", rejected: "已驳回", completed: "已完成", cancelled: "已取消" }[status]; }
function incomingInspectionStatusClass(status: IncomingInspectionStatus): string { return status === "completed" ? "approved" : status === "rejected" ? "rejected" : status === "cancelled" ? "cancelled" : "pending"; }
function createIncomingInspectionNo(records: IncomingInspection[]): string { return `IQC20260813${String(records.length + 1).padStart(4, "0")}`; }

const directBusinessLabels: Record<DirectBusinessType, string> = { production_inspection: "生产检验日报", maintenance_record: "维修记录", ipqc_patrol: "IPQC巡线问题记录" };
const directBusinessPermissionResources: Record<DirectBusinessType, string> = { production_inspection: "production_inspection_daily", maintenance_record: "repair_record", ipqc_patrol: "ipqc_inspection" };
const directBusinessPrefixes: Record<DirectBusinessType, string> = { production_inspection: "PIR", maintenance_record: "MR", ipqc_patrol: "IPQC" };
function directProductKey(record: Pick<DirectBusinessRecord, "materialNo" | "productName" | "productModel">): string {
  return [record.materialNo, record.productName, record.productModel].map((value) => String(value || "").trim().toLocaleLowerCase()).join("|");
}

function normalizedDefectDetails(value: unknown, fallbackQuantity = 0, recordId = "defect"): DefectDetail[] {
  if (Array.isArray(value)) return value.map((item, index) => ({ id: String((item as Partial<DefectDetail>).id || `${recordId}-${index + 1}`), libraryItemId: (item as Partial<DefectDetail>).libraryItemId ? String((item as Partial<DefectDetail>).libraryItemId) : undefined, defect: String((item as Partial<DefectDetail>).defect || "").trim(), quantity: Number((item as Partial<DefectDetail>).quantity || 0) })).filter((item) => item.defect);
  if (typeof value === "string" && value.trim()) return [{ id: `${recordId}-1`, defect: value.trim(), quantity: fallbackQuantity }];
  return [];
}

function emptyBatchProductionRow(): BatchProductionInspectionRow { return { id: `batch-row-${Date.now()}-${Math.random()}`, businessDate: "", inspectionProcess: "", productName: "", materialNo: "", productModel: "", orderNo: "", orderQty: "", inputQty: "", inspectionQty: "", defectDetails: [], remark: "", attachmentName: "" }; }
function batchDefectQty(row: BatchProductionInspectionRow): number { return row.defectDetails.reduce((total, item) => total + Number(item.quantity || 0), 0); }
function normalizeBatchRow(row: BatchProductionInspectionRow): string { const defectQty = batchDefectQty(row); const inspectionQty = Number(row.inspectionQty || 0); return JSON.stringify([row.businessDate, row.inspectionProcess.trim(), row.productName.trim(), row.materialNo.trim(), row.productModel.trim(), row.orderNo.trim(), Number(row.orderQty), Number(row.inputQty), inspectionQty, defectQty, inspectionQty ? Number((defectQty / inspectionQty * 100).toFixed(2)) : 0, row.defectDetails.map((item) => [item.defect.trim(), Number(item.quantity)]), row.remark.trim(), row.attachmentName.trim()]); }
export function validateBatchProductionRows(rows: BatchProductionInspectionRow[]): string[] {
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const prefix = `第 ${index + 1} 行：`;
    if (!row.businessDate || !row.inspectionProcess.trim() || !row.productName.trim() || !row.materialNo.trim() || !row.productModel.trim() || !row.orderNo.trim()) { errors.push(`${prefix}请填写全部必填字段`); return; }
    if ([row.orderQty, row.inputQty, row.inspectionQty].some((value) => value === "" || Number(value) < 0)) { errors.push(`${prefix}数量必须为非负数`); return; }
    if (Number(row.inspectionQty) > Number(row.inputQty)) { errors.push(`${prefix}检验数量不能大于投入数量`); return; }
    if (row.defectDetails.some((item) => !item.defect.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 0)) { errors.push(`${prefix}不良明细必须填写不良项和非负整数数量`); return; }
    if (new Set(row.defectDetails.map((item) => item.defect.trim().toLocaleLowerCase())).size !== row.defectDetails.length) { errors.push(`${prefix}同一行不良项不能重复`); return; }
    if (batchDefectQty(row) > Number(row.inspectionQty)) errors.push(`${prefix}不良数量不能大于检验数量`);
  });
  const groups = new Map<string, number[]>(); rows.forEach((row, index) => { const key = normalizeBatchRow(row); groups.set(key, [...(groups.get(key) ?? []), index + 1]); });
  groups.forEach((indices) => { if (indices.length > 1) errors.push(`第 ${indices.join("、")} 行：整行内容完全重复`); });
  return errors;
}

type StoredDirectBusinessRecord = Omit<DirectBusinessRecord, "defectDetails" | "repairDetails"> & {
  defectDetails?: string | DefectDetail[];
  repairDetails?: Array<Partial<RepairDetail> & { defect?: string; quantity?: number; cause?: string; method?: string; repairer?: string }>;
};

function normalizeDirectBusinessRecords(records: StoredDirectBusinessRecord[]): DirectBusinessRecord[] {
  const normalized = records.map((record) => ({
    ...record,
    version: record.version || 1,
    flowRecords: record.flowRecords || [],
    defectDetails: normalizedDefectDetails(record.defectDetails, Number(record.defectQty || 0), record.id),
  }));
  return normalized.map<DirectBusinessRecord>((record) => {
    if (record.businessType !== "maintenance_record") return { ...record, repairDetails: undefined };
    const legacyDetails = Array.isArray(record.repairDetails) ? record.repairDetails : [];
    const repairDetails: RepairDetail[] = legacyDetails.map((item, index) => {
      const source = normalized.find((candidate) => candidate.businessType === "production_inspection" && candidate.factoryOrganizationId === record.factoryOrganizationId && candidate.materialNo === record.materialNo && candidate.productName === record.productName && candidate.productModel === record.productModel && normalizedDefectDetails(candidate.defectDetails).some((defect) => defect.defect === String(item.defect || "").trim()));
      const sourceDefect = source ? normalizedDefectDetails(source.defectDetails).find((defect) => defect.defect === String(item.defect || "").trim()) : undefined;
      return {
        id: String(item.id || `${record.id}-repair-${index + 1}`),
        sourceProductionInspectionId: String(item.sourceProductionInspectionId || source?.id || ""),
        sourceProductionInspectionNo: String(item.sourceProductionInspectionNo || source?.businessNo || ""),
        sourceDefectItemId: String(item.sourceDefectItemId || sourceDefect?.id || ""),
        inspectionProcess: String(item.inspectionProcess || source?.inspectionProcess || ""),
        defect: String(item.defect || "").trim(),
        quantity: Number(item.quantity || 0),
        cause: String(item.cause || ""),
        method: String(item.method || ""),
        repairer: String(item.repairer || ""),
      };
    });
    return { ...record, repairDetails };
  });
}

function readDefectLibraryItems(): DefectLibraryItem[] {
  const seed = [{ id: "defect-library-seed-001", organizationId: factoryOrganizationId, productKey: `${"MAT-USB-C-021|USB-C连接器|UC24-PRO".toLocaleLowerCase()}`, materialNo: "MAT-USB-C-021", productName: "USB-C连接器", productModel: "UC24-PRO", defect: "端子压接高度超差", quantity: 12 }];
  try {
    const raw = window.localStorage.getItem(DEFECT_LIBRARY_STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as DefectLibraryItem[];
    return Array.isArray(parsed) ? parsed : seed;
  } catch { return seed; }
}

function getAvailableDefectLibraryItems(organizationId: string, product: Pick<DirectBusinessRecord, "materialNo" | "productName" | "productModel">): DefectLibraryItem[] {
  const key = directProductKey(product);
  return readDefectLibraryItems().filter((item) => item.organizationId === organizationId && item.productKey === key);
}

function getHistoricalRepairQuantity(records: DirectBusinessRecord[], sourceId: string, defectId: string): number {
  return records.filter((record) => record.businessType === "maintenance_record").flatMap((record) => record.repairDetails || []).filter((detail) => detail.sourceProductionInspectionId === sourceId && detail.sourceDefectItemId === defectId).reduce((total, detail) => total + Number(detail.quantity || 0), 0);
}

export function validateRepairDetails(details: RepairDetail[], records: DirectBusinessRecord[], organizationId: string): string | undefined {
  if (!details.length) return "请至少新增一项维修明细";
  const sourceRecords = records.filter((record) => record.businessType === "production_inspection");
  const groups = new Map<string, { source: DirectBusinessRecord; defect: DefectDetail; current: number }>();
  for (const detail of details) {
    const source = sourceRecords.find((record) => record.id === detail.sourceProductionInspectionId);
    if (!source || source.factoryOrganizationId !== organizationId) return "来源生产检验日报必须属于当前组织";
    const sourceDefect = normalizedDefectDetails(source.defectDetails).find((item) => item.id === detail.sourceDefectItemId && item.defect === detail.defect);
    if (!sourceDefect) return `不良项“${detail.defect || "未选择"}”必须来自来源日报`;
    if (detail.quantity <= 0 || !Number.isInteger(detail.quantity)) return `不良项“${detail.defect}”的维修数量必须为正整数`;
    if (!detail.cause.trim() || !detail.method.trim() || !detail.repairer.trim()) return `请完整填写不良项“${detail.defect}”的维修原因、方法和维修人`;
    const key = `${source.id}::${sourceDefect.id}`;
    const group = groups.get(key) || { source, defect: sourceDefect, current: 0 };
    group.current += detail.quantity;
    groups.set(key, group);
  }
  const selectedSources = details.map((detail) => sourceRecords.find((record) => record.id === detail.sourceProductionInspectionId)).filter((record): record is DirectBusinessRecord => Boolean(record));
  const firstProduct = selectedSources[0];
  if (firstProduct && selectedSources.some((source) => directProductKey(source) !== directProductKey(firstProduct))) return "同一张维修记录关联的来源日报必须是同一产品";
  for (const { source, defect, current } of groups.values()) {
    const historical = getHistoricalRepairQuantity(records, source.id, defect.id);
    if (historical + current > defect.quantity) return `不良项“${defect.defect}”超出可维修数量：来源${defect.quantity}，历史已维修${historical}，本次${current}，超出${historical + current - defect.quantity}`;
  }
  return undefined;
}

const seededProductionInspectionRecords = productionInspectionDemo.records as unknown as DirectBusinessRecord[];
const seededDirectBusinessRecords: DirectBusinessRecord[] = [
  ...seededProductionInspectionRecords,
  { id: "direct-mr-seed-001", version: 1, businessNo: "MR202608120002", businessType: "maintenance_record", status: "completed", factoryOrganizationId: factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-12", materialNo: "MAT-USB-C-021", productName: "USB-C连接器", productModel: "UC24-PRO", repairDetails: [{ id: "mr-seed-repair-001", sourceProductionInspectionId: "direct-pir-seed-001", sourceProductionInspectionNo: "PIR202608130001", sourceDefectItemId: "pir-seed-defect-001", inspectionProcess: "一检", defect: "端子压接高度超差", quantity: 12, cause: "治具磨损", method: "更换治具后返修", repairer: "陈工" }], attachmentName: "", remark: "维修完成后复检。", flowRecords: [{ id: "mr-seed-submitted", kind: "submitted", action: "提交维修记录并直接归档", time: "2026-08-12 16:20", operator: "陈工", organization: "华南智造 OEM 工厂" }], createdAt: "2026-08-12 16:20", updatedAt: "2026-08-12 16:20" },
  { id: "direct-ipqc-seed-001", version: 1, businessNo: "IPQC202608110003", businessType: "ipqc_patrol", status: "completed", factoryOrganizationId: factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-11", materialNo: "MAT-FPC-019", productName: "FPC连接排线", productModel: "FPC-19P-120", teamLine: "二车间 / SMT-02线", issueReporter: "陈工", issueDescription: "巡线发现防呆治具未按要求点检。", responsibleDepartment: "生产部", improvementMeasure: "补充点检标识并纳入班前确认。", issueLocation: "SMT-02线首站", qualityFollower: "赵敏", progress: "processing", attachmentName: "", remark: "已安排责任部门改善。", flowRecords: [{ id: "ipqc-seed-submitted", kind: "submitted", action: "提交IPQC巡线问题并直接归档", time: "2026-08-11 14:40", operator: "陈工", organization: "华南智造 OEM 工厂" }], createdAt: "2026-08-11 14:40", updatedAt: "2026-08-11 14:40" },
];

function readDirectBusinessRecords(): DirectBusinessRecord[] {
  try {
    const raw = window.localStorage.getItem(DIRECT_BUSINESS_STORAGE_KEY);
    if (!raw) return seededDirectBusinessRecords;
    const parsed = JSON.parse(raw) as StoredDirectBusinessRecord[];
    if (!Array.isArray(parsed) || !parsed.length) return seededDirectBusinessRecords;
    const normalized = normalizeDirectBusinessRecords(parsed);
    return [...normalized, ...seededDirectBusinessRecords.filter((seed) => !normalized.some((record) => record.id === seed.id))];
  } catch { return seededDirectBusinessRecords; }
}
export function reconcileLocalFirstInspection(scope: FirstInspectionScope) {
  return buildFirstInspectionCandidate(readDirectBusinessRecords(), scope);
}
function saveDirectBusinessRecord(record: DirectBusinessRecord): DirectBusinessRecord {
  const records = readDirectBusinessRecords(); const index = records.findIndex((item) => item.id === record.id); const saved = index < 0 ? { ...record, version: 1 } : { ...record, version: records[index].version + 1 }; if (index < 0) records.unshift(saved); else records[index] = saved; window.localStorage.setItem(DIRECT_BUSINESS_STORAGE_KEY, JSON.stringify(records)); auditSavedRecord(saved, directBusinessLabels[saved.businessType]); return saved;
}
function saveProductionInspectionWithDefectLibrary(record: DirectBusinessRecord, newLibraryItems: DefectLibraryItem[]): DirectBusinessRecord {
  const previousRecords = window.localStorage.getItem(DIRECT_BUSINESS_STORAGE_KEY);
  const previousLibrary = window.localStorage.getItem(DEFECT_LIBRARY_STORAGE_KEY);
  try {
    const saved = saveDirectBusinessRecord(record);
    if (newLibraryItems.length) {
      const items = readDefectLibraryItems();
      window.localStorage.setItem(DEFECT_LIBRARY_STORAGE_KEY, JSON.stringify([...items, ...newLibraryItems]));
    }
    return saved;
  } catch (error) {
    if (previousRecords === null) window.localStorage.removeItem(DIRECT_BUSINESS_STORAGE_KEY); else window.localStorage.setItem(DIRECT_BUSINESS_STORAGE_KEY, previousRecords);
    if (previousLibrary === null) window.localStorage.removeItem(DEFECT_LIBRARY_STORAGE_KEY); else window.localStorage.setItem(DEFECT_LIBRARY_STORAGE_KEY, previousLibrary);
    throw error;
  }
}
function saveProductionInspectionBatch(rows: BatchProductionInspectionRow[], organizationId: string, organizationName: string, userName: string): DirectBusinessRecord[] {
  const errors = validateBatchProductionRows(rows); if (errors.length) throw new Error(errors[0]);
  const previousRecords = window.localStorage.getItem(DIRECT_BUSINESS_STORAGE_KEY); const previousLibrary = window.localStorage.getItem(DEFECT_LIBRARY_STORAGE_KEY); const records = readDirectBusinessRecords(); const library = readDefectLibraryItems(); const now = "2026-08-24 17:00";
  const created = rows.map((row, rowIndex): DirectBusinessRecord => {
    const product = { materialNo: row.materialNo.trim(), productName: row.productName.trim(), productModel: row.productModel.trim() }; const matchingLibrary = library.filter((item) => item.organizationId === organizationId && item.productKey === directProductKey(product));
    const defects = row.defectDetails.map((item, defectIndex) => { const existing = matchingLibrary.find((libraryItem) => libraryItem.defect.toLocaleLowerCase() === item.defect.trim().toLocaleLowerCase()); return { ...item, id: `batch-defect-${Date.now()}-${rowIndex}-${defectIndex}`, libraryItemId: existing?.id ?? `batch-library-${Date.now()}-${rowIndex}-${defectIndex}`, defect: item.defect.trim(), quantity: Number(item.quantity) }; });
    return { id: `direct-production_inspection-batch-${Date.now()}-${rowIndex}`, version: 1, businessNo: `${directBusinessPrefixes.production_inspection}20260813${String(records.filter((item) => item.businessType === "production_inspection").length + rowIndex + 1).padStart(4, "0")}`, businessType: "production_inspection", status: "completed", factoryOrganizationId: organizationId, factoryOrganization: organizationName, businessDate: row.businessDate, materialNo: product.materialNo, productName: product.productName, productModel: product.productModel, orderNo: row.orderNo.trim(), orderQty: Number(row.orderQty), inputQty: Number(row.inputQty), inspectionQty: Number(row.inspectionQty), defectQty: batchDefectQty(row), inspectionProcess: row.inspectionProcess.trim(), defectDetails: defects, attachmentName: row.attachmentName, attachmentDataUrl: row.attachmentDataUrl, remark: row.remark.trim(), flowRecords: [{ id: `batch-flow-${Date.now()}-${rowIndex}`, kind: "submitted", action: "批量提交生产检验日报并直接归档", time: now, operator: userName, organization: organizationName, detail: `批次共${rows.length}条` }], createdAt: now, updatedAt: now };
  });
  const newLibraryItems = created.flatMap((record) => (record.defectDetails ?? []).filter((detail) => !library.some((item) => item.id === detail.libraryItemId)).map((detail) => ({ id: detail.libraryItemId!, organizationId, productKey: directProductKey(record), materialNo: record.materialNo, productName: record.productName, productModel: record.productModel, defect: detail.defect, quantity: detail.quantity })));
  try { window.localStorage.setItem(DIRECT_BUSINESS_STORAGE_KEY, JSON.stringify([...created, ...records])); if (newLibraryItems.length) window.localStorage.setItem(DEFECT_LIBRARY_STORAGE_KEY, JSON.stringify([...library, ...newLibraryItems])); created.forEach((record) => auditSavedRecord(record, directBusinessLabels.production_inspection)); return created; } catch (error) { if (previousRecords === null) window.localStorage.removeItem(DIRECT_BUSINESS_STORAGE_KEY); else window.localStorage.setItem(DIRECT_BUSINESS_STORAGE_KEY, previousRecords); if (previousLibrary === null) window.localStorage.removeItem(DEFECT_LIBRARY_STORAGE_KEY); else window.localStorage.setItem(DEFECT_LIBRARY_STORAGE_KEY, previousLibrary); throw error; }
}
function getDirectBusinessRecord(id: string): DirectBusinessRecord | undefined { return readDirectBusinessRecords().find((item) => item.id === id); }
function createDirectBusinessNo(type: DirectBusinessType, records: DirectBusinessRecord[]): string { return `${directBusinessPrefixes[type]}20260813${String(records.filter((item) => item.businessType === type).length + 1).padStart(4, "0")}`; }
function directBusinessPath(role: "factory" | "platform", type: DirectBusinessType): string { const base = role === "platform" ? "/app/platform/business" : "/app/factory"; return `${base}/${type === "production_inspection" ? "production-inspection-daily" : type === "maintenance_record" ? "maintenance-record" : "ipqc-patrol"}`; }

const auditedBusinessLabels: Record<AuditedBusinessType, string> = { sporadic_return: "零星退料记录", inbound_report: "入库报告", trial_summary: "试产及生产总结" };
const auditedBusinessPermissionResources: Record<AuditedBusinessType, string> = { sporadic_return: "sporadic_return", inbound_report: "inbound_report", trial_summary: "trial_production_summary" };
const auditedBusinessPrefixes: Record<AuditedBusinessType, string> = { sporadic_return: "RMR", inbound_report: "IR", trial_summary: "TPS" };
const auditedBusinessPath = (role: "factory" | "platform", type: AuditedBusinessType): string => `${role === "platform" ? "/app/platform/business" : "/app/factory"}/${type === "sporadic_return" ? "sporadic-return" : type === "inbound_report" ? "warehouse-in-report" : "trial-production-summary"}`;
const seededAuditedBusinessRecords: AuditedBusinessRecord[] = [
  { id: "audited-return-seed-001", version: 1, businessNo: "RMR202608120001", businessType: "sporadic_return", status: "pending_return", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-12", materialNo: "MAT-USB-C-021", materialName: "USB-C连接器", materialModel: "UC24-PRO", productName: "USB-C连接器总成", productModel: "UC24-PRO", orderNo: "PO202608088", orderQty: 5000, assemblyQty: 3000, inboundQty: 0, returnReason: "多余物料退回", returnQty: 120, qualifiedType: "qualified", trialInfo: "", attachmentName: "", remark: "等待填写退料物流信息。", flowRecords: [{ id: "return-seed-submitted", kind: "submitted", action: "工厂提交零星退料记录", time: "2026-08-12 10:20", operator: "陈工", organization: "华南智造 OEM 工厂" }, { id: "return-seed-approved", kind: "review_approved", action: "平台审核通过，进入待退回", time: "2026-08-12 11:10", operator: "演示管理员", organization: "示例质量运营中心" }], createdAt: "2026-08-12 10:20", updatedAt: "2026-08-12 11:10" },
  { id: "audited-inbound-seed-001", version: 1, businessNo: "IR202608130002", businessType: "inbound_report", status: "pending_review", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-13", materialNo: "MAT-FPC-019", materialName: "FPC连接排线", materialModel: "FPC-19P-120", productName: "FPC连接排线", productModel: "FPC-19P-120", orderNo: "PO202608099", orderQty: 1000, assemblyQty: 0, inboundQty: 980, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "", attachmentName: "入库检验报告.pdf", remark: "请平台审核入库质量。", flowRecords: [{ id: "inbound-seed-submitted", kind: "submitted", action: "工厂提交入库报告", time: "2026-08-13 09:30", operator: "陈工", organization: "华南智造 OEM 工厂" }], createdAt: "2026-08-13 09:30", updatedAt: "2026-08-13 09:30" },
  { id: "audited-trial-seed-001", version: 1, businessNo: "TPS202608110003", businessType: "trial_summary", status: "rejected", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-11", materialNo: "MAT-TRIAL-001", materialName: "试产物料", materialModel: "TRIAL-01", productName: "试产样机", productModel: "P-01", orderNo: "PO202608077", orderQty: 200, assemblyQty: 200, inboundQty: 0, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "首轮试产总结及问题清单", attachmentName: "", remark: "", reviewReason: "请补充试产问题闭环说明。", flowRecords: [{ id: "trial-seed-submitted", kind: "submitted", action: "工厂提交试产及生产总结", time: "2026-08-11 15:00", operator: "陈工", organization: "华南智造 OEM 工厂" }, { id: "trial-seed-rejected", kind: "review_rejected", action: "平台审核驳回", time: "2026-08-11 16:00", operator: "演示管理员", organization: "示例质量运营中心", detail: "请补充试产问题闭环说明。" }], createdAt: "2026-08-11 15:00", updatedAt: "2026-08-11 16:00" },
  { id: "audited-inbound-approved-002", version: 1, businessNo: "IR202608090004", businessType: "inbound_report", status: "approved", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-09", materialNo: "MAT-USB-C-021", materialName: "", materialModel: "UC24-PRO", productName: "USB-C连接器", productModel: "UC24-PRO", orderNo: "PO202608088", orderQty: 5000, assemblyQty: 0, inboundQty: 3000, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "", attachmentName: "入库检验报告_IR202608090004.pdf", remark: "审核通过入库。", flowRecords: [{ id: "inbound-approved-submitted", kind: "submitted", action: "工厂提交入库报告", time: "2026-08-09 10:00", operator: "陈工", organization: "华南智造 OEM 工厂" }, { id: "inbound-approved-review", kind: "review_approved", action: "平台审核通过", time: "2026-08-09 11:30", operator: "演示管理员", organization: "示例质量运营中心" }], createdAt: "2026-08-09 10:00", updatedAt: "2026-08-09 11:30" },
  { id: "audited-inbound-seed-003", version: 1, businessNo: "IR202608130005", businessType: "inbound_report", status: "approved", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-13", materialNo: "MAT-FPC-019", materialName: "FPC连接排线", materialModel: "FPC-19P-120", productName: "FPC连接排线", productModel: "FPC-19P-120", orderNo: "PO202608089", orderQty: 1000, assemblyQty: 0, inboundQty: 1000, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "", attachmentName: "入库检验报告_IR202608130005.pdf", remark: "批次已完成入库。", flowRecords: [{ id: "inbound-seed-submitted-003", kind: "submitted", action: "工厂提交入库报告", time: "2026-08-13 13:00", operator: "陈工", organization: "华南智造 OEM 工厂" }, { id: "inbound-seed-review-003", kind: "review_approved", action: "平台审核通过", time: "2026-08-13 14:00", operator: "演示管理员", organization: "示例质量运营中心" }], createdAt: "2026-08-13 13:00", updatedAt: "2026-08-13 14:00" },
  { id: "audited-inbound-seed-004", version: 1, businessNo: "IR202608130006", businessType: "inbound_report", status: "approved", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-13", materialNo: "MAT-CAM-032", materialName: "摄像头模组", materialModel: "CAM-01", productName: "摄像头模组", productModel: "CAM-01", orderNo: "PO202608090", orderQty: 800, assemblyQty: 0, inboundQty: 800, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "", attachmentName: "入库检验报告_IR202608130006.pdf", remark: "批次已完成入库。", flowRecords: [{ id: "inbound-seed-submitted-004", kind: "submitted", action: "工厂提交入库报告", time: "2026-08-13 13:10", operator: "陈工", organization: "华南智造 OEM 工厂" }, { id: "inbound-seed-review-004", kind: "review_approved", action: "平台审核通过", time: "2026-08-13 14:10", operator: "演示管理员", organization: "示例质量运营中心" }], createdAt: "2026-08-13 13:10", updatedAt: "2026-08-13 14:10" },
  { id: "audited-inbound-seed-005", version: 1, businessNo: "IR202608130007", businessType: "inbound_report", status: "approved", factoryOrganizationId, factoryOrganization: "华南智造 OEM 工厂", businessDate: "2026-08-13", materialNo: "MAT-RELAY-011", materialName: "继电器组件", materialModel: "RELAY-01", productName: "继电器组件", productModel: "RELAY-01", orderNo: "PO202608091", orderQty: 1200, assemblyQty: 0, inboundQty: 400, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "", attachmentName: "入库检验报告_IR202608130007.pdf", remark: "部分批次已入库。", flowRecords: [{ id: "inbound-seed-submitted-005", kind: "submitted", action: "工厂提交入库报告", time: "2026-08-13 13:20", operator: "陈工", organization: "华南智造 OEM 工厂" }, { id: "inbound-seed-review-005", kind: "review_approved", action: "平台审核通过", time: "2026-08-13 14:20", operator: "演示管理员", organization: "示例质量运营中心" }], createdAt: "2026-08-13 13:20", updatedAt: "2026-08-13 14:20" },
];

function readAuditedBusinessRecords(): AuditedBusinessRecord[] {
  try {
    const raw = window.localStorage.getItem(AUDITED_BUSINESS_STORAGE_KEY);
    if (!raw) return seededAuditedBusinessRecords;
    const parsed = JSON.parse(raw) as AuditedBusinessRecord[];
    if (!Array.isArray(parsed) || !parsed.length) return seededAuditedBusinessRecords;
    return [...parsed, ...seededAuditedBusinessRecords.filter((seed) => !parsed.some((record) => record.id === seed.id))];
  } catch { return seededAuditedBusinessRecords; }
}
function saveAuditedBusinessRecord(record: AuditedBusinessRecord, expectedVersion?: number): AuditedBusinessRecord { const records = readAuditedBusinessRecords(); const index = records.findIndex((item) => item.id === record.id); const saved = index < 0 ? { ...record, version: 1 } : { ...record, version: records[index].version + 1 }; if (index >= 0 && expectedVersion !== undefined && records[index].version !== expectedVersion) throw new Error("记录已被其他页面更新，请刷新后重试"); if (index < 0) records.unshift(saved); else records[index] = saved; window.localStorage.setItem(AUDITED_BUSINESS_STORAGE_KEY, JSON.stringify(records)); auditSavedRecord(saved, auditedBusinessLabels[saved.businessType]); return saved; }
function getAuditedBusinessRecord(id: string): AuditedBusinessRecord | undefined { return readAuditedBusinessRecords().find((item) => item.id === id); }
function createAuditedBusinessNo(type: AuditedBusinessType): string { const records = readAuditedBusinessRecords(); return `${auditedBusinessPrefixes[type]}20260813${String(records.filter((item) => item.businessType === type).length + 1).padStart(4, "0")}`; }

export type ProductDataRecord = { id: string; organizationId: string; materialNo: string; materialType: "product"; productName: string; productModel: string; materialQty: number; status: "enabled" | "disabled"; createdAt: string; updatedAt: string };
const seededProductData: ProductDataRecord[] = [{ id: "product-data-seed-001", organizationId: factoryOrganizationId, materialNo: "MAT-USB-C-021", materialType: "product", productName: "USB-C连接器", productModel: "UC24-PRO", materialQty: 2, status: "enabled", createdAt: "2026-08-08", updatedAt: "2026-08-08" }];
export function readProductData(): ProductDataRecord[] { try { const raw = window.localStorage.getItem(PRODUCT_DATA_STORAGE_KEY); const parsed = raw ? JSON.parse(raw) as ProductDataRecord[] : []; return Array.isArray(parsed) && parsed.length ? parsed : seededProductData; } catch { return seededProductData; } }
function saveProductData(records: ProductDataRecord[]): void { window.localStorage.setItem(PRODUCT_DATA_STORAGE_KEY, JSON.stringify(records)); }

type MetricSnapshot = { numerator: number; denominator: number; rate: number | null };
function metricRate(numerator: number, denominator: number): MetricSnapshot { return { numerator, denominator, rate: denominator > 0 ? Math.min(100, Math.max(0, (numerator / denominator) * 100)) : null }; }
function sameOrganization(record: { factoryOrganizationId?: string }, organizationId?: string): boolean { return !organizationId || organizationId === "all" || record.factoryOrganizationId === organizationId; }
function dateInPeriod(value: string, dimension: "year" | "month" | "day", period: string): boolean { if (!period) return true; if (dimension === "year") return value.slice(0, 4) === period.slice(0, 4); if (dimension === "month") return value.slice(0, 7) === period.slice(0, 7); return value === period; }

export type OrderCompletionRow = { key: string; orderNo: string; productName: string; productModel: string; organization: string; organizationId: string; businessDate: string; businessNo: string; orderQty: number; inboundQty: number; inboundCount: number; completionRate: number; status: "已完成" | "进行中" };
export function calculateOrderCompletion(productionRecords = readDirectBusinessRecords(), auditedRecords = readAuditedBusinessRecords(), filters?: MetricFilters): OrderCompletionRow[] {
  const groups = new Map<string, OrderCompletionRow>();
  productionRecords.filter((record) => record.businessType === "production_inspection" && metricEntityMatches(record, filters) && metricDateMatches(record.businessDate, filters)).forEach((record) => {
    const key = `${record.orderNo ?? ""}::${record.productName}::${record.productModel}`; const current = groups.get(key);
    if (current) { current.orderQty = Math.max(current.orderQty, Number(record.orderQty || 0)); if (record.businessDate > current.businessDate) { current.businessDate = record.businessDate; current.businessNo = record.businessNo; } }
    else groups.set(key, { key, orderNo: record.orderNo ?? "", productName: record.productName, productModel: record.productModel, organization: record.factoryOrganization, organizationId: record.factoryOrganizationId, businessDate: record.businessDate, businessNo: record.businessNo, orderQty: Number(record.orderQty || 0), inboundQty: 0, inboundCount: 0, completionRate: 0, status: "进行中" });
  });
  auditedRecords.filter((record) => record.businessType === "inbound_report" && ["approved", "completed"].includes(record.status) && metricEntityMatches(record, filters) && metricDateMatches(record.businessDate, filters)).forEach((record) => { const group = groups.get(`${record.orderNo}::${record.productName}::${record.productModel}`); if (group) { group.inboundQty += Number(record.inboundQty || 0); group.inboundCount += 1; } });
  groups.forEach((row) => { row.completionRate = row.orderQty > 0 ? Math.min(100, Number(((row.inboundQty / row.orderQty) * 100).toFixed(2))) : 0; row.status = row.completionRate >= 100 ? "已完成" : "进行中"; });
  return [...groups.values()].sort((left, right) => right.businessDate.localeCompare(left.businessDate));
}
export function calculateInspectionYield(records = readDirectBusinessRecords(), process: "一检" | "二检", filters?: MetricFilters): MetricSnapshot { const rows = records.filter((record) => record.businessType === "production_inspection" && record.inspectionProcess === process && metricEntityMatches(record, filters) && metricDateMatches(record.businessDate, filters)); return aggregateInspectionQuantities(rows); }
export function calculateInboundPassRate(records = readAuditedBusinessRecords(), filters?: MetricFilters): MetricSnapshot { const rows = records.filter((record) => record.businessType === "inbound_report" && ["approved", "rejected", "completed"].includes(record.status) && metricEntityMatches(record, filters) && metricDateMatches(record.businessDate, filters)); return metricRate(rows.filter((record) => ["approved", "completed"].includes(record.status) && record.qualifiedType === "qualified").length, rows.length); }
export function calculateIncomingPassRate(records = readIncomingInspections(), supplyMethod: IncomingInspection["supplyMethod"], filters?: MetricFilters): MetricSnapshot { const rows = records.filter((record) => record.supplyMethod === supplyMethod && (!filters?.supplier || record.supplierName === filters.supplier) && ["completed", "rejected"].includes(record.status) && metricEntityMatches(record, filters) && metricDateMatches(record.inspectionDate, filters)); return metricRate(rows.filter((record) => record.status === "completed" && record.inspectionResult === "qualified").length, rows.length); }
export type CustomerMaterialYieldRow = { key: string; materialNo: string; productName: string; productModel: string; organization: string; organizationId: string; businessNo: string; businessDate: string; inboundQty: number; materialQty: number; totalQty: number; returnQty: number; rate: number | null; matched: boolean };
export function calculateCustomerMaterialYield(auditedRecords = readAuditedBusinessRecords(), productRecords = readProductData(), filters?: MetricFilters): CustomerMaterialYieldRow[] { const products = productRecords.filter((item) => item.status === "enabled"); const rows = auditedRecords.filter((record) => record.businessType === "inbound_report" && ["approved", "completed"].includes(record.status) && metricEntityMatches(record, filters) && metricDateMatches(record.businessDate, filters)); return rows.map((record) => { const product = products.find((item) => item.organizationId === record.factoryOrganizationId && item.materialNo === record.materialNo && item.productName === record.productName && item.productModel === record.productModel); const key = `${record.materialNo}::${record.productName}::${record.productModel}`; const returnQty = auditedRecords.filter((item) => item.businessType === "sporadic_return" && item.status !== "cancelled" && item.materialNo === record.materialNo && metricEntityMatches(item, filters) && metricDateMatches(item.businessDate, filters)).reduce((sum, item) => sum + Number(item.returnQty || 0), 0); const totalQty = product ? Number(record.inboundQty || 0) * product.materialQty : 0; return { key, materialNo: record.materialNo, productName: record.productName, productModel: record.productModel, organization: record.factoryOrganization, organizationId: record.factoryOrganizationId, businessNo: record.businessNo, businessDate: record.businessDate, inboundQty: Number(record.inboundQty || 0), materialQty: product?.materialQty ?? 0, totalQty, returnQty, rate: product ? metricRate(Math.max(0, totalQty - returnQty), totalQty).rate : null, matched: Boolean(product) }; }); }
type MetricFilters = { organizationId?: string; materialNo?: string; supplier?: string; dimension?: "year" | "month" | "day"; period?: string; range?: Period };

function metricEntityMatches(record: { factoryOrganizationId?: string; materialNo?: string }, filters?: MetricFilters): boolean {
  return sameOrganization(record, filters?.organizationId) && (!filters?.materialNo || record.materialNo === filters.materialNo);
}

function metricDateMatches(date: string, filters?: MetricFilters): boolean {
  if (filters?.range) return date.slice(0, 10) >= filters.range.start && date.slice(0, 10) <= filters.range.end;
  return dateInPeriod(date, filters?.dimension ?? "year", filters?.period ?? "2026");
}

function metricRangeFromSearch(params: URLSearchParams): Period | undefined {
  const start = params.get("from");
  const end = params.get("to");
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  return start && end && isoDate.test(start) && isoDate.test(end) && start <= end ? { start, end } : undefined;
}

function simulatedMetricSnapshot(metricId: string, filters: MetricFilters): MetricSnapshot {
  if ((filters.period ?? "").slice(0, 4) !== "2026") return { numerator: 0, denominator: 0, rate: null };
  if (filters.organizationId && filters.organizationId !== "all" && filters.organizationId !== factoryOrganizationId) return { numerator: 0, denominator: 0, rate: null };
  const dimension = filters.dimension ?? "year";
  const period = filters.period ?? "2026";
  const key = `${metricId}:${dimension}:${period}:${filters.organizationId ?? "all"}`;
  const hash = [...key].reduce((value, character) => (value * 31 + character.charCodeAt(0)) % 997, 17);
  const baselines: Record<string, number> = { order_completion: 62, inspection_first: 93, inspection_second: 96, inbound_pass: 91, digital_incoming: 95, factory_incoming: 89, customer_material: 97 };
  const baseline = baselines[metricId] ?? 90;
  const rate = Math.min(99.5, Math.max(55, baseline + (hash % 17) - 8));
  const denominator = dimension === "year" ? 80 + (hash % 45) : dimension === "month" ? 18 + (hash % 24) : 6 + (hash % 12);
  return metricRate(Math.round((denominator * rate) / 100), denominator);
}

function calculateMetric(
  metricId: string, filters: MetricFilters,
  data?: { direct: DirectBusinessRecord[]; audited: AuditedBusinessRecord[]; incoming: IncomingInspection[]; products: ProductDataRecord[] },
): MetricSnapshot {
  switch (metricId) {
    case "order_completion": {
      const rows = calculateOrderCompletion(data?.direct, data?.audited, filters);
      return metricRate(rows.filter((row) => row.status === "已完成").length, rows.length);
    }
    case "inspection_first": return calculateInspectionYield(data?.direct, "一检", filters);
    case "inspection_second": return calculateInspectionYield(data?.direct, "二检", filters);
    case "inbound_pass": return calculateInboundPassRate(data?.audited, filters);
    case "digital_incoming": return calculateIncomingPassRate(data?.incoming, "platform_purchase", filters);
    case "factory_incoming": return calculateIncomingPassRate(data?.incoming, "factory_purchase", filters);
    default: {
      const rows = calculateCustomerMaterialYield(data?.audited, data?.products, filters).filter((row) => row.matched);
      const total = rows.reduce((sum, row) => sum + row.totalQty, 0);
      const returned = rows.reduce((sum, row) => sum + row.returnQty, 0);
      return metricRate(Math.max(0, total - returned), total);
    }
  }
}

function metricSnapshotFor(metricId: string, filters: MetricFilters): MetricSnapshot {
  const snapshot = calculateMetric(metricId, filters);
  return snapshot.denominator > 0 ? snapshot : simulatedMetricSnapshot(metricId, filters);
}

function shiftDemoDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysInDemoMonth(period: string): number {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate() || 31;
}

function recentDemoDates(): string[] { return Array.from({ length: 100 }, (_, index) => shiftDemoDate("2026-08-24", -index)); }

const afterSalesSeed: AfterSalesException = { id: "after-sales-seed-001", version: 1, businessNo: "SA202608130001", status: "pending_supplier", reporterOrganization: "示例质量运营中心", supplierOrganizationId: supplierOrganizationId, supplierName: "远航精密供应商", materialNo: "MAT-USB-C-021", materialName: "USB-C连接器", model: "UC24-PRO", businessDate: "2026-08-13", inputQty: 1000, defectQty: 18, description: "客户反馈连接器接触不良，需要供应商完成原因分析。", returnQty: 18, attachmentName: "售后异常照片.zip", remark: "请在时限内提交8D报告。", flowRecords: [{ id: "after-sales-seed-submitted", kind: "submitted", action: "平台提报并分配供应商", time: "2026-08-13 10:00", operator: "演示管理员", organization: "示例质量运营中心" }], createdAt: "2026-08-13 10:00", updatedAt: "2026-08-13 10:00" };
const seededSupplierAfterSalesTask: AfterSalesException = { ...afterSalesSeed, id: "supplier-todo-sa-20260808007", businessNo: "SA20260808007", status: "rejected_8d", description: "显示模组闪屏，平台驳回8D报告后待供应商改善回复。", materialNo: "MAT-DISPLAY-007", materialName: "显示模组", businessDate: "2026-08-08", remark: "请补充原因分析和改善措施。", reviewReason: "请补充原因分析和改善措施。", createdAt: "2026-08-08 09:00", updatedAt: "2026-08-10 09:10", flowRecords: [{ id: "supplier-todo-sa-submitted", kind: "submitted", action: "平台提报并分配供应商", time: "2026-08-08 09:00", operator: "演示管理员", organization: "示例质量运营中心" }, { id: "supplier-todo-sa-rejected", kind: "review_rejected", action: "平台驳回8D报告", time: "2026-08-10 09:10", operator: "演示管理员", organization: "示例质量运营中心", detail: "请补充原因分析和改善措施。" }] };
function readAfterSalesExceptions(): AfterSalesException[] { try { const raw = window.localStorage.getItem(AFTER_SALES_STORAGE_KEY); if (!raw) return [afterSalesSeed, seededSupplierAfterSalesTask]; const parsed = JSON.parse(raw) as AfterSalesException[]; return Array.isArray(parsed) && parsed.length ? [...parsed, ...[afterSalesSeed, seededSupplierAfterSalesTask].filter((seed) => !parsed.some((record) => record.id === seed.id))] : [afterSalesSeed, seededSupplierAfterSalesTask]; } catch { return [afterSalesSeed, seededSupplierAfterSalesTask]; } }
function stripAfterSalesAttachmentPayload(record: AfterSalesException, options: { attachment?: boolean; eightD?: boolean }): AfterSalesException {
  return {
    ...record,
    ...(options.attachment ? { attachmentDataUrl: undefined } : {}),
    ...(options.eightD ? { eightDAttachmentDataUrl: undefined } : {}),
  };
}

export function writeAfterSalesExceptionsWithQuota(records: AfterSalesException[], currentId: string): void {
  const write = (value: AfterSalesException[]): void => window.localStorage.setItem(AFTER_SALES_STORAGE_KEY, JSON.stringify(value));
  try {
    write(records);
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }

  compactRelatedAttachmentStorage();
  const currentIndex = records.findIndex((item) => item.id === currentId);
  const olderAttachmentsRemoved = records.map((item, index) => index === currentIndex ? item : stripAfterSalesAttachmentPayload(item, { attachment: true, eightD: true }));
  try {
    const previous = window.localStorage.getItem(AFTER_SALES_STORAGE_KEY);
    window.localStorage.removeItem(AFTER_SALES_STORAGE_KEY);
    try { write(olderAttachmentsRemoved); } catch (error) { if (previous) { try { window.localStorage.setItem(AFTER_SALES_STORAGE_KEY, previous); } catch { /* best effort restore */ } } throw error; }
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }

  const currentAttachmentRemoved = olderAttachmentsRemoved.map((item, index) => index === currentIndex ? stripAfterSalesAttachmentPayload(item, { attachment: true }) : item);
  try {
    write(currentAttachmentRemoved);
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }

  const allPayloadsRemoved = currentAttachmentRemoved.map((item, index) => index === currentIndex ? stripAfterSalesAttachmentPayload(item, { eightD: true }) : item);
  write(allPayloadsRemoved);
}

function saveAfterSalesException(record: AfterSalesException, expectedVersion?: number): AfterSalesException { const records = readAfterSalesExceptions(); const index = records.findIndex((item) => item.id === record.id); if (index >= 0 && expectedVersion !== undefined && records[index].version !== expectedVersion) throw new Error("记录已被其他页面更新，请刷新后重试"); const saved = index < 0 ? { ...record, version: 1 } : { ...record, version: records[index].version + 1 }; if (index < 0) records.unshift(saved); else records[index] = saved; writeAfterSalesExceptionsWithQuota(records, record.id); auditSavedRecord(saved, "售后异常"); return saved; }
function getAfterSalesException(id: string): AfterSalesException | undefined { return readAfterSalesExceptions().find((item) => item.id === id); }

const seededMaterialException: MaterialException = {
  id: "material-exception-seed-001",
  version: 1,
  businessNo: "ME202608121030001",
  status: "pending_review",
  reporterOrganizationId: factoryOrganizationId,
  reporterOrganization: "华南智造 OEM 工厂",
  supplierName: "远航精密供应商",
  materialNo: "MAT-USB-C-021",
  materialName: "USB-C连接器",
  model: "UC24-PRO",
  businessDate: "2026-08-12",
  inputQty: 3000,
  inspectionQty: 500,
  defectQty: 18,
  description: "抽检发现连接器端子压接高度超差。",
  attachmentName: "物料异常现场照片.zip",
  remark: "请供应商完成原因分析并提交8D报告。",
  flowRecords: [{ id: "material-seed-submitted", kind: "submitted", action: "工厂提报物料异常", time: "2026-08-12 10:30", operator: "陈工", organization: "华南智造 OEM 工厂" }],
  createdAt: "2026-08-12 10:30",
  updatedAt: "2026-08-12 10:30",
};

const seededSupplierMaterialTask: MaterialException = { ...seededMaterialException, id: "supplier-todo-me-20260810001", businessNo: "ME20260810001", status: "waiting_supplier", supplierOrganizationId: supplierOrganizationId, supplierName: "远航精密供应商", description: "连接器端子压接不良", businessDate: "2026-08-10", remark: "请供应商提交8D报告。", reviewReason: undefined, createdAt: "2026-08-10 09:00", updatedAt: "2026-08-12 10:32", flowRecords: [{ id: "supplier-todo-me-submitted", kind: "submitted", action: "平台审核通过并分配供应商", time: "2026-08-10 09:00", operator: "演示管理员", organization: "示例质量运营中心", detail: "远航精密供应商" }] };

function readMaterialExceptions(): MaterialException[] {
  try {
    const raw = window.localStorage.getItem(MATERIAL_EXCEPTION_STORAGE_KEY);
    if (!raw) return [seededMaterialException, seededSupplierMaterialTask];
    const parsed = JSON.parse(raw) as MaterialException[];
    return Array.isArray(parsed) && parsed.length ? [...parsed.map((record) => ({ ...record, version: Number.isInteger(record.version) && record.version > 0 ? record.version : 1 })), ...[seededMaterialException, seededSupplierMaterialTask].filter((seed) => !parsed.some((record) => record.id === seed.id))] : [seededMaterialException, seededSupplierMaterialTask];
  } catch {
    return [seededMaterialException, seededSupplierMaterialTask];
  }
}

function isStorageQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22) || error instanceof Error && /quota|storage/i.test(error.message);
}

function stripMaterialAttachmentPayload(record: MaterialException, options: { attachment?: boolean; eightD?: boolean }): MaterialException {
  return {
    ...record,
    ...(options.attachment ? { attachmentDataUrl: undefined } : {}),
    ...(options.eightD ? { eightDAttachmentDataUrl: undefined } : {}),
  };
}

function compactRelatedAttachmentStorage(): void {
  // localStorage is intentionally only a demo adapter. When it approaches the browser quota,
  // keep filenames and workflow records while dropping binary payloads from older records.
  const compact = (key: string, parser: (value: unknown) => unknown): void => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const compacted = JSON.stringify(parser(JSON.parse(raw)));
        window.localStorage.removeItem(key);
        try { window.localStorage.setItem(key, compacted); } catch (error) { try { window.localStorage.setItem(key, raw); } catch { /* best effort restore */ } throw error; }
      }
    } catch {
      // The target write below will surface a user-facing error if the browser is still full.
    }
  };
  compact(SHIPMENT_REPORT_STORAGE_KEY, (value) => Array.isArray(value) ? value.map((item) => ({ ...item, attachmentDataUrl: undefined })) : value);
  compact(INCOMING_INSPECTION_STORAGE_KEY, (value) => Array.isArray(value) ? value.map((item) => ({ ...item, attachmentDataUrl: undefined })) : value);
}

export function writeMaterialExceptionsWithQuota(records: MaterialException[], currentId: string): void {
  const write = (value: MaterialException[]): void => window.localStorage.setItem(MATERIAL_EXCEPTION_STORAGE_KEY, JSON.stringify(value));
  try {
    write(records);
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }

  compactRelatedAttachmentStorage();
  const currentIndex = records.findIndex((item) => item.id === currentId);
  const olderAttachmentsRemoved = records.map((item, index) => index === currentIndex ? item : stripMaterialAttachmentPayload(item, { attachment: true, eightD: true }));
  try {
    const previous = window.localStorage.getItem(MATERIAL_EXCEPTION_STORAGE_KEY);
    window.localStorage.removeItem(MATERIAL_EXCEPTION_STORAGE_KEY);
    try { write(olderAttachmentsRemoved); } catch (error) { if (previous) { try { window.localStorage.setItem(MATERIAL_EXCEPTION_STORAGE_KEY, previous); } catch { /* best effort restore */ } } throw error; }
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }

  // Preserve the current 8D upload whenever possible. If the browser is already full,
  // keep the filename and workflow state so the business action still succeeds.
  const currentAttachmentRemoved = olderAttachmentsRemoved.map((item, index) => index === currentIndex ? stripMaterialAttachmentPayload(item, { attachment: true }) : item);
  try {
    write(currentAttachmentRemoved);
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw error;
  }

  const allPayloadsRemoved = currentAttachmentRemoved.map((item, index) => index === currentIndex ? stripMaterialAttachmentPayload(item, { eightD: true }) : item);
  write(allPayloadsRemoved);
}

function saveMaterialException(record: MaterialException, expectedVersion?: number): MaterialException {
  const records = readMaterialExceptions();
  const index = records.findIndex((item) => item.id === record.id);
  let saved: MaterialException;
  if (index === -1) {
    saved = { ...record, version: 1 };
    records.unshift(saved);
  } else {
    const current = records[index];
    assertExpectedVersion(current.version, expectedVersion ?? record.version);
    assertMaterialTransition(current.status, record.status);
    saved = { ...record, version: current.version + 1 };
    records[index] = saved;
  }
  writeMaterialExceptionsWithQuota(records, record.id);
  auditSavedRecord(saved, "物料异常");
  return saved;
}

function getMaterialException(id: string): MaterialException | undefined {
  return readMaterialExceptions().find((record) => record.id === id);
}

function materialStatusLabel(status: MaterialExceptionStatus): string {
  return { pending_review: "待平台审核", rejected: "已驳回", waiting_supplier: "待供应商处理", pending_8d_review: "待平台审核8D", rejected_8d: "驳回8D", approved: "已通过", cancelled: "已取消" }[status];
}

function materialStatusClass(status: MaterialExceptionStatus): string {
  return status === "approved" ? "approved" : status === "cancelled" ? "cancelled" : status === "rejected" || status === "rejected_8d" ? "rejected" : "pending";
}

function shipmentStatusLabel(status: ShipmentStatus): string {
  return { pending_review: "待审核", rejected: "已驳回", approved: "已通过", cancelled: "已取消" }[status];
}

function shipmentStatusClass(status: ShipmentStatus): string {
  return { pending_review: "pending", rejected: "rejected", approved: "approved", cancelled: "cancelled" }[status];
}

function createShipmentNo(reports: ShipmentReport[]): string {
  const next = reports.reduce((max, report) => {
    const match = report.businessNo.match(/SR\d+(\d{3})$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return `SR20260811${String(next).padStart(3, "0")}`;
}

const roleProfiles: Record<DemoRole, {
  label: string;
  organization: string;
  organizationId: string;
  userId: string;
  user: string;
}> = {
  platform: { label: "平台管理员", organization: "示例质量运营中心", organizationId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000101", user: "演示管理员" },
  supplier: { label: "供应商用户", organization: "远航精密供应商", organizationId: "00000000-0000-4000-8000-000000000002", userId: "00000000-0000-4000-8000-000000000102", user: "王晨" },
  factory: { label: "工厂用户", organization: "华南智造 OEM 工厂", organizationId: "00000000-0000-4000-8000-000000000003", userId: "00000000-0000-4000-8000-000000000103", user: "陈工" },
};

export function createDemoSession(role: DemoRole, status: DemoSession["status"] = "enabled"): DemoSession {
  const profile = roleProfiles[role];
  if (role !== "platform") {
    const application = readMerchantApplications().find((entry) =>
      entry.reviewStatus === "approved" && merchantOrganizationId(entry) === profile.organizationId);
    if (application) return createMerchantSession(application, undefined, undefined, status);
  }
  return { role, organizationId: profile.organizationId, userId: profile.userId, status };
}

function createMerchantSession(
  application: MerchantApplication,
  selectedAccount?: MerchantAccount,
  selectedMembership?: MerchantMembership,
  forcedStatus?: DemoSession["status"],
): DemoSession {
  const role = merchantRole(application.merchantType);
  const organizationId = merchantOrganizationId(application);
  const store = readMerchantIdentityStore(merchantIdentitySources());
  const account = selectedAccount ?? store.accounts.find((entry) => entry.phone === application.administratorPhone);
  const membership = selectedMembership ?? store.memberships.find((entry) =>
    entry.organizationId === organizationId && entry.accountId === account?.id);
  const profile = roleProfiles[role];
  return {
    role,
    organizationId,
    userId: account?.id ?? profile.userId,
    membershipId: membership?.id,
    status: forcedStatus ?? (application.usageStatus === "inactive" || membership?.status === "disabled" ? "disabled" : "enabled"),
    organizationName: application.companyName,
    userName: account?.name ?? application.administratorName,
  };
}

function findMerchantLogin(phone: string): {
  account: MerchantAccount;
  memberships: MerchantMembership[];
  applications: MerchantApplication[];
} | undefined {
  const applications = readMerchantApplications();
  const sources = merchantIdentitySources(applications);
  const store = readMerchantIdentityStore(sources);
  const account = store.accounts.find((entry) => entry.phone === phone && entry.status === "enabled");
  if (!account) return undefined;
  const memberships = store.memberships.filter((entry) => entry.accountId === account.id && entry.status === "enabled");
  const memberApplications = memberships.map((membership) => applications.find((application) =>
    application.reviewStatus === "approved" && merchantOrganizationId(application) === membership.organizationId)).filter((application): application is MerchantApplication => Boolean(application));
  return memberApplications.length ? { account, memberships, applications: memberApplications } : undefined;
}

function chooseMerchantLoginOrganization(
  account: MerchantAccount,
  memberships: MerchantMembership[],
  applications: MerchantApplication[],
): { membership: MerchantMembership; application: MerchantApplication } {
  const pairs = memberships.map((membership) => ({
    membership,
    application: applications.find((application) => merchantOrganizationId(application) === membership.organizationId),
  })).filter((pair): pair is { membership: MerchantMembership; application: MerchantApplication } => Boolean(pair.application));
  const activePairs = pairs.filter((pair) => pair.application.usageStatus === "active");
  const candidates = activePairs.length ? activePairs : pairs;
  const preferredOrganizationId = readLastOrganization(account.id);
  return candidates.find((pair) => pair.membership.organizationId === preferredOrganizationId)
    ?? [...candidates].sort((left, right) => left.membership.createdAt.localeCompare(right.membership.createdAt)
      || left.membership.organizationId.localeCompare(right.membership.organizationId))[0];
}

function readDemoSession(): DemoSession | null {
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (!parsed.role || !roleProfiles[parsed.role] || !parsed.organizationId || !parsed.userId || !parsed.status) return null;
    return parsed as DemoSession;
  } catch {
    return null;
  }
}

function writeDemoSession(session: DemoSession): void {
  window.localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearDemoSession(): void {
  window.localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
}

function ensureDemoSession(role: DemoRole): DemoSession {
  const existing = readDemoSession();
  if (existing) return existing;
  const session = createDemoSession(role);
  writeDemoSession(session);
  return session;
}

const quickEntries: Array<{
  role: DemoRole;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { role: "platform", title: "平台管理员", description: "查看质量总览与审核待办", icon: ShieldCheck },
  { role: "supplier", title: "供应商用户", description: "处理异常任务与出货报告", icon: Store },
  { role: "factory", title: "工厂用户", description: "提报检验与生产质量数据", icon: Factory },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "is-compact" : ""}`}>
      <span className="brand-icon" aria-hidden="true"><ShieldCheck size={22} /></span>
      <span>
        <strong>质量数据平台</strong>
        {!compact && <small>Quality Data Management</small>}
      </span>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [method, setMethod] = useState<"password" | "code">("password");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [issuedPhone, setIssuedPhone] = useState("");
  const [codeToast, setCodeToast] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loginError, setLoginError] = useState("");
  const registrationSubmitted = new URLSearchParams(search).get("registered") === "1";

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  function phoneIsRegistered(): boolean {
    return readPlatformUsers().some((item) => item.phone === phone.trim() && item.status === "enabled")
      || Boolean(findMerchantLogin(phone.trim()));
  }

  function sendVerificationCode(): void {
    setLoginError("");
    if (!/^1\d{10}$/.test(phone.trim())) { setLoginError("请输入正确的手机号码"); return; }
    if (!phoneIsRegistered()) { setLoginError("该账号未注册、已被禁用或商家注册尚未审核通过"); return; }
    setIssuedPhone(phone.trim());
    setVerificationCode("");
    setCountdown(60);
    setCodeToast(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phone.trim()) {
      const platformUser = readPlatformUsers().find((item) => item.phone === phone.trim() && item.status === "enabled");
      const merchantLogin = findMerchantLogin(phone.trim());
      if (!platformUser && !merchantLogin) { setLoginError("账号不存在、已被禁用或商家注册尚未审核通过"); return; }
      if (method === "code") {
        if (!verificationCode.trim()) { setLoginError("请输入验证码"); return; }
        if (issuedPhone !== phone.trim() || verificationCode.trim() !== DEMO_SMS_CODE) { setLoginError("验证码错误或已过期"); return; }
      } else {
        setLoginError("新注册商家请使用验证码登录");
        return;
      }
      if (platformUser) {
        writeDemoSession({ ...createDemoSession("platform"), userId: platformUser.id, userName: platformUser.name });
        navigate("/app/platform");
        return;
      }
      const selected = chooseMerchantLoginOrganization(merchantLogin!.account, merchantLogin!.memberships, merchantLogin!.applications);
      writeLastOrganization(merchantLogin!.account.id, selected.membership.organizationId);
      writeDemoSession(createMerchantSession(selected.application, merchantLogin!.account, selected.membership));
      navigate(`/app/${merchantRole(selected.application.merchantType)}`);
      return;
    }
    writeDemoSession(createDemoSession("platform"));
    navigate("/app/platform");
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="平台介绍">
        <BrandMark />
        <div className="story-copy">
          <p className="eyebrow">ENTERPRISE QUALITY</p>
          <h1>质量数据<br />在线化管理平台</h1>
          <p className="story-lead">连接平台方与商家，让每一条质量记录在线流转、清晰可查，为后续智能分析建立可信数据基础。</p>
          <div className="value-grid">
            <article><span className="value-icon green"><Activity size={20} /></span><strong>流程透明</strong><p>审批节点实时可见，进度一目了然</p></article>
            <article><span className="value-icon blue"><Zap size={20} /></span><strong>审核高效</strong><p>组织级待办驱动，缩短处理周期</p></article>
            <article><span className="value-icon purple"><Database size={20} /></span><strong>数据统一</strong><p>多维质量数据按一致口径管理</p></article>
            <article><span className="value-icon orange"><Users size={20} /></span><strong>责任追溯</strong><p>完整流转事件，操作有据可查</p></article>
          </div>
        </div>
        <p className="story-footer">© 2026 质量数据平台 · 演示版本 v0.1</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          {registrationSubmitted && <div className="login-success" role="status"><CheckCircle2 size={18} /><span>注册申请已提交，请等待平台审核。审核结果将通过您填写的手机号和邮箱通知。</span></div>}
          <header>
            <h2>欢迎回来</h2>
            <p>登录您的账号以继续使用平台</p>
          </header>

          <div className="login-tabs" role="tablist" aria-label="登录方式">
            <button className={method === "password" ? "active" : ""} onClick={() => { setMethod("password"); setLoginError(""); }} role="tab">密码登录</button>
            <button className={method === "code" ? "active" : ""} onClick={() => { setMethod("code"); setLoginError(""); }} role="tab">验证码登录</button>
          </div>

          <form onSubmit={submit}>
            <label>手机号<input aria-label="手机号" inputMode="numeric" value={phone} onChange={(event) => { setPhone(event.target.value); setLoginError(""); }} placeholder="请输入手机号" /></label>
            {method === "password" ? (
              <label>密码<span className="input-wrap"><LockKeyhole size={17} /><input key="password" aria-label="密码" type="password" placeholder="请输入密码（8-20位含大小写字母和数字）" /></span></label>
            ) : (
              <label>验证码<span className="input-wrap code-input"><KeyRound size={17} /><input key="verification-code" aria-label="验证码" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(event) => { setVerificationCode(event.target.value.replace(/\D/g, "")); setLoginError(""); }} placeholder="请输入6位验证码" /><button type="button" disabled={countdown > 0} onClick={sendVerificationCode}>{countdown > 0 ? `${countdown}s后重试` : "获取验证码"}</button></span></label>
            )}
            <div className="login-options"><label className="check-row"><input type="checkbox" />记住登录状态</label><button type="button" className="text-button">忘记密码？</button></div>
            <button className="primary-button" type="submit">登录</button>
            {loginError && <em className="login-error" role="alert">{loginError}</em>}
          </form>

          <div className="demo-entry">
            <div className="section-rule"><span>演示快速入口</span></div>
            <div className="quick-entry-grid">
              {quickEntries.map(({ role, title, icon: Icon }) => (
                <button key={role} onClick={() => { writeDemoSession(createDemoSession(role)); navigate(`/app/${role}`); }}><Icon size={18} /><span>{title}</span></button>
              ))}
            </div>
            <small>点击直接进入，无需填写账号密码</small>
          </div>

          <p className="register-link">还没有账号？ <button type="button" onClick={() => navigate("/merchant/register")}>申请商家入驻 →</button></p>
        </div>
        <p className="legal">登录即表示您同意 <a href="#terms">服务条款</a> 和 <a href="#privacy">隐私政策</a></p>
      </section>
      {codeToast && <aside className="demo-code-toast" role="status" aria-label="模拟短信验证码"><div><KeyRound size={20} /><span><strong>模拟短信验证码</strong><small>已发送至 {issuedPhone.slice(0, 3)}****{issuedPhone.slice(-4)}</small></span></div><b>{DEMO_SMS_CODE}</b><button type="button" aria-label="关闭验证码提示" onClick={() => setCodeToast(false)}><X size={17} /></button></aside>}
    </main>
  );
}

type MerchantDraft = Pick<MerchantApplication, "merchantType" | "companyName" | "creditCode" | "administratorName" | "administratorPhone" | "administratorEmail">;
const emptyMerchantDraft: MerchantDraft = { merchantType: "supplier", companyName: "", creditCode: "", administratorName: "", administratorPhone: "", administratorEmail: "" };

function MerchantRegisterPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<MerchantDraft>(emptyMerchantDraft);
  const [error, setError] = useState("");
  function update<K extends keyof MerchantDraft>(key: K, value: MerchantDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const all = readMerchantApplications();
    if (!/^[0-9A-Z]{18}$/.test(draft.creditCode)) { setError("统一社会信用代码格式错误"); return; }
    if (!/^1\d{10}$/.test(draft.administratorPhone)) { setError("手机号码格式错误"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.administratorEmail)) { setError("邮箱格式错误"); return; }
    const activeApplications = all.filter((item) => item.reviewStatus === "pending" || item.reviewStatus === "approved");
    if (activeApplications.some((item) => item.companyName === draft.companyName || item.creditCode === draft.creditCode || item.administratorPhone === draft.administratorPhone)) { setError("公司名称、统一社会信用代码或手机号码已存在有效申请"); return; }
    const now = "2026-08-13 14:00"; const recordId = `merchant-${Date.now()}`;
    const application: MerchantApplication = { id: recordId, version: 1, merchantNo: `MC20260813${String(all.length + 1).padStart(4, "0")}`, createdAt: now, ...draft, reviewStatus: "pending", usageStatus: null, reviewReason: undefined, updatedAt: now, flowRecords: [{ id: `${recordId}-submitted-${Date.now()}`, kind: "submitted", action: "提交注册申请", time: now, operator: draft.administratorName, organization: draft.companyName }] };
    saveMerchantApplication(application); navigate("/?registered=1");
  }
  return <main className="public-form-page"><header><BrandMark compact /><button className="text-button" onClick={() => navigate("/")}>返回登录</button></header><section className="public-form-shell"><div className="page-heading"><p>MERCHANT ONBOARDING</p><h1>申请商家入驻</h1><span>提交企业与管理员信息，平台审核通过后即可使用管理员手机号登录。</span></div><form className="form-card" onSubmit={submit}><BusinessFormSection title="商家信息"><div className="form-grid"><label><span className="form-field-label"><em>*</em>商家类型</span><select aria-label="商家类型" value={draft.merchantType} onChange={(e) => update("merchantType", e.target.value as MerchantDraft["merchantType"])}><option value="supplier">供应商</option><option value="factory">OEM 工厂</option></select></label><label><span className="form-field-label"><em>*</em>公司名称</span><input aria-label="公司名称" required minLength={2} maxLength={100} value={draft.companyName} onChange={(e) => update("companyName", e.target.value)} /></label><label><span className="form-field-label"><em>*</em>统一社会信用代码</span><input aria-label="统一社会信用代码" required minLength={18} maxLength={18} value={draft.creditCode} onChange={(e) => update("creditCode", e.target.value.toUpperCase())} /></label></div></BusinessFormSection><BusinessFormSection title="管理员信息"><div className="form-grid"><label><span className="form-field-label"><em>*</em>管理员姓名</span><input aria-label="管理员姓名" required maxLength={50} value={draft.administratorName} onChange={(e) => update("administratorName", e.target.value)} /></label><label><span className="form-field-label"><em>*</em>管理员手机号码</span><input aria-label="管理员手机号码" required inputMode="numeric" maxLength={11} value={draft.administratorPhone} onChange={(e) => update("administratorPhone", e.target.value)} /></label><label><span className="form-field-label"><em>*</em>管理员邮箱</span><input aria-label="管理员邮箱" required type="email" value={draft.administratorEmail} onChange={(e) => update("administratorEmail", e.target.value)} /></label></div></BusinessFormSection>{error && <div className="form-submit-error" role="alert">{error}</div>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => navigate("/")}>取消</button><button className="primary-button" type="submit">提交注册</button></div></form></section></main>;
}

const platformNav = [
  ["首页", House], ["QE 助手", Sparkles], ["待办任务", ListChecks], ["数据分析", BarChart3], ["平台业务", Boxes],
  ["业务管理", ClipboardCheck], ["商家管理", Store], ["用户管理", Users], ["角色管理", ShieldCheck], ["基础数据", Database], ["配置中心", Gauge],
] as const;
const platformAnalysisNav = ["订单完成率", "客供物料上线合格率"] as const;
const platformBasicDataNav = ["产品数据"] as const;
const platformConfigurationNav = ["业务管理", "表单资产", "数据分析配置", "发布与审计"] as const;
const platformSubmissionNav = ["物料异常提报", "售后异常提报"] as const;
const platformAuditNav = [
  "出货报告审核",
  "物料异常审核",
  "售后异常审核",
  "来料检验",
  "生产检验日报",
  "维修记录",
  "IPQC巡线问题记录",
  "零星退料记录审核",
  "入库报告审核",
  "试产及生产总结审核",
] as const;
const supplierNav = [["首页", House], ["出货报告", FileCheck2], ["物料异常", Activity], ["售后异常", ClipboardCheck], ["用户管理", Users], ["角色管理", ShieldCheck]] as const;
const factoryNav = [["首页", House], ["物料异常", Activity], ["来料检验", ClipboardCheck], ["生产检验日报", FileCheck2], ["维修记录", Activity], ["IPQC巡线", ListChecks], ["零星退料", PackageCheck], ["入库报告", Building2], ["试产及生产总结", FileCheck2], ["用户管理", Users], ["角色管理", ShieldCheck]] as const;

function navigationPath(role: DemoRole, label: string): string {
  if (role === "supplier" && label === "出货报告") return "/app/supplier/shipment-reports";
  if (role === "supplier" && label === "物料异常") return "/app/supplier/material-exceptions";
  if (role === "supplier" && label === "售后异常") return "/app/supplier/after-sales-exception";
  if (role === "supplier" && label === "用户管理") return "/app/supplier/users";
  if (role === "supplier" && label === "角色管理") return "/app/supplier/roles";
  if (role === "factory" && label === "物料异常") return "/app/factory/material-exceptions";
  if (role === "factory" && label === "来料检验") return "/app/factory/incoming-inspections";
  if (role === "factory" && label === "生产检验日报") return "/app/factory/production-inspection-daily";
  if (role === "factory" && label === "维修记录") return "/app/factory/maintenance-record";
  if (role === "factory" && label === "IPQC巡线") return "/app/factory/ipqc-patrol";
  if (role === "factory" && label === "零星退料") return "/app/factory/sporadic-return";
  if (role === "factory" && label === "入库报告") return "/app/factory/warehouse-in-report";
  if (role === "factory" && label === "试产及生产总结") return "/app/factory/trial-production-summary";
  if (role === "factory" && label === "用户管理") return "/app/factory/users";
  if (role === "factory" && label === "角色管理") return "/app/factory/roles";
  if (role === "platform" && label === "QE 助手") return qeAssistantPath;
  if (role === "platform" && label === "待办任务") return "/app/platform/todos";
  if (role === "platform" && label === "数据分析") return "/app/platform/analysis/order-completion";
  if (role === "platform" && label === "平台业务") return "/app/platform/platform-business/material-exceptions";
  if (role === "platform" && label === "业务管理") return "/app/platform/business/shipment-reports";
  if (role === "platform" && label === "商家管理") return "/app/platform/merchants";
  if (role === "platform" && label === "用户管理") return "/app/platform/users";
  if (role === "platform" && label === "角色管理") return "/app/platform/roles";
  if (role === "platform" && label === "基础数据") return "/app/platform/product-data";
  if (role === "platform" && label === "配置中心") return "/app/platform/configuration/businesses";
  return `/app/${role}`;
}

function runtimeBusinessEntries(role: DemoRole): ConfigurationBusiness[] {
  const submitterType = role === "platform" ? "平台" : role === "supplier" ? "供应商" : "工厂";
  return readConfigurationBusinesses().filter((business) => {
    // The platform is a processing/audit surface even when the business only
    // accepts submissions from a merchant organization.
    if (business.status !== "active" || business.builtIn || (role !== "platform" && !(business.submitterTypes ?? []).includes(submitterType))) return false;
    const config = readBusinessDefinitionConfigs().find((entry) => entry.businessId === business.id);
    const activeVersion = config?.versions.find((version) => version.active);
    return Boolean(activeVersion?.permissions.read);
  });
}

function runtimeBusinessPath(role: DemoRole, code: string): string {
  return `/app/${role}/business/${encodeURIComponent(code)}`;
}

function Sidebar({ role, mobileOpen, onClose, canUseAssistant }: {
  role: DemoRole; mobileOpen: boolean; onClose: () => void; canUseAssistant: boolean;
}) {
  const [, setIdentityRevision] = useState(0);
  useEffect(() => {
    const refreshIdentity = () => setIdentityRevision((value) => value + 1);
    window.addEventListener(MERCHANT_IDENTITY_CHANGE_EVENT, refreshIdentity);
    return () => window.removeEventListener(MERCHANT_IDENTITY_CHANGE_EVENT, refreshIdentity);
  }, []);
  const session = readDemoSession();
  const currentSession = session ?? (role === "platform" ? undefined : createDemoSession(role));
  const baseItems = role === "platform" ? platformNav : role === "supplier" ? supplierNav : factoryNav;
  const canManageMerchantUsers = role !== "platform" && Boolean(currentSession && hasMerchantPermission(
    merchantIdentitySources(),
    currentSession.organizationId,
    currentSession.userId,
    "merchant.admin.user.read",
  ));
  const canManageMerchantRoles = role !== "platform" && Boolean(currentSession && hasMerchantPermission(
    merchantIdentitySources(),
    currentSession.organizationId,
    currentSession.userId,
    "merchant.admin.role.read",
  ));
  const canViewShipmentReports = role !== "platform" && Boolean(currentSession && hasMerchantPermission(
    merchantIdentitySources(),
    currentSession.organizationId,
    currentSession.userId,
    "merchant.business.shipment_report.read",
  ));
  const merchantBusinessNavPermissions: Record<string, string> = role === "supplier" ? {
    出货报告: "merchant.business.shipment_report.read",
    物料异常: "merchant.business.material_exception.read",
    售后异常: "merchant.business.after_sales_exception.read",
  } : {
    物料异常: "merchant.business.material_exception.read",
    来料检验: "merchant.business.incoming_inspection.read",
    生产检验日报: "merchant.business.production_inspection_daily.read",
    维修记录: "merchant.business.repair_record.read",
    IPQC巡线: "merchant.business.ipqc_inspection.read",
    零星退料: "merchant.business.sporadic_return.read",
    入库报告: "merchant.business.inbound_report.read",
    试产及生产总结: "merchant.business.trial_production_summary.read",
  };
  const items = baseItems.filter(([label]) => (label !== "用户管理" || role === "platform" || canManageMerchantUsers)
    && (label !== "角色管理" || role === "platform" || canManageMerchantRoles)
    && (label !== "QE 助手" || canUseAssistant)
    && (label !== "出货报告" || role !== "supplier" || canViewShipmentReports)
    && (role === "platform" || !merchantBusinessNavPermissions[label] || Boolean(currentSession && hasMerchantPermission(merchantIdentitySources(), currentSession.organizationId, currentSession.userId, merchantBusinessNavPermissions[label]))));
  const runtimeBusinesses = runtimeBusinessEntries(role);
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 数据分析: true, 平台业务: true, 业务管理: true, 基础数据: true, 配置中心: true });
  const isPlatformSubmission = role === "platform" && pathname.startsWith("/app/platform/platform-business/");
  const activeLabel = matchPath(qeAssistantPath, pathname) ? "QE 助手" : isPlatformSubmission ? "平台业务" : pathname.includes("/platform/todos") ? "待办任务" : pathname.includes("/platform/analysis") ? "数据分析" : pathname.includes("/platform/product-data") ? "基础数据" : pathname.includes("/platform/configuration") ? "配置中心" : pathname.includes("/platform/merchant") ? "商家管理" : pathname.includes("/platform/users") || (role !== "platform" && pathname.includes("/users")) ? "用户管理" : pathname.includes("/roles") ? "角色管理" : pathname.includes("incoming-inspections") || pathname.includes("after-sales-exception") || pathname.includes("sporadic-return") || pathname.includes("warehouse-in-report") || pathname.includes("trial-production-summary") ? (role === "platform" ? "业务管理" : pathname.includes("incoming-inspections") ? "来料检验" : pathname.includes("after-sales-exception") ? "售后异常" : pathname.includes("sporadic-return") ? "零星退料" : pathname.includes("warehouse-in-report") ? "入库报告" : "试产及生产总结") : pathname.includes("material-exceptions") ? (role === "platform" ? "业务管理" : "物料异常") : pathname.includes("shipment-reports") ? (role === "platform" ? "业务管理" : "出货报告") : items[0][0];
  useEffect(() => { if (["数据分析", "平台业务", "业务管理", "基础数据", "配置中心"].includes(activeLabel)) setOpenGroups((current) => ({ ...current, [activeLabel]: true })); }, [activeLabel]);
  function toggleGroup(label: string) { setOpenGroups((current) => ({ ...current, [label]: !current[label] })); }
  return (
    <>
      {mobileOpen && <button className="sidebar-scrim" aria-label="关闭导航" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand"><BrandMark compact /><button onClick={onClose} aria-label="关闭菜单"><PanelLeftClose size={20} /></button></div>
        <nav aria-label="主导航">
          {items.map(([label, Icon], index) => label === "平台业务" && role === "platform" ? (
            <div className="sidebar-nav-group" key={label}>
              <button type="button" className={`sidebar-nav-parent ${openGroups[label] ? "expanded" : ""}`} aria-expanded={openGroups[label]} onClick={() => toggleGroup(label)}><Icon size={18} /><span>{label}</span><ChevronDown className="nav-chevron" size={15} /></button>
              {openGroups[label] && <div className="sidebar-subnav" role="navigation" aria-label="平台业务二级菜单">
                {platformSubmissionNav.map((item) => item === "物料异常提报"
                  ? <Link className={pathname.includes("platform-business/material-exceptions") ? "active" : ""} to="/app/platform/platform-business/material-exceptions" key={item}>{item}</Link>
                  : <Link className={pathname.includes("platform-business/after-sales-exception") ? "active" : ""} to="/app/platform/platform-business/after-sales-exception" key={item}>{item}</Link>)}
              </div>}
            </div>
          ) : label === "数据分析" && role === "platform" ? (
            <div className="sidebar-nav-group" key={label}>
              <button type="button" className={`sidebar-nav-parent ${openGroups[label] ? "expanded" : ""}`} aria-expanded={openGroups[label]} onClick={() => toggleGroup(label)}><Icon size={18} /><span>{label}</span><ChevronDown className="nav-chevron" size={15} /></button>
              {openGroups[label] && <div className="sidebar-subnav" role="navigation" aria-label="数据分析二级菜单">{platformAnalysisNav.map((item) => <Link className={pathname.includes(item === "订单完成率" ? "order-completion" : "customer-material-yield") ? "active" : ""} to={item === "订单完成率" ? "/app/platform/analysis/order-completion" : "/app/platform/analysis/customer-material-yield"} key={item}>{item}</Link>)}</div>}
            </div>
          ) : label === "业务管理" && role === "platform" ? (
            <div className="sidebar-nav-group" key={label}>
              <button type="button" className={`sidebar-nav-parent ${openGroups[label] ? "expanded" : ""}`} aria-expanded={openGroups[label]} onClick={() => toggleGroup(label)}><Icon size={18} /><span>{label}</span><ChevronDown className="nav-chevron" size={15} /></button>
              {openGroups[label] && <div className="sidebar-subnav" role="navigation" aria-label="业务管理二级菜单">
                {platformAuditNav.map((item) => item === "出货报告审核"
                  ? <Link className={pathname.includes("shipment-reports") ? "active" : ""} to="/app/platform/business/shipment-reports" key={item}>{item}</Link>
                  : item === "物料异常审核"
                    ? <Link className={pathname.includes("/platform/business/material-exceptions") ? "active" : ""} to="/app/platform/business/material-exceptions" key={item}>{item}</Link>
                  : item === "来料检验"
                    ? <Link className={pathname.includes("incoming-inspections") ? "active" : ""} to="/app/platform/business/incoming-inspections" key={item}>{item}</Link>
                  : item === "生产检验日报"
                    ? <Link className={pathname.includes("production-inspection-daily") ? "active" : ""} to="/app/platform/business/production-inspection-daily" key={item}>{item}</Link>
                  : item === "维修记录"
                    ? <Link className={pathname.includes("maintenance-record") ? "active" : ""} to="/app/platform/business/maintenance-record" key={item}>{item}</Link>
                  : item === "IPQC巡线问题记录"
                    ? <Link className={pathname.includes("ipqc-patrol") ? "active" : ""} to="/app/platform/business/ipqc-patrol" key={item}>{item}</Link>
                  : item === "售后异常审核"
                    ? <Link className={pathname.includes("/platform/business/after-sales-exception") ? "active" : ""} to="/app/platform/business/after-sales-exception" key={item}>{item}</Link>
                  : item === "零星退料记录审核"
                    ? <Link className={pathname.includes("sporadic-return") ? "active" : ""} to="/app/platform/business/sporadic-return" key={item}>{item}</Link>
                  : item === "入库报告审核"
                    ? <Link className={pathname.includes("warehouse-in-report") ? "active" : ""} to="/app/platform/business/warehouse-in-report" key={item}>{item}</Link>
                  : item === "试产及生产总结审核"
                    ? <Link className={pathname.includes("trial-production-summary") ? "active" : ""} to="/app/platform/business/trial-production-summary" key={item}>{item}</Link>
                  : <span className="sidebar-subnav-placeholder" key={item} title="后续业务任务实现">{item}</span>)}
                {runtimeBusinesses.map((business) => <Link className={pathname.includes(`/business/${business.code}`) ? "active" : ""} to={runtimeBusinessPath(role, business.code)} key={business.id}>{business.name}</Link>)}
              </div>}
            </div>
          ) : label === "基础数据" && role === "platform" ? (
            <div className="sidebar-nav-group" key={label}>
              <button type="button" className={`sidebar-nav-parent ${openGroups[label] ? "expanded" : ""}`} aria-expanded={openGroups[label]} onClick={() => toggleGroup(label)}><Icon size={18} /><span>{label}</span><ChevronDown className="nav-chevron" size={15} /></button>
              {openGroups[label] && <div className="sidebar-subnav" role="navigation" aria-label="基础数据二级菜单">{platformBasicDataNav.map((item) => <Link className={pathname.includes("/platform/product-data") ? "active" : ""} to="/app/platform/product-data" key={item}>{item}</Link>)}</div>}
            </div>
          ) : label === "配置中心" && role === "platform" ? (
            <div className="sidebar-nav-group" key={label}>
              <button type="button" className={`sidebar-nav-parent ${openGroups[label] ? "expanded" : ""}`} aria-expanded={openGroups[label]} onClick={() => toggleGroup(label)}><Icon size={18} /><span>{label}</span><ChevronDown className="nav-chevron" size={15} /></button>
              {openGroups[label] && <div className="sidebar-subnav" role="navigation" aria-label="配置中心二级菜单">{platformConfigurationNav.map((item) => { const key = item === "业务管理" ? "businesses" : item === "表单资产" ? "assets" : item === "数据分析配置" ? "analytics" : "audit"; const target = key === "assets" ? "dictionaries" : key; const active = key === "assets" ? pathname.includes("/configuration/assets") || pathname.includes("/configuration/dictionaries") || pathname.includes("/configuration/fields") : pathname.includes(`/configuration/${key}`); return <Link className={active ? "active" : ""} to={`/app/platform/configuration/${target}`} key={item}>{item}</Link>; })}</div>}
            </div>
          ) : (
            <Link className={label === activeLabel ? "active" : ""} to={navigationPath(role, label)} key={label}
              onClick={label === "QE 助手" ? onClose : undefined} aria-current={label === "QE 助手" && label === activeLabel ? "page" : undefined}>
              <Icon size={18} /><span>{label}</span>{role !== "platform" && [2, 3, 8].includes(index) && <ChevronDown className="nav-chevron" size={15} />}
            </Link>
          ))}
          {role !== "platform" && runtimeBusinesses.map((business) => <Link className={pathname.includes(`/business/${business.code}`) ? "active" : ""} to={runtimeBusinessPath(role, business.code)} key={business.id}><Boxes size={18} /><span>{business.name}</span></Link>)}
        </nav>
        <div className="sidebar-context"><Sparkles size={16} /><span><small>当前演示身份</small>{roleProfiles[role].label}</span></div>
      </aside>
    </>
  );
}

function Topbar({ role, onMenu }: { role: DemoRole; onMenu: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const session = readDemoSession();
  const profile = { ...roleProfiles[role], organization: session?.organizationName ?? roleProfiles[role].organization, user: session?.userName ?? roleProfiles[role].user };
  const [contextOpen, setContextOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [pendingOrganization, setPendingOrganization] = useState<MerchantApplication>();
  const identityStore = role === "platform" ? undefined : readMerchantIdentityStore(merchantIdentitySources());
  const availableOrganizationIds = role === "platform" || !session ? [] : identityStore!.memberships
    .filter((membership) => membership.accountId === session.userId && membership.status === "enabled")
    .map((membership) => membership.organizationId);
  const availableOrganizations = role === "platform" ? [] : readMerchantApplications().filter((item) =>
    item.reviewStatus === "approved" && item.usageStatus === "active" && availableOrganizationIds.includes(merchantOrganizationId(item)));

  useEffect(() => {
    if (!userOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!userMenuRef.current?.contains(event.target as Node)) setUserOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setUserOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [userOpen]);

  function switchRole(nextRole: DemoRole): void {
    writeDemoSession(createDemoSession(nextRole));
    setContextOpen(false);
    navigate(`/app/${nextRole}`);
  }

  function switchOrganization(application: MerchantApplication): void {
    const account = identityStore?.accounts.find((entry) => entry.id === session?.userId);
    const membership = identityStore?.memberships.find((entry) =>
      entry.accountId === account?.id && entry.organizationId === merchantOrganizationId(application) && entry.status === "enabled");
    if (!account || !membership) return;
    writeLastOrganization(account.id, membership.organizationId);
    writeDemoSession(createMerchantSession(application, account, membership));
    setPendingOrganization(undefined);
    setContextOpen(false);
    navigate(`/app/${merchantRole(application.merchantType)}`);
  }

  const breadcrumbs = (() => {
    if (matchPath(qeAssistantPath, pathname)) return ["QE 助手"];
    if (pathname.includes("/platform/todos")) return ["待办任务"];
    if (pathname.includes("/platform/analysis/order-completion")) return ["数据分析", "订单完成率"];
    if (pathname.includes("/platform/analysis/customer-material-yield")) return ["数据分析", "客供物料上线合格率"];
    if (pathname.includes("/platform/product-data")) return ["基础数据", "产品数据"];
    if (pathname.includes("/platform/configuration/businesses")) return ["配置中心", "业务管理"];
    if (pathname.includes("/platform/configuration/assets") || pathname.includes("/platform/configuration/dictionaries") || pathname.includes("/platform/configuration/fields")) return ["配置中心", "表单资产"];
    if (pathname.includes("/platform/configuration/analytics")) return ["配置中心", "数据分析配置"];
    if (pathname.includes("/platform/configuration/audit")) return ["配置中心", "发布与审计"];
    if (pathname.includes("/platform/merchant-audits")) return ["商家管理", "商家审核"];
    if (pathname.includes("/platform/merchants")) return ["商家管理", ...(pathname.split("/").length > 4 ? ["详情"] : [])];
    if (pathname.includes("/platform/users")) return ["用户管理", ...(pathname.split("/").length > 4 ? ["详情"] : [])];
    if (pathname.includes("/platform/roles")) return ["角色管理", ...(pathname.includes("/permissions") ? ["角色权限"] : [])];
    if (pathname.includes("/supplier/users") || pathname.includes("/factory/users")) return ["用户管理", ...(pathname.split("/").length > 5 ? ["用户详情"] : [])];
    if (pathname.includes("/supplier/roles") || pathname.includes("/factory/roles")) return ["角色管理", ...(pathname.includes("/permissions") ? ["角色权限"] : [])];
    if (pathname.includes("/notifications")) return ["通知预览"];
    if (pathname.includes("/platform/audit-logs")) return ["审计日志"];
    if (pathname.includes("material-exceptions")) {
      const submission = pathname.startsWith("/app/platform/platform-business/");
      const action = pathname.endsWith("/new") ? "新增" : pathname.split("/").length > (submission ? 5 : 5) ? "详情" : undefined;
      return [role === "platform" ? (submission ? "平台业务" : "业务管理") : role === "supplier" ? "供应商管理" : "工厂管理", role === "platform" ? (submission ? "物料异常提报" : "物料异常审核") : "物料异常", ...(action ? [action] : [])];
    }
    if (pathname.includes("incoming-inspections")) {
      const action = pathname.endsWith("/new") ? "新增" : pathname.endsWith("/edit") ? "编辑" : pathname.split("/").length > 5 ? "详情" : undefined;
      return ["业务管理", "来料检验", ...(action ? [action] : [])];
    }
    if (pathname.includes("production-inspection-daily")) return ["业务管理", "生产检验日报", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : "详情"] : [])];
    if (pathname.includes("maintenance-record")) return ["业务管理", "维修记录", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : "详情"] : [])];
    if (pathname.includes("ipqc-patrol")) return ["业务管理", "IPQC巡线问题记录", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : "详情"] : [])];
    if (pathname.includes("after-sales-exception")) {
      const submission = pathname.startsWith("/app/platform/platform-business/");
      return [role === "platform" ? (submission ? "平台业务" : "业务管理") : "供应商管理", role === "platform" ? (submission ? "售后异常提报" : "售后异常审核") : "售后异常", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : "详情"] : [])];
    }
    if (pathname.includes("sporadic-return")) return [role === "platform" ? "业务管理" : "工厂管理", "零星退料记录", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : pathname.endsWith("/edit") ? "编辑" : "详情"] : [])];
    if (pathname.includes("warehouse-in-report")) return [role === "platform" ? "业务管理" : "工厂管理", "入库报告", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : pathname.endsWith("/edit") ? "编辑" : "详情"] : [])];
    if (pathname.includes("trial-production-summary")) return [role === "platform" ? "业务管理" : "工厂管理", "试产及生产总结", ...(pathname.split("/").length > 5 ? [pathname.endsWith("/new") ? "新增" : pathname.endsWith("/edit") ? "编辑" : "详情"] : [])];
    if (pathname.includes("/business/shipment-reports")) return ["业务管理", "出货报告审核", ...(pathname.split("/").length > 5 ? ["详情"] : [])];
    if (pathname.includes("/supplier/shipment-reports")) {
      if (pathname.endsWith("/new")) return ["业务管理", "出货报告", "新增"];
      if (pathname.endsWith("/edit")) return ["业务管理", "出货报告", "编辑"];
      return ["业务管理", "出货报告", ...(pathname.split("/").length > 5 ? ["详情"] : [])];
    }
    return [role === "platform" ? "首页" : role === "supplier" ? "供应商工作台" : "工厂工作台"];
  })();

  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="打开主导航"><Menu size={22} /></button>
      <nav className="topbar-breadcrumb" aria-label="面包屑">{breadcrumbs.map((item, index) => <span className={index === breadcrumbs.length - 1 ? "current" : ""} key={`${item}-${index}`}>{item}</span>)}</nav>
      <div className="topbar-spacer" />
      <div className="organization-menu">
        <button className="organization-pill" aria-expanded={contextOpen} aria-haspopup="menu" onClick={() => { setContextOpen((open) => !open); setUserOpen(false); }}><span>组织</span><strong>{profile.organization}</strong><ChevronDown size={15} /></button>
        {contextOpen && <div className="organization-popover" role="menu" aria-label="切换演示身份">
          <div className="context-summary"><small>当前组织</small><strong>{profile.organization}</strong><span>{profile.label} · {profile.user}</span></div>
          {availableOrganizations.length > 1 && <><div className="context-divider" /><small className="context-label">切换组织</small>{availableOrganizations.map((application) => <button role="menuitem" key={application.id} className={application.companyName === profile.organization ? "selected" : ""} onClick={() => application.companyName !== profile.organization && setPendingOrganization(application)}>{application.merchantType === "supplier" ? <Store size={15} /> : <Factory size={15} />}<span>{application.companyName}</span>{application.companyName === profile.organization && <CheckCircle2 size={14} />}</button>)}</>}
          <div className="context-divider" />
          <small className="context-label">切换演示身份</small>
          {quickEntries.map(({ role: nextRole, title, icon: Icon }) => <button role="menuitem" key={nextRole} className={nextRole === role ? "selected" : ""} onClick={() => switchRole(nextRole)}><Icon size={15} /><span>{title}</span>{nextRole === role && <CheckCircle2 size={14} />}</button>)}
        </div>}
      </div>
      <button className="notification-button" aria-label="通知" onClick={() => navigate(`/app/${role}/notifications`)}><Bell size={19} /><span>{Math.min(9, notificationsFromAudit(role).length)}</span></button>
      <div className="user-menu" ref={userMenuRef}>
        <button className="user-chip" aria-label={`用户菜单：${profile.user}`} aria-expanded={userOpen} aria-haspopup="menu" onClick={() => { setUserOpen((value) => !value); setContextOpen(false); }}><span>{profile.user.slice(0, 1)}</span><strong>{profile.user}</strong><ChevronDown size={15} /></button>
        {userOpen && <div className="user-popover" role="menu" aria-label="用户操作"><div className="user-popover-info"><strong>{profile.user}</strong><small>{profile.organization}</small></div><button role="menuitem" onClick={() => { setUserOpen(false); clearDemoSession(); navigate("/"); }}><LogOut size={16} />退出登录</button></div>}
      </div>
      {pendingOrganization && createPortal(<div className="dialog-backdrop"><section className="review-dialog organization-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="organization-confirm-title"><header><h2 id="organization-confirm-title">切换组织</h2><button aria-label="关闭组织切换弹窗" onClick={() => setPendingOrganization(undefined)}><X size={21} /></button></header><div className="dialog-body"><p className="organization-confirm-copy">确定要切换到「{pendingOrganization.companyName}」组织吗？切换后将按新组织重新加载权限和数据。</p></div><footer><button className="secondary-button" onClick={() => setPendingOrganization(undefined)}>取消</button><button className="primary-small" onClick={() => switchOrganization(pendingOrganization)}>确认切换</button></footer></section></div>, document.body)}
    </header>
  );
}

const qualityMetricDefinitions = [
  { id: "order_completion", label: "订单完成率", href: "/app/platform/analysis/order-completion" },
  { id: "inspection_first", label: "一检生产合格率", href: "/app/platform/business/production-inspection-daily?inspectionProcess=一检" },
  { id: "inspection_second", label: "二检生产合格率", href: "/app/platform/business/production-inspection-daily?inspectionProcess=二检" },
  { id: "inbound_pass", label: "入库检验批次合格率", href: "/app/platform/business/warehouse-in-report" },
  { id: "digital_incoming", label: "平台来料批次合格率", href: "/app/platform/business/incoming-inspections?supplyMethod=platform_purchase" },
  { id: "factory_incoming", label: "工厂来料批次合格率", href: "/app/platform/business/incoming-inspections?supplyMethod=factory_purchase" },
  { id: "customer_material", label: "客供物料上线合格率", href: "/app/platform/analysis/customer-material-yield" },
] as const;

function parseDemoTime(value: string): number {
  const timestamp = Date.parse(value.replace(" ", "T") + ":00+08:00");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatRelativeTime(value: string): string {
  const demoNow = parseDemoTime("2026-08-12 12:00");
  const difference = Math.max(0, demoNow - parseDemoTime(value));
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export function filterPermittedTodoCategories(categories: readonly string[], permissions: readonly string[]): string[] {
  const granted = new Set(permissions);
  return categories.filter((category) => granted.has(category));
}

function PlatformTodosPage() {
  const reports = readShipmentReports();
  const materialExceptions = readMaterialExceptions();
  const incomingInspections = readIncomingInspections();
  const merchants = readMerchantApplications().filter((item) => item.reviewStatus === "pending");
  const permittedCategories = filterPermittedTodoCategories(["merchant_registration", "shipment_report", "material_exception", "incoming_inspection"], ["merchant_registration", "shipment_report", "material_exception", "incoming_inspection"]);
  const pendingReports = reports
    .filter((report) => permittedCategories.includes("shipment_report") && report.status === "pending_review")
    .sort((left, right) => parseDemoTime(right.createdAt) - parseDemoTime(left.createdAt));
  const completedReports = reports.filter((report) => report.status === "approved" || report.status === "cancelled");
  const pendingMaterialExceptions = materialExceptions.filter((record) => permittedCategories.includes("material_exception") && (record.status === "pending_review" || record.status === "pending_8d_review"));
  const pendingIncomingInspections = incomingInspections.filter((record) => permittedCategories.includes("incoming_inspection") && record.status === "pending_review");
  const pendingMerchants = permittedCategories.includes("merchant_registration") ? merchants : [];
  const totalPending = pendingMerchants.length + pendingReports.length + pendingMaterialExceptions.length + pendingIncomingInspections.length;
  const averageHours = completedReports.length
    ? completedReports.reduce((total, report) => total + Math.max(0, parseDemoTime(report.updatedAt) - parseDemoTime(report.createdAt)), 0) / completedReports.length / 3_600_000
    : 0;

  return <div className="page-stack todo-page">
    <div className="page-heading"><h1>待办任务中心</h1><span>处理当前账号有权限的质量业务任务。</span></div>
    <section className="todo-summary" aria-label="待办任务统计">
      <article><span>待办任务</span><strong className="green"><ListChecks size={20} />{totalPending}<small>个</small></strong></article>
      <article><span>已完成任务</span><strong className="blue"><CheckCircle2 size={20} />{completedReports.length}<small>个</small></strong></article>
      <article><span>平均处理时效</span><strong className="orange"><Zap size={20} />{averageHours.toFixed(1)}<small>小时</small></strong></article>
    </section>
    <section className="todo-list-card">
      {totalPending ? <>
        <div className="todo-tabs" role="tablist" aria-label="待办任务分类">{pendingMerchants.length > 0 && <button className="active" role="tab" aria-selected="true">商家注册({pendingMerchants.length})</button>}{pendingReports.length > 0 && <button className={pendingMerchants.length ? "" : "active"} role="tab" aria-selected={pendingMerchants.length === 0}>出货报告({pendingReports.length})</button>}{pendingMaterialExceptions.length > 0 && <button role="tab" aria-selected={pendingMerchants.length === 0 && pendingReports.length === 0}>物料异常({pendingMaterialExceptions.length})</button>}{pendingIncomingInspections.length > 0 && <button role="tab" aria-selected={pendingMerchants.length === 0 && pendingReports.length === 0 && pendingMaterialExceptions.length === 0}>来料检验({pendingIncomingInspections.length})</button>}</div>
        <div className="todo-toolbar"><span>仅展示当前用户有权限处理的任务</span><button className="select-like">创建时间：最新 <ChevronDown size={14} /></button></div>
        <div className="responsive-table"><table><thead><tr><th>任务标题</th><th>任务类型</th><th>提报商家</th><th>创建时间</th><th>操作</th></tr></thead><tbody>
          {pendingMerchants.map((merchant) => <tr key={merchant.id}><td><Link className="todo-title" to={`/app/platform/merchant-audits?application=${merchant.id}`}>商家注册待审核-{merchant.companyName}</Link></td><td><span className="todo-type">商家注册</span></td><td>{merchant.companyName}</td><td><time dateTime={merchant.createdAt}>{formatRelativeTime(merchant.createdAt)}</time></td><td><Link className="table-action" to={`/app/platform/merchant-audits?application=${merchant.id}`}>查看详情</Link></td></tr>)}
          {pendingReports.map((report) => <tr key={report.id}><td><Link className="todo-title" to={`/app/platform/business/shipment-reports/${report.id}`}>出货报告待审核-{report.businessNo}</Link></td><td><span className="todo-type">出货报告</span></td><td>{report.supplierName}</td><td><time dateTime={report.createdAt} title={report.createdAt}>{formatRelativeTime(report.createdAt)}</time></td><td><Link className="table-action" to={`/app/platform/business/shipment-reports/${report.id}`}>查看详情</Link></td></tr>)}
          {pendingMaterialExceptions.map((record) => <tr key={record.id}><td><Link className="todo-title" to={`/app/platform/business/material-exceptions/${record.id}`}>{record.status === "pending_8d_review" ? "物料异常8D待审核" : "物料异常待审核"}-{record.businessNo}</Link></td><td><span className="todo-type">物料异常</span></td><td>{record.reporterOrganization}</td><td><time dateTime={record.updatedAt}>{formatRelativeTime(record.updatedAt)}</time></td><td><Link className="table-action" to={`/app/platform/business/material-exceptions/${record.id}`}>查看详情</Link></td></tr>)}
          {pendingIncomingInspections.map((record) => <tr key={record.id}><td><Link className="todo-title" to={`/app/platform/business/incoming-inspections/${record.id}`}>来料检验待审核-{record.businessNo}</Link></td><td><span className="todo-type">来料检验</span></td><td>{record.factoryOrganization}</td><td><time dateTime={record.updatedAt}>{formatRelativeTime(record.updatedAt)}</time></td><td><Link className="table-action" to={`/app/platform/business/incoming-inspections/${record.id}`}>查看详情</Link></td></tr>)}
        </tbody></table></div>
        <footer className="todo-pagination"><span>共 {totalPending} 条</span><button disabled>‹</button><button className="active">1</button><button disabled>›</button></footer>
      </> : <div className="todo-empty"><CheckCircle2 size={34} /><h2>暂无待办任务</h2><p>当前账号有权限的任务均已处理完成。</p></div>}
    </section>
  </div>;
}

function loadQeDemoFixtures(): number {
  const fixtures = makeQeDemoFixtures({
    factoryId: factoryOrganizationId,
    factoryName: roleProfiles.factory.organization,
    supplierId: supplierOrganizationId,
    platformName: roleProfiles.platform.organization,
    platformId: roleProfiles.platform.organizationId,
  });
  const additions = <T extends { id: string }>(key: string, records: T[], samples: T[]) => {
    const ids = new Set(records.map(({ id }) => id));
    const missing = samples.filter(({ id }) => !ids.has(id));
    return { key, missing, records: [...missing, ...records], original: localStorage.getItem(key) };
  };
  const groups = [
    additions(INCOMING_INSPECTION_STORAGE_KEY, readIncomingInspections(), fixtures.incoming),
    additions(DIRECT_BUSINESS_STORAGE_KEY, readDirectBusinessRecords(), fixtures.direct),
    additions(MATERIAL_EXCEPTION_STORAGE_KEY, readMaterialExceptions(), fixtures.material),
    additions(AFTER_SALES_STORAGE_KEY, readAfterSalesExceptions(), fixtures.afterSales),
    additions(AUDITED_BUSINESS_STORAGE_KEY, readAuditedBusinessRecords(), fixtures.audited),
    additions(SHIPMENT_REPORT_STORAGE_KEY, readShipmentReports(), fixtures.shipment),
    additions(PRODUCT_DATA_STORAGE_KEY, readProductData(), fixtures.products),
  ].filter(({ missing }) => missing.length);
  const written: typeof groups = [];
  try {
    for (const group of groups) {
      localStorage.setItem(group.key, JSON.stringify(group.records));
      written.push(group);
    }
  } catch (error) {
    for (const { key, original } of written.reverse()) {
      if (original === null) localStorage.removeItem(key);
      else localStorage.setItem(key, original);
    }
    throw error;
  }
  return groups.reduce((count, group) => count + group.missing.length, 0);
}

type QeHomeContext = { metricId: string; search: string };

function PlatformHome({ onQeContextChange }: { onQeContextChange: (context: QeHomeContext) => void }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [demoFeedback, setDemoFeedback] = useState<Feedback>();
  const lastDemoRequest = useRef("");
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("qeDemo") !== "1") { lastDemoRequest.current = ""; return; }
    if (lastDemoRequest.current === search) return;
    lastDemoRequest.current = search;
    params.delete("qeDemo");
    try {
      if (!qePlatformAccess()?.administrator) throw new Error("需要平台管理员权限");
      const added = loadQeDemoFixtures();
      setDemoFeedback({ tone: "success", message: added ? `已载入 ${added} 条 QE 模拟单据。打开右下角「QE 助手」查看简报。` : "QE 模拟数据已载入。" });
    } catch {
      setDemoFeedback({ tone: "error", message: "模拟数据加载失败，请使用平台管理员账号并检查浏览器存储空间。" });
    }
    navigate({ pathname, search: params.toString() }, { replace: true });
  }, [navigate, pathname, search]);
  const [dimension, setDimension] = useState<"year" | "month" | "day">("year");
  const [period, setPeriod] = useState("2026");
  const [organizationId, setOrganizationId] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("order_completion");
  useEffect(() => {
    onQeContextChange({ metricId: selectedMetric, search: new URLSearchParams({ organizationId, dimension, period }).toString() });
  }, [selectedMetric, organizationId, dimension, period, onQeContextChange]);
  const homeRecords = readDirectBusinessRecords();
  const organizations = [...new Map(homeRecords.map((record) => [record.factoryOrganizationId, record.factoryOrganization])).entries()];
  const qeDemoDates = homeRecords.filter((record) => record.id.startsWith("qe-demo-pir-")).map((record) => record.businessDate);
  const filters = { organizationId, dimension, period };
  const metricSnapshots = qualityMetricDefinitions.map((metric) => ({ ...metric, snapshot: metricSnapshotFor(metric.id, filters) }));
  const activeMetric = metricSnapshots.find((metric) => metric.id === selectedMetric) ?? metricSnapshots[0];
  const trendPeriods = dimension === "year"
    ? Array.from({ length: 12 }, (_, index) => `${period.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`)
    : dimension === "month"
      ? Array.from({ length: daysInDemoMonth(period.slice(0, 7)) }, (_, index) => `${period.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`)
      : Array.from({ length: 7 }, (_, index) => shiftDemoDate(period, index - 6));
  const trendLabels = trendPeriods.map((trendPeriod) => dimension === "year" ? `${trendPeriod.slice(5, 7)}月` : dimension === "month" ? `${Number(trendPeriod.slice(8, 10))}日` : trendPeriod.slice(5));
  const trendValues = trendPeriods.map((trendPeriod) => metricSnapshotFor(activeMetric.id, { organizationId, dimension, period: trendPeriod }).rate ?? 0);
  const points = trendValues.map((value, index) => `${(index / Math.max(1, trendValues.length - 1)) * 1000},${220 - (value / 100) * 200}`).join(" ");
  const areaPath = `M${points.replaceAll(" ", " L")} L1000 220 L0 220Z`;
  const yearOptions = [...new Set(["2026", ...qeDemoDates.map((date) => date.slice(0, 4))])];
  const monthOptions = [...new Set(["2026-08", "2026-07", "2026-06", ...qeDemoDates.map((date) => date.slice(0, 7)).sort().reverse()])];
  const dayOptions = [...new Set([...recentDemoDates(), ...qeDemoDates.sort().reverse()])];
  function updateDimension(next: "year" | "month" | "day") { setDimension(next); setPeriod(next === "year" ? yearOptions[0] : next === "month" ? monthOptions[0] : dayOptions[0]); }
  return (
    <div className="page-stack">
      <div className="page-heading heading-with-filters"><div><p>质量运营驾驶舱 · 演示数据</p><h1>首页总览</h1></div><div className="filter-row"><div className="segmented">{(["year", "month", "day"] as const).map((item) => <button key={item} className={dimension === item ? "active" : ""} onClick={() => updateDimension(item)}>{item === "year" ? "年" : item === "month" ? "月" : "日"}</button>)}</div><select className="select-like" aria-label="统计时间" value={period} onChange={(event) => setPeriod(event.target.value)}>{(dimension === "year" ? yearOptions : dimension === "month" ? monthOptions : dayOptions).map((option) => <option value={option} key={option}>{dimension === "year" ? `${option}年` : dimension === "month" ? `${option.slice(0, 4)}年${option.slice(5, 7)}月` : `${option}日`}</option>)}</select><select className="select-like" aria-label="统计组织" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="all">全部组织</option>{organizations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div></div>
      <ActionFeedback feedback={demoFeedback} />
      <section className="metric-grid" aria-label="质量指标">
        {metricSnapshots.map(({ id, label, href, snapshot }) => <article className={selectedMetric === id ? "selected" : ""} key={id} role="button" tabIndex={0} onClick={() => navigate(`${href}${href.includes("?") ? "&" : "?"}dimension=${dimension}&period=${period}&organizationId=${organizationId}`)} onKeyDown={(event) => { if (event.key === "Enter") navigate(`${href}${href.includes("?") ? "&" : "?"}dimension=${dimension}&period=${period}&organizationId=${organizationId}`); }}><p>{id === "customer_material" ? <>客供物料上线{"\u200b"}<br />合格率</> : label}</p><strong>{snapshot.rate === null ? "—" : snapshot.rate.toFixed(2)}<small>{snapshot.rate === null ? "" : "%"}</small></strong><span className={snapshot.rate !== null && snapshot.rate >= 95 ? "up" : "down"}>{snapshot.rate === null ? "暂无数据" : `${snapshot.numerator}/${snapshot.denominator}`}</span><em>分子/分母</em></article>)}
      </section>
      <section className="chart-card">
        <header><div><p>关键指标趋势分析</p><span>{activeMetric.label} · {dimension === "year" ? "按月" : dimension === "month" ? "按日" : "按天"}</span></div><Link className="secondary-button" to={`${activeMetric.href}${activeMetric.href.includes("?") ? "&" : "?"}dimension=${dimension}&period=${period}&organizationId=${organizationId}`}>查看分析 <BarChart3 size={16} /></Link></header>
        <div className="chart-tabs">{qualityMetricDefinitions.map((metric) => <button key={metric.id} className={selectedMetric === metric.id ? "active" : ""} onClick={() => setSelectedMetric(metric.id)}>{metric.label}趋势</button>)}</div>
        <div className="chart-wrap">
          <div className="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
          <svg viewBox="0 0 1000 230" role="img" aria-label={`${activeMetric.label}趋势折线图`} preserveAspectRatio="none">
            <title>{activeMetric.label}趋势</title>
            <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10a455" stopOpacity="0.2"/><stop offset="100%" stopColor="#10a455" stopOpacity="0"/></linearGradient></defs>
            <g className="grid-lines"><line x1="0" x2="1000" y1="20" y2="20"/><line x1="0" x2="1000" y1="70" y2="70"/><line x1="0" x2="1000" y1="120" y2="120"/><line x1="0" x2="1000" y1="170" y2="170"/><line x1="0" x2="1000" y1="220" y2="220"/></g>
            <path className="area" d={areaPath}/><polyline className="trend-line" points={points}/>
          </svg>
          <div className="x-labels">{trendLabels.map((label) => <span key={label}>{label}</span>)}</div>
        </div>
      </section>
    </div>
  );
}

function OrderCompletionAnalysisPage() {
  const { search } = useLocation(); const params = new URLSearchParams(search);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState<"all" | "已完成" | "进行中">("all");
  const rows = calculateOrderCompletion(undefined, undefined, { organizationId: params.get("organizationId") ?? "all", dimension: (params.get("dimension") as "year" | "month" | "day") || "year", period: params.get("period") || "2026", range: metricRangeFromSearch(params), materialNo: params.get("material") ?? undefined }).filter((row) => (!query.trim() || `${row.orderNo}${row.productName}${row.productModel}`.includes(query.trim())) && (status === "all" || row.status === status));
  const totalInbound = rows.reduce((sum, row) => sum + row.inboundQty, 0); const completed = rows.filter((row) => row.status === "已完成").length;
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><p className="page-kicker">数据分析</p><h1>订单完成率</h1></div><button className="secondary-button" onClick={() => exportRowsAsXlsx(`订单完成率${Date.now()}`, ["检验日报时间", "业务组织", "业务编码", "订单号", "产品名称", "产品型号", "已入库次数", "已入库数量", "检验订单数", "订单完成率", "订单状态"], rows.map((row) => [row.businessDate, row.organization, row.businessNo, row.orderNo, row.productName, row.productModel, row.inboundCount, row.inboundQty, row.orderQty, `${row.completionRate.toFixed(2)}%`, row.status]))}>导出</button></div><section className="list-summary"><div><span>订单组合数</span><strong>{rows.length}</strong></div><div><span>已完成订单</span><strong>{completed}</strong></div><div><span>累计入库数量</span><strong>{totalInbound.toLocaleString()}</strong></div></section><section className="admin-filter-card"><input aria-label="搜索订单或产品" placeholder="搜索订单号/产品名称/产品型号" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="订单状态" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">全部状态</option><option value="已完成">已完成</option><option value="进行中">进行中</option></select><button className="secondary-button" onClick={() => { setQuery(""); setStatus("all"); }}>重置</button></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>检验日报时间</th><th>业务组织</th><th>业务编码</th><th>检验订单号</th><th>产品名称</th><th>产品型号</th><th>已入库次数</th><th>已入库数量</th><th>检验订单数</th><th>订单完成率</th><th>订单状态</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td>{row.businessDate}</td><td>{row.organization}</td><td>{row.businessNo}</td><td>{row.orderNo}</td><td>{row.productName}</td><td>{row.productModel}</td><td>{row.inboundCount}</td><td>{row.inboundQty.toLocaleString()}</td><td>{row.orderQty.toLocaleString()}</td><td>{row.completionRate.toFixed(2)}%</td><td><span className={`status ${row.status === "已完成" ? "approved" : "pending"}`}>{row.status}</span></td></tr>)}{rows.length === 0 && <tr><td className="empty-cell" colSpan={11}>暂无匹配订单数据</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {rows.length} 条记录</span></div></section></div>;
}

function CustomerMaterialYieldAnalysisPage() {
  const { search } = useLocation(); const params = new URLSearchParams(search); const [query, setQuery] = useState("");
  const rows = calculateCustomerMaterialYield(undefined, undefined, { organizationId: params.get("organizationId") ?? "all", dimension: (params.get("dimension") as "year" | "month" | "day") || "year", period: params.get("period") || "2026", range: metricRangeFromSearch(params), materialNo: params.get("material") ?? undefined }).filter((row) => !query.trim() || `${row.materialNo}${row.productName}${row.businessNo}`.includes(query.trim()));
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><p className="page-kicker">数据分析</p><h1>客供物料上线合格率</h1></div><button className="secondary-button" onClick={() => exportRowsAsXlsx(`客供物料上线合格率${Date.now()}`, ["入库时间", "业务组织", "业务编码", "物料料号", "产品名称", "产品型号", "入库数量", "总数量", "退料数量", "客供物料上线合格率"], rows.map((row) => [row.businessDate, row.organization, row.businessNo, row.materialNo, row.productName, row.productModel, row.inboundQty, row.totalQty, row.returnQty, row.rate === null ? "未统计" : `${row.rate.toFixed(2)}%`]))}>导出</button></div><section className="list-summary"><div><span>统计记录</span><strong>{rows.length}</strong></div><div><span>上线物料总数</span><strong>{rows.reduce((sum, row) => sum + row.totalQty, 0).toLocaleString()}</strong></div><div><span>退料数量</span><strong>{rows.reduce((sum, row) => sum + row.returnQty, 0).toLocaleString()}</strong></div></section><section className="admin-filter-card"><input aria-label="搜索物料或产品" placeholder="搜索业务编码/物料料号/产品名称" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button" onClick={() => setQuery("")}>重置</button></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>入库时间</th><th>业务组织</th><th>业务编码</th><th>物料料号</th><th>产品名称</th><th>产品型号</th><th>入库数量</th><th>总数量</th><th>退料数量</th><th>客供物料上线合格率</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td>{row.businessDate}</td><td>{row.organization}</td><td>{row.businessNo}</td><td>{row.materialNo}</td><td>{row.productName}</td><td>{row.productModel}</td><td>{row.inboundQty.toLocaleString()}</td><td>{row.matched ? row.totalQty.toLocaleString() : "未统计"}</td><td>{row.returnQty.toLocaleString()}</td><td>{row.rate === null ? <span className="status cancelled">未统计</span> : `${row.rate.toFixed(2)}%`}</td></tr>)}{rows.length === 0 && <tr><td className="empty-cell" colSpan={10}>暂无匹配客供物料数据</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {rows.length} 条记录</span></div></section></div>;
}

function ProductDataDialog({ record, onClose, onSaved }: { record?: ProductDataRecord; onClose: () => void; onSaved: (message: string) => void }) {
  const [productName, setProductName] = useState(record?.productName ?? ""); const [productModel, setProductModel] = useState(record?.productModel ?? ""); const [materialNo, setMaterialNo] = useState(record?.materialNo ?? ""); const [materialQty, setMaterialQty] = useState(String(record?.materialQty ?? "")); const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const records = readProductData(); const no = materialNo.trim(); const name = productName.trim(); const model = productModel.trim(); const qty = Number(materialQty); if (!record && !new RegExp("^[0-9]{8}$").test(no)) { setError("物料料号必须为8位数字"); return; } if (!name || name.length > 100 || !model || model.length > 100 || !Number.isInteger(qty) || qty <= 0) { setError("请完整填写产品名称、产品型号和正整数物料数量"); return; } if (records.some((item) => item.id !== record?.id && (item.materialNo === no || item.productName === name))) { setError("物料料号或产品名称已存在"); return; } const now = "2026-08-24"; const saved: ProductDataRecord = { id: record?.id ?? `product-data-${Date.now()}`, organizationId: factoryOrganizationId, materialNo: record?.materialNo ?? no, materialType: "product", productName: name, productModel: model, materialQty: qty, status: record?.status ?? "enabled", createdAt: record?.createdAt ?? now, updatedAt: now }; saveProductData(record ? records.map((item) => item.id === record.id ? saved : item) : [saved, ...records]); onSaved(record ? "产品数据已保存" : "产品数据已新增"); }
  return <div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="product-data-dialog-title"><header><h2 id="product-data-dialog-title">{record ? "编辑产品数据" : "新增产品数据"}</h2><button aria-label="关闭产品数据弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><label className="dialog-input">物料类型<select disabled value="product"><option value="product">产品</option></select></label><label className="dialog-input">物料料号<input aria-label="物料料号" required disabled={Boolean(record)} inputMode="numeric" value={materialNo} onChange={(event) => setMaterialNo(event.target.value)} /></label><label className="dialog-input">产品名称<input aria-label="产品名称" required maxLength={100} value={productName} onChange={(event) => setProductName(event.target.value)} /></label><label className="dialog-input">产品型号<input aria-label="产品型号" required maxLength={100} value={productModel} onChange={(event) => setProductModel(event.target.value)} /></label><label className="dialog-input">物料数量<input aria-label="物料数量" required min={1} step={1} type="number" value={materialQty} onChange={(event) => setMaterialQty(event.target.value)} /></label>{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">确定</button></footer></form></section></div>;
}

function ProductDataPage() {
  const { search } = useLocation();
  const [records, setRecords] = useState(readProductData); const [query, setQuery] = useState(() => new URLSearchParams(search).get("material") ?? ""); const [status, setStatus] = useState<"all" | ProductDataRecord["status"]>("all"); const [editing, setEditing] = useState<ProductDataRecord>(); const [open, setOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>(); const filtered = records.filter((item) => (!query.trim() || `${item.materialNo}${item.productName}${item.productModel}`.includes(query.trim())) && (status === "all" || item.status === status));
  function toggle(record: ProductDataRecord) { const next = record.status === "enabled" ? "disabled" : "enabled"; saveProductData(records.map((item) => item.id === record.id ? { ...item, status: next, updatedAt: "2026-08-24" } : item)); setRecords(readProductData()); setFeedback({ tone: "success", message: next === "enabled" ? "产品数据已启用" : "产品数据已禁用" }); }
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><h1>产品数据</h1><div className="list-page-actions"><button className="secondary-button" onClick={() => setRecords(readProductData())}><RefreshCw size={15} />刷新</button><button className="primary-small" onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={16} />新增</button></div></div><ActionFeedback feedback={feedback} /><section className="admin-filter-card"><input aria-label="搜索产品数据" placeholder="搜索物料料号/产品名称/产品型号" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="产品数据状态" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">全部状态</option><option value="enabled">启用</option><option value="disabled">禁用</option></select><button className="secondary-button" onClick={() => { setQuery(""); setStatus("all"); }}>重置</button></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>物料料号</th><th>物料类型</th><th>产品名称</th><th>产品型号</th><th>物料数量</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td>{record.materialNo}</td><td>产品</td><td>{record.productName}</td><td>{record.productModel}</td><td>{record.materialQty}</td><td>{record.createdAt}</td><td><span className={`status ${record.status === "enabled" ? "approved" : "cancelled"}`}>{record.status === "enabled" ? "启用" : "禁用"}</span></td><td><button className="table-action" onClick={() => { setEditing(record); setOpen(true); }}><Pencil size={13} />编辑</button><button className="table-action" onClick={() => toggle(record)}>{record.status === "enabled" ? "禁用" : "启用"}</button></td></tr>)}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={8}>暂无产品数据</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 条记录</span></div></section>{open && <ProductDataDialog record={editing} onClose={() => setOpen(false)} onSaved={(message) => { setRecords(readProductData()); setOpen(false); setFeedback({ tone: "success", message }); }} />}</div>;
}

function MerchantStatusBadge({ application }: { application: MerchantApplication }) {
  const label = application.reviewStatus === "approved" ? (application.usageStatus === "inactive" ? "已停用" : "正常") : merchantReviewLabel(application.reviewStatus);
  const className = application.reviewStatus === "approved" && application.usageStatus === "active" ? "approved" : application.reviewStatus === "rejected" ? "rejected" : application.reviewStatus === "cancelled" || application.usageStatus === "inactive" ? "cancelled" : "pending";
  return <span className={`status ${className}`}>{label}</span>;
}

type ConfigurationView = "businesses" | "assets" | "analytics" | "audit" | "dictionaries" | "fields" | "schemas" | "designer";
const emptyCustomField = (): Omit<FieldDefinition, "source" | "status" | "updatedAt"> => ({ code: "", name: "", type: "single_line", validation: {}, description: "" });

function ConfigurationNavigation({ view }: { view: ConfigurationView }) {
  const assetLinks: Array<["dictionaries" | "fields", string]> = [["dictionaries", "字典管理"], ["fields", "字段库"]];
  if (!["dictionaries", "fields"].includes(view)) return null;
  return <nav className="configuration-subtabs" aria-label="表单资产页面切换">{assetLinks.map(([key, label]) => <Link key={key} to={`/app/platform/configuration/${key}`} className={view === key ? "active" : ""}>{label}</Link>)}</nav>;
}

function CustomFieldDialog({ field, onClose, onSaved }: { field?: FieldDefinition; onClose: () => void; onSaved: (message: string) => void }) {
  const [draft, setDraft] = useState<Omit<FieldDefinition, "source" | "status" | "updatedAt">>(field ? { code: field.code, name: field.name, type: field.type, validation: field.validation, description: field.description } : emptyCustomField());
  const [error, setError] = useState("");
  function update<K extends keyof typeof draft>(key: K, value: typeof draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { saveFieldDefinition(draft, field?.code); onSaved(field ? "自定义字段已保存" : "自定义字段已新增"); } catch (reason) { setError(reason instanceof Error ? reason.message : "字段保存失败"); } }
  return <div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="custom-field-dialog-title"><header><h2 id="custom-field-dialog-title">{field ? "编辑自定义字段" : "新增自定义字段"}</h2><button aria-label="关闭字段弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="admin-form-grid"><label className="dialog-input">字段编码<input aria-label="字段编码" disabled={Boolean(field)} value={draft.code} placeholder="如 CUSTOM_001" onChange={(event) => update("code", event.target.value.toUpperCase())} /></label><label className="dialog-input">字段名称<input aria-label="字段名称" value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label className="dialog-input">字段类型<select aria-label="字段类型" value={draft.type} onChange={(event) => update("type", event.target.value as FieldType)}>{Object.entries(fieldTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="dialog-input">最大值/长度<input aria-label="字段最大值" type="number" min={0} value={draft.validation.max ?? ""} onChange={(event) => update("validation", { ...draft.validation, max: event.target.value === "" ? undefined : Number(event.target.value) })} /></label></div><label className="dialog-input"><span><input type="checkbox" checked={Boolean(draft.validation.required)} onChange={(event) => update("validation", { ...draft.validation, required: event.target.checked })} /> 必填字段</span></label><label className="dialog-input">字段说明<textarea aria-label="字段说明" value={draft.description} maxLength={200} onChange={(event) => update("description", event.target.value)} /></label>{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">保存</button></footer></form></section></div>;
}

function DictionaryManagementPage() {
  const [dictionaries, setDictionaries] = useState(readConfigDictionaries); const [query, setQuery] = useState(""); const [editingCode, setEditingCode] = useState<string>(); const [feedback, setFeedback] = useState<Feedback>();
  const filtered = dictionaries.filter((dictionary) => !query.trim() || `${dictionary.code}${dictionary.name}${dictionary.description}${dictionary.items.map((item) => item.name).join("")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const editingDictionary = dictionaries.find((dictionary) => dictionary.code === editingCode);
  function toggle(dictionaryCode: string, itemCode: string, next: DictionaryStatus) {
    try {
      setDictionaries(setDictionaryItemStatus(dictionaryCode, itemCode, next));
      const itemName = dictionaries.find((dictionary) => dictionary.code === dictionaryCode)?.items.find((item) => item.code === itemCode)?.name ?? itemCode;
      setFeedback({ tone: "success", message: next === "disabled" ? `已停用「${itemName}」，新建业务将不再显示该项` : `已启用「${itemName}」` });
    } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "操作失败" }); }
  }
  return <div className="page-stack platform-admin-page configuration-page"><div className="page-heading"><p>CONFIGURATION CENTER</p><h1>字典管理</h1><span>维护枚举字典及字典项；停用后仅影响新建业务，已存业务继续按原值显示。</span></div><ConfigurationNavigation view="dictionaries" /><ActionFeedback feedback={feedback} /><section className="admin-filter-card configuration-filter"><input aria-label="搜索字典" placeholder="搜索字典编码、名称或字典项" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button" onClick={() => setQuery("")}>重置</button></section><section className="work-card admin-table-card dictionary-table"><div className="responsive-table"><table><colgroup><col className="dict-col-code" /><col className="dict-col-name" /><col className="dict-col-desc" /><col className="dict-col-items" /><col className="dict-col-source" /><col className="dict-col-action" /></colgroup><thead><tr><th>字典编码</th><th>字典名称</th><th>描述</th><th>字典项</th><th>来源</th><th>操作</th></tr></thead><tbody>{filtered.map((dictionary) => <tr key={dictionary.code}><td>{dictionary.code}</td><td><strong>{dictionary.name}</strong></td><td><span className="muted-cell">{dictionary.description || "—"}</span></td><td><div className="dictionary-items">{dictionary.items.map((item) => <span key={item.code} className={item.status === "disabled" ? "disabled" : ""} title={item.status === "disabled" ? `${item.name}（已停用）` : undefined}>{item.name}</span>)}</div></td><td className="dictionary-source">内置</td><td><button className="table-action" onClick={() => setEditingCode(dictionary.code)}><Pencil size={13} />编辑</button></td></tr>)}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={6}>暂无匹配字典</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 个枚举字典</span></div></section>{editingDictionary && <DictionaryEditDialog dictionary={editingDictionary} onToggle={(itemCode, next) => toggle(editingDictionary.code, itemCode, next)} onClose={() => setEditingCode(undefined)} />}</div>;
}

function DictionaryEditDialog({ dictionary, onToggle, onClose }: { dictionary: ConfigDictionary; onToggle: (itemCode: string, next: DictionaryStatus) => void; onClose: () => void }) {
  const enabledCount = dictionary.items.filter((item) => item.status === "enabled").length;
  return <div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog dictionary-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="dictionary-edit-title">
    <header><h2 id="dictionary-edit-title">编辑字典 · {dictionary.code}</h2><button aria-label="关闭字典编辑弹窗" onClick={onClose}><X size={21} /></button></header>
    <div className="dialog-body">
      <div className="dictionary-meta">
        <div><span>字典编码</span><strong>{dictionary.code}</strong></div>
        <div><span>字典名称</span><strong>{dictionary.name}</strong></div>
        <div><span>字典项状态</span><strong>启用 {enabledCount} / 共 {dictionary.items.length}</strong></div>
        <div><span>字典分类</span><strong>枚举字典</strong></div>
        <div className="wide"><span>描述</span><strong>{dictionary.description || "—"}</strong></div>
      </div>
      <div className="dictionary-item-editor">
        <div className="dictionary-item-editor-head"><span>字典项</span><em>停用后仅影响新建业务，已存业务继续按原值显示</em></div>
        {dictionary.items.map((item) => <div className="dictionary-item-row" key={item.code}>
          <div className="dictionary-item-name"><strong>{item.name}</strong><small>{item.code} · 值 {item.value}</small></div>
          <span className={`status ${item.status === "enabled" ? "approved" : "cancelled"}`}>{item.status === "enabled" ? "启用" : "已停用"}</span>
          <button className="dictionary-item-toggle" onClick={() => onToggle(item.code, item.status === "enabled" ? "disabled" : "enabled")}>{item.status === "enabled" ? "停用" : "启用"}</button>
        </div>)}
      </div>
    </div>
    <footer><button type="button" className="primary-small" onClick={onClose}>完成</button></footer>
  </section></div>;
}

function EllipsisCell({ text, className }: { text: string; className?: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ left: number; top: number; above: boolean }>();
  function openTip() {
    const node = textRef.current;
    if (!node || node.scrollWidth <= node.clientWidth + 1) return;
    const rect = node.getBoundingClientRect();
    const above = rect.bottom + 96 > window.innerHeight;
    setTip({ left: Math.max(12, Math.min(rect.left, window.innerWidth - 472)), top: above ? rect.top - 8 : rect.bottom + 8, above });
  }
  return <td onMouseEnter={openTip} onMouseLeave={() => setTip(undefined)}><span ref={textRef} className={className ? `cell-ellipsis ${className}` : "cell-ellipsis"}>{text}</span>{tip && createPortal(<div className={tip.above ? "cell-tooltip above" : "cell-tooltip"} role="tooltip" style={{ left: tip.left, top: tip.top }}>{text}</div>, document.body)}</td>;
}

const rowActionMenuWidth = 172;

function RowActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const pendingAutoFocus = useRef(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number }>();
  const [above, setAbove] = useState(false);
  const open = Boolean(anchor);
  function returnFocus() { triggerRef.current?.focus(); }
  function openMenu() {
    window.clearTimeout(closeTimer.current);
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setAbove(false);
    setAnchor({ left: Math.max(12, Math.min(rect.right - rowActionMenuWidth, window.innerWidth - rowActionMenuWidth - 12)), top: rect.bottom + 6 });
  }
  function scheduleClose() { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setAnchor(undefined), 160); }
  function closeMenu() { window.clearTimeout(closeTimer.current); setAnchor(undefined); }
  function keepOpen() { window.clearTimeout(closeTimer.current); }
  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!anchor || !node) return;
    if (pendingAutoFocus.current) { pendingAutoFocus.current = false; node.querySelector<HTMLElement>("a, button")?.focus(); }
    if (!above && anchor.top + node.offsetHeight > window.innerHeight - 8) setAbove(true);
  });
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
  }, [open]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  return <>
    <button
      ref={triggerRef}
      type="button"
      className={open ? "row-more-trigger open" : "row-more-trigger"}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      title="更多操作"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={() => { if (menuRef.current) keepOpen(); }}
      onBlur={(event) => { if (!menuRef.current?.contains(event.relatedTarget as Node)) scheduleClose(); }}
      onClick={() => {
        // 触屏等无 hover 的设备用点击切换；鼠标设备靠悬停展开，避免「悬停已打开→点击又收起」
        if (window.matchMedia?.("(hover: hover)").matches) return;
        if (open) closeMenu(); else openMenu();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") { event.preventDefault(); if (open) menuRef.current?.querySelector<HTMLElement>("a, button")?.focus(); else { pendingAutoFocus.current = true; openMenu(); } }
        else if (event.key === "Escape") { closeMenu(); returnFocus(); }
      }}
    ><MoreHorizontal size={17} /></button>
    {anchor && createPortal(<div ref={menuRef} className={above ? "row-more-menu above" : "row-more-menu"} role="menu" aria-label={label} style={{ left: anchor.left, top: anchor.top }} onMouseEnter={keepOpen} onMouseLeave={scheduleClose} onClick={closeMenu} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); closeMenu(); returnFocus(); } }}>{children}</div>, document.body)}
  </>;
}

function FieldLibraryPage() {
  const [fields, setFields] = useState(readFieldDefinitions); const [query, setQuery] = useState(""); const [source, setSource] = useState<"all" | FieldDefinition["source"]>("all"); const [editing, setEditing] = useState<FieldDefinition>(); const [dialogOpen, setDialogOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>();
  const filtered = fields.filter((field) => (source === "all" || field.source === source) && (!query.trim() || `${field.code}${field.name}${field.description}`.toLowerCase().includes(query.trim().toLowerCase())));
  function toggle(field: FieldDefinition) { try { const next = field.status === "enabled" ? "disabled" : "enabled"; setFields(setFieldStatus(field.code, next)); setFeedback({ tone: "success", message: next === "enabled" ? "字段已启用" : "字段已停用；已发布版本和历史记录不受影响" }); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "操作失败" }); } }
  return <div className="page-stack platform-admin-page configuration-page"><div className="list-page-title"><div><p className="page-kicker">CONFIGURATION CENTER</p><h1>字段库</h1></div><div className="list-page-actions"><button className="secondary-button" onClick={() => setFields(readFieldDefinitions())}><RefreshCw size={15} />刷新</button><button className="primary-small" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus size={16} />新增自定义字段</button></div></div><ConfigurationNavigation view="fields" /><ActionFeedback feedback={feedback} /><section className="admin-filter-card configuration-filter"><input aria-label="搜索字段" placeholder="搜索字段编码、名称或说明" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="字段来源" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="all">全部来源</option><option value="builtin">内置字段</option><option value="custom">自定义字段</option></select><button className="secondary-button" onClick={() => { setQuery(""); setSource("all"); }}>重置</button></section><section className="work-card admin-table-card field-table"><div className="responsive-table"><table><colgroup><col className="field-col-code" /><col className="field-col-name" /><col className="field-col-desc" /><col className="field-col-type" /><col className="field-col-rule" /><col className="field-col-source" /><col className="field-col-status" /><col className="field-col-updated" /><col className="field-col-action" /></colgroup><thead><tr><th>字段编码</th><th>字段名称</th><th>描述</th><th>字段类型</th><th>校验规则</th><th>来源</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{filtered.map((field) => <tr key={field.code}><EllipsisCell text={field.code} /><EllipsisCell text={field.name} className="cell-strong" /><EllipsisCell text={field.description || "—"} className="muted-cell" /><EllipsisCell text={fieldTypeLabels[field.type]} /><EllipsisCell text={formatValidation(field.validation)} /><EllipsisCell text={field.source === "builtin" ? "内置" : "自定义"} /><td><span className={`status ${field.status === "enabled" ? "approved" : "cancelled"}`}>{field.status === "enabled" ? "启用" : "停用"}</span></td><EllipsisCell text={field.updatedAt} /><td><button className="table-action" disabled={field.source === "builtin"} onClick={() => { setEditing(field); setDialogOpen(true); }}><Pencil size={13} />编辑</button><button className="table-action" onClick={() => toggle(field)}>{field.status === "enabled" ? "停用" : "启用"}</button></td></tr>)}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={9}>暂无匹配字段</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 个字段</span></div></section>{dialogOpen && <CustomFieldDialog field={editing} onClose={() => setDialogOpen(false)} onSaved={(message) => { setFields(readFieldDefinitions()); setDialogOpen(false); setFeedback({ tone: "success", message }); }} />}</div>;
}

function ConfigSchemaPage() {
  const [schemas, setSchemas] = useState(readConfigSchemas); const [raw, setRaw] = useState(() => configSchemaJson(readConfigSchemas()[0])); const [feedback, setFeedback] = useState<Feedback>();
  function save(): void { try { const saved = saveConfigSchemaJson(raw); setSchemas(readConfigSchemas()); setRaw(configSchemaJson(saved)); setFeedback({ tone: "success", message: `已保存 ${saved.name} v${saved.schemaVersion}，刷新后仍可追溯该版本` }); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "配置保存失败" }); } }
  return <div className="page-stack platform-admin-page configuration-page"><div className="page-heading"><p>CONFIGURATION CENTER</p><h1>配置Schema</h1><span>每次保存生成一个不可变的版本快照；本阶段仅管理配置输入，发布、回滚与运行时将在后续任务接入。</span></div><ConfigurationNavigation view="schemas" /><ActionFeedback feedback={feedback} /><div className="schema-layout"><section className="work-card schema-list"><header><div><strong>版本列表</strong><span>已保存 {schemas.length} 个版本</span></div></header>{schemas.map((schema) => <button key={schema.id} className="schema-version" onClick={() => { setRaw(configSchemaJson(schema)); setFeedback(undefined); }}><span><strong>{schema.name}</strong><small>{schema.code}</small></span><span className={`status ${schema.status === "published" ? "approved" : "pending"}`}>v{schema.schemaVersion} · {schema.status === "published" ? "已发布" : "草稿"}</span></button>)}</section><section className="work-card schema-editor"><header><div><strong>JSON 编辑器</strong><span>字段引用必须存在于字段库，且同一schema不能重复引用字段。</span></div><button className="primary-small" onClick={save}>保存新版本</button></header><textarea aria-label="配置Schema JSON" value={raw} onChange={(event) => setRaw(event.target.value)} spellCheck={false} /><footer><span>保存后会生成下一个版本号，不会覆盖历史版本。</span></footer></section></div></div>;
}

function DesignRuleCard({ draft, field, group, definition, conditionTargets, onCommit }: { draft: FormDesignDraft; field: FormDesignDraft["groups"][number]["fields"][number]; group: FormDesignDraft["groups"][number]; definition?: FieldDefinition; conditionTargets: FormDesignDraft["groups"][number]["fields"]; onCommit: (next: FormDesignDraft, message?: string) => void }) {
  if (!definition) return null;
  const validation = field.validation ?? { kind: "none" as const };
  const commitValidation = (patch: Partial<DesignValidation>, message?: string) => {
    const next = { ...validation, ...patch };
    onCommit(updateDesignField(draft, field.fieldCode, { validation: next }), message);
  };
  return <article className="designer-rule-card"><header><div><strong>{field.label}</strong><span>{field.fieldCode} · {group.name} · {definition ? fieldTypeLabels[definition.type] : "未知类型"}</span></div><label className="designer-checkbox"><input type="checkbox" aria-label={`${field.label}显示`} checked={field.visible} onChange={(event) => onCommit(updateDesignField(draft, field.fieldCode, { visible: event.target.checked }), "显示规则已保存")} />显示</label><label className="designer-checkbox"><input type="checkbox" aria-label={`${field.label}必填`} checked={field.required} onChange={(event) => onCommit(updateDesignField(draft, field.fieldCode, { required: event.target.checked }), "必填规则已保存")} />始终必填</label></header><div className="designer-rule-grid"><label>校验类型<select aria-label={`${field.label}校验类型`} value={validation.kind} disabled><option value="none">无额外校验</option><option value="text">文本规则</option><option value="number">数字规则</option><option value="date">日期规则</option><option value="choice">选项规则</option><option value="file">附件规则</option></select></label>{(validation.kind === "text" || validation.kind === "number" || validation.kind === "date") && <><label>{validation.kind === "text" ? "最小长度" : validation.kind === "number" ? "最小值" : "最早日期"}<input aria-label={`${field.label}最小值`} type={validation.kind === "date" ? "date" : "number"} value={validation.min ?? ""} onChange={(event) => commitValidation({ min: event.target.value === "" ? undefined : validation.kind === "date" ? event.target.value : Number(event.target.value) })} /></label><label>{validation.kind === "text" ? "最大长度" : validation.kind === "number" ? "最大值" : "最晚日期"}<input aria-label={`${field.label}最大值`} type={validation.kind === "date" ? "date" : "number"} value={validation.max ?? ""} onChange={(event) => commitValidation({ max: event.target.value === "" ? undefined : validation.kind === "date" ? event.target.value : Number(event.target.value) })} /></label></>}{validation.kind === "text" && <label>格式规则<input aria-label={`${field.label}格式规则`} placeholder="字母数字 / 数字，8位整数" value={validation.pattern ?? ""} onChange={(event) => commitValidation({ pattern: event.target.value || undefined })} /></label>}{validation.kind === "choice" && <div className="designer-rule-options wide"><div className="designer-rule-options-header"><strong>选项配置</strong><button type="button" className="table-action" onClick={() => commitValidation({ options: [...(validation.options ?? []), `选项${(validation.options?.length ?? 0) + 1}`] }, "已新增选项")}>新增选项</button></div>{(validation.options ?? []).map((option, index) => <div className="designer-rule-option" key={`${field.fieldCode}-option-${index}`}><input aria-label={`${field.label}选项${index + 1}`} value={option} placeholder={`选项${index + 1}`} onChange={(event) => { const options = [...(validation.options ?? [])]; options[index] = event.target.value; commitValidation({ options }); }} /><button type="button" className="table-action danger-text" aria-label={`删除${field.label}选项${index + 1}`} onClick={() => commitValidation({ options: (validation.options ?? []).filter((_, optionIndex) => optionIndex !== index) })}>删除</button></div>)}</div>}{validation.kind === "file" && <><label>允许文件类型<input aria-label={`${field.label}允许文件类型`} placeholder="JPG, PNG, PDF" value={(validation.accept ?? []).join(", ")} onChange={(event) => commitValidation({ accept: event.target.value.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean) })} /></label><label>最大文件数量<input aria-label={`${field.label}最大文件数量`} type="number" min={1} value={validation.maxFiles ?? 1} onChange={(event) => commitValidation({ maxFiles: Math.max(1, Number(event.target.value) || 1) })} /></label></>}<label className="wide">错误提示<input aria-label={`${field.label}错误提示`} placeholder="留空使用系统提示" value={validation.message ?? ""} onChange={(event) => commitValidation({ message: event.target.value || undefined })} /></label><label>条件必填字段<select aria-label={`${field.label}条件字段`} value={field.requiredWhen?.fieldCode ?? ""} onChange={(event) => onCommit(updateDesignField(draft, field.fieldCode, { requiredWhen: event.target.value ? { fieldCode: event.target.value, operator: "filled" } : undefined }), "条件必填规则已保存")}><option value="">不启用条件必填</option>{conditionTargets.map((target) => <option key={target.fieldCode} value={target.fieldCode}>{target.label}</option>)}</select></label><label>判断方式<select aria-label={`${field.label}条件方式`} disabled={!field.requiredWhen} value={field.requiredWhen?.operator ?? "filled"} onChange={(event) => onCommit(updateDesignField(draft, field.fieldCode, { requiredWhen: field.requiredWhen ? { ...field.requiredWhen, operator: event.target.value as "equals" | "not_equals" | "filled" } : undefined }))}><option value="filled">有值时</option><option value="equals">等于</option><option value="not_equals">不等于</option></select></label><label>条件值<input aria-label={`${field.label}条件值`} disabled={!field.requiredWhen || field.requiredWhen.operator === "filled"} value={field.requiredWhen?.value ?? ""} onChange={(event) => onCommit(updateDesignField(draft, field.fieldCode, { requiredWhen: field.requiredWhen ? { ...field.requiredWhen, value: event.target.value } : undefined }))} /></label></div></article>;
}

type BusinessWorkbenchStep = "basic" | "form" | "workflow" | "permissions" | "analysis" | "preview" | "history";
const businessWorkbenchTabs: Array<[string, BusinessWorkbenchStep, string]> = [
  ["基本信息", "basic", "业务元信息与适用端"],
  ["表单设计", "form", "字段布局、规则与预览"],
  ["流程配置", "workflow", "节点、状态与处理权限"],
  ["权限与入口", "permissions", "菜单、提报端与数据范围"],
  ["分析设置", "analysis", "列表字段、维度与指标"],
  ["预览与发布", "preview", "联合校验、版本与激活"],
];

function BusinessWorkbenchNavigation({ isNew = false, activeStep, hrefForStep }: { isNew?: boolean; activeStep: BusinessWorkbenchStep; hrefForStep: (step: BusinessWorkbenchStep) => string }) {
  return <nav className="business-workbench-tabs" aria-label="业务定义配置步骤">{businessWorkbenchTabs.map(([label, step, hint]) => {
    const enabled = !isNew || step === "basic";
    return enabled
      ? <Link key={step} className={activeStep === step ? "active" : ""} to={hrefForStep(step)}>{label}<small>{hint}</small></Link>
      : <button key={step} type="button" disabled>{label}<small>保存基本信息后继续</small></button>;
  })}</nav>;
}

function FormDesignerPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const mode = new URLSearchParams(search).get("mode");
  const businessId = new URLSearchParams(search).get("businessId");
  const business = businessId ? readConfigurationBusinesses().find((entry) => entry.id === businessId) : undefined;
  const persistedSchemas = readConfigSchemas();
  const initialSchema = business ? getBusinessSchema(business.code, business.name, business.status === "active" ? "published" : "draft") : persistedSchemas[0];
  const schemas = initialSchema && !persistedSchemas.some((entry) => entry.id === initialSchema.id) ? [initialSchema, ...persistedSchemas] : persistedSchemas;
  const supportedSchemas = business ? schemas.filter((entry) => entry.code === business.code) : schemas;
  const [schemaId, setSchemaId] = useState(initialSchema.id);
  const schema = supportedSchemas.find((entry) => entry.id === schemaId) ?? initialSchema;
  const [draft, setDraft] = useState<FormDesignDraft>(() => readFormDesignDraft(initialSchema));
  const [selectedFieldCode, setSelectedFieldCode] = useState<string | undefined>(() => draft.groups.flatMap((group) => group.fields)[0]?.fieldCode);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(() => draft.groups[0]?.id);
  const [fieldQuery, setFieldQuery] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [versionName, setVersionName] = useState("");
  const [versionChangeNote, setVersionChangeNote] = useState("");
  const [draftSaved, setDraftSaved] = useState(() => business?.draftStatus === "saved");
  const availableFields = readFieldDefinitions().filter((field) => field.status === "enabled" && `${field.code}${field.name}${field.description}`.toLowerCase().includes(fieldQuery.trim().toLowerCase()));
  const selectedField = draft.groups.flatMap((group) => group.fields).find((field) => field.fieldCode === selectedFieldCode);
  const selectedFieldDefinition = selectedField ? readFieldDefinitions().find((field) => field.code === selectedField.fieldCode) : undefined;
  const published = schema.status === "published";
  const versionHistory = readFormDesignVersions(schema.code);

  function commit(next: FormDesignDraft, message?: string): void {
    if (published) { setFeedback({ tone: "error", message: "已发布版本只读，请复制为新草稿后编辑" }); return; }
    const saved = saveFormDesignDraft(next);
    if (business) {
      const businessConfig = readBusinessDefinitionConfig(business.id, saved, business.code, business.name);
      saveBusinessDefinitionConfig({ ...businessConfig, draftStatus: "saved", lastValidationError: undefined, draft: { ...businessConfig.draft, form: saved, updatedAt: "2026-08-29 10:00" } });
    }
    setDraft(saved);
    setDraftSaved(true);
    if (message) setFeedback({ tone: "success", message });
  }

  function saveDraftExplicitly(): void {
    if (published) {
      setFeedback({ tone: "error", message: "已发布版本只读，请复制为新草稿后保存" });
      return;
    }
    saveFormDesignDraft(draft);
    if (business) {
      const businessConfig = readBusinessDefinitionConfig(business.id, draft, business.code, business.name);
      saveBusinessDefinitionConfig({ ...businessConfig, draftStatus: "saved", lastValidationError: undefined, draft: { ...businessConfig.draft, form: draft, updatedAt: "2026-08-29 10:00" } });
    }
    setDraftSaved(true);
    setFeedback({ tone: "success", message: "表单设计草稿已保存" });
  }

  function publishVersion(): void {
    const changeNote = versionChangeNote.trim();
    if (!changeNote) {
      setFeedback({ tone: "error", message: "请填写发布变更说明" });
      return;
    }
    if (changeNote.length > 500) {
      setFeedback({ tone: "error", message: "发布变更说明不能超过 500 个字符" });
      return;
    }
    try {
      saveFormDesignVersion(schema, draft, changeNote, versionName.trim() || undefined);
      setConfigSchemaStatus(schema.id, "published");
      setFeedback({ tone: "success", message: `${schema.name} v${schema.schemaVersion} 已发布，历史版本保持不变` });
    } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "版本发布失败" }); }
  }

  function rollbackVersion(record: FormDesignVersionRecord): void {
    const sourceSchema = schemas.find((entry) => entry.id === record.schemaId);
    if (!sourceSchema) { setFeedback({ tone: "error", message: "历史版本对应的Schema不存在" }); return; }
    try {
      const rollbackSchema = copyConfigSchemaVersion(sourceSchema, `${sourceSchema.name}（回滚副本）`);
      saveCopiedFormDesignDraft(record.draft, rollbackSchema);
      setSchemaId(rollbackSchema.id);
      const rollbackDraft = readFormDesignDraft(rollbackSchema);
      setDraft(rollbackDraft);
      setSelectedGroupId(rollbackDraft.groups[0]?.id);
      setSelectedFieldCode(rollbackDraft.groups.flatMap((group) => group.fields)[0]?.fieldCode);
      setFeedback({ tone: "success", message: `已从 v${record.version} 回滚为 ${rollbackSchema.name} v${rollbackSchema.schemaVersion} 草稿` });
    } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "回滚失败" }); }
  }

  function selectSchema(nextId: string): void {
    const nextSchema = schemas.find((entry) => entry.id === nextId);
    if (!nextSchema) return;
    const nextDraft = readFormDesignDraft(nextSchema);
    setSchemaId(nextId);
    setDraft(nextDraft);
    setSelectedGroupId(nextDraft.groups[0]?.id);
    setSelectedFieldCode(nextDraft.groups.flatMap((group) => group.fields)[0]?.fieldCode);
    setDraftSaved(false);
    setFeedback(undefined);
  }

  const designerHref = (nextMode?: string): string => {
    const params = new URLSearchParams();
    if (businessId) params.set("businessId", businessId);
    if (nextMode) params.set("mode", nextMode);
    const query = params.toString();
    return `/app/platform/configuration/designer${query ? `?${query}` : ""}`;
  };

  const renderWorkbenchHeader = (title: string, active = "表单设计") => <>
    <div className="business-workbench-header designer-workbench-header">
      <div className="business-workbench-heading">
        <button className="back-button" type="button" onClick={() => navigate(business ? `/app/platform/configuration/businesses/${business.id}` : "/app/platform/configuration/businesses")}><ArrowLeft size={16} />{business ? "返回业务" : "返回列表"}</button>
        <div><h1>{business ? `编辑业务 · ${business.name}` : title}</h1></div>
      </div>
      <div className="business-workbench-meta">
        {business && <><span>当前状态：<strong>{business.status === "active" ? "已激活" : business.status === "disabled" ? "已停用" : "草稿"}</strong></span><span>激活版本：<strong>{business.activeVersion}</strong></span></>}
        <span>草稿保存状态：<strong>{draftSaved || feedback?.tone === "success" ? "已保存" : "未保存"}</strong></span>
        <button className="primary-small" type="button" onClick={saveDraftExplicitly}>保存草稿</button>
      </div>
    </div>
    <section className="work-card business-workbench designer-workbench">
      <BusinessWorkbenchNavigation
        activeStep={active === "预览与发布" ? "preview" : "form"}
        hrefForStep={(step) => step === "form" ? designerHref("properties") : step === "preview" ? designerHref("preview") : business ? `/app/platform/configuration/businesses/${business.id}?step=${step}` : "/app/platform/configuration/businesses"}
      />
    </section>
  </>;

  function addField(field: FieldDefinition, groupId = selectedGroupId ?? draft.groups[0]?.id): void {
    if (!groupId) { setFeedback({ tone: "error", message: "请先新增一个分组" }); return; }
    try { commit(addDesignField(draft, field, groupId), `已将「${field.name}」加入画布`); setSelectedFieldCode(field.code); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "字段添加失败" }); }
  }

  function moveField(fieldCode: string, groupId: string, index?: number): void {
    try { commit(moveDesignField(draft, fieldCode, groupId, index)); setSelectedFieldCode(fieldCode); setSelectedGroupId(groupId); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "字段移动失败" }); }
  }

  function dragPaletteField(event: DragEvent<HTMLElement>, fieldCode: string): void {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-quality-library-field", fieldCode);
  }

  function dragCanvasField(event: DragEvent<HTMLElement>, fieldCode: string): void {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-quality-canvas-field", fieldCode);
  }

  function dropField(event: DragEvent<HTMLElement>, groupId: string, targetIndex?: number): void {
    event.preventDefault();
    const libraryCode = event.dataTransfer.getData("application/x-quality-library-field");
    const canvasCode = event.dataTransfer.getData("application/x-quality-canvas-field");
    if (libraryCode) { const field = readFieldDefinitions().find((entry) => entry.code === libraryCode); if (field) addField(field, groupId); return; }
    if (canvasCode) moveField(canvasCode, groupId, targetIndex);
  }

  function createGroup(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try { const next = addDesignGroup(draft, newGroupName); commit(next, "已新增表单分组"); setSelectedGroupId(next.groups.at(-1)?.id); setNewGroupName(""); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "新增分组失败" }); }
  }

  function removeSelectedField(): void {
    if (!selectedField) return;
    commit(removeDesignField(draft, selectedField.fieldCode), `已从画布移除「${selectedField.label}」`);
    setSelectedFieldCode(undefined);
  }

  function updatePreviewValue(fieldCode: string, value: string): void {
    setPreviewValues((current) => ({ ...current, [fieldCode]: value }));
    setPreviewErrors((current) => { const next = { ...current }; delete next[fieldCode]; return next; });
  }

  function submitPreview(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const errors = validateDesignPreview(draft, previewValues);
    setPreviewErrors(errors);
    setFeedback(Object.keys(errors).length ? { tone: "error", message: `请修正 ${Object.keys(errors).length} 个字段后再提交` } : { tone: "success", message: "预览表单校验通过（仅演示，不会提交业务数据）" });
  }

  function renderPreviewField(field: FormDesignDraft["groups"][number]["fields"][number], definition?: FieldDefinition): ReactNode {
    if (!definition) return null;
    const configuredOptions = field.validation?.options ?? [];
    const configuredControl = definition.type === "multi_line" ? <textarea aria-label={field.label} value={previewValues[field.fieldCode] ?? ""} onChange={(event) => updatePreviewValue(field.fieldCode, event.target.value)} /> : definition.type === "select" ? <select aria-label={field.label} value={previewValues[field.fieldCode] ?? ""} onChange={(event) => updatePreviewValue(field.fieldCode, event.target.value)}><option value="">请选择</option>{configuredOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select> : definition.type === "radio" ? <div className="designer-preview-choice">{configuredOptions.map((option) => <label key={option}><input type="radio" name={field.fieldCode} value={option} checked={(previewValues[field.fieldCode] ?? "") === option} onChange={(event) => updatePreviewValue(field.fieldCode, event.target.value)} />{option}</label>)}</div> : definition.type === "checkbox" ? <div className="designer-preview-choice">{configuredOptions.map((option) => { const selected = (previewValues[field.fieldCode] ?? "").split(",").filter(Boolean); return <label key={option}><input type="checkbox" value={option} checked={selected.includes(option)} onChange={(event) => updatePreviewValue(field.fieldCode, event.target.checked ? [...selected, option].join(",") : selected.filter((item) => item !== option).join(","))} />{option}</label>; })}</div> : definition.type === "multi_select" ? <select aria-label={field.label} multiple value={(previewValues[field.fieldCode] ?? "").split(",").filter(Boolean)} onChange={(event) => updatePreviewValue(field.fieldCode, [...event.target.selectedOptions].map((option) => option.value).join(","))}>{configuredOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select> : definition.type === "file" ? <input aria-label={field.label} type="file" accept={(field.validation?.accept ?? []).map((item) => `.${item.toLowerCase()}`).join(",")} multiple={(field.validation?.maxFiles ?? 1) > 1} onChange={(event) => updatePreviewValue(field.fieldCode, [...(event.target.files ?? [])].map((file) => file.name).join(","))} /> : <input aria-label={field.label} type={definition.type === "integer" || definition.type === "decimal" ? "number" : definition.type === "date" ? "date" : definition.type === "datetime" ? "datetime-local" : "text"} value={previewValues[field.fieldCode] ?? ""} onChange={(event) => updatePreviewValue(field.fieldCode, event.target.value)} />;
    const configuredError = previewErrors[field.fieldCode];
    return <label key={field.fieldCode} className={`designer-preview-field span-${field.span}`}><span>{field.label}{isDesignFieldRequired(field, previewValues) && <em>*</em>}</span>{configuredControl}<small className={configuredError ? "error" : ""}>{configuredError ?? formatDesignValidation(field.validation)}</small></label>;
  }

  if (mode === "preview") return <div className="page-stack platform-admin-page configuration-page designer-page">{renderWorkbenchHeader("填写预览", "预览与发布")}<ActionFeedback feedback={feedback} /><section className="designer-toolbar designer-publish-toolbar"><div><strong>{schema.name} · 预览与发布</strong><span>隐藏字段不会显示；提交仅执行前端演示校验。</span></div><div className="designer-publish-fields"><label>版本名称<input aria-label="版本名称" placeholder="例如：出货报告 V2" value={versionName} maxLength={100} onChange={(event) => setVersionName(event.target.value)} /></label><label><span>变更说明 <em className="required-mark" aria-hidden="true">*</em></span><small>必填，1-500 字符</small><textarea aria-label="变更说明" placeholder="说明本次表单配置的变更内容" value={versionChangeNote} maxLength={500} onChange={(event) => setVersionChangeNote(event.target.value)} /></label></div><div className="designer-publish-actions"><Link className="secondary-button" to={designerHref("properties")}>返回设计</Link><button type="button" className="primary-small" onClick={publishVersion}>发布版本</button></div></section><form className="designer-preview" onSubmit={submitPreview}>{draft.groups.map((group) => <section className="designer-preview-group" key={group.id}><header><strong>{group.name}</strong><span>{group.fields.filter((field) => field.visible !== false).length} 个字段</span></header><div className={`designer-preview-grid columns-${group.columns}`}>{group.fields.filter((field) => field.visible !== false).map((field) => renderPreviewField(field, readFieldDefinitions().find((entry) => entry.code === field.fieldCode)))}</div></section>)}<footer><button type="submit" className="primary-small">校验预览表单</button></footer></form></div>;

  const selectedFieldGroup = selectedField ? draft.groups.find((group) => group.fields.some((item) => item.fieldCode === selectedField.fieldCode)) : undefined;
  const conditionTargets = draft.groups.flatMap((entry) => entry.fields).filter((entry) => entry.fieldCode !== selectedField?.fieldCode);
  const rulesPanel = selectedField && selectedFieldDefinition && selectedFieldGroup
    ? <DesignRuleCard draft={draft} field={selectedField} group={selectedFieldGroup} definition={selectedFieldDefinition} conditionTargets={conditionTargets} onCommit={commit} />
    : <div className="designer-property-empty">选择一个画布字段，即可编辑该字段的显示、必填、校验、选项和条件规则。</div>;

  return <div className="page-stack platform-admin-page configuration-page designer-page">{renderWorkbenchHeader(mode === "rules" ? "字段规则配置" : "表单设计器")}<ActionFeedback feedback={feedback} /><section className="designer-toolbar">{!businessId && <label>设计案例<select aria-label="设计案例版本" value={schema.id} onChange={(event) => selectSchema(event.target.value)}>{supportedSchemas.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} v{entry.schemaVersion} · {entry.status === "draft" ? "草稿" : "已发布"}</option>)}</select></label>}<span>{mode === "rules" ? "点击画布字段可在右侧编辑字段规则；规则按字段类型显示。" : "拖动字段到分组中；点击画布字段可在右侧编辑属性。"}</span>{!businessId && <div className="designer-version-actions"><strong>{published ? `v${schema.schemaVersion} · 已发布` : `v${schema.schemaVersion} · 草稿`}</strong></div>}</section>{!businessId && <section className="designer-history" aria-label="表单版本历史"><header><div><strong>版本历史</strong><span>{versionHistory.length ? `已发布 ${versionHistory.length} 个版本` : "暂无已发布版本"}</span></div></header>{versionHistory.length > 0 && <div className="designer-history-list">{versionHistory.map((record) => <div key={record.id} className="designer-history-row"><div><strong>{record.name} v{record.version}</strong><span>{record.publishedAt} · {record.publishedBy} · {record.changeNote}</span></div><button type="button" className="table-action" onClick={() => selectSchema(record.schemaId)}>查看</button><button type="button" className="table-action" onClick={() => rollbackVersion(record)}>回滚为草稿</button></div>)}</div>}</section>}<div className="designer-layout"><aside className="designer-palette" aria-label="字段库面板"><header><div><strong>字段库</strong><span>拖入画布</span></div><span>{availableFields.length} 个可用</span></header><input aria-label="搜索设计器字段" value={fieldQuery} placeholder="搜索字段编码或名称" onChange={(event) => setFieldQuery(event.target.value)} /> <div className="designer-palette-list">{availableFields.map((field) => { const used = designContainsField(draft, field.code); return <button type="button" key={field.code} draggable={!used} onDragStart={(event) => dragPaletteField(event, field.code)} onClick={() => addField(field)} disabled={used} className="designer-palette-field"><span><strong>{field.name}</strong><small>{field.code} · {fieldTypeLabels[field.type]}</small></span><em>{used ? "已使用" : "拖入"}</em></button>; })}</div></aside><main className="designer-canvas" aria-label="表单设计画布"><header><div><strong>{schema.name}</strong><span>{schema.code} · v{schema.schemaVersion}</span></div><span>{draft.groups.reduce((sum, group) => sum + group.fields.length, 0)} 个字段 · {draft.groups.length} 个分组</span></header>{draft.groups.map((group) => <section key={group.id} className={`designer-group columns-${group.columns}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropField(event, group.id)}><header><div><input aria-label={`${group.name}分组名称`} value={group.name} onFocus={() => setSelectedGroupId(group.id)} onChange={(event) => { try { commit(updateDesignGroup(draft, group.id, { name: event.target.value })); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "分组保存失败" }); } }} /><span>{group.fields.length} 个字段</span></div><div className="designer-group-actions"><label>栅格<select aria-label={`${group.name}分组栅格`} value={group.columns} onChange={(event) => commit(updateDesignGroup(draft, group.id, { columns: Number(event.target.value) as 1 | 2 }), "分组栅格已更新")}><option value={1}>一列</option><option value={2}>两列</option></select></label><button type="button" className="table-action danger-text" disabled={group.fields.length > 0} onClick={() => { try { commit(removeDesignGroup(draft, group.id), "空分组已删除"); setSelectedGroupId(draft.groups.find((entry) => entry.id !== group.id)?.id); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "删除分组失败" }); } }}>删除</button></div></header><div className="designer-field-grid">{group.fields.map((field, index) => <button type="button" key={field.fieldCode} draggable onDragStart={(event) => dragCanvasField(event, field.fieldCode)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); dropField(event, group.id, index); }} onClick={() => { setSelectedFieldCode(field.fieldCode); setSelectedGroupId(group.id); }} className={`designer-field-card ${selectedFieldCode === field.fieldCode ? "selected" : ""} span-${Math.min(group.columns, field.span)}`}><span className="designer-drag-handle" aria-hidden="true">::</span><span><strong>{field.label}</strong><small>{field.fieldCode} · {field.required ? "必填" : "选填"} · {field.visible ? "显示" : "隐藏"}</small></span></button>)}{group.fields.length === 0 && <div className="designer-drop-empty">将字段拖到这里</div>}</div></section>)}<form className="designer-add-group" onSubmit={createGroup}><input aria-label="新分组名称" value={newGroupName} placeholder="输入分组名称" maxLength={50} onChange={(event) => setNewGroupName(event.target.value)} /><button type="submit" className="secondary-button"><Plus size={15} />新增分组</button></form></main><aside className={`designer-properties ${mode === "rules" ? "designer-rule-properties" : ""}`} aria-label="字段属性面板"><header><div><strong>字段配置</strong><span>{selectedField ? "当前选中字段" : "选择画布字段后编辑"}</span></div></header><nav className="designer-property-tabs" role="tablist" aria-label="字段配置模式"><Link role="tab" aria-selected={mode !== "rules"} className={mode === "rules" ? "" : "active"} to={designerHref("properties")}>字段属性</Link><Link role="tab" aria-selected={mode === "rules"} className={mode === "rules" ? "active" : ""} to={designerHref("rules")}>字段规则</Link></nav>{mode === "rules" ? rulesPanel : selectedField && selectedFieldDefinition ? <div className="designer-property-content"><div className="designer-selected-field"><strong>{selectedFieldDefinition.name}</strong><span>{selectedField.fieldCode} · {fieldTypeLabels[selectedFieldDefinition.type]}</span></div><label>显示名称<input aria-label="字段显示名称" value={selectedField.label} maxLength={100} onChange={(event) => commit(updateDesignField(draft, selectedField.fieldCode, { label: event.target.value }), "字段显示名称已更新")} /></label><label className="designer-checkbox"><input aria-label="字段必填" type="checkbox" checked={selectedField.required} onChange={(event) => commit(updateDesignField(draft, selectedField.fieldCode, { required: event.target.checked }), event.target.checked ? "字段设为必填" : "字段设为选填")} />必填字段</label><label className="designer-checkbox"><input aria-label="字段显示" type="checkbox" checked={selectedField.visible} onChange={(event) => commit(updateDesignField(draft, selectedField.fieldCode, { visible: event.target.checked }))} />在表单中显示</label><label>字段宽度<select aria-label="字段宽度" value={selectedField.span} onChange={(event) => commit(updateDesignField(draft, selectedField.fieldCode, { span: Number(event.target.value) as 1 | 2 }), "字段宽度已更新")}><option value={1}>单列宽度</option><option value={2}>跨两列</option></select></label><label>所在分组<select aria-label="字段所在分组" value={selectedGroupId} onChange={(event) => moveField(selectedField.fieldCode, event.target.value)}>{draft.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button type="button" className="secondary-button danger-button" onClick={removeSelectedField}>从画布移除</button></div> : <div className="designer-property-empty">选择一个画布字段，即可编辑显示名称、必填、可见性和宽度。</div>}</aside></div></div>;
}

type ConfigurationBusiness = { id: string; code: string; name: string; builtIn: boolean; status: "active" | "draft" | "disabled"; hasDraft?: boolean; draftStatus?: BusinessDraftStatus; updatedAt: string; activeVersion: string; category?: string; submitterTypes?: string[]; draftUpdatedAt?: string; dataCount?: number; inTransitCount?: number; description?: string; numberPrefix?: string; latestPublishedAt?: string; latestPublishedBy?: string; disabledReason?: string };
const CONFIGURATION_BUSINESSES_STORAGE_KEY = "quality-platform.configuration-businesses";
const builtInConfigurationBusinesses: ConfigurationBusiness[] = [
  ["shipment_report", "出货报告"], ["material_exception", "物料异常"], ["after_sales_exception", "售后异常"], ["incoming_inspection", "来料检验"], ["production_inspection_daily", "生产检验日报"], ["maintenance_record", "维修记录"], ["ipqc_patrol", "IPQC巡线问题记录"], ["sporadic_return", "零星退料"], ["inbound_report", "入库报告"], ["trial_summary", "试产及生产总结"],
].map(([code, name]): ConfigurationBusiness => ({ id: `builtin-${code}`, code, name, builtIn: true, status: "active", updatedAt: "2026-08-29", activeVersion: "v1", category: code.includes("inspection") ? "来料/生产" : code.includes("return") || code.includes("after") ? "售后" : "出货" , submitterTypes: ["平台", "供应商", "工厂"], numberPrefix: code.slice(0, 8).toUpperCase(), dataCount: 0, inTransitCount: 0 }));
function businessDraftStatus(item: ConfigurationBusiness): BusinessDraftStatus {
  const config = readBusinessDefinitionConfigs().find((entry) => entry.businessId === item.id);
  if (config?.draftStatus) return config.draftStatus;
  if (!config) return item.draftStatus ?? (item.hasDraft ? "saved" : "none");
  if (config.lastValidationError) return "validation_failed";
  const active = config.versions.find((version) => version.active);
  if (!active) return "saved";
  const snapshot = (value: unknown) => JSON.stringify(value);
  const same = snapshot(config.draft.form) === snapshot(active.form)
    && snapshot(config.draft.workflow) === snapshot(active.workflow)
    && snapshot(config.draft.permissions) === snapshot(active.permissions)
    && snapshot(config.draft.analysis) === snapshot(active.analysis);
  return same ? "none" : "saved";
}

function readConfigurationBusinesses(): ConfigurationBusiness[] {
  try {
    const raw = window.localStorage.getItem(CONFIGURATION_BUSINESSES_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) as ConfigurationBusiness[] : [];
    const items = [...builtInConfigurationBusinesses.map((item) => stored.find((entry) => entry.id === item.id) ?? item), ...stored.filter((entry) => !entry.builtIn)];
    return items.map((item) => {
      const draftStatus = businessDraftStatus(item);
      const config = readBusinessDefinitionConfigs().find((entry) => entry.businessId === item.id);
      const active = config?.versions.find((version) => version.active);
      return { ...item, activeVersion: active ? `v${active.version}` : item.activeVersion, draftStatus, hasDraft: draftStatus !== "none", draftUpdatedAt: config?.draft.updatedAt ?? item.draftUpdatedAt };
    });
  } catch { return builtInConfigurationBusinesses; }
}
function saveConfigurationBusinesses(items: ConfigurationBusiness[]): void { window.localStorage.setItem(CONFIGURATION_BUSINESSES_STORAGE_KEY, JSON.stringify(items)); }

function upsertBusiness(item: ConfigurationBusiness): void {
  const items = readConfigurationBusinesses();
  saveConfigurationBusinesses(items.some((entry) => entry.id === item.id) ? items.map((entry) => entry.id === item.id ? item : entry) : [item, ...items]);
}

function ConfigurationBusinessListPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState(readConfigurationBusinesses);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ConfigurationBusiness["status"]>("all");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [submitter, setSubmitter] = useState("all");
  const [draftState, setDraftState] = useState("all");
  const [feedback, setFeedback] = useState<Feedback>();
  const filtered = businesses.filter((item) => (!query.trim() || `${item.code}${item.name}`.toLowerCase().includes(query.trim().toLowerCase())) && (status === "all" || item.status === status) && (category === "all" || item.category === category) && (source === "all" || (source === "builtin" ? item.builtIn : !item.builtIn)) && (submitter === "all" || item.submitterTypes?.includes(submitter)) && (draftState === "all" || (draftState === "saved" ? item.draftStatus === "saved" : draftState === "validation_failed" ? item.draftStatus === "validation_failed" : item.draftStatus === "none")));
  function toggle(item: ConfigurationBusiness): void {
    const next = item.status === "disabled" ? "active" : "disabled";
    if (next === "disabled" && !window.confirm(`确认停用“${item.name}”吗？停用后不可新建单据，在途和历史数据仍可查询。`)) return;
    let reason: string | undefined;
    if (next === "disabled") { reason = window.prompt("请输入停用原因（必填）", "配置调整")?.trim(); if (!reason) { setFeedback({ tone: "error", message: "停用原因不能为空" }); return; } }
    if (next === "active" && !window.confirm(`确认重新启用“${item.name}”吗？启用前将重新执行配置校验。`)) return;
    if (next === "active") {
      const definition = readBusinessDefinitionConfigs().find((entry) => entry.businessId === item.id);
      if (definition && validateBusinessDefinitionConfig(definition).length) { setFeedback({ tone: "error", message: "当前业务配置校验未通过，无法启用" }); return; }
    }
    if (next === "disabled" && !window.confirm(`停用原因：${reason}。再次确认停用“${item.name}”吗？`)) return;
    const updated: ConfigurationBusiness[] = businesses.map((entry) => entry.id === item.id ? { ...entry, status: next, updatedAt: "2026-08-29", disabledReason: next === "disabled" ? reason?.trim() : undefined } : entry);
    saveConfigurationBusinesses(updated); setBusinesses(updated); setFeedback({ tone: "success", message: next === "active" ? "业务已启用" : "业务已停用" });
  }
  function deleteCustom(item: ConfigurationBusiness): void { const definition = readBusinessDefinitionConfigs().find((entry) => entry.businessId === item.id); if (item.builtIn || definition?.versions.length) return; if (!window.confirm(`确认删除“${item.name}”吗？删除后不可恢复。`)) return; saveConfigurationBusinesses(businesses.filter((entry) => entry.id !== item.id)); const records = readBusinessDefinitionConfigs().filter((entry) => entry.businessId !== item.id); window.localStorage.setItem(CONFIG_BUSINESS_DEFINITIONS_STORAGE_KEY, JSON.stringify(records)); setBusinesses(readConfigurationBusinesses()); setFeedback({ tone: "success", message: "业务已删除" }); }
  return <div className="page-stack platform-admin-page configuration-page"><div className="list-page-title"><div><h1>业务列表</h1><span className="page-subtitle">管理业务类型、配置版本和运行入口；业务数据在运行端处理。</span></div><div className="list-page-actions"><button className="secondary-button" onClick={() => setBusinesses(readConfigurationBusinesses())}><RefreshCw size={15} />刷新</button><button className="primary-small" onClick={() => navigate("/app/platform/configuration/businesses/new")}><Plus size={16} />新增业务</button></div></div><ConfigurationNavigation view="businesses" /><ActionFeedback feedback={feedback} /><section className="admin-filter-card configuration-filter"><input aria-label="搜索业务" placeholder="搜索业务编码或名称" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="业务分类" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">全部分类</option><option value="出货">出货</option><option value="来料/生产">来料/生产</option><option value="售后">售后</option><option value="自定义">自定义</option></select><select aria-label="提报端" value={submitter} onChange={(event) => setSubmitter(event.target.value)}><option value="all">全部提报端</option><option>平台</option><option>供应商</option><option>工厂</option></select><select aria-label="业务来源" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">全部来源</option><option value="builtin">内置业务</option><option value="custom">自定义业务</option></select><select aria-label="业务状态" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">全部状态</option><option value="active">已启用</option><option value="draft">配置中</option><option value="disabled">已停用</option></select><select aria-label="草稿状态" value={draftState} onChange={(event) => setDraftState(event.target.value)}><option value="all">全部草稿状态</option><option value="saved">已保存草稿</option><option value="validation_failed">校验失败</option><option value="none">无草稿</option></select><button className="secondary-button" onClick={() => { setQuery(""); setStatus("all"); setCategory("all"); setSource("all"); setSubmitter("all"); setDraftState("all"); }}>重置</button></section><section className="work-card admin-table-card business-table"><div className="responsive-table"><table><colgroup><col className="biz-col-name" /><col className="biz-col-category" /><col className="biz-col-submitter" /><col className="biz-col-status" /><col className="biz-col-version" /><col className="biz-col-draft" /><col className="biz-col-published" /><col className="biz-col-count" /><col className="biz-col-action" /></colgroup><thead><tr><th>业务名称/编码</th><th>分类</th><th>提报端</th><th>业务状态</th><th>激活版本</th><th>草稿状态</th><th>最近发布</th><th>数据量</th><th>操作</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code} · {item.builtIn ? "内置" : "自定义"}</small></td><EllipsisCell text={item.category ?? "自定义"} /><EllipsisCell text={(item.submitterTypes ?? []).join("、")} /><td><span className={`status ${item.status === "active" ? "approved" : item.status === "draft" ? "pending" : "cancelled"}`}>{item.status === "active" ? "已启用" : item.status === "draft" ? "配置中" : "已停用"}</span></td><EllipsisCell text={item.activeVersion === "暂无" ? "无" : item.activeVersion} /><EllipsisCell text={item.draftStatus === "validation_failed" ? "校验失败" : item.draftStatus === "saved" ? "已保存" : "无草稿"} /><EllipsisCell text={item.latestPublishedAt ? `${item.latestPublishedAt} · ${item.latestPublishedBy ?? ""}` : "无"} /><EllipsisCell text={`${item.dataCount ?? 0} 条${item.inTransitCount ? ` · 在途 ${item.inTransitCount}` : ""}`} /><td className="row-action-cell"><RowActionMenu label={`${item.name} 更多操作`}><Link className="table-action" to={`/app/platform/configuration/businesses/${item.id}`}>{item.draftStatus === "none" ? "编辑" : "继续编辑"}</Link><Link className="table-action" to={`/app/platform/configuration/businesses/new?copyFrom=${item.id}`}>复制</Link><Link className="table-action" to={`/app/platform/configuration/businesses/${item.id}?step=preview`}>预览</Link><Link className="table-action" to={`/app/platform/configuration/businesses/${item.id}?step=history`}>版本历史</Link><Link className="table-action" to={`/app/platform/business/${item.code}`}>进入业务数据</Link><button className="table-action" onClick={() => toggle(item)}>{item.status === "disabled" ? "启用" : "停用"}</button>{!item.builtIn && !readBusinessDefinitionConfigs().find((entry) => entry.businessId === item.id)?.versions.length && <button className="table-action danger-text" onClick={() => deleteCustom(item)}>删除</button>}</RowActionMenu></td></tr>)}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={9}>暂无业务定义</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 个业务定义</span></div></section></div>;
}

function BusinessDefinitionWorkbench({ isNew = false }: { isNew?: boolean }) {
  const navigate = useNavigate(); const location = useLocation(); const { businessId } = useParams();
  const source = isNew ? undefined : readConfigurationBusinesses().find((entry) => entry.id === businessId);
  const initialCopySourceId = new URLSearchParams(location.search).get("copyFrom") ?? "";
  const [name, setName] = useState(source?.name ?? ""); const [code, setCode] = useState(source?.code ?? ""); const [description, setDescription] = useState(source?.description ?? ""); const [numberPrefix, setNumberPrefix] = useState(source?.numberPrefix ?? (source?.code.slice(0, 8).toUpperCase() ?? "")); const [category, setCategory] = useState(source?.category ?? "自定义"); const [submitterTypes, setSubmitterTypes] = useState<string[]>(source?.submitterTypes ?? ["平台", "供应商", "工厂"]); const [creationMode, setCreationMode] = useState<"blank" | "copy" | "template">(initialCopySourceId ? "copy" : "blank"); const [copySourceId, setCopySourceId] = useState(initialCopySourceId); const [templateType, setTemplateType] = useState<"direct" | "single_approval" | "external" | "multi_stage">("single_approval"); const [feedback, setFeedback] = useState<Feedback | undefined>(() => source?.draftStatus === "saved" ? { tone: "success", message: "" } : undefined);
  const [workflow, setWorkflow] = useState(() => createDefaultBusinessWorkflow(source?.code ?? "business")); const [permissions, setPermissions] = useState(() => createDefaultBusinessPermissions(source?.name ?? "新业务")); const [analysis, setAnalysis] = useState(() => createDefaultBusinessAnalysis()); const [config, setConfig] = useState<BusinessDefinitionConfig>(); const [versionName, setVersionName] = useState(""); const [changeNote, setChangeNote] = useState("");
  const activeStep = new URLSearchParams(location.search).get("step") ?? "basic"; const schema = source ? getBusinessSchema(source.code, source.name, "draft") : undefined; const formDraft = schema ? readFormDesignDraft(schema) : undefined;
  useEffect(() => { if (!source || !formDraft) return; const loaded = readBusinessDefinitionConfig(source.id, formDraft, source.code, source.name, Number(source.activeVersion.replace(/^v/, "")) || 0); setConfig(loaded); setWorkflow(loaded.draft.workflow); setPermissions(loaded.draft.permissions); setAnalysis(loaded.draft.analysis); }, [source?.id]);
  const href = (step: string) => `${location.pathname}?step=${step}`;
  function saveDraft(goNextOrEvent: boolean | MouseEvent<HTMLButtonElement> = false): void {
    const goNext = goNextOrEvent === true;
    if (!name.trim() || !code.trim()) { setFeedback({ tone: "error", message: "请先填写业务名称和业务编码" }); return; }
    const existingCodes = readConfigurationBusinesses().filter((entry) => entry.id !== source?.id).map((entry) => entry.code);
    if (existingCodes.includes(code.trim())) { setFeedback({ tone: "error", message: "业务编码已存在，请更换编码" }); return; }
    const id = source?.id ?? `custom-${Date.now()}`;
    if (!/^[A-Z0-9]{2,10}$/.test(numberPrefix.trim().toUpperCase())) { setFeedback({ tone: "error", message: "业务编号前缀需为2-10位大写字母或数字" }); return; }
    if (!submitterTypes.length) { setFeedback({ tone: "error", message: "至少选择一个提报端" }); return; }
    const next: ConfigurationBusiness = { id, code: code.trim(), name: name.trim(), builtIn: source?.builtIn ?? false, status: source?.status ?? "draft", hasDraft: true, draftStatus: "saved", updatedAt: "2026-08-29", activeVersion: source?.activeVersion ?? "暂无", category, submitterTypes, description: description.trim(), numberPrefix: numberPrefix.trim().toUpperCase(), draftUpdatedAt: "2026-08-29 10:00", dataCount: source?.dataCount ?? 0, inTransitCount: source?.inTransitCount ?? 0, latestPublishedAt: source?.latestPublishedAt, latestPublishedBy: source?.latestPublishedBy };
    const items = readConfigurationBusinesses(); saveConfigurationBusinesses(source ? items.map((entry) => entry.id === id ? next : entry) : [next, ...items]);
    const nextSchema = getBusinessSchema(next.code, next.name, "draft"); const nextForm = readFormDesignDraft(nextSchema);
    const copiedSource = creationMode === "copy" && copySourceId ? readConfigurationBusinesses().find((item) => item.id === copySourceId) : undefined;
    const copiedConfig = copiedSource ? readBusinessDefinitionConfig(copiedSource.id, readFormDesignDraft(getBusinessSchema(copiedSource.code, copiedSource.name, "draft")), copiedSource.code, copiedSource.name) : undefined;
    const copiedForm = copiedConfig ? { ...copiedConfig.draft.form, id: nextForm.id, schemaId: nextForm.schemaId, schemaCode: nextForm.schemaCode } : nextForm;
    const nextConfig = config ?? (copiedConfig ? copyBusinessDefinitionDraft(copiedConfig, id, copiedForm) : readBusinessDefinitionConfig(id, nextForm, next.code, next.name));
    try { saveFormDesignDraft(copiedForm); setConfig(saveBusinessDefinitionConfig({ ...nextConfig, draftStatus: "saved", lastValidationError: undefined, draft: { ...nextConfig.draft, form: copiedForm, workflow, permissions: { ...permissions, menuName: permissions.menuName || next.name }, analysis } }, config?.draft.revision)); setFeedback({ tone: "success", message: "业务草稿已保存" }); if (!businessId) navigate(`/app/platform/configuration/businesses/${id}${goNext ? "?step=form" : ""}`); }
    catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "草稿保存失败" }); }
  }
  function currentConfig(): BusinessDefinitionConfig | undefined { if (!config || !formDraft) return undefined; return { ...config, draft: { form: formDraft, workflow, permissions, analysis, updatedAt: "2026-08-29 10:00" } }; }
  function publish(): void { const current = currentConfig(); if (!current || !source) { setFeedback({ tone: "error", message: "请先保存业务草稿" }); return; } try { const version = publishBusinessDefinition(current, versionName, changeNote); upsertBusiness({ ...source, status: "active", hasDraft: false, draftStatus: "none", activeVersion: `v${version.version}`, updatedAt: version.publishedAt, latestPublishedAt: version.publishedAt, latestPublishedBy: version.publishedBy }); setConfig(readBusinessDefinitionConfig(source.id, formDraft!, source.code, source.name, version.version)); setFeedback({ tone: "success", message: `业务已发布并激活 v${version.version}` }); } catch (reason) { const message = reason instanceof Error ? reason.message : "发布失败"; try { if (current) saveBusinessDefinitionConfig({ ...current, draftStatus: "validation_failed", lastValidationError: message }); } catch { /* preserve the publish error even if status persistence is unavailable */ } setFeedback({ tone: "error", message }); } }
  function discardDraft(): void { if (!config || !window.confirm("放弃当前草稿并恢复激活版本吗？未发布修改将丢失。")) return; try { const next = discardBusinessDefinitionDraft(config); setConfig(next); setWorkflow(next.draft.workflow); setPermissions(next.draft.permissions); setAnalysis(next.draft.analysis); if (source) upsertBusiness({ ...source, hasDraft: false, draftStatus: "none" }); setFeedback({ tone: "success", message: "草稿已放弃，已恢复激活版本" }); } catch (reason) { setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "草稿放弃失败" }); } }
    function addWorkflowNode(): void { const id = `process-${Date.now()}`; setWorkflow((current) => { const previous = current.nodes.at(-2); const end = current.nodes.at(-1); const nextNodes = current.nodes.map((node) => node.id === previous?.id ? { ...node, nextNodeIds: [id] } : node); return { ...current, nodes: [...nextNodes.slice(0, -1), { id, name: "业务处理", type: "process", statusCode: `processing_${current.nodes.length}`, organizationRule: "supplier", permissionCode: `merchant.business.${code || "business"}.handle`, actions: ["处理完成"], nextNodeIds: end ? [end.id] : [] }, ...(end ? [end] : [])] }; }); }
  function removeWorkflowNode(nodeId: string): void {
    const target = workflow.nodes.find((node) => node.id === nodeId);
    if (!target || target.type === "start" || target.type === "end") {
      setFeedback({ tone: "error", message: "开始和结束节点不可删除" });
      return;
    }
    if (!window.confirm(`确认删除流程节点“${target.name}”吗？删除后将由前置节点直接连接后继节点。`)) return;
    const replacementIds = (target.nextNodeIds ?? []).filter((id) => id !== nodeId);
    setWorkflow((current) => ({
      ...current,
      nodes: current.nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => {
          if (!(node.nextNodeIds ?? []).includes(nodeId)) return node;
          const nextNodeIds = (node.nextNodeIds ?? []).flatMap((nextId) => nextId === nodeId ? replacementIds : [nextId]);
          return { ...node, nextNodeIds: [...new Set(nextNodeIds)] };
        }),
    }));
    setFeedback({ tone: "success", message: `流程节点“${target.name}”已删除` });
  }
  const current = currentConfig(); const errors = current ? validateBusinessDefinitionConfig(current) : []; const changes = current ? diffBusinessDefinition(current) : { added: [], changed: [], removed: [] };
  return <div className="page-stack platform-admin-page configuration-page"><div className="business-workbench-header"><div className="business-workbench-heading"><button className="back-button" type="button" onClick={() => navigate("/app/platform/configuration/businesses")}><ArrowLeft size={16} />返回列表</button><div><h1>{isNew ? "新增业务" : `编辑业务 · ${source?.name ?? "未找到业务"}`}</h1></div></div><div className="business-workbench-meta"><span>当前状态：<strong>{source?.status === "active" ? "已启用" : source?.status === "disabled" ? "已停用" : "配置中"}</strong></span><span>激活版本：<strong>{source?.activeVersion ?? "无"}</strong></span><span>草稿保存状态：<strong>{feedback?.tone === "success" ? `已保存 · ${config?.draft.updatedAt ?? ""}` : "未保存"}</strong></span><button className="primary-small" type="button" onClick={saveDraft}>保存草稿</button></div></div><ActionFeedback feedback={feedback} /><section className="work-card business-workbench"><BusinessWorkbenchNavigation isNew={isNew} activeStep={activeStep as BusinessWorkbenchStep} hrefForStep={(step) => step === "form" && source ? `/app/platform/configuration/designer?businessId=${encodeURIComponent(source.id)}` : href(step)} />
    {activeStep === "basic" && <div className="business-workbench-body"><div className="workbench-section-title"><div><p>STEP 01</p><h2>基本信息</h2></div><span>业务编码创建后不可修改</span></div>{isNew && <fieldset className="creation-method"><legend>创建方式</legend><label><input type="radio" name="creation-mode" checked={creationMode === "blank"} onChange={() => { setCreationMode("blank"); setCopySourceId(""); setWorkflow(createBusinessWorkflowTemplate("direct", code || "business")); }} />空白创建</label><label><input type="radio" name="creation-mode" checked={creationMode === "copy"} onChange={() => setCreationMode("copy")} />从现有业务复制</label><label><input type="radio" name="creation-mode" checked={creationMode === "template"} onChange={() => { setCreationMode("template"); setName("供应商改善追踪"); setCode("supplier_improvement_tracking"); setCategory("自定义"); setWorkflow(createBusinessWorkflowTemplate(templateType, "supplier_improvement_tracking")); }} />从流程模板创建</label>{creationMode === "copy" && <select aria-label="复制来源业务" value={copySourceId} onChange={(event) => { const item = readConfigurationBusinesses().find((entry) => entry.id === event.target.value); setCopySourceId(event.target.value); if (item) { const copied = readBusinessDefinitionConfig(item.id, readFormDesignDraft(getBusinessSchema(item.code, item.name, "draft")), item.code, item.name, Number(item.activeVersion.replace(/^v/, "")) || 0); setName(`${item.name}副本`); setCode(`${item.code}_copy`); setCategory(item.category ?? "自定义"); setDescription(item.description ?? ""); setNumberPrefix(`${item.numberPrefix ?? item.code.slice(0, 8).toUpperCase()}X` .slice(0, 10)); setSubmitterTypes(item.submitterTypes ?? []); setWorkflow(copied.draft.workflow); setPermissions(copied.draft.permissions); setAnalysis(copied.draft.analysis); } }}><option value="">选择现有业务</option>{readConfigurationBusinesses().map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{creationMode === "template" && <select aria-label="业务流程模板" value={templateType} onChange={(event) => { const value = event.target.value as typeof templateType; setTemplateType(value); setWorkflow(createBusinessWorkflowTemplate(value, code || "supplier_improvement_tracking")); }}><option value="direct">直接完成</option><option value="single_approval">单级审核</option><option value="external">审核后外部处理</option><option value="multi_stage">多阶段处理</option></select>}</fieldset>}<div className="admin-form-grid"><label className="dialog-input"><span>业务名称 <em className="required-mark" aria-hidden="true">*</em></span><input aria-label="业务名称" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /></label><label className="dialog-input"><span>业务编码 <em className="required-mark" aria-hidden="true">*</em></span><input aria-label="业务编码" value={code} disabled={!isNew} maxLength={50} onChange={(event) => setCode(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} /></label><label className="dialog-input"><span>业务编号前缀 <em className="required-mark" aria-hidden="true">*</em></span><input aria-label="业务编号前缀" value={numberPrefix} maxLength={10} onChange={(event) => setNumberPrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label><label className="dialog-input">业务分类<select aria-label="业务分类" value={category} onChange={(event) => setCategory(event.target.value)}><option>来料</option><option>生产</option><option>出货</option><option>售后</option><option>自定义</option></select></label><label className="dialog-input wide">业务说明<textarea aria-label="业务说明" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></label><fieldset className="dialog-fieldset"><legend>提报端 <em className="required-mark" aria-hidden="true">*</em></legend>{["平台", "供应商", "工厂"].map((type) => <label key={type}><input type="checkbox" checked={submitterTypes.includes(type)} onChange={(event) => setSubmitterTypes((current) => event.target.checked ? [...current, type] : current.filter((entry) => entry !== type))} />{type}</label>)}</fieldset></div>{isNew && <div className="business-step-actions"><button className="primary-small" type="button" onClick={() => saveDraft(true)}>下一步：表单设计<ArrowRight size={15} /></button></div>}</div>}
    {activeStep === "form" && <div className="business-placeholder"><h2>表单设计</h2><p>从字段库配置字段、分组、规则并执行填写预览。</p>{source ? <Link className="primary-small" to={`/app/platform/configuration/designer?businessId=${encodeURIComponent(source.id)}`}>打开表单设计器</Link> : <button className="primary-small" type="button" onClick={saveDraft}>先保存业务并打开设计器</button>}</div>}
    {activeStep === "workflow" && <div className="business-workbench-body"><div className="workbench-section-title"><div><p>STEP 03</p><h2>流程配置</h2></div><button className="secondary-button" type="button" onClick={addWorkflowNode}><Plus size={15} />新增处理节点</button></div><div className="workflow-editor" aria-label="流程配置编辑器">{workflow.nodes.map((node, index) => <article className="workflow-node" key={node.id}><span className="workflow-node-index">{index + 1}</span><div className="workflow-node-heading"><div><strong>{node.name}</strong><small>{node.type === "start" ? "开始" : node.type === "end" ? "结束" : "处理节点"} · {node.statusCode}</small></div>{node.type !== "start" && node.type !== "end" && <button type="button" className="workflow-node-remove table-action danger-text" title={`删除节点 ${node.name}`} aria-label={`删除节点 ${node.name}`} onClick={() => removeWorkflowNode(node.id)}><Trash2 size={14} />删除</button>}</div><label>节点名称<input value={node.name} disabled={node.type === "start" || node.type === "end"} onChange={(event) => setWorkflow((current) => ({ ...current, nodes: current.nodes.map((entry) => entry.id === node.id ? { ...entry, name: event.target.value } : entry) }))} /></label><label>业务状态码<input value={node.statusCode} disabled={node.type === "start" || node.type === "end"} onChange={(event) => setWorkflow((current) => ({ ...current, nodes: current.nodes.map((entry) => entry.id === node.id ? { ...entry, statusCode: event.target.value.trim() } : entry) }))} /></label>{node.type !== "start" && node.type !== "end" && <><label>处理组织<select value={node.organizationRule} onChange={(event) => setWorkflow((current) => ({ ...current, nodes: current.nodes.map((entry) => entry.id === node.id ? { ...entry, organizationRule: event.target.value as BusinessWorkflowNode["organizationRule"] } : entry) }))}><option value="platform">平台组织</option><option value="submitter">提报组织</option><option value="supplier">供应商组织</option><option value="factory">工厂组织</option></select></label><label>处理权限<input value={node.permissionCode} onChange={(event) => setWorkflow((current) => ({ ...current, nodes: current.nodes.map((entry) => entry.id === node.id ? { ...entry, permissionCode: event.target.value } : entry) }))} /></label></>}</article>)}</div></div>}
    {activeStep === "permissions" && <div className="business-workbench-body"><div className="workbench-section-title"><div><p>STEP 04</p><h2>权限与入口</h2></div></div><div className="admin-form-grid"><label className="dialog-input">运行菜单名称<input value={permissions.menuName} onChange={(event) => setPermissions((current) => ({ ...current, menuName: event.target.value }))} /></label><label className="dialog-input">菜单位置<select value={permissions.menuLocation} onChange={(event) => setPermissions((current) => ({ ...current, menuLocation: event.target.value }))}><option>平台业务</option><option>业务管理</option><option>供应商管理</option><option>工厂管理</option></select></label><label className="dialog-input">数据范围<select value={permissions.dataScope} onChange={(event) => setPermissions((current) => ({ ...current, dataScope: event.target.value as "organization" | "all" }))}><option value="organization">当前组织</option><option value="all">全部授权组织</option></select></label><fieldset className="dialog-fieldset"><legend>能力权限</legend>{([["read", "查看"], ["submit", "提报"], ["handle", "处理"], ["export", "导出"]] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={permissions[key]} onChange={(event) => setPermissions((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset></div></div>}
    {activeStep === "analysis" && <div className="business-workbench-body"><div className="workbench-section-title"><div><p>STEP 05</p><h2>分析设置</h2></div></div><div className="admin-form-grid"><label className="dialog-input wide">列表字段<input value={analysis.listFields.join(", ")} onChange={(event) => setAnalysis((current) => ({ ...current, listFields: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></label><label className="dialog-input wide">分析维度<input value={analysis.dimensions.join(", ")} onChange={(event) => setAnalysis((current) => ({ ...current, dimensions: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></label><label className="dialog-input wide">分析指标<input value={analysis.metrics.join(", ")} onChange={(event) => setAnalysis((current) => ({ ...current, metrics: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} /></label></div></div>}
    {activeStep === "preview" && <div className="business-workbench-body"><div className="workbench-section-title"><div><p>STEP 06</p><h2>预览与发布</h2></div></div><div className="preview-mode-grid"><article><strong>填写预览</strong><span>按提报端和样例组织查看字段、联动与校验</span><Link to={source ? `/app/platform/configuration/designer?businessId=${encodeURIComponent(source.id)}&mode=preview` : href("form")}>打开填写预览</Link></article><article><strong>流程预演</strong><span>模拟节点、状态、处理组织和处理权限</span><Link to={href("workflow")}>查看流程配置</Link></article><article><strong>运行预览</strong><span>查看发布后的菜单、列表、详情和待办入口</span><Link to={source ? `/app/platform/business/${source.code}` : href("permissions")}>查看运行入口</Link></article></div><div className="publish-checklist"><strong>发布前联合校验</strong>{!config && <span>请先保存草稿</span>}{errors.map((error) => <span className="field-error" key={error}>{error}</span>)}{config && errors.length === 0 && <span className="success-text">基本信息、表单、流程、权限和分析配置校验通过</span>}</div><div className="publish-diff"><strong>与当前激活版本差异</strong>{changes.added.length === 0 && changes.changed.length === 0 && changes.removed.length === 0 ? <span>暂无差异</span> : <>{changes.added.map((item) => <span className="diff-added" key={`add-${item}`}>新增 · {item}</span>)}{changes.changed.map((item) => <span className="diff-changed" key={`change-${item}`}>修改 · {item}</span>)}{changes.removed.map((item) => <span className="diff-removed" key={`remove-${item}`}>停用/移除 · {item}</span>)}</>}</div><div className="admin-form-grid"><label className="dialog-input">版本名称<input aria-label="版本名称" value={versionName} onChange={(event) => setVersionName(event.target.value)} /></label><label className="dialog-input wide"><span>变更说明 <em className="required-mark" aria-hidden="true">*</em></span><textarea aria-label="变更说明" value={changeNote} maxLength={500} onChange={(event) => setChangeNote(event.target.value)} /></label></div><div className="list-page-actions"><button className="secondary-button" type="button" onClick={saveDraft}>保存草稿</button>{source && <button className="secondary-button" type="button" onClick={discardDraft}>放弃草稿</button>}<button className="primary-small" type="button" onClick={publish}>联合校验并发布</button><Link className="secondary-button" to={href("history")}>版本历史</Link></div></div>}
    {activeStep === "history" && <div className="business-history"><header><h2>业务版本历史</h2><span>发布版本不可编辑；回滚会生成新的业务草稿。</span></header>{(config?.versions ?? []).map((version) => <article key={version.id}><div><strong>v{version.version} · {version.name}</strong><span>{version.publishedAt} · {version.publishedBy} · {version.changeNote}</span></div><span className={`status ${version.active ? "approved" : "pending"}`}>{version.active ? "激活" : "历史"}</span><button className="table-action" type="button" onClick={() => { if (config) { const next = rollbackBusinessDefinition(config, version); setConfig(next); setWorkflow(version.workflow); setPermissions(version.permissions); setAnalysis(version.analysis); setFeedback({ tone: "success", message: `已将 v${version.version} 复制为新草稿` }); } }}>回滚为草稿</button></article>)}{!config?.versions.length && <EmptyState compact message="暂无已发布版本" />}</div>}</section></div>;
}

function ConfigurationAssetsPage() { return <Navigate to="/app/platform/configuration/dictionaries" replace />; }

function dynamicFieldValue(record: DynamicBusinessRecord, fieldCode: string): string {
  if (fieldCode === "businessNo") return record.id;
  if (fieldCode === "organization") return record.organizationName;
  if (fieldCode === "status") return record.status;
  if (fieldCode === "businessDate") return record.createdAt.slice(0, 10);
  return record.values[fieldCode] ?? "";
}

function dynamicFieldLabel(fieldCode: string, form: FormDesignDraft): string {
  return form.groups.flatMap((group) => group.fields).find((field) => field.fieldCode === fieldCode)?.label
    ?? ({ businessNo: "业务编号", organization: "组织", businessDate: "业务日期", status: "状态" }[fieldCode] ?? fieldCode);
}

function DynamicBusinessDataPage() {
  const { code = "", id } = useParams<{ code: string; id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const role: DemoRole = location.pathname.startsWith("/app/supplier/") ? "supplier" : location.pathname.startsWith("/app/factory/") ? "factory" : "platform";
  const business = readConfigurationBusinesses().find((item) => item.code === code);
  const config = business ? readBusinessDefinitionConfigs().find((item) => item.businessId === business.id) : undefined;
  const activeVersion = config?.versions.find((version) => version.active);
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isNew = location.pathname.endsWith("/new");
  const session = readDemoSession();
  const organizationId = session?.organizationId ?? (role === "platform" ? PLATFORM_RUNTIME_ORGANIZATION_ID : factoryOrganizationId);
  const organizationName = session?.organizationName ?? (role === "platform" ? "质量平台" : roleProfiles[role].organization);
  const userName = session?.userName ?? roleProfiles[role].user;
  const submitterType = role === "platform" ? "平台" : role === "supplier" ? "供应商" : "工厂";
  const canAccessBusiness = role === "platform" || Boolean(business?.submitterTypes?.includes(submitterType) && activeVersion?.permissions.read);
  const runtimeStore = readDynamicBusinessRuntimeStore();
  const records = dynamicRecordsForOrganization(runtimeStore, code, organizationId, role === "platform");
  const currentRecord = id ? records.find((record) => record.id === id) : undefined;
  const recordVersion = currentRecord?.definitionSnapshot;
  const displayForm = recordVersion?.form ?? activeVersion?.form;
  const displayWorkflow = recordVersion?.workflow ?? activeVersion?.workflow;
  const listFields = activeVersion?.analysis.listFields?.length ? activeVersion.analysis.listFields : ["businessNo", "organization", "businessDate", "status"];
  const currentTodo = currentRecord ? runtimeStore.todos.find((todo) => todo.recordId === currentRecord.id && todo.status === "open") : undefined;
  const todoCount = openDynamicTodosForOrganization(runtimeStore, organizationId).filter((todo) => todo.businessCode === code).length;

  useEffect(() => { if (currentRecord) setValues(currentRecord.values); }, [currentRecord?.id]);
  if (!business || business.status !== "active") return <Navigate to={role === "platform" ? "/app/platform/configuration/businesses" : `/app/${role}`} replace />;
  const activeBusiness = business;
  if (!activeVersion || !displayForm) return <div className="page-stack platform-admin-page"><div className="page-heading"><p>业务数据管理</p><h1>{business.name}</h1><span>该业务尚未发布激活版本，暂不能提报。</span></div></div>;
  if (!canAccessBusiness) return <MerchantBusinessAccessDenied role={role} />;
  if (id && !currentRecord) return <Navigate to={runtimeBusinessPath(role, code)} replace />;

  function updateValue(fieldCode: string, value: string): void { setValues((current) => ({ ...current, [fieldCode]: value })); setErrors((current) => ({ ...current, [fieldCode]: "" })); }
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors = validateDesignPreview(activeVersion!.form, values);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setFeedback({ tone: "error", message: "请修正表单后再提交" }); return; }
    const now = "2026-08-29 10:00";
    const submission = createDynamicBusinessSubmission({ id: `${activeBusiness.numberPrefix ?? activeBusiness.code.slice(0, 8).toUpperCase()}${Date.now()}`, businessId: activeBusiness.id, businessCode: activeBusiness.code, businessName: activeBusiness.name, version: activeVersion!, organizationId, organizationName, submittedBy: userName, values, now });
    saveDynamicBusinessRuntimeStore({ records: [submission.record, ...runtimeStore.records], events: [submission.event, ...runtimeStore.events], todos: [...(submission.todo ? [submission.todo] : []), ...runtimeStore.todos] });
    const latest = readConfigurationBusinesses().find((item) => item.id === activeBusiness.id);
    const allRecords = readDynamicBusinessRuntimeStore().records;
    if (latest) upsertBusiness({ ...latest, dataCount: allRecords.filter((item) => item.businessId === activeBusiness.id).length, inTransitCount: allRecords.filter((item) => item.businessId === activeBusiness.id && !item.archivedAt).length });
    setFeedback({ tone: "success", message: submission.todo ? "业务数据已提交，已生成处理待办" : "业务数据已提交并归档" });
    navigate(`${runtimeBusinessPath(role, code)}/${submission.record.id}`);
  }
  function advance(record: DynamicBusinessRecord): void {
    try {
      const nextStore = transitionDynamicBusinessRecord({ store: runtimeStore, recordId: record.id, actorOrganizationId: organizationId, actorOrganizationName: organizationName, actorName: userName, now: "2026-08-29 10:05" });
      saveDynamicBusinessRuntimeStore(nextStore);
      const updated = nextStore.records.find((item) => item.id === record.id);
      setFeedback({ tone: "success", message: updated?.archivedAt ? "已完成处理并归档" : `已流转至${updated?.status ?? "下一节点"}` });
      navigate(runtimeBusinessPath(role, code));
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "流程处理失败" });
    }
  }
  function renderField(field: FormDesignDraft["groups"][number]["fields"][number]): ReactNode {
    const definition = readFieldDefinitions().find((item) => item.code === field.fieldCode);
    const validation = field.validation;
    const label = <span className="form-field-label">{field.label}{isDesignFieldRequired(field, values) && <em>*</em>}</span>;
    const common = { value: values[field.fieldCode] ?? "", onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => updateValue(field.fieldCode, event.target.value), "aria-label": field.label };
    let control: ReactNode;
    if (definition?.type === "multi_line") control = <textarea {...common} />;
    else if (definition?.type === "date" || definition?.type === "datetime") control = <input {...common} type={definition.type} />;
    else if (definition?.type === "integer" || definition?.type === "decimal") control = <input {...common} type="number" />;
    else if (definition?.type === "select" || definition?.type === "radio") control = <select {...common}><option value="">请选择</option>{(validation?.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    else control = <input {...common} type={definition?.type === "file" ? "file" : "text"} />;
    return <label key={field.fieldCode} className={`span-${field.span}`}>{label}{control}{errors[field.fieldCode] && <em className="field-error">{errors[field.fieldCode]}</em>}</label>;
  }
  if (isNew) return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><p>业务数据管理</p><h1>新增{business.name}</h1><span>{business.code} · 使用激活版本 v{activeVersion.version}</span></div><button className="secondary-button" onClick={() => navigate(runtimeBusinessPath(role, code))}>返回列表</button></div><ActionFeedback feedback={feedback} /><form className="form-card dynamic-business-form" onSubmit={submit}>{activeVersion.form.groups.map((group) => <BusinessFormSection title={group.name} key={group.id}><div className={`form-grid columns-${group.columns}`}>{group.fields.filter((field) => field.visible !== false).map(renderField)}</div></BusinessFormSection>)}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => navigate(runtimeBusinessPath(role, code))}>取消</button><button className="primary-button" type="submit">提交业务</button></div></form></div>;
  if (currentRecord) return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><p>业务数据管理</p><h1>{business.name}详情</h1><span>{currentRecord.id} · 提交版本 v{currentRecord.version} · {currentRecord.archivedAt ? "已归档" : "处理中"}</span></div><button className="secondary-button" onClick={() => navigate(runtimeBusinessPath(role, code))}>返回列表</button></div><ActionFeedback feedback={feedback} /><section className="work-card dynamic-record-overview"><div><span>当前状态</span><strong>{currentRecord.status}</strong></div><div><span>提报组织</span><strong>{currentRecord.organizationName}</strong></div><div><span>当前处理方</span><strong>{currentTodo ? currentTodo.handlerOrganizationName : currentRecord.archivedAt ? "已归档" : "待处理"}</strong></div><div><span>定义版本</span><strong>v{currentRecord.version}</strong></div></section><section className="form-card dynamic-record-detail"><h2>提交内容</h2>{displayForm.groups.map((group) => <BusinessFormSection title={group.name} key={group.id}><div className={`form-grid columns-${group.columns}`}>{group.fields.filter((field) => field.visible !== false).map((field) => <div className={`runtime-value span-${field.span}`} key={field.fieldCode}><span>{field.label}</span><strong>{dynamicFieldValue(currentRecord, field.fieldCode) || "-"}</strong></div>)}</div></BusinessFormSection>)}</section><section className="work-card dynamic-timeline"><header><h2>流程时间线</h2><span>记录始终使用提交时的版本快照</span></header>{runtimeStore.events.filter((event) => event.recordId === currentRecord.id).slice().reverse().map((event) => <article key={event.id}><span className="timeline-dot" /><div><strong>{event.action}</strong><small>{event.fromStatus ? `${event.fromStatus} → ` : ""}{event.toStatus} · {event.actorOrganizationName} / {event.actorName}</small></div><time>{event.createdAt}</time></article>)}</section>{currentTodo?.handlerOrganizationId === organizationId && activeVersion.permissions.handle && <div className="form-actions"><button className="primary-button" type="button" onClick={() => advance(currentRecord)}>{displayWorkflow?.nodes.find((node) => node.id === currentTodo.nodeId)?.actions[0] ?? "处理待办"}</button></div>}</div>;
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><p>业务数据管理</p><h1>{business.name}</h1><span>{business.code} · 当前激活版本 v{activeVersion.version}</span></div><div className="list-page-actions">{activeVersion.permissions.submit && <Link className="primary-small" to={`${runtimeBusinessPath(role, code)}/new`}><Plus size={15} />新增提报</Link>}{role === "platform" && <Link className="secondary-button" to={`/app/platform/configuration/businesses/${business.id}`}>编辑配置</Link>}</div></div><ActionFeedback feedback={feedback} /><section className="list-summary"><div><strong>{records.length}</strong><span>业务记录</span></div><div><strong>{records.filter((record) => !record.archivedAt).length}</strong><span>在途记录</span></div><div><strong>{todoCount}</strong><span>我的待办</span></div></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr>{listFields.map((field) => <th key={field}>{dynamicFieldLabel(field, activeVersion.form)}</th>)}<th>当前处理方</th><th>操作</th></tr></thead><tbody>{records.map((record) => { const todo = runtimeStore.todos.find((item) => item.recordId === record.id && item.status === "open"); return <tr key={record.id}>{listFields.map((field) => <td key={field}>{dynamicFieldValue(record, field)}</td>)}<td>{todo?.handlerOrganizationName ?? "已归档"}</td><td><Link className="table-action" to={`${runtimeBusinessPath(role, code)}/${record.id}`}>详情</Link>{todo?.handlerOrganizationId === organizationId && activeVersion.permissions.handle && <button className="table-action" type="button" onClick={() => advance(record)}>处理待办</button>}</td></tr>; })}{records.length === 0 && <tr><td colSpan={listFields.length + 2} className="empty-cell">暂无业务数据，点击“新增提报”创建第一条记录</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {records.length} 条记录</span></div></section></div>;
}
function analyticsSourceRecords(): AnalyticsRecord[] {
  return readAuditedBusinessRecords().filter((record) => record.businessType === "inbound_report").map((record) => ({ id: record.id, businessCode: "inbound_report", businessName: "入库报告", organizationId: record.factoryOrganizationId, organizationName: record.factoryOrganization, status: record.status, businessDate: record.businessDate }));
}
function analyticsStatusLabel(status: string): string { return ({ approved: "已通过", pending_review: "待审核", pending_return: "待退回", pending_replenish: "待补料", rejected: "已驳回", completed: "已完成", cancelled: "已取消" } as Record<string, string>)[status] ?? status; }
function AnalyticsPreview({ definition, filters = {}, title }: { definition: AnalyticsReportDraft; filters?: AnalyticsFilter; title: string }) {
  const result = queryAnalyticsRecords(analyticsSourceRecords(), definition, filters); const ratio = definition.metric === "status_ratio";
  const max = Math.max(1, ...result.groups.map((group) => ratio ? group.ratio ?? 0 : group.count));
  return <section className="analytics-preview" aria-label={title}><header><div><strong>{title}</strong><span>入库报告 · {result.total} 条可访问记录</span></div><small>数据范围与看板一致</small></header>{result.total === 0 ? <div className="analytics-empty">当前筛选范围内暂无数据</div> : definition.chartType === "kpi" ? <div className="analytics-kpi"><span>{ratio ? `${analyticsStatusLabel(definition.ratioStatus)}占比` : "记录数"}</span><strong>{ratio ? `${((result.ratio ?? 0) * 100).toFixed(2)}%` : result.total}</strong>{ratio && <small>分子 {result.numerator} / 分母 {result.denominator}</small>}</div> : definition.chartType === "table" ? <div className="responsive-table analytics-table"><table><thead><tr><th>{definition.dimension === "organization" ? "组织" : definition.dimension === "status" ? "状态" : "日期"}</th><th>{ratio ? "状态占比" : "记录数"}</th></tr></thead><tbody>{result.groups.map((group) => <tr key={group.key}><td>{definition.dimension === "status" ? analyticsStatusLabel(group.label) : group.label}</td><td>{ratio ? `${((group.ratio ?? 0) * 100).toFixed(2)}%` : group.count}</td></tr>)}</tbody></table></div> : <div className="analytics-bars">{result.groups.map((group) => { const value = ratio ? group.ratio ?? 0 : group.count; return <div className="analytics-bar-row" key={group.key}><span>{definition.dimension === "status" ? analyticsStatusLabel(group.label) : group.label}</span><div><i style={{ width: `${Math.max(5, value / max * 100)}%` }} /></div><b>{ratio ? `${(value * 100).toFixed(2)}%` : value}</b></div>; })}</div>}</section>;
}
function AnalyticsFilters({ filters, onChange, prefix }: { filters: AnalyticsFilter; onChange: (value: AnalyticsFilter) => void; prefix: string }) {
  const organizations = [...new Map(analyticsSourceRecords().map((record) => [record.organizationId, record.organizationName]))]; const statuses = [...new Set(analyticsSourceRecords().map((record) => record.status))];
  return <div className="analytics-config-grid"><label>组织<select aria-label={`${prefix}组织`} value={filters.organizationId ?? ""} onChange={(event) => onChange({ ...filters, organizationId: event.target.value || undefined })}><option value="">全部组织</option>{organizations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>状态<select aria-label={`${prefix}状态`} value={filters.status ?? ""} onChange={(event) => onChange({ ...filters, status: event.target.value || undefined })}><option value="">全部状态</option>{statuses.map((status) => <option key={status} value={status}>{analyticsStatusLabel(status)}</option>)}</select></label><label>开始日期<input aria-label={`${prefix}开始日期`} type="date" value={filters.startDate ?? ""} onChange={(event) => onChange({ ...filters, startDate: event.target.value || undefined })} /></label><label>结束日期<input aria-label={`${prefix}结束日期`} type="date" value={filters.endDate ?? ""} onChange={(event) => onChange({ ...filters, endDate: event.target.value || undefined })} /></label></div>;
}
function ConfigurationAnalyticsPage() {
  const [reports, setReports] = useState(readAnalyticsReports); const [dashboards, setDashboards] = useState(readAnalyticsDashboards); const [tab, setTab] = useState<"reports" | "dashboards">("reports"); const [report, setReport] = useState<AnalyticsReport>(); const [dashboard, setDashboard] = useState<AnalyticsDashboard>(); const [feedback, setFeedback] = useState<Feedback>();
  const refresh = () => { setReports(readAnalyticsReports()); setDashboards(readAnalyticsDashboards()); };
  const reportDraft = (): AnalyticsReport => ({ id: "", name: "", code: "", status: "draft", draft: { businessCode: "inbound_report", dimension: "status", metric: "record_count", ratioStatus: "approved", filters: {}, chartType: "bar" }, versions: [], updatedAt: "", updatedBy: "平台管理员" });
  const dashboardDraft = (): AnalyticsDashboard => ({ id: "", name: "", code: "", status: "draft", draft: { filters: {}, items: [] }, active: null, updatedAt: "", updatedBy: "平台管理员" });
  function saveReport(): AnalyticsReport | undefined { if (!report) return; try { const initial = report.id ? report : { ...createAnalyticsReport(report.name, report.code), draft: report.draft }; const saved = saveAnalyticsReport(initial); setReport(saved); refresh(); setFeedback({ tone: "success", message: "报表草稿已保存" }); return saved; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "保存失败" }); } }
  function saveDashboard(): AnalyticsDashboard | undefined { if (!dashboard) return; try { const initial = dashboard.id ? dashboard : { ...createAnalyticsDashboard(dashboard.name, dashboard.code), draft: dashboard.draft }; const saved = saveAnalyticsDashboard(initial); setDashboard(saved); refresh(); setFeedback({ tone: "success", message: "看板草稿已保存" }); return saved; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "保存失败" }); } }
  if (report) { const statuses = [...new Set(analyticsSourceRecords().map((record) => record.status))]; const update = (draft: Partial<AnalyticsReportDraft>) => setReport({ ...report, draft: { ...report.draft, ...draft } }); return <div className="page-stack platform-admin-page analytics-page"><div className="analytics-titlebar"><button className="back-button" onClick={() => { setReport(undefined); refresh(); }}><ArrowLeft size={16} />返回报表列表</button><div className="analytics-title-actions"><span className={`status ${report.status === "active" ? "approved" : "pending"}`}>{report.status === "active" ? "已发布" : "草稿"}</span><button className="secondary-button" onClick={saveReport}>保存草稿</button><button className="primary-small" onClick={() => { const saved = saveReport(); if (!saved) return; try { const published = publishAnalyticsReport(saved); setReport(published); refresh(); setFeedback({ tone: "success", message: `报表已发布并激活 V${published.versions[0].version}` }); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "发布失败" }); } }}>发布激活</button></div></div><ActionFeedback feedback={feedback} /><section className="work-card analytics-editor"><div className="analytics-editor-heading"><div><h1>{report.id ? "编辑动态报表" : "新增动态报表"}</h1><span>草稿仅对配置人员可见；发布后版本不可修改。</span></div><span>{report.versions.length ? `激活 V${report.versions[0].version}` : "未发布"}</span></div><div className="analytics-config-grid"><label>报表名称<input aria-label="报表名称" value={report.name} onChange={(event) => setReport({ ...report, name: event.target.value })} /></label><label>报表编码<input aria-label="报表编码" value={report.code} onChange={(event) => setReport({ ...report, code: event.target.value.toUpperCase() })} /></label><label>数据源<select aria-label="报表数据源" value={report.draft.businessCode} onChange={(event) => update({ businessCode: event.target.value })}><option value="inbound_report">入库报告业务记录</option></select></label><label>图表类型<select aria-label="图表类型" value={report.draft.chartType} onChange={(event) => update({ chartType: event.target.value as AnalyticsReportDraft["chartType"] })}><option value="bar">柱状图</option><option value="kpi">指标卡</option><option value="table">汇总表</option></select></label><label>统计维度<select aria-label="统计维度" value={report.draft.dimension} onChange={(event) => update({ dimension: event.target.value as AnalyticsReportDraft["dimension"] })}><option value="status">业务状态</option><option value="organization">组织</option><option value="date">业务日期</option></select></label><label>统计指标<select aria-label="统计指标" value={report.draft.metric} onChange={(event) => update({ metric: event.target.value as AnalyticsReportDraft["metric"] })}><option value="record_count">记录数</option><option value="status_ratio">状态占比</option></select></label>{report.draft.metric === "status_ratio" && <label>占比状态<select aria-label="占比状态" value={report.draft.ratioStatus} onChange={(event) => update({ ratioStatus: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{analyticsStatusLabel(status)}</option>)}</select></label>}</div><div className="analytics-filter-block"><strong>默认筛选</strong><AnalyticsFilters prefix="报表筛选" filters={report.draft.filters} onChange={(filters) => update({ filters })} /></div><AnalyticsPreview definition={report.draft} title="报表预览（当前草稿）" />{report.versions.length > 0 && <section className="analytics-version-history" aria-label="报表版本历史"><header><strong>报表版本历史</strong><span>已发布版本不可编辑</span></header>{report.versions.map((version, index) => <div key={version.version}><strong>V{version.version}</strong><span>{version.name} · {version.publishedAt} · {version.publishedBy}</span><em>{index === 0 ? "当前激活" : "历史只读"}</em></div>)}</section>}</section></div>; }
  if (dashboard) { const published = reports.filter((item) => item.status === "active" && item.versions.length); const items = dashboard.draft.items.map((item) => ({ item, report: reports.find((report) => report.id === item.reportId) })).filter((entry): entry is { item: AnalyticsDashboardDraft["items"][number]; report: AnalyticsReport } => Boolean(entry.report)); const update = (draft: Partial<AnalyticsDashboardDraft>) => setDashboard({ ...dashboard, draft: { ...dashboard.draft, ...draft } }); const move = (index: number, offset: number) => { const target = index + offset; if (target < 0 || target >= dashboard.draft.items.length) return; const next = [...dashboard.draft.items]; [next[index], next[target]] = [next[target], next[index]]; update({ items: next }); }; return <div className="page-stack platform-admin-page analytics-page"><div className="analytics-titlebar"><button className="back-button" onClick={() => { setDashboard(undefined); refresh(); }}><ArrowLeft size={16} />返回看板列表</button><div className="analytics-title-actions"><span className={`status ${dashboard.status === "active" ? "approved" : "pending"}`}>{dashboard.status === "active" ? "已发布" : "草稿"}</span><button className="secondary-button" onClick={saveDashboard}>保存草稿</button><button className="primary-small" onClick={() => { const saved = saveDashboard(); if (!saved) return; try { const publishedDashboard = publishAnalyticsDashboard(saved); setDashboard(publishedDashboard); refresh(); setFeedback({ tone: "success", message: "看板已发布，整张看板已生效" }); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "发布失败" }); } }}>发布看板</button></div></div><ActionFeedback feedback={feedback} /><section className="work-card analytics-editor"><div className="analytics-editor-heading"><div><h1>{dashboard.id ? "编辑看板" : "新增看板"}</h1><span>看板全局筛选会传递给每个组件。</span></div><span>{dashboard.draft.items.length} 个组件</span></div><div className="analytics-config-grid"><label>看板名称<input aria-label="看板名称" value={dashboard.name} onChange={(event) => setDashboard({ ...dashboard, name: event.target.value })} /></label><label>看板编码<input aria-label="看板编码" value={dashboard.code} onChange={(event) => setDashboard({ ...dashboard, code: event.target.value.toUpperCase() })} /></label></div><div className="analytics-filter-block"><strong>全局筛选</strong><AnalyticsFilters prefix="看板筛选" filters={dashboard.draft.filters} onChange={(filters) => update({ filters })} /></div><label className="analytics-add-report">添加已发布报表<select aria-label="添加看板组件" defaultValue="" onChange={(event) => { const reportId = event.target.value; event.currentTarget.value = ""; if (reportId && !dashboard.draft.items.some((item) => item.reportId === reportId)) update({ items: [...dashboard.draft.items, { id: `dashboard-item-${Date.now()}`, reportId }] }); }}><option value="">选择已发布报表</option>{published.map((item) => <option key={item.id} value={item.id}>{item.name} · V{item.versions[0].version}</option>)}</select></label><div className="analytics-dashboard-grid">{items.map(({ item, report }, index) => <article className="analytics-dashboard-component" key={item.id}><header><div><strong>{item.title || report.name}</strong><span>报表 V{report.versions[0].version}</span></div><div className="analytics-component-actions"><button title="上移组件" aria-label={`上移 ${report.name}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button title="下移组件" aria-label={`下移 ${report.name}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button title="移除组件" aria-label={`移除 ${report.name}`} onClick={() => update({ items: dashboard.draft.items.filter((entry) => entry.id !== item.id) })}><Trash2 size={15} /></button></div></header><AnalyticsPreview definition={report.versions[0]} filters={dashboard.draft.filters} title={report.name} /></article>)}{!items.length && <div className="analytics-empty">选择已发布报表后，组件会在这里按相同数据范围预览。</div>}</div></section></div>; }
  return <div className="page-stack platform-admin-page analytics-page"><div className="list-page-title"><div><h1>{tab === "reports" ? "动态报表" : "看板配置"}</h1><span className="page-subtitle">单一业务记录源 Demo。报表预览和看板组件复用相同数据范围。</span></div><div className="list-page-actions"><button className="secondary-button" onClick={refresh}><RefreshCw size={15} />刷新</button><button className="primary-small" onClick={() => tab === "reports" ? setReport(reportDraft()) : setDashboard(dashboardDraft())}><Plus size={16} />{tab === "reports" ? "新增报表" : "新增看板"}</button></div></div><div className="analytics-tabs"><button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>动态报表</button><button className={tab === "dashboards" ? "active" : ""} onClick={() => setTab("dashboards")}>看板配置</button></div><ActionFeedback feedback={feedback} /><section className="work-card admin-table-card"><div className="responsive-table"><table>{tab === "reports" ? <><thead><tr><th>报表名称/编码</th><th>数据源</th><th>图表类型</th><th>状态</th><th>所属看板</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{reports.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code}</small></td><td>入库报告</td><td>{{ kpi: "指标卡", table: "汇总表", bar: "柱状图" }[item.draft.chartType]}</td><td><span className={`status ${item.status === "active" ? "approved" : item.status === "disabled" ? "cancelled" : "pending"}`}>{item.status === "active" ? "已发布" : item.status === "disabled" ? "已停用" : "草稿"}</span></td><td>{dashboards.filter((dashboard) => dashboard.draft.items.some((entry) => entry.reportId === item.id)).map((dashboard) => dashboard.name).join("、") || "—"}</td><td>{item.updatedAt}</td><td><button className="table-action" onClick={() => setReport(JSON.parse(JSON.stringify(item)) as AnalyticsReport)}>编辑/预览</button>{item.status === "active" && <button className="table-action danger-text" onClick={() => { try { disableAnalyticsReport(item); refresh(); setFeedback({ tone: "success", message: "报表已停用" }); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "停用失败" }); } }}>停用</button>}</td></tr>)}{!reports.length && <tr><td className="empty-cell" colSpan={7}>暂无动态报表，请创建第一张报表</td></tr>}</tbody></> : <><thead><tr><th>看板名称/编码</th><th>状态</th><th>组件数</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{dashboards.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code}</small></td><td><span className={`status ${item.status === "active" ? "approved" : "pending"}`}>{item.status === "active" ? "已发布" : "草稿"}</span></td><td>{item.draft.items.length}</td><td>{item.updatedAt}</td><td><button className="table-action" onClick={() => setDashboard(JSON.parse(JSON.stringify(item)) as AnalyticsDashboard)}>编辑</button></td></tr>)}{!dashboards.length && <tr><td className="empty-cell" colSpan={5}>暂无看板，请先创建并发布动态报表</td></tr>}</tbody></>}</table></div></section></div>;
}
function ConfigurationPlaceholderPage({ section, title, items }: { section: string; title: string; items: string[] }) { return <div className="page-stack platform-admin-page configuration-page"><div className="page-heading"><p>{section}</p><h1>{title}</h1><span>页面骨架已接入配置中心导航，具体能力按后续 PRD 任务实现。</span></div><ConfigurationNavigation view={section.includes("分析") ? "analytics" : "audit"} /><section className="configuration-entry-grid">{items.map((item) => <article className="configuration-entry-card pending" key={item}><strong>{item}</strong><span>待 DEV-20-P05/P06 接入</span><em>建设中</em></article>)}</section></div>; }

function ConfigurationCenterPage({ view }: { view: ConfigurationView }) {
  if (view === "businesses") return <ConfigurationBusinessListPage />;
  if (view === "assets") return <ConfigurationAssetsPage />;
  if (view === "analytics") return <ConfigurationAnalyticsPage />;
  if (view === "audit") return <ConfigurationPlaceholderPage section="CONFIGURATION CENTER / PUBLISH & AUDIT" title="发布与审计" items={["发布记录", "配置操作日志"]} />;
  if (view === "dictionaries") return <DictionaryManagementPage />;
  if (view === "fields") return <FieldLibraryPage />;
  if (view === "designer") return <FormDesignerPage />;
  return <ConfigSchemaPage />;
}

function PlatformMerchantsPage() {
  const navigate = useNavigate();
  const applications = readMerchantApplications();
  const [companyQuery, setCompanyQuery] = useState("");
  const [administratorQuery, setAdministratorQuery] = useState("");
  const [merchantType, setMerchantType] = useState<"all" | MerchantApplication["merchantType"]>("all");
  const pendingCount = applications.filter((item) => item.reviewStatus === "pending").length;
  const merchants = applications.filter((item) => item.reviewStatus === "approved" && item.companyName.includes(companyQuery.trim()) && item.administratorName.includes(administratorQuery.trim()) && (merchantType === "all" || item.merchantType === merchantType));
  return <div className="page-stack merchant-management-page"><div className="list-page-title"><h1>商家管理</h1><div className="list-page-actions"><button className="secondary-button">导出数据</button><button className="primary-small audit-entry-button" onClick={() => navigate("/app/platform/merchant-audits")}><FileCheck2 size={16} />商家注册审核{pendingCount > 0 && <span>{pendingCount}</span>}</button></div></div><section className="merchant-filter-card"><input aria-label="搜索公司名称" placeholder="搜索公司名称" value={companyQuery} onChange={(event) => setCompanyQuery(event.target.value)} /><input aria-label="搜索管理员名称" placeholder="搜索管理员名称" value={administratorQuery} onChange={(event) => setAdministratorQuery(event.target.value)} /><select aria-label="商家类型" value={merchantType} onChange={(event) => setMerchantType(event.target.value as typeof merchantType)}><option value="all">全部类型</option><option value="supplier">供应商</option><option value="factory">OEM 工厂</option></select><button className="primary-small">搜索</button><button className="secondary-button" onClick={() => { setCompanyQuery(""); setAdministratorQuery(""); setMerchantType("all"); }}>重置</button></section><section className="work-card shipment-list-card merchant-management-table"><div className="responsive-table"><table><thead><tr><th>序号</th><th>商家名称</th><th>商家类型</th><th>统一社会信用代码</th><th>管理员姓名</th><th>管理员手机号码</th><th>注册时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{merchants.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><Link to={`/app/platform/merchants/${item.id}`}>{item.companyName}</Link></td><td>{item.merchantType === "supplier" ? "供应商" : "OEM 工厂"}</td><td>{item.creditCode}</td><td>{item.administratorName}</td><td>{item.administratorPhone}</td><td>{item.createdAt}</td><td><MerchantStatusBadge application={item} /></td><td><Link className="table-action" to={`/app/platform/merchants/${item.id}`}>查看</Link><button className="table-danger-action" onClick={() => navigate(`/app/platform/merchants/${item.id}`)}>{item.usageStatus === "active" ? "停用" : "启用"}</button></td></tr>)}{merchants.length === 0 && <tr><td className="empty-cell" colSpan={9}>暂无符合条件的商家</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {merchants.length} 条记录</span><button disabled>‹</button><button className="active">1</button><button disabled>›</button><button className="page-size-button">10 条/页</button></div></section></div>;
}

type MerchantAuditTab = "all" | MerchantReviewStatus;

function MerchantAuditStatusBadge({ status }: { status: MerchantReviewStatus }) {
  const label = status === "pending" ? "审核中" : merchantReviewLabel(status);
  const className = status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "cancelled" ? "cancelled" : "pending";
  return <span className={`status ${className}`}>{label}</span>;
}

function MerchantApplicationDialog({ application, onClose, onReview, onCancel }: { application: MerchantApplication; onClose: () => void; onReview: () => void; onCancel: () => void }) {
  return createPortal(<div className="dialog-backdrop"><section className="review-dialog merchant-application-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-application-title"><header><h2 id="merchant-application-title">商家详情</h2><button aria-label="关闭商家详情" onClick={onClose}><X size={21} /></button></header><div className="dialog-body"><strong className="readonly-section-title">注册信息（只读）</strong><div className="readonly-field-grid"><div><span>公司名称</span><strong>{application.companyName}</strong></div><div><span>商家类型</span><strong>{application.merchantType === "supplier" ? "供应商" : "OEM 工厂"}</strong></div><div className="wide"><span>统一社会信用代码</span><strong>{application.creditCode}</strong></div><div><span>管理员姓名</span><strong>{application.administratorName}</strong></div><div><span>管理员手机</span><strong>{application.administratorPhone}</strong></div><div className="wide"><span>管理员邮箱</span><strong>{application.administratorEmail}</strong></div><div><span>当前状态</span><strong>{application.reviewStatus === "pending" ? "审核中" : merchantReviewLabel(application.reviewStatus)}</strong></div>{application.reviewReason && <div className="wide"><span>驳回原因</span><strong>{application.reviewReason}</strong></div>}</div></div><footer>{(application.reviewStatus === "pending" || application.reviewStatus === "rejected") && <button className="danger-outline-button" onClick={onCancel}>取消申请</button>}{application.reviewStatus === "pending" && <button className="primary-small" onClick={onReview}>审核</button>}</footer></section></div>, document.body);
}

function PlatformMerchantAuditsPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const initialId = new URLSearchParams(search).get("application");
  const [applications, setApplications] = useState(readMerchantApplications);
  const [activeTab, setActiveTab] = useState<MerchantAuditTab>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(initialId ?? undefined);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const selected = applications.find((item) => item.id === selectedId);
  const tabs: Array<{ id: MerchantAuditTab; label: string }> = [{ id: "all", label: "全部" }, { id: "pending", label: "审核中" }, { id: "approved", label: "已通过" }, { id: "rejected", label: "已驳回" }, { id: "cancelled", label: "已取消" }];
  const filtered = applications.filter((item) => (activeTab === "all" || item.reviewStatus === activeTab) && (!query.trim() || item.companyName.includes(query.trim()) || item.creditCode.includes(query.trim())));
  function persist(updated: MerchantApplication, message: string) { try { saveMerchantApplication(updated, selected?.version); setApplications(readMerchantApplications()); setSelectedId(updated.id); setFeedback({ tone: "success", message }); return true; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "操作失败" }); return false; } }
  function review(result: "approved" | "rejected", reason: string) { if (!selected) return; const now = "2026-08-13 14:30"; const updated: MerchantApplication = { ...selected, reviewStatus: result, usageStatus: result === "approved" ? "active" : null, reviewReason: reason || undefined, approvedAt: result === "approved" ? now : undefined, updatedAt: now, flowRecords: [...selected.flowRecords, { id: `${selected.id}-review-${Date.now()}`, kind: result === "approved" ? "review_approved" : "review_rejected", action: result === "approved" ? "平台审核通过" : "平台审核驳回", time: now, operator: "演示管理员", organization: "示例质量运营中心", detail: reason || undefined }] }; if (result === "rejected") { if (persist(updated, "商家注册已驳回")) setReviewOpen(false); return; } try { saveMerchantApprovalAtomically(updated, selected.version); setApplications(readMerchantApplications()); setSelectedId(updated.id); setFeedback({ tone: "success", message: "商家注册已通过，管理员账号与超级管理员角色已初始化" }); setReviewOpen(false); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "商家审批初始化失败" }); } }
  function cancelRegistration() { if (!selected) return; const now = "2026-08-13 15:10"; const updated: MerchantApplication = { ...selected, reviewStatus: "cancelled", usageStatus: null, updatedAt: now, flowRecords: [...selected.flowRecords, { id: `${selected.id}-cancel-${Date.now()}`, kind: "cancelled", action: "平台取消注册申请", time: now, operator: "演示管理员", organization: "示例质量运营中心" }] }; if (persist(updated, "注册申请已取消")) setCancelOpen(false); }
  return <div className="page-stack merchant-audit-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate("/app/platform/merchants")}><ArrowLeft size={16} />返回</button><h1>商家审核</h1></div><button className="secondary-button refresh-button" onClick={() => setApplications(readMerchantApplications())}><RefreshCw size={15} />刷新</button></div><ActionFeedback feedback={feedback} /><section className="todo-list-card merchant-audit-card"><div className="todo-tabs" role="tablist" aria-label="商家审核状态">{tabs.map((tab) => <button role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}<span>{applications.filter((item) => tab.id === "all" || item.reviewStatus === tab.id).length}</span></button>)}</div><div className="merchant-audit-search"><input aria-label="搜索商家名称或统一社会信用代码" placeholder="搜索商家名称/统一社会信用代码" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="primary-small">搜索</button></div><div className="responsive-table"><table><thead><tr><th>商家编码</th><th>商家名称</th><th>商家类型</th><th>统一社会信用代码</th><th>管理员姓名</th><th>管理员手机号码</th><th>申请时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.merchantNo}</td><td>{item.companyName}</td><td>{item.merchantType === "supplier" ? "供应商" : "OEM 工厂"}</td><td>{item.creditCode}</td><td>{item.administratorName}</td><td>{item.administratorPhone}</td><td>{item.createdAt}</td><td><MerchantAuditStatusBadge status={item.reviewStatus} /></td><td><button className="table-action" onClick={() => setSelectedId(item.id)}>查看</button></td></tr>)}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={9}>当前筛选下暂无注册申请</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 条记录</span><button disabled>‹</button><button className="active">1</button><button disabled>›</button><button className="page-size-button">10 条/页</button></div></section>{selected && !reviewOpen && !cancelOpen && <MerchantApplicationDialog application={selected} onClose={() => setSelectedId(undefined)} onReview={() => setReviewOpen(true)} onCancel={() => setCancelOpen(true)} />}{selected && reviewOpen && <MerchantReviewDialog application={selected} onClose={() => setReviewOpen(false)} onSubmit={review} />}{selected && cancelOpen && createPortal(<div className="dialog-backdrop"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-audit-cancel-title"><header><h2 id="merchant-audit-cancel-title">取消注册申请</h2><button aria-label="关闭取消申请弹窗" onClick={() => setCancelOpen(false)}><X size={21} /></button></header><div className="dialog-body"><div className="cancel-warning"><strong>确定取消该商家注册申请吗？</strong><span>取消后该商家可重新注册，取消记录将保留。</span></div></div><footer><button className="secondary-button" onClick={() => setCancelOpen(false)}>返回</button><button className="danger-button" onClick={cancelRegistration}>确定取消</button></footer></section></div>, document.body)}</div>;
}

function MerchantReviewDialog({ application, onClose, onSubmit }: { application: MerchantApplication; onClose: () => void; onSubmit: (result: "approved" | "rejected", reason: string) => void }) {
  const [result, setResult] = useState<"approved" | "rejected">("approved"); const [reason, setReason] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (result === "rejected" && !reason.trim()) return; onSubmit(result, reason.trim()); }
  return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-review-title"><header><h2 id="merchant-review-title">商家注册审核</h2><button aria-label="关闭审核弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>商家名称：</span><strong>{application.companyName}</strong></div><fieldset><legend>审核结果 <em>*</em></legend><label><input type="radio" name="merchant-result" checked={result === "approved"} onChange={() => setResult("approved")} />审核通过</label><label><input type="radio" name="merchant-result" checked={result === "rejected"} onChange={() => setResult("rejected")} />审核驳回</label></fieldset>{result === "rejected" && <label className="dialog-textarea"><span className="dialog-field-label">驳回原因 <em>*</em></span><textarea aria-label="驳回原因" required maxLength={100} value={reason} onChange={(e) => setReason(e.target.value)} /><span className="dialog-counter">{reason.length} / 100</span></label>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">提交审核</button></footer></form></section></div>;
}

function hasIncompleteMerchantWork(application: MerchantApplication): { tasks: number; businesses: number } {
  const organizationId = merchantOrganizationId(application);
  if (application.merchantType === "supplier") {
    return {
      tasks: readSupplierTasks(organizationId).length,
      businesses: readShipmentReports().filter((item) => item.supplierOrganizationId === organizationId && !["approved", "cancelled"].includes(item.status)).length,
    };
  }
  return {
    tasks: readFactoryTasks(organizationId).length,
    businesses: readMaterialExceptions().filter((item) => item.reporterOrganizationId === organizationId && !["approved", "cancelled"].includes(item.status)).length,
  };
}

function MerchantGrantDialog({ application, onClose, onSaved }: { application: MerchantApplication; onClose: () => void; onSaved: (message: string) => void }) {
  const sources = merchantIdentitySources();
  const organizationId = merchantOrganizationId(application);
  const grant = readOrganizationGrant(sources, organizationId);
  const [selected, setSelected] = useState(grant.permissionCodes);
  const [error, setError] = useState("");
  const tree = merchantPermissionTree(application.merchantType);
  function save(): void {
    try {
      const updated = updateOrganizationGrant(merchantIdentitySources(), organizationId, selected);
      appendAuditLog({ action: "调整商家功能授权", businessType: "merchant_grant", operator: "演示管理员", organization: application.companyName, time: "2026-08-27 11:00", detail: `Grant r${updated.revision} · ${updated.permissionCodes.length}项` });
      onSaved(`组织功能授权已更新为 r${updated.revision}，越界角色权限已清理`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "组织功能授权更新失败");
    }
  }
  return createPortal(<div className="dialog-backdrop"><section className="review-dialog merchant-grant-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-grant-dialog-title"><header><h2 id="merchant-grant-dialog-title">调整功能授权</h2><button type="button" aria-label="关闭功能授权弹窗" onClick={onClose}><X size={21} /></button></header><div className="dialog-body"><div className="dialog-business-no"><span>商家：</span><strong>{application.companyName}</strong></div><p className="admin-inline-note">这里配置商家组织的功能上限。收回权限后，超级管理员同步新上限，自定义角色中的越界权限立即移除。</p><PermissionTree nodes={tree} selected={selected} onToggle={(node, checked) => setSelected((current) => updatePermissionSelection(current, node, checked))} />{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-small" onClick={save}>保存授权</button></footer></section></div>, document.body);
}

function PlatformMerchantDetailPage() {
  const navigate = useNavigate(); const { id = "" } = useParams(); const [application, setApplication] = useState(() => readMerchantApplications().find((item) => item.id === id)); const [feedback, setFeedback] = useState<Feedback>(); const [disableOpen, setDisableOpen] = useState(false); const [grantOpen, setGrantOpen] = useState(false); const [grantRevision, setGrantRevision] = useState(0);
  if (!application) return <Navigate to="/app/platform/merchants" replace />;
  if (String(application.reviewStatus) !== "approved") return <Navigate to={`/app/platform/merchant-audits?application=${application.id}`} replace />;
  const currentApplication = application;
  const organizationId = merchantOrganizationId(currentApplication);
  const grant = readOrganizationGrant(merchantIdentitySources(), organizationId);
  function persist(updated: MerchantApplication, message: string) { try { const saved = saveMerchantApplication(updated, currentApplication.version); setApplication(saved); setFeedback({ tone: "success", message }); return true; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "操作失败" }); return false; } }
  function toggleUsage() { if (currentApplication.usageStatus === "active") { const work = hasIncompleteMerchantWork(currentApplication); if (work.tasks || work.businesses) { setFeedback({ tone: "error", message: `该商家有 ${work.tasks} 个待处理任务和 ${work.businesses} 个在途业务（作为提报方仍未完成），请先处理完再停用` }); setDisableOpen(false); return; } } const inactive = currentApplication.usageStatus === "active"; const now = "2026-08-13 15:00"; const updated: MerchantApplication = { ...currentApplication, usageStatus: inactive ? "inactive" : "active", updatedAt: now, flowRecords: [...currentApplication.flowRecords, { id: `${currentApplication.id}-usage-${Date.now()}`, kind: inactive ? "disabled" : "enabled", action: inactive ? "平台停用商家" : "平台启用商家", time: now, operator: "演示管理员", organization: "示例质量运营中心" }] }; if (persist(updated, inactive ? "商家已停用" : "商家已启用")) setDisableOpen(false); }
  const action = <button className={application.usageStatus === "active" ? "danger-outline-button" : "primary-small"} onClick={() => application.usageStatus === "active" ? setDisableOpen(true) : toggleUsage()}>{application.usageStatus === "active" ? "停用" : "启用"}</button>;
  return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate("/app/platform/merchants")}><ArrowLeft size={16} />返回</button><h1>{application.merchantNo} · {application.companyName}</h1><MerchantStatusBadge application={application} /></div><div className="detail-title-actions"><button className="secondary-button" onClick={() => setGrantOpen(true)}><ShieldCheck size={15} />调整功能权限</button>{action}</div></div><ActionFeedback feedback={feedback} /><div className="detail-sections"><DetailSection title="商家信息"><div className="detail-grid"><div><span>商家类型</span><strong>{application.merchantType === "supplier" ? "供应商" : "OEM 工厂"}</strong></div><div><span>公司名称</span><strong>{application.companyName}</strong></div><div><span>统一社会信用代码</span><strong>{application.creditCode}</strong></div><div><span>注册时间</span><strong>{application.createdAt}</strong></div><div><span>审批通过时间</span><strong>{application.approvedAt || "—"}</strong></div><div><span>使用状态</span><strong>{application.usageStatus === "active" ? "正常" : "已停用"}</strong></div></div></DetailSection><DetailSection title="管理员信息"><div className="detail-grid"><div><span>管理员姓名</span><strong>{application.administratorName}</strong></div><div><span>手机号码</span><strong>{application.administratorPhone}</strong></div><div><span>邮箱</span><strong>{application.administratorEmail}</strong></div></div></DetailSection><DetailSection title="组织功能授权"><div className="detail-grid"><div><span>授权版本</span><strong>r{grant.revision}</strong></div><div><span>已授权叶子权限</span><strong>{grant.permissionCodes.length} 项</strong></div><div><span>最近调整</span><strong>{grant.updatedAt}</strong></div><div><span>商家角色同步</span><strong>收回后自动清理越界权限</strong></div></div></DetailSection><FlowTimeline records={application.flowRecords} /></div>{grantOpen && <MerchantGrantDialog application={currentApplication} onClose={() => setGrantOpen(false)} onSaved={(message) => { setGrantOpen(false); setGrantRevision((value) => value + 1); setFeedback({ tone: "success", message }); }} key={grantRevision} />}{disableOpen && <div className="dialog-backdrop"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-disable-title"><header><h2 id="merchant-disable-title">停用商家</h2><button aria-label="关闭停用弹窗" onClick={() => setDisableOpen(false)}><X size={21} /></button></header><div className="dialog-body"><div className="cancel-warning"><strong>确定停用该商家吗？</strong><span>停用后商家用户仍可登录，但仅可进入商家冻结页面。</span></div></div><footer><button className="secondary-button" onClick={() => setDisableOpen(false)}>取消</button><button className="danger-button" onClick={toggleUsage}>确定停用</button></footer></section></div>}</div>;
}

const platformOrganizationOptions = [{ id: "00000000-0000-4000-8000-000000000001", name: "示例质量运营中心" }, ...readMerchantApplications().map((item) => ({ id: merchantOrganizationId(item), name: item.companyName }))];
const organizationNameById = (id: string): string => platformOrganizationOptions.find((item) => item.id === id)?.name ?? id;

function PlatformUserDialog({ user, onClose, onSaved }: { user?: PlatformUserRecord; onClose: () => void; onSaved: (message: string) => void }) {
  const editing = Boolean(user); const roles = readPlatformRoles();
  const [name, setName] = useState(user?.name ?? ""); const [phone, setPhone] = useState(user?.phone ?? ""); const [email, setEmail] = useState(user?.email ?? ""); const [position, setPosition] = useState(user?.position ?? ""); const [roleIds, setRoleIds] = useState(user?.roleIds ?? [roles.find((role) => !role.system)?.id ?? ""]); const [organizationIds, setOrganizationIds] = useState(user?.organizationIds ?? [platformOrganizationOptions[0].id]); const [error, setError] = useState("");
  const isSuperAdmin = user?.roleIds.some((id) => roles.find((role) => role.id === id)?.name === "超级管理员") ?? false;
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const users = readPlatformUsers(); if (!name.trim() || !/^1\d{10}$/.test(phone)) { setError("请填写姓名和正确的手机号码"); return; } if (users.some((item) => item.phone === phone.trim() && item.id !== user?.id)) { setError("手机号码已存在"); return; } if (!organizationIds.length || !roleIds.length) { setError("至少选择一个组织和角色"); return; } const now = "2026-08-24 16:00"; const record: PlatformUserRecord = { id: user?.id ?? `platform-user-${Date.now()}`, name: name.trim(), phone: phone.trim(), email: email.trim(), position: position.trim(), organizationIds, roleIds: isSuperAdmin ? user!.roleIds : roleIds, status: user?.status ?? "enabled", createdAt: user?.createdAt ?? now, updatedAt: now }; savePlatformUsers(user ? users.map((item) => item.id === user.id ? record : item) : [record, ...users]); onSaved(editing ? "用户信息已保存" : "用户已新增"); }
  return <div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-user-dialog-title"><header><h2 id="platform-user-dialog-title">{editing ? "编辑用户" : "新增用户"}</h2><button aria-label="关闭用户弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="admin-form-grid"><label className="dialog-input">姓名<input aria-label="用户姓名" required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="dialog-input">手机号码<input aria-label="用户手机号码" required inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="dialog-input">邮箱<input aria-label="用户邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="dialog-input">职位<input aria-label="用户职位" value={position} onChange={(event) => setPosition(event.target.value)} /></label></div><fieldset className="admin-check-group"><legend>组织范围 <em>*</em></legend>{platformOrganizationOptions.map((organization) => <label key={organization.id}><input type="checkbox" checked={organizationIds.includes(organization.id)} onChange={(event) => setOrganizationIds((current) => event.target.checked ? [...new Set([...current, organization.id])] : current.filter((id) => id !== organization.id))} />{organization.name}</label>)}</fieldset><fieldset className="admin-check-group"><legend>角色 <em>*</em>{isSuperAdmin && <small>（超级管理员角色不可修改）</small>}</legend>{roles.map((role) => <label key={role.id}><input type="checkbox" disabled={isSuperAdmin} checked={roleIds.includes(role.id)} onChange={(event) => setRoleIds((current) => event.target.checked ? [...new Set([...current, role.id])] : current.filter((id) => id !== role.id))} />{role.name}{role.system && <small>系统内置</small>}</label>)}</fieldset>{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">保存</button></footer></form></section></div>;
}

function PlatformUsersPage() {
  const [users, setUsers] = useState(readPlatformUsers); const [query, setQuery] = useState(""); const [roleFilter, setRoleFilter] = useState("all"); const [statusFilter, setStatusFilter] = useState<"all" | PlatformUserRecord["status"]>("all"); const [editing, setEditing] = useState<PlatformUserRecord | null>(null); const [dialogOpen, setDialogOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>();
  const roles = readPlatformRoles(); const filtered = users.filter((user) => (!query.trim() || `${user.name}${user.phone}`.includes(query.trim())) && (roleFilter === "all" || user.roleIds.includes(roleFilter)) && (statusFilter === "all" || user.status === statusFilter));
  function toggleStatus(user: PlatformUserRecord) { if (user.roleIds.some((id) => roles.find((role) => role.id === id)?.name === "超级管理员")) { setFeedback({ tone: "error", message: "超级管理员不可禁用" }); return; } const next = user.status === "enabled" ? "disabled" : "enabled"; const now = "2026-08-24 16:10"; savePlatformUsers(users.map((item) => item.id === user.id ? { ...item, status: next, updatedAt: now } : item)); setUsers(readPlatformUsers()); setFeedback({ tone: "success", message: next === "enabled" ? "用户已启用" : "用户已禁用" }); }
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><h1>用户管理</h1><div className="list-page-actions"><button className="secondary-button" onClick={() => { setUsers(readPlatformUsers()); setFeedback(undefined); }}><RefreshCw size={15} />刷新</button><button className="primary-small" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={16} />新增用户</button></div></div><ActionFeedback feedback={feedback} /><section className="admin-filter-card"><input aria-label="搜索用户" placeholder="搜索姓名/手机号" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="角色筛选" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">全部角色</option>{roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select><select aria-label="状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部状态</option><option value="enabled">启用</option><option value="disabled">禁用</option></select><button className="secondary-button" onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); }}>重置</button></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>用户</th><th>手机号</th><th>职位</th><th>组织范围</th><th>角色</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{filtered.map((user) => { const superAdmin = user.roleIds.some((id) => roles.find((role) => role.id === id)?.name === "超级管理员"); return <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email || "未填写邮箱"}</small></td><td>{user.phone}</td><td>{user.position || "—"}</td><td>{user.organizationIds.map(organizationNameById).join("、")}</td><td>{user.roleIds.map((id) => roles.find((role) => role.id === id)?.name ?? id).join("、")}</td><td><span className={`status ${user.status === "enabled" ? "approved" : "cancelled"}`}>{user.status === "enabled" ? "启用" : "禁用"}</span></td><td>{user.updatedAt}</td><td><button className="table-action" onClick={() => { setEditing(user); setDialogOpen(true); }}><Pencil size={13} />编辑</button><button className="table-action" disabled={superAdmin} onClick={() => toggleStatus(user)}>{user.status === "enabled" ? "禁用" : "启用"}</button></td></tr>; })}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={8}>暂无符合条件的用户</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 条记录</span></div></section>{dialogOpen && <PlatformUserDialog user={editing ?? undefined} onClose={() => setDialogOpen(false)} onSaved={(message) => { setUsers(readPlatformUsers()); setDialogOpen(false); setFeedback({ tone: "success", message }); }} />}</div>;
}

function PlatformRoleDialog({ role, onClose, onSaved }: { role?: PlatformRoleRecord; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(role?.name ?? ""); const [description, setDescription] = useState(role?.description ?? ""); const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const roles = readPlatformRoles(); if (!name.trim()) { setError("请输入角色名称"); return; } if (roles.some((item) => item.name === name.trim() && item.id !== role?.id)) { setError("角色名称已存在"); return; } const now = "2026-08-24 16:20"; const record = { id: role?.id ?? `platform-role-${Date.now()}`, name: name.trim(), description: description.trim(), system: role?.system ?? false, permissionCodes: role?.permissionCodes ?? [], createdAt: role?.createdAt ?? now, updatedAt: now }; savePlatformRoles(role ? roles.map((item) => item.id === role.id ? record : item) : [record, ...roles]); onSaved(role ? "角色信息已保存" : "角色已新增"); }
  return <div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-role-dialog-title"><header><h2 id="platform-role-dialog-title">{role ? "编辑角色" : "新增角色"}</h2><button aria-label="关闭角色弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><label className="dialog-input">角色名称<input aria-label="角色名称" required disabled={role?.system} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="dialog-input">角色描述<textarea aria-label="角色描述" value={description} onChange={(event) => setDescription(event.target.value)} /></label>{role?.system && <p className="admin-inline-note">超级管理员为系统内置角色，不可编辑或删除。</p>}{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small" disabled={role?.system}>保存</button></footer></form></section></div>;
}

function PlatformRolesPage() {
  const [roles, setRoles] = useState(readPlatformRoles); const [editing, setEditing] = useState<PlatformRoleRecord | null>(null); const [dialogOpen, setDialogOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>(); const users = readPlatformUsers();
  function remove(role: PlatformRoleRecord) { if (role.system) { setFeedback({ tone: "error", message: "超级管理员角色不可删除" }); return; } if (users.some((user) => user.roleIds.includes(role.id))) { setFeedback({ tone: "error", message: "角色已关联用户，不能删除" }); return; } savePlatformRoles(roles.filter((item) => item.id !== role.id)); setRoles(readPlatformRoles()); setFeedback({ tone: "success", message: "角色已删除" }); }
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><h1>角色管理</h1><div className="list-page-actions"><button className="primary-small" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus size={16} />新增角色</button></div></div><ActionFeedback feedback={feedback} /><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>角色名称</th><th>角色描述</th><th>类型</th><th>关联用户</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{roles.map((role) => <tr key={role.id}><td><strong>{role.name}</strong></td><td>{role.description || "—"}</td><td>{role.system ? "系统内置" : "自定义"}</td><td>{users.filter((user) => user.roleIds.includes(role.id)).length}</td><td>{role.updatedAt}</td><td><Link className="table-action" to={`/app/platform/roles/${role.id}/permissions`}>权限配置</Link><button className="table-action" disabled={role.system} onClick={() => { setEditing(role); setDialogOpen(true); }}><Pencil size={13} />编辑</button><button className="table-action danger-text" disabled={role.system} onClick={() => remove(role)}><Trash2 size={13} />删除</button></td></tr>)}</tbody></table></div><div className="todo-pagination"><span>共 {roles.length} 个角色</span></div></section>{dialogOpen && <PlatformRoleDialog role={editing ?? undefined} onClose={() => setDialogOpen(false)} onSaved={(message) => { setRoles(readPlatformRoles()); setDialogOpen(false); setFeedback({ tone: "success", message }); }} />}</div>;
}

function PermissionCheckbox({ checked, indeterminate, disabled, onChange }: { checked: boolean; indeterminate: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={inputRef} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />;
}

function PermissionTree({ nodes, selected, onToggle, disabledCodes = [], level = 0 }: { nodes: PermissionNode[]; selected: string[]; onToggle: (node: PermissionNode, checked: boolean) => void; disabledCodes?: readonly string[]; level?: number }) {
  return <div className="permission-tree">{nodes.map((node) => { const leafCodes = flattenPermissionCodes([node]); const enabledCodes = leafCodes.filter((code) => !disabledCodes.includes(code)); const selectedEnabledCount = enabledCodes.filter((code) => selected.includes(code)).length; const disabled = enabledCodes.length === 0; const checked = enabledCodes.length > 0 && selectedEnabledCount === enabledCodes.length; const indeterminate = selectedEnabledCount > 0 && selectedEnabledCount < enabledCodes.length; return <div className={`permission-node ${disabled ? "disabled" : ""}`} key={node.id} style={{ marginLeft: level * 20 }}><label title={disabled ? "平台未授权该功能" : undefined}><PermissionCheckbox checked={checked} indeterminate={indeterminate} disabled={disabled} onChange={(nextChecked) => onToggle(node, nextChecked)} />{node.label}{disabled && node.code && <small>未授权</small>}</label>{node.children && <PermissionTree nodes={node.children} selected={selected} onToggle={onToggle} disabledCodes={disabledCodes} level={level + 1} />}</div>; })}</div>;
}

function RolePermissionPage() {
  const navigate = useNavigate(); const { id = "" } = useParams(); const role = readPlatformRoles().find((item) => item.id === id); const [selected, setSelected] = useState(role?.permissionCodes ?? []); const [feedback, setFeedback] = useState<Feedback>();
  if (!role) return <Navigate to="/app/platform/roles" replace />;
  const currentRole = role;
  function save() { const roles = readPlatformRoles().map((item) => item.id === currentRole.id ? { ...item, permissionCodes: selected, updatedAt: "2026-08-24 16:30" } : item); savePlatformRoles(roles); setFeedback({ tone: "success", message: "角色权限已保存" }); }
  return <div className="page-stack platform-admin-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate("/app/platform/roles")}><ArrowLeft size={16} />返回</button><h1>{currentRole.name} · 角色权限</h1></div><div className="detail-title-actions"><button className="primary-small" disabled={currentRole.system} onClick={save}>保存权限</button></div></div><ActionFeedback feedback={feedback} /><section className="work-card permission-card"><header><div><strong>权限树</strong><span>父节点勾选将同步选择全部子权限，取消全部子权限后父节点自动取消。</span></div><span className="permission-count">已选 {selected.length} 项</span></header><PermissionTree nodes={platformPermissionTree} selected={selected} onToggle={(node, checked) => setSelected((current) => updatePermissionSelection(current, node, checked))} /></section>{currentRole.system && <p className="admin-inline-note">超级管理员拥有全部权限，权限不可修改。</p>}</div>;
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function relativeCreatedAt(value: string): string {
  if (value.startsWith("2026-08-27")) return "今天";
  if (value.startsWith("2026-08-")) return `${Math.max(1, 27 - Number(value.slice(8, 10)))}天前`;
  return value.slice(0, 10);
}

function MerchantUserAccessDenied() {
  return <div className="page-stack"><section className="work-card merchant-user-denied"><ShieldCheck size={28} /><h1>暂无用户管理权限</h1><p>当前成员没有当前组织的用户查看权限，请联系商家超级管理员分配角色。</p></section></div>;
}

function MerchantUserDialog({
  organizationId,
  member,
  onClose,
  onSaved,
}: {
  organizationId: string;
  member?: OrganizationMember;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const sources = merchantIdentitySources();
  const roles = readOrganizationRoles(sources, organizationId);
  const editing = Boolean(member);
  const [name, setName] = useState(member?.account.name ?? "");
  const [phone, setPhone] = useState(member?.account.phone ?? "");
  const [email, setEmail] = useState(member?.account.email ?? "");
  const [position, setPosition] = useState(member?.position ?? "");
  const [roleIds, setRoleIds] = useState(member?.roleIds ?? [roles.find((role) => role.code !== "merchant_super_admin")?.id ?? ""]);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      saveOrganizationMember(sources, organizationId, { name, phone, email, position, roleIds: roleIds.filter(Boolean) }, member?.id);
      appendAuditLog({ action: editing ? "编辑商家用户" : "新增商家用户", businessType: "merchant_user", operator: readDemoSession()?.userName ?? "商家管理员", organization: readDemoSession()?.organizationName ?? organizationId, time: "2026-08-27 10:00", detail: `${name.trim()} · ${maskPhone(phone.trim())}` });
      onSaved(editing ? "用户信息已保存" : "用户已新增，可使用手机号和验证码登录");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "用户保存失败");
    }
  }

  return createPortal(<div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-user-dialog-title"><header><h2 id="merchant-user-dialog-title">{editing ? "编辑用户" : "新增用户"}</h2><button type="button" aria-label="关闭用户弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="admin-form-grid"><label className="dialog-input">用户姓名 <em>*</em><input aria-label="用户姓名" required maxLength={50} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} /></label><label className="dialog-input">手机号码 <em>*</em><input aria-label="用户手机号码" required inputMode="numeric" maxLength={11} value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "")); setError(""); }} /></label><label className="dialog-input">邮箱<input aria-label="用户邮箱" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} /></label><label className="dialog-input">职位<input aria-label="用户职位" maxLength={50} value={position} onChange={(event) => { setPosition(event.target.value); setError(""); }} /></label></div><fieldset className="admin-check-group"><legend>角色 <em>*</em></legend>{roles.map((role) => { const locked = Boolean(member?.registrationAdministrator && role.code === "merchant_super_admin"); return <label key={role.id}><input type="checkbox" checked={roleIds.includes(role.id)} disabled={locked} onChange={(event) => setRoleIds((current) => event.target.checked ? [...new Set([...current, role.id])] : current.filter((id) => id !== role.id))} />{role.name}{locked && <small>注册管理员固定角色</small>}</label>; })}</fieldset><p className="admin-inline-note">{editing ? "姓名、手机号和邮箱属于全局账号资料，修改后会同步影响该账号的其他组织；职位和角色仅属于当前组织。" : "手机号已属于其他组织时将复用同一全局账号，只新增当前组织Membership。"}</p>{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">{editing ? "保存" : "新增用户"}</button></footer></form></section></div>, document.body);
}

function MerchantUserDetailPage({ role }: { role: Exclude<DemoRole, "platform"> }) {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const session = readDemoSession();
  if (!session || !hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, "merchant.admin.user.read")) return <MerchantUserAccessDenied />;
  const member = readOrganizationMembers(merchantIdentitySources(), session.organizationId).find((entry) => entry.id === id);
  if (!member) return <Navigate to={`/app/${role}/users`} replace />;
  return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(`/app/${role}/users`)}><ArrowLeft size={16} />返回</button><h1>{member.account.name}</h1><span className={`status ${member.status === "enabled" ? "approved" : "cancelled"}`}>{member.status === "enabled" ? "启用" : "禁用"}</span></div></div><div className="detail-sections"><DetailSection title="账号信息"><div className="detail-grid"><div><span>用户姓名</span><strong>{member.account.name}</strong></div><div><span>手机号码</span><strong>{maskPhone(member.account.phone)}</strong></div><div><span>邮箱</span><strong>{member.account.email || "—"}</strong></div><div><span>账号状态</span><strong>{member.account.status === "enabled" ? "正常" : "冻结"}</strong></div></div></DetailSection><DetailSection title="当前组织成员信息"><div className="detail-grid"><div><span>所属组织</span><strong>{session.organizationName}</strong></div><div><span>职位</span><strong>{member.position || "—"}</strong></div><div><span>角色</span><strong>{member.roles.map((entry) => entry.name).join("、")}</strong></div><div><span>Membership状态</span><strong>{member.status === "enabled" ? "启用" : "禁用"}</strong></div><div><span>加入时间</span><strong>{member.createdAt}</strong></div><div><span>更新时间</span><strong>{member.updatedAt}</strong></div></div></DetailSection></div></div>;
}

function MerchantUsersPage({ role }: { role: Exclude<DemoRole, "platform"> }) {
  const session = readDemoSession();
  const sources = merchantIdentitySources();
  const canRead = Boolean(session && hasMerchantPermission(sources, session.organizationId, session.userId, "merchant.admin.user.read"));
  if (!session || !canRead) return <MerchantUserAccessDenied />;
  const currentSession = session;
  const organizationId = currentSession.organizationId;
  const roles = readOrganizationRoles(sources, organizationId);
  const [members, setMembers] = useState(() => readOrganizationMembers(sources, organizationId));
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [editing, setEditing] = useState<OrganizationMember>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrganizationMember>();
  const [feedback, setFeedback] = useState<Feedback>();
  const canCreate = hasMerchantPermission(sources, organizationId, session.userId, "merchant.admin.user.create");
  const canUpdate = hasMerchantPermission(sources, organizationId, session.userId, "merchant.admin.user.update");
  const canStatus = hasMerchantPermission(sources, organizationId, session.userId, "merchant.admin.user.status");
  const canExport = hasMerchantPermission(sources, organizationId, session.userId, "merchant.admin.user.export");
  const filtered = members.filter((member) => {
    const keyword = query.trim().toLowerCase();
    return (!keyword || member.account.name.toLowerCase().includes(keyword) || member.account.phone.includes(keyword))
      && (roleFilter === "all" || member.roleIds.includes(roleFilter))
      && (statusFilter === "all" || member.status === statusFilter);
  });

  function refresh(): void {
    setMembers(readOrganizationMembers(merchantIdentitySources(), organizationId));
  }

  function confirmStatus(): void {
    if (!pendingStatus) return;
    try {
      const nextStatus = pendingStatus.status === "enabled" ? "disabled" : "enabled";
      setOrganizationMembershipStatus(merchantIdentitySources(), organizationId, pendingStatus.id, nextStatus);
      appendAuditLog({ action: nextStatus === "enabled" ? "启用商家用户" : "禁用商家用户", businessType: "merchant_user", operator: currentSession.userName ?? "商家管理员", organization: currentSession.organizationName ?? organizationId, time: "2026-08-27 10:00", detail: `${pendingStatus.account.name} · ${maskPhone(pendingStatus.account.phone)}` });
      refresh();
      setFeedback({ tone: "success", message: nextStatus === "enabled" ? "用户已在当前组织启用" : "用户已在当前组织禁用，其他组织不受影响" });
      setPendingStatus(undefined);
    } catch (reason) {
      setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "状态更新失败" });
      setPendingStatus(undefined);
    }
  }

  function exportMembers(): void {
    exportRowsAsXlsx(`${currentSession.organizationName ?? "商家"}-用户-${Date.now()}`, ["用户姓名", "手机号", "邮箱", "角色", "职位", "状态", "创建时间"], filtered.map((member) => [member.account.name, maskPhone(member.account.phone), member.account.email, member.roles.map((entry) => entry.name).join("、"), member.position, member.status === "enabled" ? "启用" : "禁用", member.createdAt]));
    setFeedback({ tone: "success", message: `已导出当前筛选结果 ${filtered.length} 条` });
  }

  return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><h1>用户管理</h1><p className="page-subtitle">{currentSession.organizationName} · 仅管理当前组织Membership</p></div><div className="list-page-actions">{canExport && <button className="secondary-button" onClick={exportMembers}><Download size={15} />导出</button>}<button className="secondary-button" onClick={() => { refresh(); setFeedback(undefined); }}><RefreshCw size={15} />刷新</button>{canCreate && <button className="primary-small" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus size={16} />新增用户</button>}</div></div><ActionFeedback feedback={feedback} /><section className="admin-filter-card"><input aria-label="搜索商家用户" placeholder="搜索用户姓名/手机号" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="商家用户角色筛选" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">全部角色</option>{roles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><select aria-label="商家用户状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部状态</option><option value="enabled">启用</option><option value="disabled">禁用</option></select><button className="secondary-button" onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); }}>重置</button></section><section className="work-card admin-table-card merchant-user-table"><div className="responsive-table"><table><thead><tr><th>用户姓名</th><th>手机号码</th><th>邮箱</th><th>角色</th><th>职位</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{filtered.map((member) => { const superAdmin = member.roles.some((entry) => entry.code === "merchant_super_admin"); return <tr key={member.id}><td><Link to={`/app/${role}/users/${member.id}`}>{member.account.name}</Link></td><td>{maskPhone(member.account.phone)}</td><td>{member.account.email || "—"}</td><td><div className="merchant-role-tags">{member.roles.map((entry) => <span key={entry.id}>{entry.name}</span>)}</div></td><td>{member.position || "—"}</td><td><span className={`status ${member.status === "enabled" ? "approved" : "cancelled"}`}>{member.status === "enabled" ? "启用" : "禁用"}</span></td><td><time title={member.createdAt}>{relativeCreatedAt(member.createdAt)}</time></td><td><Link className="table-action" to={`/app/${role}/users/${member.id}`}><Eye size={13} />详情</Link>{canUpdate && <button className="table-action" onClick={() => { setEditing(member); setDialogOpen(true); }}><Pencil size={13} />编辑</button>}{canStatus && <button className="table-action" disabled={superAdmin} title={superAdmin ? "超级管理员不可禁用" : undefined} onClick={() => setPendingStatus(member)}>{member.status === "enabled" ? "禁用" : "启用"}</button>}</td></tr>; })}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={8}>暂无符合条件的当前组织用户</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 条记录</span></div></section>{dialogOpen && <MerchantUserDialog organizationId={organizationId} member={editing} onClose={() => setDialogOpen(false)} onSaved={(message) => { refresh(); setDialogOpen(false); setFeedback({ tone: "success", message }); }} />}{pendingStatus && createPortal(<div className="dialog-backdrop"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="membership-status-title"><header><h2 id="membership-status-title">{pendingStatus.status === "enabled" ? "禁用用户" : "启用用户"}</h2><button type="button" aria-label="关闭状态确认弹窗" onClick={() => setPendingStatus(undefined)}><X size={21} /></button></header><div className="dialog-body"><div className="cancel-warning"><strong>确定{pendingStatus.status === "enabled" ? "禁用" : "启用"}{pendingStatus.account.name}吗？</strong><span>{pendingStatus.status === "enabled" ? "仅禁用当前组织Membership，用户在其他组织的成员关系不受影响。" : "启用后用户可再次登录并访问当前组织。"}</span></div></div><footer><button className="secondary-button" onClick={() => setPendingStatus(undefined)}>取消</button><button className={pendingStatus.status === "enabled" ? "danger-button" : "primary-small"} onClick={confirmStatus}>确定{pendingStatus.status === "enabled" ? "禁用" : "启用"}</button></footer></section></div>, document.body)}</div>;
}

function MerchantRoleAccessDenied() {
  return <div className="page-stack"><section className="work-card merchant-user-denied"><ShieldCheck size={28} /><h1>暂无角色管理权限</h1><p>当前成员没有当前组织的角色查看权限，请联系商家超级管理员分配角色。</p></section></div>;
}

function MerchantRoleDialog({ organizationId, role, onClose, onSaved }: { organizationId: string; role?: MerchantRole; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      saveOrganizationRole(merchantIdentitySources(), organizationId, { name, description }, role?.id);
      appendAuditLog({ action: role ? "编辑商家角色" : "新增商家角色", businessType: "merchant_role", operator: readDemoSession()?.userName ?? "商家管理员", organization: readDemoSession()?.organizationName ?? organizationId, time: "2026-08-27 11:00", detail: name.trim() });
      onSaved(role ? "角色信息已保存" : "角色已新增，可继续配置权限");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "角色保存失败");
    }
  }
  return createPortal(<div className="dialog-backdrop"><section className="review-dialog platform-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="merchant-role-dialog-title"><header><h2 id="merchant-role-dialog-title">{role ? "编辑角色" : "新增角色"}</h2><button type="button" aria-label="关闭角色弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><label className="dialog-input">角色名称 <em>*</em><input aria-label="角色名称" required maxLength={50} disabled={role?.system} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} /></label><label className="dialog-input">角色描述<textarea aria-label="角色描述" maxLength={200} disabled={role?.system} value={description} onChange={(event) => { setDescription(event.target.value); setError(""); }} /></label><span className="dialog-counter">{description.length} / 200</span>{role?.system && <p className="admin-inline-note">超级管理员为系统内置角色，不可编辑、删除或手动修改权限。</p>}{error && <div className="form-submit-error" role="alert">{error}</div>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small" disabled={role?.system}>保存</button></footer></form></section></div>, document.body);
}

function MerchantRolesPage({ role }: { role: Exclude<DemoRole, "platform"> }) {
  const session = readDemoSession();
  const sources = merchantIdentitySources();
  if (!session || !hasMerchantPermission(sources, session.organizationId, session.userId, "merchant.admin.role.read")) return <MerchantRoleAccessDenied />;
  const currentSession = session;
  const organizationId = currentSession.organizationId;
  const [roles, setRoles] = useState(() => readOrganizationRoles(sources, organizationId));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MerchantRole>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const canCreate = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.admin.role.create");
  const canUpdate = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.admin.role.update");
  const canDelete = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.admin.role.delete");
  const canExport = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.admin.role.export");
  const canConfigure = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.admin.role_permission.update");
  const filtered = roles.filter((entry) => !query.trim() || `${entry.name}${entry.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  function refresh(): void { setRoles(readOrganizationRoles(merchantIdentitySources(), organizationId)); }
  function remove(entry: MerchantRole): void {
    try {
      deleteOrganizationRole(merchantIdentitySources(), organizationId, entry.id);
      appendAuditLog({ action: "删除商家角色", businessType: "merchant_role", operator: currentSession.userName ?? "商家管理员", organization: currentSession.organizationName ?? organizationId, time: "2026-08-27 11:00", detail: entry.name });
      refresh();
      setFeedback({ tone: "success", message: "角色已删除" });
    } catch (reason) {
      setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "角色删除失败" });
    }
  }
  function exportRoles(): void {
    exportRowsAsXlsx(`${currentSession.organizationName ?? "商家"}-角色-${Date.now()}`, ["角色名称", "角色描述", "用户数量", "类型", "创建时间"], filtered.map((entry) => [entry.name, entry.description ?? "", countOrganizationRoleMembers(merchantIdentitySources(), organizationId, entry.id), entry.system ? "系统内置" : "自定义", entry.createdAt]));
    setFeedback({ tone: "success", message: `已导出当前筛选结果 ${filtered.length} 条` });
  }
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><div><h1>角色管理</h1><p className="page-subtitle">{currentSession.organizationName} · 角色权限不得超过平台授权上限</p></div><div className="list-page-actions">{canExport && <button className="secondary-button" onClick={exportRoles}><Download size={15} />导出</button>}<button className="secondary-button" onClick={() => { refresh(); setFeedback(undefined); }}><RefreshCw size={15} />刷新</button>{canCreate && <button className="primary-small" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus size={16} />新增角色</button>}</div></div><ActionFeedback feedback={feedback} /><section className="admin-filter-card merchant-role-filter"><input aria-label="搜索商家角色" placeholder="搜索角色名称/描述" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-button" onClick={() => setQuery("")}>重置</button></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>角色名称</th><th>角色描述</th><th>用户数量</th><th>类型</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{filtered.map((entry) => { const memberCount = countOrganizationRoleMembers(merchantIdentitySources(), organizationId, entry.id); const description = entry.description ?? ""; return <tr key={entry.id}><td>{canConfigure ? <Link to={`/app/${role}/roles/${entry.id}/permissions`}><strong>{entry.name}</strong></Link> : <strong>{entry.name}</strong>}</td><td title={description}>{description ? `${description.slice(0, 50)}${description.length > 50 ? "…" : ""}` : "—"}</td><td>{memberCount}</td><td>{entry.system ? "系统内置" : "自定义"}</td><td><time title={entry.createdAt}>{relativeCreatedAt(entry.createdAt)}</time></td><td>{canConfigure && <Link className="table-action" to={`/app/${role}/roles/${entry.id}/permissions`}><ShieldCheck size={13} />权限配置</Link>}{canUpdate && <button className="table-action" disabled={entry.system} title={entry.system ? "超级管理员不可编辑" : undefined} onClick={() => { setEditing(entry); setDialogOpen(true); }}><Pencil size={13} />编辑</button>}{canDelete && <button className="table-action danger-text" disabled={entry.system} title={entry.system ? "超级管理员不可删除" : undefined} onClick={() => remove(entry)}><Trash2 size={13} />删除</button>}</td></tr>; })}{filtered.length === 0 && <tr><td className="empty-cell" colSpan={6}>暂无符合条件的当前组织角色</td></tr>}</tbody></table></div><div className="todo-pagination"><span>共 {filtered.length} 个角色</span></div></section>{dialogOpen && <MerchantRoleDialog organizationId={organizationId} role={editing} onClose={() => setDialogOpen(false)} onSaved={(message) => { refresh(); setDialogOpen(false); setFeedback({ tone: "success", message }); }} />}</div>;
}

function MerchantRolePermissionPage({ role }: { role: Exclude<DemoRole, "platform"> }) {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const session = readDemoSession();
  const sources = merchantIdentitySources();
  if (!session || !hasMerchantPermission(sources, session.organizationId, session.userId, "merchant.admin.role.read")) return <MerchantRoleAccessDenied />;
  const currentSession = session;
  const organizationId = currentSession.organizationId;
  const currentRole = readOrganizationRoles(sources, organizationId).find((entry) => entry.id === id);
  if (!currentRole) return <Navigate to={`/app/${role}/roles`} replace />;
  const selectedRole = currentRole;
  const source = sources.find((entry) => entry.organizationId === organizationId)!;
  const grant = readOrganizationGrant(sources, organizationId);
  const tree = merchantPermissionTree(source.merchantType);
  const allCodes = flattenPermissionCodes(tree);
  const disabledCodes = allCodes.filter((code) => !grant.permissionCodes.includes(code));
  const [selected, setSelected] = useState(selectedRole.permissionCodes);
  const [feedback, setFeedback] = useState<Feedback>();
  const canConfigure = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.admin.role_permission.update");
  function save(): void {
    try {
      saveOrganizationRolePermissions(merchantIdentitySources(), organizationId, selectedRole.id, selected);
      appendAuditLog({ action: "配置商家角色权限", businessType: "merchant_role", operator: currentSession.userName ?? "商家管理员", organization: currentSession.organizationName ?? organizationId, time: "2026-08-27 11:00", detail: `${selectedRole.name} · ${selected.length}项` });
      setFeedback({ tone: "success", message: "角色权限已保存并立即生效" });
    } catch (reason) {
      setFeedback({ tone: "error", message: reason instanceof Error ? reason.message : "角色权限保存失败" });
    }
  }
  return <div className="page-stack platform-admin-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(`/app/${role}/roles`)}><ArrowLeft size={16} />返回</button><h1>{selectedRole.name} · 角色权限</h1></div><div className="detail-title-actions"><button className="primary-small" disabled={selectedRole.system || !canConfigure} onClick={save}>保存权限</button></div></div><ActionFeedback feedback={feedback} /><section className="work-card permission-card"><header><div><strong>当前组织权限树</strong><span>未获平台授权的功能置灰不可选；只保存叶子权限码。</span></div><span className="permission-count">已选 {selected.length} / 已授权 {grant.permissionCodes.length}</span></header><PermissionTree nodes={tree} selected={selected} disabledCodes={disabledCodes} onToggle={(node, checked) => setSelected((current) => updateGrantedPermissionSelection(current, node, checked, grant.permissionCodes))} /></section>{selectedRole.system && <p className="admin-inline-note">超级管理员权限自动同步当前组织授权上限，不可手动修改。</p>}{!canConfigure && !selectedRole.system && <p className="admin-inline-note">当前成员只有角色查看权限，不能修改角色权限。</p>}</div>;
}

type SupplierTodoTask = {
  id: string;
  businessNo: string;
  task: string;
  businessType: "出货报告" | "物料异常" | "售后异常";
  summary: string;
  createdAt: string;
  status: "待处理" | "驳回8D" | "待重新提报" | "待重新处理";
  sourceOrganization: string;
  href?: string;
  processHref?: string;
};

// This record is kept for the end-to-end workflow fixture and is not a homepage task seed.
const supplierWorkflowFixtureIds = new Set(["after-sales-seed-001"]);

function readSupplierTasks(organizationId = supplierOrganizationId): SupplierTodoTask[] {
  const shipmentTasks = readShipmentReports()
    .filter((report) => report.supplierOrganizationId === organizationId && report.status === "rejected")
    .map((report): SupplierTodoTask => ({
      id: `supplier-todo-shipment-${report.id}`,
      businessNo: report.businessNo,
      task: "出货报告重新提报",
      businessType: "出货报告",
      summary: report.reviewReason || "平台审核驳回，请修改后重新提报。",
      createdAt: report.updatedAt,
      status: "待重新提报",
      sourceOrganization: "示例质量运营中心",
      href: `/app/supplier/shipment-reports/${report.id}/edit`,
    }));
  const materialTasks = readMaterialExceptions()
    .filter((record) => record.supplierOrganizationId === organizationId && (record.status === "waiting_supplier" || record.status === "rejected_8d"))
    .map((record): SupplierTodoTask => ({
      id: record.id === "supplier-todo-me-20260810001" ? record.id : `supplier-todo-material-${record.id}`,
      businessNo: record.businessNo,
      task: record.status === "rejected_8d" ? "物料异常重新处理" : "物料异常8D待提交",
      businessType: "物料异常",
      summary: record.description,
      createdAt: record.updatedAt,
      status: record.status === "rejected_8d" ? "待重新处理" : "待处理",
      sourceOrganization: record.reporterOrganization,
      href: record.id === "supplier-todo-me-20260810001" ? `/app/supplier/todos/${record.id}` : `/app/supplier/material-exceptions/${record.id}`,
      processHref: `/app/supplier/material-exceptions/${record.id}`,
    }));
  const afterSalesTasks = readAfterSalesExceptions()
    .filter((record) => record.supplierOrganizationId === organizationId && !supplierWorkflowFixtureIds.has(record.id) && (record.status === "pending_supplier" || record.status === "rejected_8d"))
    .map((record): SupplierTodoTask => ({
      id: record.id === "supplier-todo-sa-20260808007" ? record.id : `supplier-todo-after-sales-${record.id}`,
      businessNo: record.businessNo,
      task: record.status === "rejected_8d" ? "售后异常改善回复" : "售后异常待处理",
      businessType: "售后异常",
      summary: record.description,
      createdAt: record.updatedAt,
      status: record.status === "rejected_8d" ? "驳回8D" : "待处理",
      sourceOrganization: record.reporterOrganization,
      href: record.id === "supplier-todo-sa-20260808007" ? `/app/supplier/todos/${record.id}` : `/app/supplier/after-sales-exception/${record.id}`,
      processHref: `/app/supplier/after-sales-exception/${record.id}`,
    }));
  return [...shipmentTasks, ...materialTasks, ...afterSalesTasks].sort((left, right) => parseDemoTime(right.createdAt) - parseDemoTime(left.createdAt));
}

type FactoryTodoTask = {
  id: string;
  businessNo: string;
  task: string;
  businessType: "来料检验" | "物料异常";
  summary: string;
  createdAt: string;
  status: "待重新提报";
  href?: string;
};

function readFactoryTasks(organizationId = factoryOrganizationId): FactoryTodoTask[] {
  const materialTasks = readMaterialExceptions()
    .filter((record) => record.reporterOrganizationId === organizationId && record.status === "rejected")
    .map((record): FactoryTodoTask => ({ id: `factory-todo-material-${record.id}`, businessNo: record.businessNo, task: "物料异常重新提报", businessType: "物料异常", summary: record.reviewReason || "平台审核驳回，请修改后重新提报。", createdAt: record.updatedAt, status: "待重新提报", href: `/app/factory/material-exceptions/${record.id}/edit` }));
  const incomingInspectionTasks = readIncomingInspections()
    .filter((record) => record.factoryOrganizationId === organizationId && record.status === "rejected")
    .map((record): FactoryTodoTask => ({ id: `factory-todo-iqc-${record.id}`, businessNo: record.businessNo, task: "来料检验重新提报", businessType: "来料检验", summary: record.reviewReason || "平台审核驳回，请修改后重新提报。", createdAt: record.updatedAt, status: "待重新提报", href: `/app/factory/incoming-inspections/${record.id}/edit` }));
  return [...materialTasks, ...incomingInspectionTasks].sort((left, right) => parseDemoTime(right.createdAt) - parseDemoTime(left.createdAt));
}

function SupplierTodoDetailPage({ task }: { task: SupplierTodoTask }) {
  const navigate = useNavigate();
  return <div className="page-stack detail-page">
    <div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" type="button" onClick={() => navigate("/app/supplier")}><ArrowLeft size={16} />返回</button><h1>{task.businessNo} · {task.businessType}</h1><span className="status warning">{task.status}</span></div><div className="detail-title-actions"><button className="primary-small" type="button" onClick={() => navigate(task.processHref ?? task.href ?? `/app/supplier/todos/${task.id}`)}>进入处理</button></div></div>
    <div className="detail-sections">
      <DetailSection title="任务信息"><div className="detail-grid"><div><span>任务类型</span><strong>{task.businessType}</strong></div><div><span>任务标题</span><strong>{task.task}</strong></div><div><span>来源组织</span><strong>{task.sourceOrganization}</strong></div><div><span>创建时间</span><strong>{task.createdAt}</strong></div><div><span>当前状态</span><strong>{task.status}</strong></div></div></DetailSection>
      <DetailSection title="异常摘要"><p className="detail-copy">{task.summary}</p></DetailSection>
      <DetailSection title="处理说明"><p className="detail-copy">这是供应商首页待办的演示详情入口。具体8D报告字段、附件和提交流转将在物料异常/售后异常闭环任务中接入。</p></DetailSection>
    </div>
  </div>;
}

function SupplierTodoRoute() {
  const { id } = useParams();
  const session = readDemoSession();
  const task = readSupplierTasks(readDemoSession()?.organizationId).find((item) => item.id === id);
  const canHandleShipmentTasks = Boolean(session && hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, "merchant.home.shipment_report.read") && hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, "merchant.business.shipment_report.submit"));
  if (task?.businessType === "出货报告" && !canHandleShipmentTasks) return <MerchantBusinessAccessDenied />;
  return task ? <SupplierTodoDetailPage task={task} /> : <Navigate to="/app/supplier" replace />;
}

function SupplierHome() {
  const navigate = useNavigate();
  const session = readDemoSession();
  const currentSession = session ?? createDemoSession("supplier");
  const organizationId = currentSession.organizationId;
  const organizationName = currentSession.organizationName ?? roleProfiles.supplier.organization;
  const isSeedOrganization = organizationId === supplierOrganizationId;
  const sources = merchantIdentitySources();
  const canHandleShipmentTasks = hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.home.shipment_report.read") && hasMerchantPermission(sources, organizationId, currentSession.userId, "merchant.business.shipment_report.submit");
  const supplierTasks = readSupplierTasks(organizationId).filter((task) => task.businessType !== "出货报告" || canHandleShipmentTasks);
  const [activeType, setActiveType] = useState<"全部" | SupplierTodoTask["businessType"]>("全部");
  const visibleTasks = activeType === "全部" ? supplierTasks : supplierTasks.filter((task) => task.businessType === activeType);
  const taskTypes = (["出货报告", "物料异常", "售后异常"] as const).filter((type) => type !== "出货报告" || canHandleShipmentTasks);
  const completedTaskCount = isSeedOrganization ? 18 : 0;
  const averageHours = isSeedOrganization ? "6.4" : "—";
  return (
    <div className="page-stack">
      <div className="page-heading"><p>{organizationName}</p><h1>供应商工作台</h1><span>集中处理平台分配的质量任务。</span></div>
      <section className="summary-grid" aria-label="供应商待办统计"><article><Activity/><div><span>待处理任务</span><strong>{supplierTasks.length}</strong></div></article><article><CheckCircle2/><div><span>本月已完成</span><strong>{completedTaskCount}</strong></div></article><article><Gauge/><div><span>平均处理时效</span><strong>{averageHours}{isSeedOrganization && <small>小时</small>}</strong></div></article></section>
      <section className="work-card supplier-todo-card"><header><div><h2>我的待办</h2><p>按优先级处理平台分配及驳回重提的质量任务</p></div><span className="list-count">共 {visibleTasks.length} 条</span></header><div className="supplier-todo-tabs" role="tablist" aria-label="商家待办分类"><button className={activeType === "全部" ? "active" : ""} role="tab" aria-selected={activeType === "全部"} onClick={() => setActiveType("全部")}>全部({supplierTasks.length})</button>{taskTypes.map((type) => <button key={type} className={activeType === type ? "active" : ""} role="tab" aria-selected={activeType === type} onClick={() => setActiveType(type)}>{type}({supplierTasks.filter((task) => task.businessType === type).length})</button>)}</div><div className="responsive-table"><table><thead><tr><th>业务编号</th><th>任务</th><th>关联业务</th><th>异常摘要</th><th>来源组织</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{visibleTasks.map((task) => { const target = task.href ?? `/app/supplier/todos/${task.id}`; return <tr key={task.id}><td><Link to={target}>{task.businessNo}</Link></td><td>{task.task}</td><td>{task.businessType}</td><td>{task.summary}</td><td>{task.sourceOrganization}</td><td><time dateTime={task.createdAt} title={task.createdAt}>{formatRelativeTime(task.createdAt)}</time></td><td><span className="status warning">{task.status}</span></td><td><button className="table-action" type="button" onClick={() => navigate(target)}>查看详情</button></td></tr>; })}</tbody></table></div><footer className="supplier-todo-footer"><span>共 {visibleTasks.length} 条</span><button type="button" disabled>‹</button><button type="button" className="active">1</button><button type="button" disabled>›</button></footer></section>
    </div>
  );
}

function FactoryHome() {
  const navigate = useNavigate();
  const session = readDemoSession();
  const organizationId = session?.organizationId ?? factoryOrganizationId;
  const organizationName = session?.organizationName ?? roleProfiles.factory.organization;
  const userName = session?.userName ?? roleProfiles.factory.user;
  const isSeedOrganization = organizationId === factoryOrganizationId;
  const factoryTasks = readFactoryTasks(organizationId);
  return (
    <div className="page-stack">
      <div className="page-heading"><p>{organizationName}</p><h1>工厂工作台</h1><span>选择一项质量业务开始在线提报。</span></div>
      <section className="factory-hero"><div className="factory-illustration"><Factory size={42}/></div><div><span>今日质量数据</span><h2>下午好，{userName}</h2><p>{isSeedOrganization ? "今日已提交 6 条记录，生产检验日报还可继续批量录入。" : "当前组织暂无质量记录，可从业务菜单开始首次提报。"}</p><div className="hero-actions"><button className="primary-small">批量新增日报</button><button className="secondary-button">查看今日记录</button></div></div></section>
      <section className="work-card supplier-todo-card"><header><div><h2>我的待办</h2><p>处理平台驳回后需要重新提报的业务</p></div><span className="list-count">共 {factoryTasks.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th><th>任务</th><th>关联业务</th><th>处理说明</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{factoryTasks.map((task) => { const target = task.href ?? `/app/factory/todos/${task.id}`; return <tr key={task.id}><td><Link to={target}>{task.businessNo}</Link></td><td>{task.task}</td><td>{task.businessType}</td><td>{task.summary}</td><td><time dateTime={task.createdAt}>{formatRelativeTime(task.createdAt)}</time></td><td><span className="status warning">{task.status}</span></td><td><button className="table-action" type="button" onClick={() => navigate(target)}>进入处理</button></td></tr>; })}</tbody></table></div></section>
      <section className="business-grid"><article><ClipboardCheck/><div><strong>来料检验</strong><span>IQC来料质量检查</span></div><em>{isSeedOrganization ? 2 : 0}条</em></article><article><FileCheck2/><div><strong>生产检验日报</strong><span>每日产线检验记录</span></div><em>{isSeedOrganization ? 3 : 0}条</em></article><article><Activity/><div><strong>维修记录</strong><span>不良品维修明细</span></div><em>{isSeedOrganization ? 1 : 0}条</em></article><article><ListChecks/><div><strong>IPQC巡线</strong><span>制程巡线问题跟进</span></div><em>0条</em></article></section>
    </div>
  );
}

function FactoryTodoDetailPage({ task }: { task: FactoryTodoTask }) {
  const navigate = useNavigate();
  return <div className="page-stack detail-page">
    <div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" type="button" onClick={() => navigate("/app/factory")}><ArrowLeft size={16} />返回</button><h1>{task.businessNo} · {task.businessType}</h1><span className="status warning">{task.status}</span></div><div className="detail-title-actions"><button className="primary-small" type="button" onClick={() => task.href && navigate(task.href)}>进入处理</button></div></div>
    <div className="detail-sections"><DetailSection title="任务信息"><div className="detail-grid"><div><span>任务类型</span><strong>{task.businessType}</strong></div><div><span>任务标题</span><strong>{task.task}</strong></div><div><span>创建时间</span><strong>{task.createdAt}</strong></div><div><span>当前状态</span><strong>{task.status}</strong></div></div></DetailSection><DetailSection title="驳回说明"><p className="detail-copy">{task.summary}</p></DetailSection><DetailSection title="处理说明"><p className="detail-copy">请根据平台驳回意见补充业务信息后重新提报，提交后将重新进入平台审核待办。</p></DetailSection></div>
  </div>;
}

function FactoryTodoRoute() {
  const { id } = useParams();
  const task = readFactoryTasks(readDemoSession()?.organizationId).find((item) => item.id === id);
  return task ? <FactoryTodoDetailPage task={task} /> : <Navigate to="/app/factory" replace />;
}

function MaterialStatusBadge({ status }: { status: MaterialExceptionStatus }) {
  return <span className={`status ${materialStatusClass(status)}`}>{materialStatusLabel(status)}</span>;
}

function MaterialExceptionListPage({ role, surface = "audit" }: { role: "factory" | "platform" | "supplier"; surface?: "submission" | "audit" }) {
  const navigate = useNavigate();
  const organizationId = readDemoSession()?.organizationId;
  const platformSubmission = role === "platform" && surface === "submission";
  const records = readMaterialExceptions().filter((record) => platformSubmission ? record.reporterOrganizationId === organizationId : role === "platform" || (role === "supplier" ? record.supplierOrganizationId === organizationId : record.reporterOrganizationId === organizationId));
  const title = platformSubmission ? "物料异常提报" : role === "platform" ? "物料异常审核" : role === "supplier" ? "物料异常任务处理" : "物料异常";
  const root = platformSubmission ? "/app/platform/platform-business/material-exceptions" : `/app/${role}${role === "platform" ? "/business" : ""}/material-exceptions`;
  const exportRows = records.map((record) => [record.businessNo, record.reporterOrganization, record.supplierName, record.materialNo, record.materialName, record.inspectionQty ? `${(record.defectQty / record.inspectionQty * 100).toFixed(2)}%` : "—", materialStatusLabel(record.status)]);
  return <div className="page-stack"><div className="page-heading heading-with-filters"><div><p>{platformSubmission ? "平台业务" : role === "platform" ? "业务管理" : role === "supplier" ? "供应商管理" : "工厂管理"}</p><h1>{title}</h1><span>{platformSubmission ? "平台主动提报物料异常并跟踪处理进度。" : role === "platform" ? "审核工厂或平台提报并分配供应商，或审核供应商8D报告。" : role === "supplier" ? "查看并处理平台分配给本组织的物料异常任务。" : "在线提报物料异常并跟踪平台处理进度。"}</span></div><div className="list-page-actions">{role !== "platform" && <MerchantBusinessExportButton permissionCode="merchant.business.material_exception.export" filename="物料异常" headers={["业务编号", "提报组织", "供应商", "物料料号", "物料名称", "不良率", "状态"]} rows={exportRows} />}{(role === "factory" || platformSubmission) && <button className="primary-small" onClick={() => navigate(`${root}/new`)}>新增物料异常</button>}</div></div><section className="list-summary"><div><strong>{records.length}</strong><span>全部记录</span></div><div><strong>{records.filter((record) => record.status === "pending_review" || record.status === "pending_8d_review").length}</strong><span>待平台审核</span></div><div><strong>{records.filter((record) => record.status === "approved").length}</strong><span>已通过</span></div></section><section className="work-card shipment-list-card"><header><div><h2>物料异常列表</h2><p>默认按提报时间倒序展示</p></div><span className="list-count">共 {records.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th><th>提报组织</th><th>供应商</th><th>物料料号</th><th>物料名称</th><th>不良率</th><th>状态</th><th>操作</th></tr></thead><tbody>{records.map((record) => { const path = `${root}/${record.id}`; return <tr key={record.id}><td><Link to={path}>{record.businessNo}</Link></td><td>{record.reporterOrganization}</td><td>{record.supplierName}</td><td>{record.materialNo}</td><td>{record.materialName}</td><td>{record.inspectionQty ? `${(record.defectQty / record.inspectionQty * 100).toFixed(2)}%` : "—"}</td><td><MaterialStatusBadge status={record.status} /></td><td><Link className="table-action" to={path}>查看详情</Link></td></tr>; })}</tbody></table></div></section></div>;
}

type MaterialExceptionDraft = Pick<MaterialException, "supplierName" | "materialNo" | "materialName" | "model" | "businessDate" | "inputQty" | "inspectionQty" | "defectQty" | "description" | "attachmentName" | "attachmentDataUrl" | "remark">;
const emptyMaterialDraft: MaterialExceptionDraft = { supplierName: "远航精密供应商", materialNo: "", materialName: "", model: "", businessDate: "2026-08-13", inputQty: 0, inspectionQty: 0, defectQty: 0, description: "", attachmentName: "", attachmentDataUrl: undefined, remark: "" };

function MaterialExceptionFormPage({ actor = "factory" }: { actor?: "factory" | "platform" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = id ? getMaterialException(id) : undefined;
  const session = readDemoSession();
  const currentOrganizationId = session?.organizationId ?? roleProfiles[actor].organizationId;
  const currentOrganizationName = session?.organizationName ?? roleProfiles[actor].organization;
  const currentUserName = session?.userName ?? roleProfiles[actor].user;
  const [draft, setDraft] = useState<MaterialExceptionDraft>(() => existing ? { supplierName: existing.supplierName, materialNo: existing.materialNo, materialName: existing.materialName, model: existing.model, businessDate: existing.businessDate, inputQty: existing.inputQty, inspectionQty: existing.inspectionQty, defectQty: existing.defectQty, description: existing.description, attachmentName: existing.attachmentName, attachmentDataUrl: existing.attachmentDataUrl, remark: existing.remark } : emptyMaterialDraft);
  const [attachmentError, setAttachmentError] = useState("");
  function update<K extends keyof MaterialExceptionDraft>(key: K, value: MaterialExceptionDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  async function selectAttachment(file?: File) { if (!file) return; try { const attachment = await readLocalAttachment(file); setAttachmentError(""); update("attachmentName", attachment.name); update("attachmentDataUrl", attachment.dataUrl); } catch (error) { setAttachmentError(error instanceof Error ? error.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const now = "2026-08-13 11:00"; const recordId = existing?.id ?? `material-exception-${Date.now()}`; const actorLabel = actor === "platform" ? "平台" : "工厂"; const record: MaterialException = { ...(existing ?? { id: recordId, version: 1, businessNo: `ME20260813${String(readMaterialExceptions().length + 1).padStart(6, "0")}`, reporterOrganizationId: currentOrganizationId, reporterOrganization: currentOrganizationName, createdAt: now, flowRecords: [] }), ...draft, status: "pending_review", updatedAt: now, reviewReason: undefined, flowRecords: [...(existing?.flowRecords ?? []), { id: `${recordId}-${existing ? "resubmitted" : "submitted"}-${Date.now()}`, kind: existing ? "resubmitted" : "submitted", action: existing ? `${actorLabel}重新提报物料异常` : `${actorLabel}提报物料异常`, time: now, operator: currentUserName, organization: currentOrganizationName }] }; const saved = saveMaterialException(record, existing?.version); const root = actor === "platform" ? "/app/platform/platform-business/material-exceptions" : "/app/factory/material-exceptions"; navigate(`${root}/${saved.id}`); }
  const label = (text: string, required = false) => <span className="form-field-label">{required && <em>*</em>}{text}</span>;
  return <BusinessFormLayout title={existing ? "修改并重新提报物料异常" : "新增物料异常"} onBack={() => navigate(-1)} onSubmit={submit}><BusinessFormSection title="基础信息"><div className="form-grid"><label>{label("供应商名称", true)}<input required value={draft.supplierName} onChange={(e) => update("supplierName", e.target.value)} /></label><label>{label("异常反馈时间", true)}<input required type="date" value={draft.businessDate} onChange={(e) => update("businessDate", e.target.value)} /></label></div></BusinessFormSection><BusinessFormSection title="物料信息"><div className="form-grid"><label>{label("物料料号", true)}<input required value={draft.materialNo} onChange={(e) => update("materialNo", e.target.value)} /></label><label>{label("物料名称", true)}<input required value={draft.materialName} onChange={(e) => update("materialName", e.target.value)} /></label><label>{label("物料型号")}<input value={draft.model} onChange={(e) => update("model", e.target.value)} /></label></div></BusinessFormSection><BusinessFormSection title="检验与异常信息"><div className="form-grid"><label>{label("投入数量")}<input type="number" min="0" value={draft.inputQty || ""} onChange={(e) => update("inputQty", Number(e.target.value))} /></label><label>{label("检验数量")}<input type="number" min="0" value={draft.inspectionQty || ""} onChange={(e) => update("inspectionQty", Number(e.target.value))} /></label><label>{label("不良数量")}<input type="number" min="0" value={draft.defectQty || ""} onChange={(e) => update("defectQty", Number(e.target.value))} /></label><label>{label("异常描述", true)}<textarea required maxLength={500} value={draft.description} onChange={(e) => update("description", e.target.value)} /></label></div></BusinessFormSection><BusinessFormSection title="附件与备注"><div className="form-grid single-column"><label>{label("附件")}<span className="file-input file-upload-zone"><input aria-label="物料异常附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void selectAttachment(e.target.files?.[0])} /><span><Upload size={28} /><strong>{draft.attachmentName || "点击或拖拽文件到此区域上传"}</strong><small>支持图片、Office、PDF、压缩包，单文件最大10MB</small></span></span>{attachmentError && <em className="field-error">{attachmentError}</em>}</label><label>{label("备注")}<textarea maxLength={500} value={draft.remark} onChange={(e) => update("remark", e.target.value)} /></label></div></BusinessFormSection></BusinessFormLayout>;
}

function MaterialExceptionSections({ record }: { record: MaterialException }) {
  return <div className="detail-sections"><DetailSection title="基本信息"><div className="detail-grid"><div><span>提报组织</span><strong>{record.reporterOrganization}</strong></div><div><span>供应商名称</span><strong>{record.supplierName}</strong></div><div><span>异常反馈时间</span><strong>{record.businessDate}</strong></div><div><span>提报时间</span><strong>{record.createdAt}</strong></div>{record.sourceIncomingInspectionId && <div><span>来源来料检验</span><strong><Link className="table-action" to={`/app/${readDemoSession()?.role === "platform" ? "platform/business" : "factory"}/incoming-inspections/${record.sourceIncomingInspectionId}`}>{record.sourceIncomingInspectionNo}</Link></strong></div>}</div></DetailSection><DetailSection title="物料与检验信息"><div className="detail-grid"><div><span>物料料号</span><strong>{record.materialNo}</strong></div><div><span>物料名称</span><strong>{record.materialName}</strong></div><div><span>物料型号</span><strong>{record.model || "—"}</strong></div><div><span>投入数量</span><strong>{record.inputQty.toLocaleString()}</strong></div><div><span>检验数量</span><strong>{record.inspectionQty.toLocaleString()}</strong></div><div><span>不良数量 / 不良率</span><strong>{record.defectQty.toLocaleString()} / {record.inspectionQty ? (record.defectQty / record.inspectionQty * 100).toFixed(2) : "0.00"}%</strong></div></div></DetailSection><DetailSection title="异常描述"><p className="detail-copy">{record.description}</p></DetailSection><DetailSection title="附件"><div className="detail-grid single-row"><div><span>物料异常附件</span>{record.attachmentName ? <strong>{record.attachmentDataUrl ? <button className="table-action" type="button" onClick={() => downloadLocalAttachment({ name: record.attachmentName, dataUrl: record.attachmentDataUrl! })}>下载 {record.attachmentName}</button> : record.attachmentName}</strong> : <strong>未上传</strong>}</div></div></DetailSection>{record.eightDAttachmentName && <DetailSection title="8D报告"><div className="detail-grid"><div><span>附件</span><strong>{record.eightDAttachmentDataUrl ? <button className="table-action" type="button" onClick={() => downloadLocalAttachment({ name: record.eightDAttachmentName!, dataUrl: record.eightDAttachmentDataUrl! })}>下载 {record.eightDAttachmentName}</button> : record.eightDAttachmentName}</strong></div><div><span>备注</span><strong>{record.eightDRemark || "—"}</strong></div></div></DetailSection>}<FlowTimeline records={record.flowRecords} /></div>;
}

function MaterialReviewDialog({ record, eightD, onClose, onSubmit }: { record: MaterialException; eightD: boolean; onClose: () => void; onSubmit: (result: "approved" | "rejected", reason: string, supplier: string) => void }) {
  const [result, setResult] = useState<"approved" | "rejected">("approved");
  const [reason, setReason] = useState("");
  const [supplier, setSupplier] = useState(record.supplierName || "");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (result === "rejected" && !reason.trim()) return; if (!eightD && result === "approved" && !supplier) return; onSubmit(result, reason.trim(), supplier); }
  return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="material-review-title"><header><h2 id="material-review-title">{eightD ? "审核8D报告" : "审核物料异常"}</h2><button aria-label="关闭审核弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><fieldset><legend>审核结果 <em>*</em></legend><label><input type="radio" checked={result === "approved"} onChange={() => setResult("approved")} />通过</label><label><input type="radio" checked={result === "rejected"} onChange={() => setResult("rejected")} />驳回</label></fieldset>{!eightD && result === "approved" && <label className="dialog-textarea"><small>分配供应商 *</small><select aria-label="分配供应商" required value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">请选择供应商</option><option>远航精密供应商</option></select></label>}<label className="dialog-textarea"><small>{result === "rejected" ? "审核意见 *" : "审核意见"}</small><textarea aria-label="审核意见" required={result === "rejected"} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">确认提交</button></footer></form></section></div>;
}

function EightDDialog({ record, onClose, onSubmit }: { record: MaterialException; onClose: () => void; onSubmit: (remark: string, attachment: LocalAttachment) => void }) {
  const [remark, setRemark] = useState(record.eightDRemark || ""); const [attachment, setAttachment] = useState<LocalAttachment | undefined>(record.eightDAttachmentName && record.eightDAttachmentDataUrl ? { name: record.eightDAttachmentName, dataUrl: record.eightDAttachmentDataUrl } : undefined); const [error, setError] = useState("");
  async function select(file?: File) { if (!file) return; try { setAttachment(await readLocalAttachment(file)); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!attachment) { setError("请上传8D附件"); return; } onSubmit(remark.trim(), attachment); }
  return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="eightd-title"><header><h2 id="eightd-title">提交8D报告</h2><button aria-label="关闭8D弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><label><small>附件 *</small><span className="file-input file-upload-zone"><input aria-label="8D附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void select(e.target.files?.[0])} /><span><Upload size={24} /><strong>{attachment?.name || "点击上传8D附件"}</strong><small>单文件最大10MB</small></span></span>{error && <em className="field-error">{error}</em>}</label><label className="dialog-textarea"><small>备注</small><textarea aria-label="8D备注" maxLength={1000} value={remark} onChange={(e) => setRemark(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">提交8D报告</button></footer></form></section></div>;
}

type Feedback = { tone: "success" | "error"; message: string };

function ActionFeedback({ feedback, onRefresh }: { feedback?: Feedback; onRefresh?: () => void }) {
  if (!feedback) return null;
  return <div className={`action-feedback ${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{feedback.message}</span>{feedback.tone === "error" && onRefresh && <button type="button" onClick={onRefresh}><RefreshCw size={14} />刷新数据</button>}</div>;
}

function CancelMaterialDialog({ record, onCancel, onClose }: { record: MaterialException; onCancel: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (reason.trim()) onCancel(reason.trim()); }
  return <div className="dialog-backdrop"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="material-cancel-title"><header><h2 id="material-cancel-title">取消物料异常</h2><button aria-label="关闭取消弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><div className="cancel-warning"><strong>取消后不可恢复</strong><span>取消后将通知当前处理方，该单据不能再次审核或提交8D。</span></div><label className="dialog-textarea"><span className="dialog-field-label">取消原因 <em>*</em></span><textarea required minLength={1} maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} aria-label="取消原因" placeholder="请输入取消原因（必填，最多200字）" /><span className="dialog-counter">{reason.length} / 200</span></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="danger-button">确认取消</button></footer></form></section></div>;
}

function MaterialExceptionDetailPage({ role, surface = "audit" }: { role: "factory" | "platform" | "supplier"; surface?: "submission" | "audit" }) {
  const navigate = useNavigate(); const { id = "" } = useParams(); const [record, setRecord] = useState<MaterialException | undefined>(() => getMaterialException(id)); const [reviewOpen, setReviewOpen] = useState(false); const [eightDOpen, setEightDOpen] = useState(false); const [cancelOpen, setCancelOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>();
  const session = readDemoSession();
  if (!record || !session || !canAccessOrganizationRecord(role, session.organizationId, record)) return <Navigate to={`/app/${role}`} replace />;
  const current = record;
  function commit(updated: MaterialException, successMessage: string) { try { const saved = saveMaterialException(updated, current.version); setRecord(saved); setFeedback({ tone: "success", message: successMessage }); return true; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "数据加载失败，请刷新重试" }); setReviewOpen(false); setEightDOpen(false); setCancelOpen(false); return false; } }
  function refresh() { const latest = getMaterialException(id); if (latest) setRecord(latest); setFeedback(undefined); setReviewOpen(false); setEightDOpen(false); setCancelOpen(false); }
  function review(result: "approved" | "rejected", reason: string, supplier: string) { const now = "2026-08-13 11:20"; const eightD = current.status === "pending_8d_review"; const nextStatus: MaterialExceptionStatus = result === "approved" ? (eightD ? "approved" : "waiting_supplier") : (eightD ? "rejected_8d" : "rejected"); const updated: MaterialException = { ...current, status: nextStatus, supplierName: supplier || current.supplierName, supplierOrganizationId: result === "approved" && !eightD ? supplierOrganizationId : current.supplierOrganizationId, reviewReason: reason, updatedAt: now, flowRecords: [...current.flowRecords, { id: `${current.id}-review-${Date.now()}`, kind: result === "approved" ? (eightD ? "review_approved" : "assigned") : "review_rejected", action: result === "approved" ? (eightD ? "平台审核8D通过" : `平台审核通过并分配${supplier}`) : (eightD ? "平台审核8D驳回" : "平台审核驳回"), time: now, operator: "演示管理员", organization: "示例质量运营中心", detail: reason || undefined }] }; if (commit(updated, "审核结果已提交")) setReviewOpen(false); }
  function submitEightD(remark: string, attachment: LocalAttachment) { const now = "2026-08-13 11:40"; const updated: MaterialException = { ...current, status: "pending_8d_review", eightDRemark: remark, eightDAttachmentName: attachment.name, eightDAttachmentDataUrl: attachment.dataUrl, updatedAt: now, flowRecords: [...current.flowRecords, { id: `${current.id}-8d-${Date.now()}`, kind: "submitted_8d", action: current.status === "rejected_8d" ? "供应商重新提交8D报告" : "供应商提交8D报告", time: now, operator: "王晨", organization: "远航精密供应商", detail: attachment.name }] }; if (commit(updated, "8D报告已提交审核")) setEightDOpen(false); }
  function cancel(reason: string): void { const now = "2026-08-13 12:00"; const updated: MaterialException = { ...current, status: "cancelled", updatedAt: now, reviewReason: reason, flowRecords: [...current.flowRecords, { id: `${current.id}-cancel-${Date.now()}`, kind: "cancelled", action: "平台取消物料异常", time: now, operator: "演示管理员", organization: "示例质量运营中心", detail: reason }] }; if (commit(updated, "物料异常已取消")) setCancelOpen(false); }
  const platformSubmission = role === "platform" && surface === "submission";
  const listPath = platformSubmission ? "/app/platform/platform-business/material-exceptions" : role === "platform" ? "/app/platform/business/material-exceptions" : role === "supplier" ? "/app/supplier/material-exceptions" : "/app/factory/material-exceptions";
  const canMerchantAct = role === "supplier"
    ? hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, "merchant.business.material_exception.handle")
    : role === "factory" ? hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, "merchant.business.material_exception.submit") : true;
  const actions = <>{role === "platform" && surface === "audit" && (current.status === "pending_review" || current.status === "pending_8d_review") && <button className="primary-small" onClick={() => setReviewOpen(true)}>{current.status === "pending_8d_review" ? "审核8D" : "审核"}</button>}{role === "platform" && ((surface === "audit" && !["approved", "cancelled"].includes(current.status)) || (surface === "submission" && current.status === "pending_review")) && <button className="danger-outline-button" onClick={() => setCancelOpen(true)}>取消</button>}{role === "factory" && canMerchantAct && current.status === "rejected" && <button className="primary-small" onClick={() => navigate(`/app/factory/material-exceptions/${current.id}/edit`)}>修改并重新提报</button>}{role === "supplier" && canMerchantAct && (current.status === "waiting_supplier" || current.status === "rejected_8d") && <button className="primary-small" onClick={() => setEightDOpen(true)}>{current.status === "rejected_8d" ? "重新提交8D" : "提交8D报告"}</button>}</>;
  return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(listPath)}><ArrowLeft size={16} />返回</button><h1>{current.businessNo} · 物料异常</h1><MaterialStatusBadge status={current.status} /></div><div className="detail-title-actions">{actions}</div></div><ActionFeedback feedback={feedback} onRefresh={refresh} /><MaterialExceptionSections record={current} />{reviewOpen && <MaterialReviewDialog record={current} eightD={current.status === "pending_8d_review"} onClose={() => setReviewOpen(false)} onSubmit={review} />}{eightDOpen && <EightDDialog record={current} onClose={() => setEightDOpen(false)} onSubmit={submitEightD} />}{cancelOpen && <CancelMaterialDialog record={current} onClose={() => setCancelOpen(false)} onCancel={cancel} />}</div>;
}

type IncomingInspectionDraft = Pick<IncomingInspection, "supplierName" | "materialNo" | "materialName" | "model" | "inspectionDate" | "inputQty" | "inspectionQty" | "defectQty" | "inspectionResult" | "supplyMethod" | "attachmentName" | "attachmentDataUrl" | "defectDescription" | "remark">;
const emptyIncomingInspectionDraft: IncomingInspectionDraft = { supplierName: "远航精密供应商", materialNo: "", materialName: "", model: "", inspectionDate: "2026-08-13", inputQty: 0, inspectionQty: 0, defectQty: 0, inspectionResult: "qualified", supplyMethod: "platform_purchase", attachmentName: "", attachmentDataUrl: undefined, defectDescription: "", remark: "" };

function IncomingInspectionStatusBadge({ status }: { status: IncomingInspectionStatus }) { return <span className={`status ${incomingInspectionStatusClass(status)}`}>{incomingInspectionStatusLabel(status)}</span>; }

function IncomingInspectionListPage({ role }: { role: "factory" | "platform" }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const supplyMethod = params.get("supplyMethod") || "all";
  const range = role === "platform" ? metricRangeFromSearch(params) : undefined;
  const organizationId = readDemoSession()?.organizationId ?? factoryOrganizationId;
  const records = readIncomingInspections().filter((record) => (role === "platform" || record.factoryOrganizationId === organizationId) && (supplyMethod === "all" || record.supplyMethod === supplyMethod)
    && (!range || (metricDateMatches(record.inspectionDate, { range }) && metricEntityMatches(record, { organizationId: params.get("organizationId") ?? undefined, materialNo: params.get("material") ?? undefined }))));
  const root = role === "platform" ? "/app/platform/business/incoming-inspections" : "/app/factory/incoming-inspections";
  const exportRows = records.map((record) => [record.businessNo, record.factoryOrganization, record.supplierName, record.materialNo, record.materialName, record.inspectionResult === "qualified" ? "合格" : "不合格", record.inspectionDate, incomingInspectionStatusLabel(record.status)]);
  const canSubmit = role === "factory" && hasCurrentMerchantPermission("merchant.business.incoming_inspection.submit");
  return <div className="page-stack"><div className="page-heading heading-with-filters"><div><p>{role === "platform" ? "业务管理" : "工厂管理"}</p><h1>{role === "platform" ? "来料检验审核" : "来料检验"}</h1><span>{role === "platform" ? "审核工厂提交的来料检验，审核通过时明确处理方式。" : "在线提报来料检验并跟踪审核与物料异常关联。"}</span></div><div className="list-page-actions">{role === "factory" && <MerchantBusinessExportButton permissionCode="merchant.business.incoming_inspection.export" filename="来料检验" headers={["业务编号", "提报工厂", "供应商", "物料料号", "物料名称", "检验结果", "检验时间", "状态"]} rows={exportRows} />}{canSubmit && <button className="primary-small" onClick={() => navigate(`${root}/new`)}>新增来料检验</button>}</div></div><section className="list-summary"><div><strong>{records.length}</strong><span>全部记录</span></div><div><strong>{records.filter((item) => item.status === "pending_review").length}</strong><span>待审核</span></div><div><strong>{records.filter((item) => item.status === "completed").length}</strong><span>已完成</span></div></section><section className="work-card shipment-list-card"><header><div><h2>来料检验列表</h2><p>默认按提报时间倒序展示</p></div><span className="list-count">共 {records.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th>{role === "platform" && <th>提报工厂</th>}<th>供应商</th><th>物料料号</th><th>物料名称</th><th>检验结果</th><th>检验时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link to={`${root}/${record.id}`}>{record.businessNo}</Link></td>{role === "platform" && <td>{record.factoryOrganization}</td>}<td>{record.supplierName}</td><td>{record.materialNo}</td><td>{record.materialName}</td><td>{record.inspectionResult === "qualified" ? "合格" : "不合格"}</td><td>{record.inspectionDate}</td><td><IncomingInspectionStatusBadge status={record.status} /></td><td><Link className="table-action" to={`${root}/${record.id}`}>查看详情</Link></td></tr>)}</tbody></table></div></section></div>;
}

function IncomingInspectionFormPage() {
  const navigate = useNavigate(); const { id } = useParams(); const existing = id ? getIncomingInspection(id) : undefined; const session = readDemoSession();
  const organizationId = session?.organizationId ?? factoryOrganizationId; const organizationName = session?.organizationName ?? roleProfiles.factory.organization; const userName = session?.userName ?? roleProfiles.factory.user;
  const [draft, setDraft] = useState<IncomingInspectionDraft>(() => existing?.status === "rejected" ? { supplierName: existing.supplierName, materialNo: existing.materialNo, materialName: existing.materialName, model: existing.model, inspectionDate: existing.inspectionDate, inputQty: existing.inputQty, inspectionQty: existing.inspectionQty, defectQty: existing.defectQty, inspectionResult: existing.inspectionResult, supplyMethod: existing.supplyMethod, attachmentName: existing.attachmentName, attachmentDataUrl: existing.attachmentDataUrl, defectDescription: existing.defectDescription, remark: existing.remark } : { ...emptyIncomingInspectionDraft });
  const [attachmentError, setAttachmentError] = useState(""); const [formError, setFormError] = useState("");
  function update<K extends keyof IncomingInspectionDraft>(key: K, value: IncomingInspectionDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  async function selectAttachment(file?: File) { if (!file) return; try { const attachment = await readLocalAttachment(file); update("attachmentName", attachment.name); update("attachmentDataUrl", attachment.dataUrl); setAttachmentError(""); } catch (error) { setAttachmentError(error instanceof Error ? error.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFormError(""); if (draft.inspectionQty > draft.inputQty) { setFormError("检验数量不能大于投入数量"); return; } if (draft.defectQty > draft.inspectionQty) { setFormError("不良数量不能大于检验数量"); return; } if (draft.inspectionResult === "unqualified" && !draft.defectDescription.trim()) { setFormError("检验结果不合格时必须填写不良描述"); return; } const now = "2026-08-13 16:00"; const recordId = existing?.id ?? `incoming-inspection-${Date.now()}`; const record: IncomingInspection = { ...(existing ?? { id: recordId, version: 1, businessNo: createIncomingInspectionNo(readIncomingInspections()), createdAt: now, flowRecords: [] }), ...draft, factoryOrganizationId: organizationId, factoryOrganization: organizationName, status: "pending_review", reviewReason: undefined, cancelReason: undefined, updatedAt: now, flowRecords: [...(existing?.flowRecords ?? []), { id: `${recordId}-${existing ? "resubmitted" : "submitted"}-${Date.now()}`, kind: existing ? "resubmitted" : "submitted", action: existing ? "工厂重新提交来料检验" : "工厂提交来料检验", time: now, operator: userName, organization: organizationName }] }; try { const saved = saveIncomingInspection(record, existing?.version); navigate(`/app/factory/incoming-inspections/${saved.id}`); } catch (error) { setFormError(error instanceof Error ? error.message : "提交失败"); } }
  const label = (value: string, required = false) => <span className="form-field-label">{required && <em>*</em>}{value}</span>;
  return <BusinessFormLayout title={existing ? "修改并重新提报来料检验" : "新增来料检验"} onBack={() => navigate("/app/factory/incoming-inspections")} onSubmit={submit}><BusinessFormSection title="基础信息"><div className="form-grid"><label>{label("提报工厂")}<input readOnly value={organizationName} /></label><label>{label("供应商名称", true)}<input required value={draft.supplierName} onChange={(e) => update("supplierName", e.target.value)} /></label><label>{label("检验时间", true)}<input required type="date" value={draft.inspectionDate} onChange={(e) => update("inspectionDate", e.target.value)} /></label><label>{label("供货方式", true)}<select aria-label="供货方式" value={draft.supplyMethod} onChange={(e) => update("supplyMethod", e.target.value as IncomingInspectionDraft["supplyMethod"])}><option value="platform_purchase">平台采购</option><option value="factory_purchase">工厂采购</option></select></label></div></BusinessFormSection><BusinessFormSection title="物料信息"><div className="form-grid"><label>{label("物料料号", true)}<input required value={draft.materialNo} onChange={(e) => update("materialNo", e.target.value)} /></label><label>{label("物料名称", true)}<input required value={draft.materialName} onChange={(e) => update("materialName", e.target.value)} /></label><label>{label("物料型号")}<input value={draft.model} onChange={(e) => update("model", e.target.value)} /></label></div></BusinessFormSection><BusinessFormSection title="检验信息"><div className="form-grid"><label>{label("投入数量", true)}<input required type="number" min="1" value={draft.inputQty || ""} onChange={(e) => update("inputQty", Number(e.target.value))} /></label><label>{label("检验数量", true)}<input required type="number" min="1" value={draft.inspectionQty || ""} onChange={(e) => update("inspectionQty", Number(e.target.value))} /></label><label>{label("不良数量", true)}<input required type="number" min="0" value={draft.defectQty} onChange={(e) => update("defectQty", Number(e.target.value))} /></label><label>{label("不良率")}<input readOnly value={`${draft.inspectionQty ? (draft.defectQty / draft.inspectionQty * 100).toFixed(2) : "0.00"}%`} /></label><label>{label("检验结果", true)}<select aria-label="检验结果" value={draft.inspectionResult} onChange={(e) => update("inspectionResult", e.target.value as IncomingInspectionDraft["inspectionResult"])}><option value="qualified">合格</option><option value="unqualified">不合格</option></select></label><label>{label("不良描述", draft.inspectionResult === "unqualified")}<textarea required={draft.inspectionResult === "unqualified"} value={draft.defectDescription} onChange={(e) => update("defectDescription", e.target.value)} /></label></div></BusinessFormSection><BusinessFormSection title="附件与备注"><div className="form-grid single-column"><label>{label("附件")}<span className="file-input file-upload-zone"><input aria-label="来料检验附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void selectAttachment(e.target.files?.[0])} /><span><Upload size={28} /><strong>{draft.attachmentName || "点击或拖拽文件到此区域上传"}</strong><small>支持图片、Office、PDF、压缩包，单文件最大10MB</small></span></span>{attachmentError && <em className="field-error">{attachmentError}</em>}</label><label>{label("备注")}<textarea maxLength={500} value={draft.remark} onChange={(e) => update("remark", e.target.value)} /></label></div></BusinessFormSection>{formError && <div className="form-submit-error" role="alert">{formError}</div>}</BusinessFormLayout>;
}

function IncomingInspectionSections({ record, role }: { record: IncomingInspection; role: "factory" | "platform" }) {
  const materialPath = role === "platform" ? "/app/platform/business/material-exceptions" : "/app/factory/material-exceptions";
  return <div className="detail-sections"><DetailSection title="基本信息"><div className="detail-grid"><div><span>提报工厂</span><strong>{record.factoryOrganization}</strong></div><div><span>供应商名称</span><strong>{record.supplierName}</strong></div><div><span>检验时间</span><strong>{record.inspectionDate}</strong></div><div><span>供货方式</span><strong>{record.supplyMethod === "platform_purchase" ? "平台采购" : "工厂采购"}</strong></div><div><span>提报时间</span><strong>{record.createdAt}</strong></div>{record.triggeredMaterialExceptionId && <div><span>关联物料异常</span><strong><Link className="table-action" to={`${materialPath}/${record.triggeredMaterialExceptionId}`}>{record.triggeredMaterialExceptionNo}</Link></strong></div>}</div></DetailSection><DetailSection title="物料与检验信息"><div className="detail-grid"><div><span>物料料号</span><strong>{record.materialNo}</strong></div><div><span>物料名称</span><strong>{record.materialName}</strong></div><div><span>物料型号</span><strong>{record.model || "—"}</strong></div><div><span>投入数量</span><strong>{record.inputQty.toLocaleString()}</strong></div><div><span>检验数量</span><strong>{record.inspectionQty.toLocaleString()}</strong></div><div><span>不良数量 / 不良率</span><strong>{record.defectQty.toLocaleString()} / {record.inspectionQty ? (record.defectQty / record.inspectionQty * 100).toFixed(2) : "0.00"}%</strong></div><div><span>检验结果</span><strong>{record.inspectionResult === "qualified" ? "合格" : "不合格"}</strong></div><div><span>平台处理方式</span><strong>{record.handlingMethod || "—"}</strong></div></div></DetailSection><DetailSection title="不良描述"><p className="detail-copy">{record.defectDescription || "—"}</p></DetailSection><DetailSection title="附件与备注"><div className="detail-grid"><div><span>检验附件</span><strong>{record.attachmentName ? record.attachmentDataUrl ? <button className="table-action" onClick={() => downloadLocalAttachment({ name: record.attachmentName, dataUrl: record.attachmentDataUrl! })}>下载 {record.attachmentName}</button> : `${record.attachmentName}（历史演示数据无文件内容）` : "未上传"}</strong></div><div><span>备注</span><strong>{record.remark || "—"}</strong></div></div></DetailSection><FlowTimeline records={record.flowRecords} /></div>;
}

function IncomingInspectionReviewDialog({ record, onClose, onSubmit }: { record: IncomingInspection; onClose: () => void; onSubmit: (result: "completed" | "rejected", value: string) => void }) {
  const [result, setResult] = useState<"completed" | "rejected">("completed"); const [value, setValue] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!value.trim()) return; onSubmit(result, value.trim()); }
  return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="iqc-review-title"><header><h2 id="iqc-review-title">来料检验审核</h2><button aria-label="关闭审核弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><fieldset><legend>审核结果 <em>*</em></legend><label><input type="radio" name="iqc-review" checked={result === "completed"} onChange={() => { setResult("completed"); setValue(""); }} />审核通过</label><label><input type="radio" name="iqc-review" checked={result === "rejected"} onChange={() => { setResult("rejected"); setValue(""); }} />审核驳回</label></fieldset><label className="dialog-textarea"><span className="dialog-field-label">{result === "completed" ? "处理方式" : "驳回原因"} <em>*</em></span><textarea aria-label={result === "completed" ? "处理方式" : "驳回原因"} required maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} placeholder={result === "completed" ? "请输入处理方式（必填）" : "请输入驳回原因（必填）"} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">提交审核</button></footer></form></section></div>;
}

function CancelIncomingInspectionDialog({ record, role, onClose, onCancel }: { record: IncomingInspection; role: "factory" | "platform"; onClose: () => void; onCancel: (reason: string) => void }) {
  const [reason, setReason] = useState(""); function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (reason.trim()) onCancel(reason.trim()); }
  return <div className="dialog-backdrop"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="iqc-cancel-title"><header><h2 id="iqc-cancel-title">取消来料检验</h2><button aria-label="关闭取消弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><div className="cancel-warning"><strong>取消后不可恢复</strong><span>{role === "platform" ? "平台取消后工厂不能再次修改或提报该记录。" : "取消后该记录不能再次修改或重新提交。"}</span></div><label className="dialog-textarea"><span className="dialog-field-label">取消原因 <em>*</em></span><textarea aria-label="取消原因" required maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="danger-button">确认取消</button></footer></form></section></div>;
}

function IncomingInspectionDetailPage({ role }: { role: "factory" | "platform" }) {
  const navigate = useNavigate(); const { id = "" } = useParams(); const [record, setRecord] = useState<IncomingInspection | undefined>(() => getIncomingInspection(id)); const [reviewOpen, setReviewOpen] = useState(false); const [cancelOpen, setCancelOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>();
  const root = role === "platform" ? "/app/platform/business/incoming-inspections" : "/app/factory/incoming-inspections";
  const session = readDemoSession();
  if (!record || !session || !canAccessOrganizationRecord(role, session.organizationId, record)) return <Navigate to={root} replace />; const current = record;
  function commit(updated: IncomingInspection, message: string) { try { const saved = saveIncomingInspection(updated, current.version); setRecord(saved); setFeedback({ tone: "success", message }); return true; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "操作失败" }); setReviewOpen(false); setCancelOpen(false); return false; } }
  function review(result: "completed" | "rejected", value: string) { try { if (result === "completed") validateIncomingInspectionApproval(value); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "请填写处理方式" }); return; } const now = "2026-08-13 16:30"; const updated: IncomingInspection = { ...current, status: result, handlingMethod: result === "completed" ? value : undefined, reviewReason: result === "rejected" ? value : undefined, updatedAt: now, flowRecords: [...current.flowRecords, { id: `${current.id}-review-${Date.now()}`, kind: result === "completed" ? "review_approved" : "review_rejected", action: result === "completed" ? "平台审核通过" : "平台审核驳回", time: now, operator: "演示管理员", organization: "示例质量运营中心", detail: result === "completed" ? `处理方式：${value}` : value }] }; if (commit(updated, "审核结果已提交")) setReviewOpen(false); }
  function cancel(reason: string) { const session = readDemoSession(); const now = "2026-08-13 16:40"; const updated: IncomingInspection = { ...current, status: "cancelled", cancelReason: reason, updatedAt: now, flowRecords: [...current.flowRecords, { id: `${current.id}-cancel-${Date.now()}`, kind: "cancelled", action: role === "platform" ? "平台取消来料检验" : "工厂取消来料检验", time: now, operator: role === "platform" ? "演示管理员" : (session?.userName ?? "陈工"), organization: role === "platform" ? "示例质量运营中心" : current.factoryOrganization, detail: reason }] }; if (commit(updated, "来料检验已取消")) setCancelOpen(false); }
  function triggerMaterialException() { const latest = getIncomingInspection(current.id); if (!latest || !canTriggerMaterialException(latest)) { setFeedback({ tone: "error", message: latest?.triggeredMaterialExceptionId ? "该来料检验已触发过物料异常" : "当前记录不满足触发物料异常条件" }); return; } const existingMaterial = readMaterialExceptions().find((item) => item.sourceIncomingInspectionId === latest.id); if (existingMaterial) { try { const saved = saveIncomingInspection({ ...latest, triggeredMaterialExceptionId: existingMaterial.id, triggeredMaterialExceptionNo: existingMaterial.businessNo }, latest.version); setRecord(saved); setFeedback({ tone: "success", message: `已关联物料异常 ${existingMaterial.businessNo}` }); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "关联失败" }); } return; } const now = "2026-08-13 16:50"; const materialId = `material-exception-iqc-${Date.now()}`; const materialNo = `ME20260813${String(readMaterialExceptions().length + 1).padStart(6, "0")}`; const material: MaterialException = { id: materialId, version: 1, businessNo: materialNo, status: "pending_review", reporterOrganizationId: latest.factoryOrganizationId, reporterOrganization: latest.factoryOrganization, supplierName: latest.supplierName, materialNo: latest.materialNo, materialName: latest.materialName, model: latest.model, businessDate: latest.inspectionDate, inputQty: latest.inputQty, inspectionQty: latest.inspectionQty, defectQty: latest.defectQty, description: latest.defectDescription, attachmentName: latest.attachmentName, attachmentDataUrl: latest.attachmentDataUrl, remark: latest.remark, sourceIncomingInspectionId: latest.id, sourceIncomingInspectionNo: latest.businessNo, flowRecords: [{ id: `${materialId}-triggered`, kind: "submitted", action: "由来料检验手动触发", time: now, operator: readDemoSession()?.userName ?? "陈工", organization: latest.factoryOrganization, detail: `来源：${latest.businessNo}` }], createdAt: now, updatedAt: now }; try { saveMaterialException(material); const saved = saveIncomingInspection({ ...latest, triggeredMaterialExceptionId: materialId, triggeredMaterialExceptionNo: materialNo, updatedAt: now, flowRecords: [...latest.flowRecords, { id: `${latest.id}-triggered-${Date.now()}`, kind: "triggered", action: "手动触发物料异常", time: now, operator: readDemoSession()?.userName ?? "陈工", organization: latest.factoryOrganization, detail: materialNo }] }, latest.version); setRecord(saved); setFeedback({ tone: "success", message: `物料异常 ${materialNo} 已生成并进入平台待办` }); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "触发失败" }); } }
  function refresh() { const latest = getIncomingInspection(id); if (latest) setRecord(latest); setFeedback(undefined); }
  const canCancel = current.status === "pending_review" || current.status === "rejected";
  return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(root)}><ArrowLeft size={16} />返回</button><h1>{current.businessNo} · 来料检验</h1><IncomingInspectionStatusBadge status={current.status} /></div><div className="detail-title-actions">{role === "platform" && current.status === "pending_review" && <button className="primary-small" onClick={() => setReviewOpen(true)}>审核</button>}{role === "factory" && current.status === "rejected" && <button className="primary-small" onClick={() => navigate(`${root}/${current.id}/edit`)}>修改并重新提报</button>}{role === "factory" && canTriggerMaterialException(current) && <button className="primary-small" onClick={triggerMaterialException}>手动触发物料异常</button>}{canCancel && <button className="danger-outline-button" onClick={() => setCancelOpen(true)}>取消</button>}</div></div><ActionFeedback feedback={feedback} onRefresh={refresh} /><IncomingInspectionSections record={current} role={role} />{reviewOpen && <IncomingInspectionReviewDialog record={current} onClose={() => setReviewOpen(false)} onSubmit={review} />}{cancelOpen && <CancelIncomingInspectionDialog record={current} role={role} onClose={() => setCancelOpen(false)} onCancel={cancel} />}</div>;
}

function DirectBusinessListPage({ role, type }: { role: "factory" | "platform"; type: DirectBusinessType }) {
  const navigate = useNavigate(); const { search } = useLocation();
  const params = new URLSearchParams(search);
  const inspectionProcess = params.get("inspectionProcess");
  const range = role === "platform" ? metricRangeFromSearch(params) : undefined;
  const session = readDemoSession(); const organizationId = session?.organizationId ?? factoryOrganizationId; const organizationName = session?.organizationName ?? roleProfiles.factory.organization; const userName = session?.userName ?? roleProfiles.factory.user; const root = directBusinessPath(role, type); const [batchOpen, setBatchOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>();
  const records = readDirectBusinessRecords()
    .filter((item) => item.businessType === type && (role === "platform" || item.factoryOrganizationId === organizationId) && (!inspectionProcess || item.inspectionProcess === inspectionProcess)
      && (!range || (metricDateMatches(item.businessDate, { range }) && metricEntityMatches(item, { organizationId: params.get("organizationId") ?? undefined, materialNo: params.get("material") ?? undefined }))))
    .sort((left, right) => right.businessDate.localeCompare(left.businessDate) || right.businessNo.localeCompare(left.businessNo));
  const exportRows = records.map((record) => [record.businessNo, record.factoryOrganization, record.productName, record.businessDate, "已完成"]);
  const permissionResource = directBusinessPermissionResources[type];
  const canSubmit = role === "factory" && hasCurrentMerchantPermission(`merchant.business.${permissionResource}.submit`);
  return <div className="page-stack"><div className="page-heading heading-with-filters"><div><p>{role === "platform" ? "业务管理" : "工厂管理"}{type === "production_inspection" ? " · 演示数据" : ""}</p><h1>{directBusinessLabels[type]}</h1><span>{type === "production_inspection" ? `当前列表使用版本化 M1 演示数据；${role === "platform" ? "仅查看已完成记录。" : "新增记录提交后直接归档，无需平台审核。"}` : role === "platform" ? `仅查看已完成的${directBusinessLabels[type]}记录。` : `提交后直接归档${directBusinessLabels[type]}，无需平台审核。`}</span></div><div className="list-page-actions">{canSubmit && <><button className="primary-small" onClick={() => navigate(`${root}/new`)}>新增{directBusinessLabels[type]}</button>{type === "production_inspection" && <button className="secondary-button" onClick={() => setBatchOpen(true)}>批量新增</button>}</>}{role === "platform" ? <button className="secondary-button" onClick={() => exportRowsAsXlsx(`${directBusinessLabels[type]}列表`, ["业务编号", "提报组织", "产品名称", "业务时间", "状态"], exportRows)}><Download size={15} />导出</button> : <MerchantBusinessExportButton permissionCode={`merchant.business.${permissionResource}.export`} filename={directBusinessLabels[type]} headers={["业务编号", "提报组织", "产品名称", "业务时间", "状态"]} rows={exportRows} />}</div></div><ActionFeedback feedback={feedback} /><section className="list-summary"><div><strong>{records.length}</strong><span>全部记录</span></div><div><strong>{records.length}</strong><span>已完成</span></div><div><strong>0</strong><span>待审核</span></div></section><section className="work-card shipment-list-card"><header><div><h2>{directBusinessLabels[type]}列表</h2><p>按提报时间倒序展示</p></div><span className="list-count">共 {records.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th>{role === "platform" && <th>提报组织</th>}<th>{type === "production_inspection" ? "产品名称" : type === "maintenance_record" ? "料号" : "产品型号"}</th><th>{type === "ipqc_patrol" ? "事项描述" : type === "production_inspection" ? "检验工序" : "维修明细"}</th><th>业务时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link to={`${root}/${record.id}`}>{record.businessNo}</Link></td>{role === "platform" && <td>{record.factoryOrganization}</td>}<td>{type === "production_inspection" ? record.productName : type === "maintenance_record" ? record.materialNo : record.productModel}</td><td>{type === "ipqc_patrol" ? (record.issueDescription || "—").slice(0, 30) : type === "production_inspection" ? record.inspectionProcess : `${record.repairDetails?.length ?? 0}项维修明细`}</td><td>{record.businessDate}</td><td><span className="status approved">已完成</span></td><td><Link className="table-action" to={`${root}/${record.id}`}>查看详情</Link></td></tr>)}</tbody></table></div></section>{batchOpen && <BatchProductionInspectionDialog organizationId={organizationId} organizationName={organizationName} userName={userName} onClose={() => setBatchOpen(false)} onSubmitted={(count) => { setBatchOpen(false); setFeedback({ tone: "success", message: `已批量提交${count}条生产检验日报` }); }} />}</div>;
}

function BatchDefectDialog({ row, onClose, onSave }: { row: BatchProductionInspectionRow; onClose: () => void; onSave: (details: DefectDetail[]) => void }) {
  const [details, setDetails] = useState<DefectDetail[]>(row.defectDetails.length ? row.defectDetails : [{ id: `batch-defect-draft-${Date.now()}`, defect: "", quantity: 0 }]);
  return <div className="dialog-backdrop"><section className="review-dialog batch-defect-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-defect-title"><header><h2 id="batch-defect-title">维护不良明细</h2><button aria-label="关闭不良明细弹窗" onClick={onClose}><X size={21} /></button></header><div className="dialog-body"><p className="form-hint">当前行不良数量将由明细数量自动汇总。</p><div className="structured-form-list">{details.map((detail, index) => <div className="structured-form-row" key={detail.id}><label><span className="form-field-label">不良项</span><input aria-label={`批量不良项第${index + 1}项`} value={detail.defect} onChange={(event) => setDetails((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, defect: event.target.value } : item))} /></label><label><span className="form-field-label">数量</span><input aria-label={`批量不良数量第${index + 1}项`} type="number" min="0" step="1" value={detail.quantity || ""} onChange={(event) => setDetails((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} /></label><button type="button" className="table-action" onClick={() => setDetails((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)}>删除</button></div>)}<button className="secondary-button" type="button" onClick={() => setDetails((current) => [...current, { id: `batch-defect-draft-${Date.now()}`, defect: "", quantity: 0 }])}>新增不良项</button></div></div><footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-small" onClick={() => onSave(details.filter((item) => item.defect.trim() || item.quantity))}>保存明细</button></footer></section></div>;
}

function BatchProductionInspectionDialog({ organizationId, organizationName, userName, onClose, onSubmitted }: { organizationId: string; organizationName: string; userName: string; onClose: () => void; onSubmitted: (count: number) => void }) {
  const [rows, setRows] = useState<BatchProductionInspectionRow[]>([emptyBatchProductionRow()]); const [defectRowIndex, setDefectRowIndex] = useState<number>(); const [errors, setErrors] = useState<string[]>([]); const [confirmOpen, setConfirmOpen] = useState(false); const [attachmentError, setAttachmentError] = useState("");
  function updateRow(index: number, patch: Partial<BatchProductionInspectionRow>) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  function copyRow(index: number) { if (rows.length >= 20) return; const source = rows[index]; setRows((current) => [...current.slice(0, index + 1), { ...source, id: `batch-row-${Date.now()}-${index}`, attachmentName: "", attachmentDataUrl: undefined, defectDetails: source.defectDetails.map((item) => ({ ...item, id: `batch-defect-${Date.now()}-${index}` })) }, ...current.slice(index + 1)]); }
  function addRow() { if (rows.length < 20) setRows((current) => [...current, emptyBatchProductionRow()]); }
  function submitBatch() { const nextErrors = validateBatchProductionRows(rows); setErrors(nextErrors); if (!nextErrors.length) setConfirmOpen(true); }
  function confirm() { try { const created = saveProductionInspectionBatch(rows, organizationId, organizationName, userName); onSubmitted(created.length); } catch (error) { setErrors([error instanceof Error ? error.message : "批量提交失败"]); setConfirmOpen(false); } }
  async function selectAttachment(index: number, file?: File) { if (!file) return; try { const attachment = await readLocalAttachment(file); updateRow(index, { attachmentName: attachment.name, attachmentDataUrl: attachment.dataUrl }); setAttachmentError(""); } catch (error) { setAttachmentError(error instanceof Error ? error.message : "文件读取失败"); } }
  return <div className="dialog-backdrop"><section className="review-dialog batch-production-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-production-title"><header><h2 id="batch-production-title">批量新增生产检验日报</h2><button aria-label="关闭批量新增弹窗" onClick={onClose}><X size={21} /></button></header><div className="dialog-body batch-dialog-body">{errors.length > 0 && <div className="form-submit-error" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}<p className="form-hint">一次最多提交20行；复制行会清空附件，全部校验通过后需要二次确认。</p><div className="batch-row-list">{rows.map((row, index) => <div className="batch-row-card" key={row.id}><div className="batch-row-head"><strong>第 {index + 1} 行</strong><span>不良数量 {batchDefectQty(row)} · 不良率 {Number(row.inspectionQty) ? (batchDefectQty(row) / Number(row.inspectionQty) * 100).toFixed(2) : "0.00"}%</span><button className="table-action" type="button" onClick={() => copyRow(index)} disabled={rows.length >= 20}>复制</button><button className="table-action danger-text" type="button" onClick={() => setRows((current) => current.length > 1 ? current.filter((_, rowIndex) => rowIndex !== index) : current)}>删除</button></div><div className="batch-grid"><label>检验时间<input aria-label={`检验时间第${index + 1}行`} type="date" value={row.businessDate} onChange={(event) => updateRow(index, { businessDate: event.target.value })} /></label><label>检验工序<input aria-label={`检验工序第${index + 1}行`} value={row.inspectionProcess} onChange={(event) => updateRow(index, { inspectionProcess: event.target.value })} /></label><label>产品名称<input aria-label={`产品名称第${index + 1}行`} value={row.productName} onChange={(event) => updateRow(index, { productName: event.target.value })} /></label><label>物料料号<input aria-label={`物料料号第${index + 1}行`} value={row.materialNo} onChange={(event) => updateRow(index, { materialNo: event.target.value })} /></label><label>产品型号<input aria-label={`产品型号第${index + 1}行`} value={row.productModel} onChange={(event) => updateRow(index, { productModel: event.target.value })} /></label><label>订单号<input aria-label={`订单号第${index + 1}行`} value={row.orderNo} onChange={(event) => updateRow(index, { orderNo: event.target.value })} /></label><label>订单数量<input aria-label={`订单数量第${index + 1}行`} type="number" min="0" value={row.orderQty} onChange={(event) => updateRow(index, { orderQty: event.target.value === "" ? "" : Number(event.target.value) })} /></label><label>投入数量<input aria-label={`投入数量第${index + 1}行`} type="number" min="0" value={row.inputQty} onChange={(event) => updateRow(index, { inputQty: event.target.value === "" ? "" : Number(event.target.value) })} /></label><label>检验数量<input aria-label={`检验数量第${index + 1}行`} type="number" min="0" value={row.inspectionQty} onChange={(event) => updateRow(index, { inspectionQty: event.target.value === "" ? "" : Number(event.target.value) })} /></label><label>不良数量<input aria-label={`不良数量第${index + 1}行`} readOnly value={batchDefectQty(row)} /></label><label className="batch-attachment">附件<input aria-label={`附件第${index + 1}行`} type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(event) => void selectAttachment(index, event.target.files?.[0])} /><span>{row.attachmentName || "未上传"}</span></label><label>备注<input aria-label={`备注第${index + 1}行`} value={row.remark} onChange={(event) => updateRow(index, { remark: event.target.value })} /></label></div><div className="batch-row-actions"><button className="secondary-button" type="button" onClick={() => setDefectRowIndex(index)}>维护不良明细（{row.defectDetails.length}项）</button>{attachmentError && <em className="field-error">{attachmentError}</em>}</div></div>)}</div><button className="secondary-button" type="button" onClick={addRow} disabled={rows.length >= 20}>新增一行（{rows.length}/20）</button></div><footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-small" onClick={submitBatch}>校验并提交</button></footer></section>{defectRowIndex !== undefined && <BatchDefectDialog row={rows[defectRowIndex]} onClose={() => setDefectRowIndex(undefined)} onSave={(details) => { updateRow(defectRowIndex, { defectDetails: details }); setDefectRowIndex(undefined); }} />}{confirmOpen && <div className="dialog-backdrop"><section className="review-dialog batch-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-confirm-title"><header><h2 id="batch-confirm-title">确认批量提交</h2></header><div className="dialog-body"><div className="cancel-warning"><strong>本次将提交 {rows.length} 条记录</strong><span>确认后将直接归档，不能在本弹窗内撤回。</span></div></div><footer><button className="secondary-button" onClick={() => setConfirmOpen(false)}>返回修改</button><button className="primary-small" onClick={confirm}>确认提交</button></footer></section></div>}</div>;
}

function DirectBusinessFormPage({ type }: { type: DirectBusinessType }) {
  const navigate = useNavigate(); const session = readDemoSession(); const organizationId = session?.organizationId ?? factoryOrganizationId; const organizationName = session?.organizationName ?? roleProfiles.factory.organization; const userName = session?.userName ?? roleProfiles.factory.user; const allRecords = readDirectBusinessRecords();
  const initialSourceId = new URLSearchParams(useLocation().search).get("sourceInspectionId") || "";
  const initialSource = allRecords.find((record) => record.id === initialSourceId && record.businessType === "production_inspection" && record.factoryOrganizationId === organizationId);
  const [draft, setDraft] = useState<Partial<DirectBusinessRecord>>(() => ({ businessDate: "2026-08-13", materialNo: initialSource?.materialNo || "", productName: initialSource?.productName || "", productModel: initialSource?.productModel || "", orderNo: "", orderQty: 0, inputQty: 0, inspectionQty: 0, defectQty: 0, inspectionProcess: "一检", defectDetails: [], repairDetails: [{ id: `repair-draft-${Date.now()}`, sourceProductionInspectionId: initialSource?.id || "", sourceProductionInspectionNo: initialSource?.businessNo || "", sourceDefectItemId: "", inspectionProcess: initialSource?.inspectionProcess || "", defect: "", quantity: 0, cause: "", method: "", repairer: userName }], teamLine: "", issueReporter: userName, issueDescription: "", responsibleDepartment: "", improvementMeasure: "", issueLocation: "", qualityFollower: "", progress: "pending", attachmentName: "", remark: "" }));
  const [error, setError] = useState(""); const [attachmentError, setAttachmentError] = useState("");
  const defectDetails = Array.isArray(draft.defectDetails) ? draft.defectDetails : [];
  const derivedDefectQty = defectDetails.reduce((total, item) => total + Math.max(0, Number(item.quantity || 0)), 0);
  const repairDetails = Array.isArray(draft.repairDetails) ? draft.repairDetails : [];
  const eligibleSources = allRecords.filter((record) => record.businessType === "production_inspection" && record.factoryOrganizationId === organizationId && normalizedDefectDetails(record.defectDetails).length > 0);
  const firstRepairSource = allRecords.find((record) => record.id === repairDetails.find((detail) => detail.sourceProductionInspectionId)?.sourceProductionInspectionId);
  const sourceProductKey = firstRepairSource ? directProductKey(firstRepairSource) : "";
  const sourceOptions = eligibleSources.filter((record) => !sourceProductKey || directProductKey(record) === sourceProductKey);
  const libraryItems = type === "production_inspection" ? getAvailableDefectLibraryItems(organizationId, { materialNo: String(draft.materialNo || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || "") }) : [];
  function update(key: keyof DirectBusinessRecord, value: unknown) { setDraft((current) => ({ ...current, [key]: value })); }
  function updateDefect(index: number, patch: Partial<DefectDetail>) { setDraft((current) => ({ ...current, defectDetails: (Array.isArray(current.defectDetails) ? current.defectDetails : []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) })); }
  function addDefect() { setDraft((current) => ({ ...current, defectDetails: [...(Array.isArray(current.defectDetails) ? current.defectDetails : []), { id: `defect-draft-${Date.now()}`, defect: "", quantity: 0 }] })); }
  function removeDefect(index: number) { setDraft((current) => ({ ...current, defectDetails: (Array.isArray(current.defectDetails) ? current.defectDetails : []).filter((_, itemIndex) => itemIndex !== index) })); }
  function updateRepair(index: number, patch: Partial<RepairDetail>) {
    setDraft((current) => {
      const details = (Array.isArray(current.repairDetails) ? current.repairDetails : []) as RepairDetail[];
      let next = details.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
      const selected = allRecords.find((record) => record.id === next[index]?.sourceProductionInspectionId);
      if (selected && patch.sourceProductionInspectionId !== undefined) next = next.map((item, itemIndex) => itemIndex === index ? { ...item, sourceProductionInspectionNo: selected.businessNo, sourceDefectItemId: "", inspectionProcess: selected.inspectionProcess || "", defect: "" } : item);
      const firstSourceId = next.find((item) => item.sourceProductionInspectionId)?.sourceProductionInspectionId;
      const firstSource = allRecords.find((record) => record.id === firstSourceId);
      return { ...current, materialNo: firstSource?.materialNo || "", productName: firstSource?.productName || "", productModel: firstSource?.productModel || "", repairDetails: next };
    });
  }
  function addRepair() { setDraft((current) => ({ ...current, repairDetails: [...(Array.isArray(current.repairDetails) ? current.repairDetails : []), { id: `repair-draft-${Date.now()}`, sourceProductionInspectionId: "", sourceProductionInspectionNo: "", sourceDefectItemId: "", inspectionProcess: "", defect: "", quantity: 0, cause: "", method: "", repairer: userName }] })); }
  function removeRepair(index: number) { setDraft((current) => ({ ...current, repairDetails: (Array.isArray(current.repairDetails) ? current.repairDetails : []).filter((_, itemIndex) => itemIndex !== index) })); }
  async function selectAttachment(file?: File) { if (!file) return; try { const attachment = await readLocalAttachment(file); update("attachmentName", attachment.name); update("attachmentDataUrl", attachment.dataUrl); setAttachmentError(""); } catch (reason) { setAttachmentError(reason instanceof Error ? reason.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Number(draft.inputQty || 0); const inspection = Number(draft.inspectionQty || 0); const defect = type === "production_inspection" ? derivedDefectQty : Number(draft.defectQty || 0); const now = "2026-08-13 17:00"; const id = `direct-${type}-${Date.now()}`;
    if (type === "production_inspection") {
      if (inspection > input || defect > inspection) { setError("检验数量和不良数量必须符合数量关系"); return; }
      const details = defectDetails.map((item) => ({ ...item, defect: item.defect.trim(), quantity: Number(item.quantity || 0) })).filter((item) => item.defect || item.quantity);
      if (details.some((item) => !item.defect || item.quantity <= 0 || !Number.isInteger(item.quantity))) { setError("不良明细必须填写不良项和正整数数量"); return; }
      if (new Set(details.map((item) => item.defect.toLocaleLowerCase())).size !== details.length) { setError("同一张生产检验日报中不良项不能重复"); return; }
      const existingLibrary = getAvailableDefectLibraryItems(organizationId, { materialNo: String(draft.materialNo || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || "") });
      const recordDetails = details.map((item, index) => { const existing = existingLibrary.find((library) => library.defect.toLocaleLowerCase() === item.defect.toLocaleLowerCase()); return { ...item, id: item.id || `defect-${Date.now()}-${index}`, libraryItemId: existing?.id || item.libraryItemId || `defect-library-${Date.now()}-${index}` }; });
      const newLibraryItems = recordDetails.filter((item) => !existingLibrary.some((library) => library.id === item.libraryItemId)).map((item) => ({ id: item.libraryItemId!, organizationId, productKey: directProductKey({ materialNo: String(draft.materialNo || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || "") }), materialNo: String(draft.materialNo || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || ""), defect: item.defect, quantity: item.quantity }));
      const record: DirectBusinessRecord = { id, version: 1, businessNo: createDirectBusinessNo(type, allRecords), businessType: type, status: "completed", factoryOrganizationId: organizationId, factoryOrganization: organizationName, businessDate: String(draft.businessDate), materialNo: String(draft.materialNo || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || ""), orderNo: draft.orderNo ? String(draft.orderNo) : undefined, orderQty: Number(draft.orderQty || 0), inputQty: input, inspectionQty: inspection, defectQty: defect, inspectionProcess: draft.inspectionProcess ? String(draft.inspectionProcess) : undefined, defectDetails: recordDetails, attachmentName: String(draft.attachmentName || ""), attachmentDataUrl: draft.attachmentDataUrl ? String(draft.attachmentDataUrl) : undefined, remark: String(draft.remark || ""), flowRecords: [{ id: `${id}-flow`, kind: "submitted", action: `提交${directBusinessLabels[type]}并直接归档`, time: now, operator: userName, organization: organizationName }], createdAt: now, updatedAt: now };
      try { saveProductionInspectionWithDefectLibrary(record, newLibraryItems); navigate(`${directBusinessPath("factory", type)}/${record.id}`); } catch (reason) { setError(reason instanceof Error ? reason.message : "提交失败，请重试"); }
      return;
    }
    if (type === "maintenance_record") {
      const validation = validateRepairDetails(repairDetails, allRecords, organizationId); if (validation) { setError(validation); return; }
      const record: DirectBusinessRecord = { id, version: 1, businessNo: createDirectBusinessNo(type, allRecords), businessType: type, status: "completed", factoryOrganizationId: organizationId, factoryOrganization: organizationName, businessDate: String(draft.businessDate), materialNo: String(draft.materialNo || firstRepairSource?.materialNo || ""), productName: String(draft.productName || firstRepairSource?.productName || ""), productModel: String(draft.productModel || firstRepairSource?.productModel || ""), repairDetails, attachmentName: String(draft.attachmentName || ""), attachmentDataUrl: draft.attachmentDataUrl ? String(draft.attachmentDataUrl) : undefined, remark: String(draft.remark || ""), flowRecords: [{ id: `${id}-flow`, kind: "submitted", action: `提交${directBusinessLabels[type]}并直接归档`, time: now, operator: userName, organization: organizationName }], createdAt: now, updatedAt: now };
      saveDirectBusinessRecord(record); navigate(`${directBusinessPath("factory", type)}/${record.id}`); return;
    }
    if (!draft.issueDescription?.trim()) { setError("请填写巡线事项描述"); return; }
    const record: DirectBusinessRecord = { id, version: 1, businessNo: createDirectBusinessNo(type, allRecords), businessType: type, status: "completed", factoryOrganizationId: organizationId, factoryOrganization: organizationName, businessDate: String(draft.businessDate), materialNo: String(draft.materialNo || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || ""), teamLine: draft.teamLine ? String(draft.teamLine) : undefined, issueReporter: draft.issueReporter ? String(draft.issueReporter) : undefined, issueDescription: String(draft.issueDescription), responsibleDepartment: draft.responsibleDepartment ? String(draft.responsibleDepartment) : undefined, improvementMeasure: draft.improvementMeasure ? String(draft.improvementMeasure) : undefined, issueLocation: draft.issueLocation ? String(draft.issueLocation) : undefined, qualityFollower: draft.qualityFollower ? String(draft.qualityFollower) : undefined, progress: draft.progress as DirectBusinessRecord["progress"], attachmentName: String(draft.attachmentName || ""), attachmentDataUrl: draft.attachmentDataUrl ? String(draft.attachmentDataUrl) : undefined, remark: String(draft.remark || ""), flowRecords: [{ id: `${id}-flow`, kind: "submitted", action: `提交${directBusinessLabels[type]}并直接归档`, time: now, operator: userName, organization: organizationName }], createdAt: now, updatedAt: now };
    saveDirectBusinessRecord(record); navigate(`${directBusinessPath("factory", type)}/${record.id}`);
  }
  const field = (label: string, key: keyof DirectBusinessRecord, required = false, typeHint = "text", readOnly = false) => <label><span className="form-field-label">{required && <em>*</em>}{label}</span><input aria-label={label} required={required} type={typeHint} readOnly={readOnly} value={String(draft[key] ?? "")} onChange={(e) => update(key, typeHint === "number" ? Number(e.target.value) : e.target.value)} /></label>;
  return <BusinessFormLayout title={`新增${directBusinessLabels[type]}`} onBack={() => navigate(directBusinessPath("factory", type))} onSubmit={submit} submitLabel="提交并归档">
    <BusinessFormSection title="基础信息"><div className="form-grid">{field("业务时间", "businessDate", true, "date")}{field("物料料号", "materialNo", type !== "ipqc_patrol", "text", type === "maintenance_record")}{field("产品名称", "productName", type === "production_inspection", "text", type === "maintenance_record")}{field("产品型号", "productModel", type === "production_inspection", "text", type === "maintenance_record")}</div></BusinessFormSection>
    {type === "production_inspection" && <><BusinessFormSection title="订单与检验信息"><div className="form-grid">{field("订单号", "orderNo", true)}{field("订单数量", "orderQty", true, "number")}{field("投入数量", "inputQty", true, "number")}{field("检验数量", "inspectionQty", true, "number")}<label><span className="form-field-label"><em>*</em>不良数量（自动汇总）</span><input aria-label="不良数量" type="number" readOnly value={derivedDefectQty} /></label>{field("检验工序", "inspectionProcess", true)}</div></BusinessFormSection><BusinessFormSection title="不良明细"><div className="structured-form-list">{defectDetails.map((item, index) => <div className="structured-form-row defect-row" key={item.id}><label><span className="form-field-label"><em>*</em>不良项</span><input aria-label={`不良项第${index + 1}项`} list={`defect-library-${index}`} value={item.defect} onChange={(e) => updateDefect(index, { defect: e.target.value })} /><datalist id={`defect-library-${index}`}>{libraryItems.map((library) => <option key={library.id} value={library.defect}>{library.quantity}</option>)}</datalist></label><label><span className="form-field-label"><em>*</em>数量</span><input aria-label={`不良数量第${index + 1}项`} type="number" min="1" step="1" value={item.quantity || ""} onChange={(e) => updateDefect(index, { quantity: Number(e.target.value) })} /></label><button type="button" className="table-action" onClick={() => removeDefect(index)}>删除</button></div>)}<button type="button" className="secondary-button" onClick={addDefect}>+ 新增不良项</button>{defectDetails.length === 0 && <p className="form-hint">可选择当前组织当前产品的不良明细库项目，也可直接新增不良项。</p>}</div></BusinessFormSection></>}
    {type === "maintenance_record" && <BusinessFormSection title="维修明细"><div className="form-grid single-column"><div className="locked-source-fields"><span>来源日报带入的产品信息</span><strong>{firstRepairSource ? `${firstRepairSource.materialNo} / ${firstRepairSource.productName} / ${firstRepairSource.productModel}` : "选择来源日报后自动带入并锁定"}</strong></div>{repairDetails.map((item, index) => { const source = allRecords.find((record) => record.id === item.sourceProductionInspectionId); const sourceDefects = source ? normalizedDefectDetails(source.defectDetails) : []; const historical = source && item.sourceDefectItemId ? getHistoricalRepairQuantity(allRecords, source.id, item.sourceDefectItemId) : 0; return <div className="structured-form-row repair-row" key={item.id}><label><span className="form-field-label"><em>*</em>来源生产检验日报</span><select aria-label={`来源生产检验日报第${index + 1}项`} value={item.sourceProductionInspectionId} onChange={(e) => updateRepair(index, { sourceProductionInspectionId: e.target.value })}><option value="">请选择来源日报</option>{sourceOptions.map((option) => <option key={option.id} value={option.id}>{option.businessNo} · {option.productName} · {option.businessDate}</option>)}</select></label><label><span className="form-field-label">检验工序（自动带入）</span><input aria-label={`检验工序第${index + 1}项`} value={item.inspectionProcess} readOnly /></label><label><span className="form-field-label"><em>*</em>不良项</span><select aria-label={`维修不良项第${index + 1}项`} value={item.sourceDefectItemId} disabled={!source} onChange={(e) => { const selectedDefect = sourceDefects.find((defectItem) => defectItem.id === e.target.value); updateRepair(index, { sourceDefectItemId: e.target.value, defect: selectedDefect?.defect || "" }); }}><option value="">请选择不良项</option>{sourceDefects.map((defectItem) => <option key={defectItem.id} value={defectItem.id}>{defectItem.defect}（来源 {defectItem.quantity}，剩余 {Math.max(0, defectItem.quantity - getHistoricalRepairQuantity(allRecords, source?.id || "", defectItem.id))}）</option>)}</select></label><label><span className="form-field-label"><em>*</em>数量</span><input aria-label={`维修数量第${index + 1}项`} type="number" min="1" step="1" value={item.quantity || ""} onChange={(e) => updateRepair(index, { quantity: Number(e.target.value) })} /><small className="form-hint">该不良项历史已维修 {historical}</small></label><label><span className="form-field-label"><em>*</em>不良原因</span><input aria-label={`不良原因第${index + 1}项`} value={item.cause} onChange={(e) => updateRepair(index, { cause: e.target.value })} /></label><label><span className="form-field-label"><em>*</em>维修方法</span><input aria-label={`维修方法第${index + 1}项`} value={item.method} onChange={(e) => updateRepair(index, { method: e.target.value })} /></label><label><span className="form-field-label"><em>*</em>维修人</span><input aria-label={`维修人第${index + 1}项`} value={item.repairer} onChange={(e) => updateRepair(index, { repairer: e.target.value })} /></label><button type="button" className="table-action" onClick={() => removeRepair(index)}>删除此行</button></div>; })}<div className="structured-form-actions"><button type="button" className="secondary-button" onClick={addRepair}>+ 新增维修明细</button><span className="form-hint">同一日报同一不良项可分多张维修记录陆续提交，但累计不得超过来源数量。</span></div></div></BusinessFormSection>}
    {type === "ipqc_patrol" && <BusinessFormSection title="巡线问题信息"><div className="form-grid">{field("班组/线体", "teamLine", true)}{field("问题提出者", "issueReporter", true)}{field("责任部门", "responsibleDepartment", true)}{field("问题定位", "issueLocation", true)}{field("质量跟进人", "qualityFollower", true)}<label><span className="form-field-label"><em>*</em>巡线事项描述</span><textarea aria-label="巡线事项描述" required value={String(draft.issueDescription || "")} onChange={(e) => update("issueDescription", e.target.value)} /></label><label><span className="form-field-label">改善措施</span><textarea aria-label="改善措施" value={String(draft.improvementMeasure || "")} onChange={(e) => update("improvementMeasure", e.target.value)} /></label></div></BusinessFormSection>}
    <BusinessFormSection title="附件与备注"><div className="form-grid single-column"><label><span className="form-field-label">附件</span><span className="file-input file-upload-zone"><input aria-label={`${directBusinessLabels[type]}附件`} type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void selectAttachment(e.target.files?.[0])} /><span><Upload size={28} /><strong>{draft.attachmentName || "点击或拖拽文件到此区域上传"}</strong><small>支持图片、Office、PDF、压缩包，单文件最大10MB</small></span></span>{attachmentError && <em className="field-error">{attachmentError}</em>}</label><label><span className="form-field-label">备注</span><textarea aria-label="备注" maxLength={500} value={String(draft.remark || "")} onChange={(e) => update("remark", e.target.value)} /></label></div></BusinessFormSection>{error && <div className="form-submit-error" role="alert">{error}</div>}
  </BusinessFormLayout>;
}

function DirectBusinessDetailPage({ role, type }: { role: "factory" | "platform"; type: DirectBusinessType }) {
  const navigate = useNavigate(); const { id = "" } = useParams(); const record = getDirectBusinessRecord(id); const path = directBusinessPath(role, type); const session = readDemoSession(); if (!record || !session || !canAccessOrganizationRecord(role, session.organizationId, record)) return <Navigate to={path} replace />;
  const defects = normalizedDefectDetails(record.defectDetails);
  const productionOrderFields = type === "production_inspection" ? <><div><span>订单号</span><strong>{record.orderNo || "—"}</strong></div><div><span>订单数量</span><strong>{Number(record.orderQty || 0).toLocaleString()}</strong></div><div><span>投入数量</span><strong>{Number(record.inputQty || 0).toLocaleString()}</strong></div></> : null;
  return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(path)}><ArrowLeft size={16} />返回</button><h1>{record.businessNo} · {directBusinessLabels[type]}</h1><span className="status approved">已完成</span></div>{role === "factory" && type === "production_inspection" && defects.length > 0 && <div className="detail-title-actions"><button className="primary-small" onClick={() => navigate(`/app/factory/maintenance-record/new?sourceInspectionId=${record.id}`)}>新增维修记录</button></div>}</div><div className="detail-sections"><DetailSection title="基本信息"><div className="detail-grid"><div><span>提报组织</span><strong>{record.factoryOrganization}</strong></div><div><span>业务时间</span><strong>{record.businessDate}</strong></div><div><span>提报时间</span><strong>{record.createdAt}</strong></div></div></DetailSection><DetailSection title="业务信息"><div className="detail-grid"><div><span>物料料号</span><strong>{record.materialNo || "—"}</strong></div><div><span>产品名称</span><strong>{record.productName || "—"}</strong></div><div><span>产品型号</span><strong>{record.productModel || "—"}</strong></div>{productionOrderFields}{type === "production_inspection" && <><div><span>检验工序</span><strong>{record.inspectionProcess}</strong></div><div><span>检验数量</span><strong>{Number(record.inspectionQty || 0).toLocaleString()}</strong></div><div><span>不良数量 / 不良率</span><strong>{record.defectQty} / {record.inspectionQty ? ((record.defectQty || 0) / record.inspectionQty * 100).toFixed(2) : "0.00"}%</strong></div></>}{type === "ipqc_patrol" && <><div><span>处理进度</span><strong>{record.progress === "processing" ? "处理中" : record.progress === "completed" ? "已完成" : "待处理"}</strong></div><div className="wide"><span>巡线事项描述</span><strong>{record.issueDescription}</strong></div><div><span>责任部门</span><strong>{record.responsibleDepartment}</strong></div></>}</div></DetailSection>{type === "production_inspection" && <DetailSection title="不良明细"><div className="structured-detail-list">{defects.length ? defects.map((item) => <div key={item.id}><strong>{item.defect}</strong><span>数量：{item.quantity}</span></div>) : <p className="detail-copy">无不良明细</p>}</div></DetailSection>}{type === "maintenance_record" && <DetailSection title="维修明细"><div className="structured-detail-list repair-detail-list">{(record.repairDetails || []).map((item) => <div key={item.id}><Link to={`/app/${role === "platform" ? "platform/business" : "factory"}/production-inspection-daily/${item.sourceProductionInspectionId}`}>{item.sourceProductionInspectionNo || "来源日报"}</Link><strong>{item.inspectionProcess} · {item.defect} · {item.quantity}</strong><span>原因：{item.cause}；方法：{item.method}；维修人：{item.repairer}</span></div>)}</div></DetailSection>}<DetailSection title="附件"><div className="detail-grid single-row"><div><span>{directBusinessLabels[type]}附件</span><strong>{record.attachmentName ? record.attachmentDataUrl ? <button className="table-action" type="button" onClick={() => downloadLocalAttachment({ name: record.attachmentName, dataUrl: record.attachmentDataUrl! })}>下载 {record.attachmentName}</button> : record.attachmentName : "未上传"}</strong></div></div></DetailSection><DetailSection title="备注"><p className="detail-copy">{record.remark || "—"}</p></DetailSection><FlowTimeline records={record.flowRecords} /></div></div>;
}

function auditedStatusLabel(status: AuditedBusinessStatus): string { return { pending_review: "待审核", rejected: "已驳回", pending_return: "待退回", pending_replenish: "待补回", completed: "已完成", approved: "已通过", cancelled: "已取消" }[status]; }
function auditedStatusClass(status: AuditedBusinessStatus): string { return status === "approved" || status === "completed" ? "approved" : status === "rejected" ? "rejected" : status === "cancelled" ? "cancelled" : status === "pending_return" || status === "pending_replenish" ? "warning" : "pending"; }

function AuditedBusinessListPage({ role, type }: { role: "factory" | "platform"; type: AuditedBusinessType }) {
  const navigate = useNavigate(); const { search } = useLocation();
  const params = new URLSearchParams(search);
  const qualifiedType = params.get("qualifiedType");
  const range = role === "platform" ? metricRangeFromSearch(params) : undefined;
  const organizationId = readDemoSession()?.organizationId ?? factoryOrganizationId; const root = auditedBusinessPath(role, type);
  const records = readAuditedBusinessRecords().filter((item) => item.businessType === type && (role === "platform" || item.factoryOrganizationId === organizationId) && (!qualifiedType || item.qualifiedType === qualifiedType)
    && (!range || (metricDateMatches(item.businessDate, { range }) && metricEntityMatches(item, { organizationId: params.get("organizationId") ?? undefined, materialNo: params.get("material") ?? undefined }))));
  const permissionResource = auditedBusinessPermissionResources[type];
  const canSubmit = role === "factory" && hasCurrentMerchantPermission(`merchant.business.${permissionResource}.submit`);
  const exportRows = records.map((record) => [record.businessNo, record.factoryOrganization, record.materialNo, record.productName, record.orderNo, record.businessDate, auditedStatusLabel(record.status)]);
  const listActions = <div className="list-page-actions">{role === "factory" && <MerchantBusinessExportButton permissionCode={`merchant.business.${permissionResource}.export`} filename={auditedBusinessLabels[type]} headers={["业务编号", "提报组织", "物料料号", "产品名称", "订单号", "业务时间", "状态"]} rows={exportRows} />}{canSubmit && <button className="primary-small" onClick={() => navigate(`${root}/new`)}>新增{auditedBusinessLabels[type]}</button>}</div>;
  const isInboundReport = (value: AuditedBusinessType): boolean => value === "inbound_report";
  if (isInboundReport(type)) return <div className="page-stack"><div className="page-heading heading-with-filters"><div><p>{role === "platform" ? "业务管理" : "工厂管理"}</p><h1>{auditedBusinessLabels[type]}</h1><span>入库合格类型为不合格时提交后直接完成，合格时进入平台审核。</span></div>{listActions}</div><section className="list-summary"><div><strong>{records.length}</strong><span>全部记录</span></div><div><strong>{records.filter((item) => item.status === "pending_review").length}</strong><span>待审核</span></div><div><strong>{records.filter((item) => item.status === "approved" || item.status === "completed").length}</strong><span>已完成/通过</span></div></section><section className="work-card shipment-list-card"><header><div><h2>{auditedBusinessLabels[type]}列表</h2><p>按提报时间倒序展示</p></div><span className="list-count">共 {records.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th>{role === "platform" && <th>提报组织</th>}<th>物料料号</th><th>产品名称</th><th>产品型号</th><th>订单号</th><th>入库数量</th><th>入库合格类型</th><th>附件</th><th>备注</th><th>业务时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link to={`${root}/${record.id}`}>{record.businessNo}</Link></td>{role === "platform" && <td>{record.factoryOrganization}</td>}<td>{record.materialNo || "—"}</td><td>{record.productName || "—"}</td><td>{record.productModel || "—"}</td><td>{record.orderNo || "—"}</td><td>{Number(record.inboundQty || 0).toLocaleString()}</td><td>{record.qualifiedType === "qualified" ? "合格" : "不合格"}</td><td>{record.attachmentName || "未上传"}</td><td title={record.remark || undefined}>{record.remark || "—"}</td><td>{record.businessDate}</td><td><span className={`status ${auditedStatusClass(record.status)}`}>{auditedStatusLabel(record.status)}</span></td><td><Link className="table-action" to={`${root}/${record.id}`}>查看详情</Link></td></tr>)}</tbody></table></div></section></div>;
  return <div className="page-stack"><div className="page-heading heading-with-filters"><div><p>{role === "platform" ? "业务管理" : "工厂管理"}</p><h1>{auditedBusinessLabels[type]}</h1><span>{type === "inbound_report" ? "入库合格类型为不合格时提交后直接完成，合格时进入平台审核。" : type === "sporadic_return" ? "提交后进入平台审核，审核通过后完成退料和补回流程。" : "提交后进入平台审核，驳回后可修改并重新提报。"}</span></div>{listActions}</div><section className="list-summary"><div><strong>{records.length}</strong><span>全部记录</span></div><div><strong>{records.filter((item) => item.status === "pending_review").length}</strong><span>待审核</span></div><div><strong>{records.filter((item) => item.status === "approved" || item.status === "completed").length}</strong><span>已完成/通过</span></div></section><section className="work-card shipment-list-card"><header><div><h2>{auditedBusinessLabels[type]}列表</h2><p>按提报时间倒序展示</p></div><span className="list-count">共 {records.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th>{role === "platform" && <th>提报组织</th>}<th>{type === "trial_summary" ? "订单号" : type === "inbound_report" ? "订单号" : "物料料号"}</th><th>{type === "sporadic_return" ? "退料原因" : type === "inbound_report" ? "入库数量" : "试产信息"}</th><th>业务时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link to={`${root}/${record.id}`}>{record.businessNo}</Link></td>{role === "platform" && <td>{record.factoryOrganization}</td>}<td>{type === "trial_summary" || type === "inbound_report" ? record.orderNo : record.materialNo}</td><td>{type === "sporadic_return" ? record.returnReason : type === "inbound_report" ? record.inboundQty : record.trialInfo.slice(0, 30)}</td><td>{record.businessDate}</td><td><span className={`status ${auditedStatusClass(record.status)}`}>{auditedStatusLabel(record.status)}</span></td><td><Link className="table-action" to={`${root}/${record.id}`}>查看详情</Link></td></tr>)}</tbody></table></div></section></div>;
}

function AuditedBusinessFormPage({ type }: { type: AuditedBusinessType }) {
  const navigate = useNavigate(); const { id = "" } = useParams(); const existing = id ? getAuditedBusinessRecord(id) : undefined; const session = readDemoSession(); const organizationId = session?.organizationId ?? factoryOrganizationId; const organizationName = session?.organizationName ?? roleProfiles.factory.organization; const userName = session?.userName ?? roleProfiles.factory.user; const [error, setError] = useState(""); const [attachmentError, setAttachmentError] = useState("");
  const [draft, setDraft] = useState<Partial<AuditedBusinessRecord>>(() => existing ? { ...existing } : { businessDate: "2026-08-13", materialNo: "", materialName: "", materialModel: "", productName: "", productModel: "", orderNo: "", orderQty: 0, assemblyQty: 0, inboundQty: 0, returnReason: "", returnQty: 0, qualifiedType: "qualified", trialInfo: "", attachmentName: "", remark: "" });
  function update(key: keyof AuditedBusinessRecord, value: unknown) { setDraft((current) => ({ ...current, [key]: value })); }
  async function selectAttachment(file?: File) { if (!file) return; try { const attachment = await readLocalAttachment(file); update("attachmentName", attachment.name); update("attachmentDataUrl", attachment.dataUrl); setAttachmentError(""); } catch (reason) { setAttachmentError(reason instanceof Error ? reason.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (type === "sporadic_return" && (!draft.returnReason?.trim() || Number(draft.returnQty || 0) <= 0)) { setError("请填写退料原因和退料数量"); return; } if (type === "inbound_report" && (!draft.orderNo?.trim() || Number(draft.inboundQty || 0) <= 0)) { setError("请填写订单号和入库数量"); return; } if (type === "trial_summary" && !draft.trialInfo?.trim()) { setError("请填写试产及生产总结"); return; } const now = "2026-08-17 10:00"; const status: AuditedBusinessStatus = type === "inbound_report" && draft.qualifiedType === "unqualified" ? "completed" : "pending_review"; const record: AuditedBusinessRecord = { id: existing?.id ?? `audited-${type}-${Date.now()}`, version: existing?.version ?? 1, businessNo: existing?.businessNo ?? createAuditedBusinessNo(type), businessType: type, status, factoryOrganizationId: existing?.factoryOrganizationId ?? organizationId, factoryOrganization: existing?.factoryOrganization ?? organizationName, businessDate: String(draft.businessDate || "2026-08-17"), materialNo: String(draft.materialNo || ""), materialName: type === "sporadic_return" ? String(draft.materialName || "") : "", materialModel: String(draft.materialModel || ""), productName: String(draft.productName || ""), productModel: String(draft.productModel || ""), orderNo: String(draft.orderNo || ""), orderQty: Number(draft.orderQty || 0), assemblyQty: Number(draft.assemblyQty || 0), inboundQty: Number(draft.inboundQty || 0), returnReason: String(draft.returnReason || ""), returnQty: Number(draft.returnQty || 0), qualifiedType: draft.qualifiedType === "unqualified" ? "unqualified" : "qualified", trialInfo: String(draft.trialInfo || ""), attachmentName: String(draft.attachmentName || ""), attachmentDataUrl: draft.attachmentDataUrl ? String(draft.attachmentDataUrl) : undefined, courierNo: existing?.courierNo, returnDate: existing?.returnDate, replenishDate: existing?.replenishDate, remark: String(draft.remark || ""), reviewReason: undefined, cancelReason: undefined, flowRecords: [...(existing?.flowRecords ?? []), { id: `${existing?.id ?? `audited-${type}-${Date.now()}`}-submitted-${Date.now()}`, kind: existing ? "resubmitted" : "submitted", action: existing ? `修改并重新提报${auditedBusinessLabels[type]}` : `提交${auditedBusinessLabels[type]}`, time: now, operator: userName, organization: organizationName }], createdAt: existing?.createdAt ?? now, updatedAt: now }; saveAuditedBusinessRecord(record, existing?.version); navigate(`${auditedBusinessPath("factory", type)}/${record.id}`); }
  const field = (label: string, key: keyof AuditedBusinessRecord, required = false, inputType = "text") => <label><span className="form-field-label">{required && <em>*</em>}{label}</span><input aria-label={label} required={required} type={inputType} value={String(draft[key] ?? "")} onChange={(e) => update(key, inputType === "number" ? Number(e.target.value) : e.target.value)} /></label>;
  return <BusinessFormLayout title={`${existing ? "修改并重新提报" : "新增"}${auditedBusinessLabels[type]}`} onBack={() => navigate(auditedBusinessPath("factory", type))} onSubmit={submit} submitLabel="提交"><BusinessFormSection title="基础信息"><div className="form-grid">{field(type === "inbound_report" ? "入库时间" : type === "trial_summary" ? "试产时间" : "发起退料时间", "businessDate", true, "date")}{field("物料料号", "materialNo", type !== "trial_summary")}{type === "sporadic_return" && field("物料名称", "materialName", true)}{field("产品名称", "productName", type !== "inbound_report")}{field("产品型号", "productModel")}</div></BusinessFormSection>{type === "sporadic_return" && <BusinessFormSection title="退料信息"><div className="form-grid">{field("组装总数", "assemblyQty", false, "number")}{field("退料数量", "returnQty", true, "number")}{field("退料原因", "returnReason", true)}</div></BusinessFormSection>}{type === "inbound_report" && <BusinessFormSection title="入库信息"><div className="form-grid">{field("订单号", "orderNo", true)}{field("订单数量", "orderQty", true, "number")}{field("入库数量", "inboundQty", true, "number")}<label><span className="form-field-label"><em>*</em>入库合格类型</span><select aria-label="入库合格类型" required value={draft.qualifiedType as string} onChange={(e) => update("qualifiedType", e.target.value)}><option value="qualified">合格</option><option value="unqualified">不合格</option></select></label></div></BusinessFormSection>}{type === "trial_summary" && <BusinessFormSection title="试产及生产总结"><div className="form-grid single-column"><label><span className="form-field-label"><em>*</em>试产信息</span><textarea aria-label="试产信息" required value={String(draft.trialInfo || "")} onChange={(e) => update("trialInfo", e.target.value)} /></label>{field("订单号", "orderNo", true)}{field("订单数量", "orderQty", false, "number")}</div></BusinessFormSection>}<BusinessFormSection title="附件与备注"><div className="form-grid single-column"><label><span className="form-field-label">附件</span><span className="file-input file-upload-zone"><input aria-label={`${auditedBusinessLabels[type]}附件`} type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void selectAttachment(e.target.files?.[0])} /><span><Upload size={28} /><strong>{draft.attachmentName || "点击或拖拽文件到此区域上传"}</strong><small>支持图片、Office、PDF、压缩包，单文件最大10MB</small></span></span>{attachmentError && <em className="field-error">{attachmentError}</em>}</label><label><span className="form-field-label">备注</span><textarea aria-label="备注" value={String(draft.remark || "")} onChange={(e) => update("remark", e.target.value)} /></label></div></BusinessFormSection>{error && <div className="form-submit-error" role="alert">{error}</div>}</BusinessFormLayout>;
}

function AuditedBusinessReviewDialog({ record, onClose, onSubmit }: { record: AuditedBusinessRecord; onClose: () => void; onSubmit: (result: "approved" | "rejected", reason: string) => void }) { const [result, setResult] = useState<"approved" | "rejected">("approved"); const [reason, setReason] = useState(""); return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="audited-review-title"><header><h2 id="audited-review-title">审核{auditedBusinessLabels[record.businessType]}</h2><button aria-label="关闭审核弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={(event) => { event.preventDefault(); if (result === "rejected" && !reason.trim()) return; onSubmit(result, reason.trim()); }}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><fieldset><legend>审核结果 <em>*</em></legend><label><input type="radio" checked={result === "approved"} onChange={() => setResult("approved")} />通过</label><label><input type="radio" checked={result === "rejected"} onChange={() => setResult("rejected")} />驳回</label></fieldset><label className="dialog-textarea"><small>{result === "rejected" ? "审核意见 *" : "审核意见"}</small><textarea aria-label="审核意见" required={result === "rejected"} value={reason} onChange={(e) => setReason(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">确认提交</button></footer></form></section></div>; }

function AuditedBusinessCancelDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) { const [reason, setReason] = useState(""); return <div className="dialog-backdrop"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="audited-cancel-title"><header><h2 id="audited-cancel-title">取消业务记录</h2><button aria-label="关闭取消弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) onSubmit(reason.trim()); }}><div className="dialog-body"><label className="dialog-textarea"><small>取消原因 *</small><textarea aria-label="取消原因" required value={reason} onChange={(e) => setReason(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>返回</button><button type="submit" className="danger-button">确认取消</button></footer></form></section></div>; }

function SporadicReturnSupplementDialog({ kind, record, onClose, onSubmit }: { kind: "return" | "replenish"; record: AuditedBusinessRecord; onClose: () => void; onSubmit: (values: { courierNo?: string; returnDate?: string; replenishDate?: string; attachment?: LocalAttachment }) => void }) {
  const isReturn = kind === "return";
  const [courierNo, setCourierNo] = useState(record.courierNo || "");
  const [returnDate, setReturnDate] = useState(record.returnDate?.replace(" ", "T") || "");
  const [replenishDate, setReplenishDate] = useState(record.replenishDate?.replace(" ", "T") || "");
  const [attachment, setAttachment] = useState<LocalAttachment | undefined>(record.replenishAttachmentName && record.replenishAttachmentDataUrl ? { name: record.replenishAttachmentName, dataUrl: record.replenishAttachmentDataUrl } : undefined);
  const [error, setError] = useState("");
  async function selectAttachment(file?: File) { if (!file) return; try { setAttachment(await readLocalAttachment(file)); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReturn && (!courierNo.trim() || !returnDate)) { setError("请填写退料快递单号和退料时间"); return; }
    if (!isReturn && !replenishDate) { setError("请填写物料补回时间"); return; }
    onSubmit(isReturn ? { courierNo: courierNo.trim(), returnDate: returnDate.replace("T", " ") } : { replenishDate: replenishDate.replace("T", " "), attachment });
  }
  const title = isReturn ? "填写退料信息" : "填写补回信息";
  return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="sporadic-supplement-title"><header><h2 id="sporadic-supplement-title">{title}</h2><button aria-label={`关闭${title}弹窗`} onClick={onClose}><X size={21} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div>{isReturn ? <><label className="dialog-input"><span>退料快递单号 <em>*</em></span><input aria-label="退料快递单号" type="text" required value={courierNo} onChange={(event) => setCourierNo(event.target.value)} placeholder="请输入退料快递单号" /></label><label className="dialog-input"><span>退料时间 <em>*</em></span><input aria-label="退料时间" type="datetime-local" required value={returnDate} onChange={(event) => setReturnDate(event.target.value)} /></label></> : <><label className="dialog-input"><span>物料补回时间 <em>*</em></span><input aria-label="物料补回时间" type="datetime-local" required value={replenishDate} onChange={(event) => setReplenishDate(event.target.value)} /></label><label className="dialog-input"><span>补回附件</span><span className="file-input file-upload-zone"><input aria-label="补回附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(event) => void selectAttachment(event.target.files?.[0])} /><span><Upload size={24} /><strong>{attachment?.name || "点击上传补回附件"}</strong><small>支持图片、Office、PDF、压缩包，单文件最大10MB</small></span></span></label></>}{error && <em className="field-error" role="alert">{error}</em>}</div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">确认提交</button></footer></form></section></div>;
}

function AuditedBusinessDetailPage({ role, type }: { role: "factory" | "platform"; type: AuditedBusinessType }) {
  const navigate = useNavigate(); const { id = "" } = useParams(); const [record, setRecord] = useState<AuditedBusinessRecord | undefined>(() => getAuditedBusinessRecord(id)); const [reviewOpen, setReviewOpen] = useState(false); const [cancelOpen, setCancelOpen] = useState(false); const [supplementOpen, setSupplementOpen] = useState<"return" | "replenish" | undefined>(); const [feedback, setFeedback] = useState<Feedback>(); const path = auditedBusinessPath(role, type); const session = readDemoSession(); if (!record || !session || !canAccessOrganizationRecord(role, session.organizationId, record)) return <Navigate to={path} replace />;
  const current = record;
  function commit(updated: AuditedBusinessRecord, message: string) { try { const saved = saveAuditedBusinessRecord(updated, current.version); setRecord(saved); setFeedback({ tone: "success", message }); setReviewOpen(false); setCancelOpen(false); setSupplementOpen(undefined); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "操作失败" }); } }
  function review(result: "approved" | "rejected", reason: string) { const nextStatus: AuditedBusinessStatus = result === "rejected" ? "rejected" : type === "sporadic_return" ? "pending_return" : "approved"; commit({ ...current, status: nextStatus, reviewReason: reason || undefined, updatedAt: "2026-08-17 10:30", flowRecords: [...current.flowRecords, { id: `${current.id}-review-${Date.now()}`, kind: result === "approved" ? "review_approved" : "review_rejected", action: result === "approved" ? `平台审核通过${type === "sporadic_return" ? "，进入待退回" : ""}` : "平台审核驳回", time: "2026-08-17 10:30", operator: "演示管理员", organization: "示例质量运营中心", detail: reason || undefined }] }, "审核结果已提交"); }
  function cancel(reason: string) { commit({ ...current, status: "cancelled", cancelReason: reason, updatedAt: "2026-08-17 10:35", flowRecords: [...current.flowRecords, { id: `${current.id}-cancel-${Date.now()}`, kind: "cancelled", action: "取消业务记录", time: "2026-08-17 10:35", operator: role === "platform" ? "演示管理员" : (readDemoSession()?.userName ?? "陈工"), organization: role === "platform" ? "示例质量运营中心" : current.factoryOrganization, detail: reason }] }, "业务记录已取消"); }
  function supplement(kind: "return" | "replenish", values: { courierNo?: string; returnDate?: string; replenishDate?: string; attachment?: LocalAttachment }) { const now = "2026-08-17 10:40"; const updated: AuditedBusinessRecord = { ...current, status: kind === "return" ? "pending_replenish" : "completed", courierNo: kind === "return" ? values.courierNo : current.courierNo, returnDate: kind === "return" ? values.returnDate : current.returnDate, replenishDate: kind === "replenish" ? values.replenishDate : current.replenishDate, replenishAttachmentName: kind === "replenish" ? values.attachment?.name : current.replenishAttachmentName, replenishAttachmentDataUrl: kind === "replenish" ? values.attachment?.dataUrl : current.replenishAttachmentDataUrl, updatedAt: now, flowRecords: [...current.flowRecords, { id: `${current.id}-${kind}-${Date.now()}`, kind: "submitted", action: kind === "return" ? "填写退料物流信息" : "填写物料补回信息", time: now, operator: readDemoSession()?.userName ?? "陈工", organization: current.factoryOrganization, detail: kind === "return" ? `${values.courierNo} · ${values.returnDate}` : `${values.replenishDate}${values.attachment ? ` · ${values.attachment.name}` : ""}` }] }; commit(updated, kind === "return" ? "退料信息已提交" : "补回信息已提交"); }
  const canReview = role === "platform" && current.status === "pending_review" && !(type === "inbound_report" && current.qualifiedType === "unqualified"); const canCancel = (current.status === "pending_review" || current.status === "rejected") && (role === "platform" || role === "factory"); const canReturn = role === "factory" && type === "sporadic_return" && current.status === "pending_return"; const canReplenish = role === "factory" && type === "sporadic_return" && current.status === "pending_replenish"; const canEdit = role === "factory" && current.status === "rejected";
  return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(path)}><ArrowLeft size={16} />返回</button><h1>{record.businessNo} · {auditedBusinessLabels[type]}</h1><span className={`status ${auditedStatusClass(record.status)}`}>{auditedStatusLabel(record.status)}</span></div><div className="detail-title-actions">{canReview && <button className="primary-small" onClick={() => setReviewOpen(true)}>审核</button>}{canEdit && <button className="primary-small" onClick={() => navigate(`${path}/${record.id}/edit`)}>修改并重新提报</button>}{canReturn && <button className="primary-small" onClick={() => setSupplementOpen("return")}>填写退料信息</button>}{canReplenish && <button className="primary-small" onClick={() => setSupplementOpen("replenish")}>填写补回信息</button>}{canCancel && <button className="danger-outline-button" onClick={() => setCancelOpen(true)}>取消</button>}</div></div><ActionFeedback feedback={feedback} /><div className="detail-sections"><DetailSection title="基本信息"><div className="detail-grid"><div><span>提报组织</span><strong>{record.factoryOrganization}</strong></div><div><span>业务时间</span><strong>{record.businessDate}</strong></div><div><span>提报时间</span><strong>{record.createdAt}</strong></div><div><span>业务类型</span><strong>{auditedBusinessLabels[type]}</strong></div></div></DetailSection><DetailSection title="业务信息"><div className="detail-grid"><div><span>物料料号</span><strong>{record.materialNo || "—"}</strong></div>{type !== "inbound_report" && <div><span>物料名称</span><strong>{record.materialName || "—"}</strong></div>}<div><span>产品名称</span><strong>{record.productName || "—"}</strong></div>{type !== "sporadic_return" && <><div><span>产品型号</span><strong>{record.productModel || "—"}</strong></div><div><span>订单号</span><strong>{record.orderNo || "—"}</strong></div></>}{type === "sporadic_return" && <><div><span>物料型号</span><strong>{record.materialModel || "—"}</strong></div><div><span>组装总数</span><strong>{record.assemblyQty || "—"}</strong></div><div><span>退料原因</span><strong>{record.returnReason}</strong></div><div><span>退料数量</span><strong>{record.returnQty}</strong></div><div><span>退料快递单号</span><strong>{record.courierNo || "—"}</strong></div><div><span>退料时间</span><strong>{record.returnDate || "—"}</strong></div><div><span>物料补回时间</span><strong>{record.replenishDate || "—"}</strong></div></>}{type === "inbound_report" && <><div><span>入库数量</span><strong>{record.inboundQty}</strong></div><div><span>入库合格类型</span><strong>{record.qualifiedType === "qualified" ? "合格" : "不合格"}</strong></div></>}{type === "trial_summary" && <div className="wide"><span>试产信息</span><strong>{record.trialInfo}</strong></div>}</div></DetailSection><DetailSection title="附件与备注"><div className="detail-grid"><div><span>附件</span><strong>{record.attachmentName ? record.attachmentDataUrl ? <button type="button" className="table-action" onClick={() => downloadLocalAttachment({ name: record.attachmentName, dataUrl: record.attachmentDataUrl! })}>下载 {record.attachmentName}</button> : record.attachmentName : "未上传"}</strong></div>{type === "sporadic_return" && <div><span>补回附件</span><strong>{record.replenishAttachmentName ? record.replenishAttachmentDataUrl ? <button type="button" className="table-action" onClick={() => downloadLocalAttachment({ name: record.replenishAttachmentName!, dataUrl: record.replenishAttachmentDataUrl! })}>下载 {record.replenishAttachmentName}</button> : record.replenishAttachmentName : "未上传"}</strong></div>}<div><span>备注</span><strong>{record.remark || "—"}</strong></div></div></DetailSection><FlowTimeline records={record.flowRecords} /></div>{reviewOpen && <AuditedBusinessReviewDialog record={record} onClose={() => setReviewOpen(false)} onSubmit={review} />}{cancelOpen && <AuditedBusinessCancelDialog onClose={() => setCancelOpen(false)} onSubmit={cancel} />}{supplementOpen && <SporadicReturnSupplementDialog kind={supplementOpen} record={record} onClose={() => setSupplementOpen(undefined)} onSubmit={(values) => supplement(supplementOpen, values)} />}</div>;
}

function afterSalesStatusLabel(status: AfterSalesStatus): string { return { pending_supplier: "待供应商处理", pending_8d_review: "待审核8D", rejected_8d: "驳回8D", approved: "已通过", cancelled: "已取消" }[status]; }
function afterSalesStatusClass(status: AfterSalesStatus): string { return status === "approved" ? "approved" : status === "cancelled" ? "cancelled" : status === "rejected_8d" ? "rejected" : "warning"; }
function AfterSalesListPage({ role, surface = "audit" }: { role: "platform" | "supplier"; surface?: "submission" | "audit" }) {
  const platformSubmission = role === "platform" && surface === "submission"; const root = platformSubmission ? "/app/platform/platform-business/after-sales-exception" : role === "platform" ? "/app/platform/business/after-sales-exception" : "/app/supplier/after-sales-exception"; const organizationId = readDemoSession()?.organizationId ?? supplierOrganizationId; const records = readAfterSalesExceptions().filter((item) => role === "platform" || item.supplierOrganizationId === organizationId);
  return <div className="page-stack"><div className="page-heading heading-with-filters"><div><p>{platformSubmission ? "平台业务" : role === "platform" ? "业务管理" : "供应商管理"}</p><h1>售后异常{platformSubmission ? "提报" : role === "platform" ? "审核" : "任务处理"}</h1><span>{platformSubmission ? "平台主动提报售后异常，提报时同步分配供应商。" : role === "platform" ? "查看售后异常并审核供应商提交的8D报告。" : "处理平台分配的售后异常并提交8D报告。"}</span></div>{platformSubmission && <Link className="primary-small" to={`${root}/new`}>新增售后异常</Link>}</div><section className="list-summary"><div><strong>{records.length}</strong><span>全部记录</span></div><div><strong>{records.filter((item) => item.status === "pending_supplier" || item.status === "pending_8d_review" || item.status === "rejected_8d").length}</strong><span>待处理</span></div><div><strong>{records.filter((item) => item.status === "approved").length}</strong><span>已通过</span></div></section><section className="work-card shipment-list-card"><header><div><h2>售后异常列表</h2><p>按提报时间倒序展示</p></div><span className="list-count">共 {records.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th><th>提报组织</th><th>供应商</th><th>物料料号</th><th>不良数量</th><th>异常描述</th><th>状态</th><th>操作</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link to={`${root}/${record.id}`}>{record.businessNo}</Link></td><td>{record.reporterOrganization}</td><td>{record.supplierName}</td><td>{record.materialNo}</td><td>{record.defectQty}</td><td>{record.description.slice(0, 30)}</td><td><span className={`status ${afterSalesStatusClass(record.status)}`}>{afterSalesStatusLabel(record.status)}</span></td><td><Link className="table-action" to={`${root}/${record.id}`}>查看详情</Link></td></tr>)}</tbody></table></div></section></div>;
}

function AfterSalesFormPage() {
  const navigate = useNavigate(); const session = readDemoSession(); const [error, setError] = useState(""); const [attachmentError, setAttachmentError] = useState(""); const [draft, setDraft] = useState<Partial<AfterSalesException>>({ businessDate: "2026-08-17", supplierName: "远航精密供应商", materialNo: "", materialName: "", model: "", inputQty: 0, defectQty: 0, returnQty: 0, description: "", attachmentName: "", remark: "" });
  function update(key: keyof AfterSalesException, value: unknown) { setDraft((current) => ({ ...current, [key]: value })); }
  async function selectAttachment(file?: File) { if (!file) return; try { const attachment = await readLocalAttachment(file); update("attachmentName", attachment.name); update("attachmentDataUrl", attachment.dataUrl); setAttachmentError(""); } catch (reason) { setAttachmentError(reason instanceof Error ? reason.message : "文件读取失败"); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!draft.description?.trim() || !draft.materialNo?.trim() || !draft.materialName?.trim()) { setError("请填写物料信息和异常描述"); return; } const now = "2026-08-17 11:00"; const records = readAfterSalesExceptions(); const organizationName = session?.organizationName ?? roleProfiles.platform.organization; const record: AfterSalesException = { id: `after-sales-${Date.now()}`, version: 1, businessNo: `SA20260817${String(records.length + 1).padStart(4, "0")}`, status: "pending_supplier", reporterOrganization: organizationName, supplierOrganizationId: supplierOrganizationId, supplierName: String(draft.supplierName || "远航精密供应商"), materialNo: String(draft.materialNo), materialName: String(draft.materialName), model: String(draft.model || ""), businessDate: String(draft.businessDate), inputQty: Number(draft.inputQty || 0), defectQty: Number(draft.defectQty || 0), description: String(draft.description), returnQty: Number(draft.returnQty || 0), attachmentName: String(draft.attachmentName || ""), attachmentDataUrl: draft.attachmentDataUrl ? String(draft.attachmentDataUrl) : undefined, remark: String(draft.remark || ""), flowRecords: [{ id: `after-sales-${Date.now()}-submitted`, kind: "submitted", action: "平台提报并分配供应商", time: now, operator: session?.userName ?? roleProfiles.platform.user, organization: organizationName }], createdAt: now, updatedAt: now }; saveAfterSalesException(record); navigate(`/app/platform/platform-business/after-sales-exception/${record.id}`); }
  const field = (label: string, key: keyof AfterSalesException, required = false, inputType = "text") => <label><span className="form-field-label">{required && <em>*</em>}{label}</span><input aria-label={label} required={required} type={inputType} value={String(draft[key] ?? "")} onChange={(e) => update(key, inputType === "number" ? Number(e.target.value) : e.target.value)} /></label>;
  return <BusinessFormLayout title="新增售后异常" onBack={() => navigate("/app/platform/platform-business/after-sales-exception")} onSubmit={submit} submitLabel="提报并分配"><BusinessFormSection title="基础信息"><div className="form-grid">{field("异常时间", "businessDate", true, "date")}{field("供应商名称", "supplierName", true)}{field("物料料号", "materialNo", true)}{field("物料名称", "materialName", true)}{field("物料型号", "model")}</div></BusinessFormSection><BusinessFormSection title="异常信息"><div className="form-grid">{field("投入数量", "inputQty", false, "number")}{field("不良数量", "defectQty", false, "number")}{field("返回供应数量", "returnQty", false, "number")}<label><span className="form-field-label"><em>*</em>异常描述</span><textarea aria-label="异常描述" required value={String(draft.description || "")} onChange={(e) => update("description", e.target.value)} /></label></div></BusinessFormSection><BusinessFormSection title="附件与备注"><div className="form-grid single-column"><label><span className="form-field-label">附件</span><span className="file-input file-upload-zone"><input aria-label="售后异常附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void selectAttachment(e.target.files?.[0])} /><span><Upload size={28} /><strong>{draft.attachmentName || "点击或拖拽文件到此区域上传"}</strong><small>单文件最大10MB</small></span></span>{attachmentError && <em className="field-error">{attachmentError}</em>}</label><label><span className="form-field-label">备注</span><textarea aria-label="备注" value={String(draft.remark || "")} onChange={(e) => update("remark", e.target.value)} /></label></div></BusinessFormSection>{error && <div className="form-submit-error" role="alert">{error}</div>}</BusinessFormLayout>;
}

function AfterSalesEightDDialog({ record, onClose, onSubmit }: { record: AfterSalesException; onClose: () => void; onSubmit: (remark: string, attachment: LocalAttachment) => void }) { const [remark, setRemark] = useState(record.eightDRemark || ""); const [attachment, setAttachment] = useState<LocalAttachment | undefined>(record.eightDAttachmentName && record.eightDAttachmentDataUrl ? { name: record.eightDAttachmentName, dataUrl: record.eightDAttachmentDataUrl } : undefined); const [error, setError] = useState(""); async function select(file?: File) { if (!file) return; try { setAttachment(await readLocalAttachment(file)); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "文件读取失败"); } } return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="after-sales-8d-title"><header><h2 id="after-sales-8d-title">提交8D报告</h2><button aria-label="关闭售后异常8D弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={(event) => { event.preventDefault(); if (!attachment) { setError("请上传8D附件"); return; } onSubmit(remark.trim(), attachment); }}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{record.businessNo}</strong></div><label><small>附件 *</small><span className="file-input file-upload-zone"><input aria-label="售后异常8D附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(e) => void select(e.target.files?.[0])} /><span><Upload size={24} /><strong>{attachment?.name || "点击上传8D附件"}</strong><small>单文件最大10MB</small></span></span>{error && <em className="field-error">{error}</em>}</label><label className="dialog-textarea"><small>备注</small><textarea aria-label="售后异常8D备注" value={remark} onChange={(e) => setRemark(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">提交8D报告</button></footer></form></section></div>; }

function AfterSalesReviewDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (result: "approved" | "rejected", reason: string) => void }) { const [result, setResult] = useState<"approved" | "rejected">("approved"); const [reason, setReason] = useState(""); return <div className="dialog-backdrop"><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="after-sales-review-title"><header><h2 id="after-sales-review-title">审核售后异常8D</h2><button aria-label="关闭售后异常审核弹窗" onClick={onClose}><X size={21} /></button></header><form onSubmit={(event) => { event.preventDefault(); if (result === "rejected" && !reason.trim()) return; onSubmit(result, reason.trim()); }}><div className="dialog-body"><fieldset><legend>审核结果 <em>*</em></legend><label><input type="radio" checked={result === "approved"} onChange={() => setResult("approved")} />通过</label><label><input type="radio" checked={result === "rejected"} onChange={() => setResult("rejected")} />驳回</label></fieldset><label className="dialog-textarea"><small>{result === "rejected" ? "审核意见 *" : "审核意见"}</small><textarea aria-label="审核意见" required={result === "rejected"} value={reason} onChange={(e) => setReason(e.target.value)} /></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="primary-small">确认提交</button></footer></form></section></div>; }

function AfterSalesDetailPage({ role, surface = "audit" }: { role: "platform" | "supplier"; surface?: "submission" | "audit" }) {
  const navigate = useNavigate(); const { id = "" } = useParams(); const [record, setRecord] = useState<AfterSalesException | undefined>(() => getAfterSalesException(id)); const [eightDOpen, setEightDOpen] = useState(false); const [reviewOpen, setReviewOpen] = useState(false); const [cancelOpen, setCancelOpen] = useState(false); const [feedback, setFeedback] = useState<Feedback>(); const platformSubmission = role === "platform" && surface === "submission"; const path = platformSubmission ? "/app/platform/platform-business/after-sales-exception" : role === "platform" ? "/app/platform/business/after-sales-exception" : "/app/supplier/after-sales-exception"; const session = readDemoSession(); if (!record || !session || !canAccessOrganizationRecord(role, session.organizationId, record)) return <Navigate to={path} replace />;
  const current = record;
  function commit(updated: AfterSalesException) { try { const saved = saveAfterSalesException(updated, current.version); setRecord(saved); setFeedback({ tone: "success", message: updated.status === "pending_8d_review" ? "8D报告已提交审核" : updated.status === "cancelled" ? "售后异常已取消" : "审核结果已提交" }); setEightDOpen(false); setReviewOpen(false); setCancelOpen(false); return true; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "数据保存失败，请刷新后重试" }); setEightDOpen(false); setReviewOpen(false); setCancelOpen(false); return false; } }
  function refresh() { const latest = getAfterSalesException(id); if (latest) setRecord(latest); setFeedback(undefined); setEightDOpen(false); setReviewOpen(false); setCancelOpen(false); }
  function submitEightD(remark: string, attachment: LocalAttachment) { commit({ ...current, status: "pending_8d_review", eightDRemark: remark, eightDAttachmentName: attachment.name, eightDAttachmentDataUrl: attachment.dataUrl, updatedAt: "2026-08-17 11:30", flowRecords: [...current.flowRecords, { id: `${current.id}-8d-${Date.now()}`, kind: "submitted_8d", action: current.status === "rejected_8d" ? "供应商重新提交8D报告" : "供应商提交8D报告", time: "2026-08-17 11:30", operator: readDemoSession()?.userName ?? "王晨", organization: current.supplierName, detail: attachment.name }] }); }
  function review(result: "approved" | "rejected", reason: string) { commit({ ...current, status: result === "approved" ? "approved" : "rejected_8d", reviewReason: reason || undefined, updatedAt: "2026-08-17 11:40", flowRecords: [...current.flowRecords, { id: `${current.id}-review-${Date.now()}`, kind: result === "approved" ? "review_approved" : "review_rejected", action: result === "approved" ? "平台审核8D通过" : "平台审核8D驳回", time: "2026-08-17 11:40", operator: "演示管理员", organization: "示例质量运营中心", detail: reason || undefined }] }); }
  function cancel(reason: string) { commit({ ...current, status: "cancelled", reviewReason: reason, updatedAt: "2026-08-17 11:50", flowRecords: [...current.flowRecords, { id: `${current.id}-cancel-${Date.now()}`, kind: "cancelled", action: "平台取消售后异常", time: "2026-08-17 11:50", operator: "演示管理员", organization: "示例质量运营中心", detail: reason }] }); setCancelOpen(false); }
  const canSubmit = role === "supplier" && (current.status === "pending_supplier" || current.status === "rejected_8d"); const canReview = role === "platform" && surface === "audit" && current.status === "pending_8d_review"; const canCancel = role === "platform" && ((surface === "audit" && !["approved", "cancelled"].includes(current.status)) || (surface === "submission" && current.status === "pending_supplier")); return <div className="page-stack detail-page"><div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={() => navigate(path)}><ArrowLeft size={16} />返回</button><h1>{current.businessNo} · 售后异常</h1><span className={`status ${afterSalesStatusClass(current.status)}`}>{afterSalesStatusLabel(current.status)}</span></div><div className="detail-title-actions">{canSubmit && <button className="primary-small" onClick={() => setEightDOpen(true)}>{current.status === "rejected_8d" ? "重新提交8D" : "提交8D报告"}</button>}{canReview && <button className="primary-small" onClick={() => setReviewOpen(true)}>审核8D</button>}{canCancel && <button className="danger-outline-button" onClick={() => setCancelOpen(true)}>取消</button>}</div></div><ActionFeedback feedback={feedback} onRefresh={refresh} /><div className="detail-sections"><DetailSection title="基本信息"><div className="detail-grid"><div><span>提报组织</span><strong>{current.reporterOrganization}</strong></div><div><span>供应商</span><strong>{current.supplierName}</strong></div><div><span>业务时间</span><strong>{current.businessDate}</strong></div><div><span>提报时间</span><strong>{current.createdAt}</strong></div></div></DetailSection><DetailSection title="异常信息"><div className="detail-grid"><div><span>物料料号</span><strong>{current.materialNo}</strong></div><div><span>物料名称</span><strong>{current.materialName}</strong></div><div><span>不良数量</span><strong>{current.defectQty}</strong></div><div><span>返回供应数量</span><strong>{current.returnQty}</strong></div><div className="wide"><span>异常描述</span><strong>{current.description}</strong></div></div></DetailSection><DetailSection title="附件与8D报告"><div className="detail-grid"><div><span>异常附件</span><strong>{current.attachmentName ? current.attachmentDataUrl ? <button className="table-action" type="button" onClick={() => downloadLocalAttachment({ name: current.attachmentName, dataUrl: current.attachmentDataUrl! })}>下载 {current.attachmentName}</button> : current.attachmentName : "未上传"}</strong></div><div><span>8D附件</span><strong>{current.eightDAttachmentName ? current.eightDAttachmentDataUrl ? <button className="table-action" type="button" onClick={() => downloadLocalAttachment({ name: current.eightDAttachmentName!, dataUrl: current.eightDAttachmentDataUrl! })}>下载 {current.eightDAttachmentName}</button> : current.eightDAttachmentName : "未提交"}</strong></div><div className="wide"><span>8D备注</span><strong>{current.eightDRemark || "—"}</strong></div></div></DetailSection><FlowTimeline records={current.flowRecords} /></div>{eightDOpen && <AfterSalesEightDDialog record={current} onClose={() => setEightDOpen(false)} onSubmit={submitEightD} />}{reviewOpen && <AfterSalesReviewDialog onClose={() => setReviewOpen(false)} onSubmit={review} />}{cancelOpen && <AuditedBusinessCancelDialog onClose={() => setCancelOpen(false)} onSubmit={cancel} />}</div>;
}

type ShipmentDraft = Pick<ShipmentReport, "supplierName" | "materialNo" | "materialName" | "model" | "orderNo" | "orderQty" | "shipmentQty" | "shipmentDate" | "attachmentName" | "attachmentDataUrl" | "remark">;

const emptyShipmentDraft: ShipmentDraft = {
  supplierName: "远航精密供应商",
  materialNo: "",
  materialName: "",
  model: "",
  orderNo: "",
  orderQty: 0,
  shipmentQty: 0,
  shipmentDate: "2026-08-11",
  attachmentName: "",
  attachmentDataUrl: undefined,
  remark: "",
};

function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <span className={`status ${shipmentStatusClass(status)}`}>{shipmentStatusLabel(status)}</span>;
}

function ShipmentReportRow({ report, supplier = false }: { report: ShipmentReport; supplier?: boolean }) {
  const detailPath = supplier ? `/app/supplier/shipment-reports/${report.id}` : `/app/platform/business/shipment-reports/${report.id}`;
  return <tr>
    <td><Link to={detailPath}>{report.businessNo}</Link></td>
    {!supplier && <td>{report.supplierName}</td>}
    <td>{report.materialName}</td>
    <td>{report.materialNo}</td>
    {supplier && <td>{report.orderNo}</td>}
    <td>{report.shipmentQty.toLocaleString()}</td>
    <td>{report.shipmentDate}</td>
    <td><ShipmentStatusBadge status={report.status} /></td>
    <td><Link className="table-action" to={detailPath}>查看详情</Link></td>
  </tr>;
}

function SupplierShipmentReportsPage() {
  const navigate = useNavigate();
  const session = readDemoSession();
  const organizationId = session?.organizationId ?? supplierOrganizationId;
  const canSubmit = Boolean(session && hasMerchantPermission(merchantIdentitySources(), organizationId, session.userId, "merchant.business.shipment_report.submit"));
  const [reports] = useState(() => readShipmentReports().filter((report) => report.supplierOrganizationId === organizationId));
  const exportRows = reports.map((report) => [report.businessNo, report.materialName, report.materialNo, report.orderNo, report.shipmentQty, report.shipmentDate, shipmentStatusLabel(report.status)]);
  return <div className="page-stack">
    <div className="page-heading heading-with-filters"><div><p>供应商管理</p><h1>出货报告</h1><span>在线提交出货信息，跟踪平台审核进度。</span></div><div className="list-page-actions"><MerchantBusinessExportButton permissionCode="merchant.business.shipment_report.export" filename="出货报告" headers={["业务编号", "物料名称", "物料料号", "订单号", "出货数量", "出货时间", "状态"]} rows={exportRows} />{canSubmit && <button className="primary-small" onClick={() => navigate("/app/supplier/shipment-reports/new")}>新增出货报告</button>}</div></div>
    <section className="list-summary"><div><strong>{reports.length}</strong><span>全部报告</span></div><div><strong>{reports.filter((report) => report.status === "pending_review").length}</strong><span>待审核</span></div><div><strong>{reports.filter((report) => report.status === "rejected").length}</strong><span>待重提</span></div></section>
    <section className="work-card shipment-list-card"><header><div><h2>我的出货报告</h2><p>默认按创建时间倒序展示</p></div><span className="list-count">共 {reports.length} 条</span></header><div className="responsive-table"><table><thead><tr><th>业务编号</th><th>物料名称</th><th>物料料号</th><th>订单号</th><th>出货数量</th><th>出货时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{reports.length ? reports.map((report) => <ShipmentReportRow key={report.id} report={report} supplier />) : <tr><td colSpan={8} className="empty-cell">暂无数据</td></tr>}</tbody></table></div></section>
  </div>;
}

function BusinessFormSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="form-section form-section-card"><h2>{title}</h2>{children}</section>;
}

function BusinessFormLayout({ title, onBack, onSubmit, children, submitLabel = "提交审核" }: { title: string; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode; submitLabel?: string }) {
  return <div className="page-stack form-page">
    <div className="form-titlebar"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16} />返回列表</button><h1>{title}</h1></div>
    <form className="form-sections" onSubmit={onSubmit}>
      {children}
      <div className="form-actions form-actions-footer"><button type="button" className="secondary-button" onClick={onBack}>取消</button><button type="submit" className="primary-button">{submitLabel}</button></div>
    </form>
  </div>;
}

function ShipmentReportFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = id ? getShipmentReport(id) : undefined;
  const session = readDemoSession();
  const currentOrganizationId = session?.organizationId ?? supplierOrganizationId;
  const currentOrganizationName = session?.organizationName ?? roleProfiles.supplier.organization;
  const currentUserName = session?.userName ?? roleProfiles.supplier.user;
  const [draft, setDraft] = useState<ShipmentDraft>(() => existing && existing.status === "rejected" ? {
    supplierName: existing.supplierName,
    materialNo: existing.materialNo,
    materialName: existing.materialName,
    model: existing.model,
    orderNo: existing.orderNo,
    orderQty: existing.orderQty,
    shipmentQty: existing.shipmentQty,
    shipmentDate: existing.shipmentDate,
    attachmentName: existing.attachmentName,
    attachmentDataUrl: existing.attachmentDataUrl,
    remark: existing.remark,
  } : { ...emptyShipmentDraft, supplierName: currentOrganizationName });
  const [attachmentError, setAttachmentError] = useState("");

  function updateDraft<K extends keyof ShipmentDraft>(key: K, value: ShipmentDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function selectShipmentAttachment(file?: File): Promise<void> {
    if (!file) return;
    try {
      const attachment = await readLocalAttachment(file);
      setAttachmentError("");
      updateDraft("attachmentName", attachment.name);
      updateDraft("attachmentDataUrl", attachment.dataUrl);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "文件读取失败");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const reports = readShipmentReports();
    const now = "2026-08-11 16:00";
    const reportId = existing?.id ?? `shipment-${Date.now()}`;
    const nextFlowRecord: FlowRecord = existing
      ? { id: `${reportId}-resubmitted-${Date.now()}`, kind: "resubmitted", action: "重新提交", time: now, operator: currentUserName, organization: draft.supplierName, detail: draft.remark || undefined }
      : { id: `${reportId}-submitted`, kind: "submitted", action: "提交出货报告", time: now, operator: currentUserName, organization: draft.supplierName };
    const report: ShipmentReport = {
      ...(existing ?? { id: reportId, version: 1, businessNo: createShipmentNo(reports), createdAt: now }),
      ...draft,
      status: "pending_review",
      supplierOrganizationId: currentOrganizationId,
      updatedAt: now,
      reviewReason: undefined,
      cancelReason: undefined,
      cancelledBy: undefined,
      flowRecords: [...(existing?.flowRecords ?? []), nextFlowRecord],
    };
    const saved = saveShipmentReport(report, existing?.version);
    navigate(`/app/supplier/shipment-reports/${saved.id}`);
  }

  const fieldLabel = (label: string, required = false) => <span className="form-field-label">{required && <em>*</em>}{label}</span>;
  return <BusinessFormLayout title={existing ? "修改并重新提报" : "新增出货报告"} onBack={() => navigate(-1)} onSubmit={submit}>
      <BusinessFormSection title="基础信息"><div className="form-grid">
        <label>{fieldLabel("供应商名称")}<input value={draft.supplierName} readOnly /></label>
        <label>{fieldLabel("出货时间", true)}<input required type="date" value={draft.shipmentDate} onChange={(event) => updateDraft("shipmentDate", event.target.value)} /></label>
      </div></BusinessFormSection>
      <BusinessFormSection title="物料信息"><div className="form-grid">
        <label>{fieldLabel("物料料号", true)}<input required value={draft.materialNo} onChange={(event) => updateDraft("materialNo", event.target.value)} placeholder="请输入物料料号" /></label>
        <label>{fieldLabel("物料名称", true)}<input required value={draft.materialName} onChange={(event) => updateDraft("materialName", event.target.value)} placeholder="请输入物料名称" /></label>
        <label>{fieldLabel("物料型号")}<input value={draft.model} onChange={(event) => updateDraft("model", event.target.value)} placeholder="请输入物料型号" /></label>
      </div></BusinessFormSection>
      <BusinessFormSection title="订单与出货信息"><div className="form-grid">
        <label>{fieldLabel("订单号", true)}<input required value={draft.orderNo} onChange={(event) => updateDraft("orderNo", event.target.value)} placeholder="请输入订单号" /></label>
        <label>{fieldLabel("订单数量", true)}<input required type="number" min="1" value={draft.orderQty || ""} onChange={(event) => updateDraft("orderQty", Number(event.target.value))} placeholder="请输入订单数量" /></label>
        <label>{fieldLabel("出货数量", true)}<input required type="number" min="1" value={draft.shipmentQty || ""} onChange={(event) => updateDraft("shipmentQty", Number(event.target.value))} placeholder="请输入出货数量" /></label>
      </div></BusinessFormSection>
      <BusinessFormSection title="附件与备注"><div className="form-grid single-column">
        <label>{fieldLabel("附件（选填）")}<span className="file-input file-upload-zone"><input aria-label="出货报告附件" type="file" accept={MATERIAL_ATTACHMENT_ACCEPT} onChange={(event) => void selectShipmentAttachment(event.target.files?.[0])} /><span><Upload size={28} aria-hidden="true" /><strong>{draft.attachmentName || "点击或拖拽文件到此区域上传"}</strong><small>支持图片、Office、PDF、压缩包，单文件最大 10MB</small></span></span>{attachmentError && <em className="field-error">{attachmentError}</em>}</label>
        <label>{fieldLabel("备注")}<textarea value={draft.remark} onChange={(event) => updateDraft("remark", event.target.value)} maxLength={500} placeholder="请输入备注信息（选填，最多500字）" /></label>
      </div></BusinessFormSection>
  </BusinessFormLayout>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="detail-section"><h2>{title}</h2>{children}</section>;
}

function DetailTitlebar({ report, onBack, actions }: { report: ShipmentReport; onBack: () => void; actions?: ReactNode }) {
  return <div className="detail-titlebar"><div className="detail-title-main"><button className="back-button" onClick={onBack}><ArrowLeft size={16} />返回</button><h1>{report.businessNo} · 出货报告</h1><ShipmentStatusBadge status={report.status} /></div>{actions && <div className="detail-title-actions">{actions}</div>}</div>;
}

function ShipmentDetailSections({ report }: { report: ShipmentReport }) {
  return <div className="detail-sections">
    <DetailSection title="基本信息"><div className="detail-grid"><div><span>供应商名称</span><strong>{report.supplierName}</strong></div><div><span>出货时间</span><strong>{report.shipmentDate}</strong></div><div><span>提报时间</span><strong>{report.createdAt}</strong></div></div></DetailSection>
    <DetailSection title="物料与订单信息"><div className="detail-grid"><div><span>物料料号</span><strong>{report.materialNo}</strong></div><div><span>物料名称</span><strong>{report.materialName}</strong></div><div><span>物料型号</span><strong>{report.model || "—"}</strong></div><div><span>订单号</span><strong>{report.orderNo}</strong></div><div><span>订单数量</span><strong>{report.orderQty.toLocaleString()}</strong></div><div><span>出货数量</span><strong>{report.shipmentQty.toLocaleString()}</strong></div></div></DetailSection>
    <DetailSection title="附件"><div className="detail-grid single-row"><div><span>出货检验报告</span><strong>{report.attachmentName ? report.attachmentDataUrl ? <button className="table-action" type="button" onClick={() => downloadLocalAttachment({ name: report.attachmentName, dataUrl: report.attachmentDataUrl! })}>下载 {report.attachmentName}</button> : `${report.attachmentName}（历史演示数据无文件内容）` : "未上传"}</strong></div></div></DetailSection>
    <DetailSection title="备注"><p className="detail-copy">{report.remark || "—"}</p></DetailSection>
    <FlowTimeline records={report.flowRecords} />
  </div>;
}

function FlowTimeline({ records }: { records: FlowRecord[] }) {
  return <DetailSection title="流程记录">{records.length ? <ol className="flow-timeline" aria-label="业务流程记录">{records.map((record) => <li className={`flow-event ${record.kind}`} key={record.id}><span className="flow-dot" aria-hidden="true" /><div className="flow-event-content"><strong>{record.action}</strong><p>{record.time} · {record.operator} · {record.organization}</p>{record.detail && <span>{record.detail}</span>}</div></li>)}</ol> : <EmptyState compact message="暂无流程记录" />}</DetailSection>;
}

function PageSkeleton() {
  return <div className="page-state skeleton-state" role="status" aria-label="数据加载中"><span className="skeleton-line wide" /><span className="skeleton-line" /><span className="skeleton-card" /><span>数据加载中...</span></div>;
}

function EmptyState({ message = "暂无数据", compact = false }: { message?: string; compact?: boolean }) {
  return <div className={`page-state empty-state${compact ? " compact" : ""}`}><ListChecks size={compact ? 24 : 34} /><strong>{message}</strong><span>当前没有可展示的内容</span></div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="page-state error-state" role="alert"><AlertCircle size={34} /><strong>数据加载失败，请刷新重试</strong><span>若连续失败，请稍后再试</span><button className="secondary-button" type="button" onClick={onRetry}><RefreshCw size={15} />重新加载</button></div>;
}

function useDemoState(): "loading" | "empty" | "error" | "success" {
  const value = new URLSearchParams(useLocation().search).get("demoState");
  return value === "loading" || value === "empty" || value === "error" ? value : "success";
}

function CancelShipmentDialog({ report, actor, onCancel, onClose }: { report: ShipmentReport; actor: "supplier" | "platform"; onCancel: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!reason.trim()) return;
    onCancel(reason.trim());
  }
  return <div className="dialog-backdrop" role="presentation"><section className="review-dialog cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="shipment-cancel-title">
    <header><h2 id="shipment-cancel-title">取消出货报告</h2><button aria-label="关闭取消弹窗" onClick={onClose}><X size={21} /></button></header>
    <form onSubmit={submit}><div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{report.businessNo}</strong></div><div className="cancel-warning"><strong>取消后不可恢复</strong><span>{actor === "platform" ? "取消后将模拟通知供应商，且该单据不能再次审核或重提。" : "取消后该单据不能再次修改或重新提交。"}</span></div><label className="dialog-textarea"><span className="dialog-field-label">取消原因 <em>*</em></span><textarea required minLength={1} maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="请输入取消原因（必填，最多200字）" aria-label="取消原因" /><span className="dialog-counter">{reason.length} / 200</span></label></div><footer><button type="button" className="secondary-button" onClick={onClose}>取消</button><button type="submit" className="danger-button">确认取消</button></footer></form>
  </section></div>;
}

function SupplierShipmentReportDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [report, setReport] = useState<ShipmentReport | undefined>(() => getShipmentReport(id));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  const session = readDemoSession();
  if (!report || !session || !canAccessOrganizationRecord("supplier", session.organizationId, report)) return <Navigate to="/app/supplier/shipment-reports" replace />;
  const currentReport = report;
  const canSubmit = Boolean(session && hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, "merchant.business.shipment_report.submit"));
  const canCancel = canSubmit && (currentReport.status === "pending_review" || currentReport.status === "rejected");
  function cancelReport(reason: string): void {
    const time = "2026-08-12 17:30";
    const updated = { ...currentReport, status: "cancelled" as const, cancelReason: reason, cancelledBy: "supplier" as const, updatedAt: time, flowRecords: [...currentReport.flowRecords, { id: `${currentReport.id}-cancelled-supplier-${Date.now()}`, kind: "cancelled" as const, action: "供应商取消", time, operator: "王晨", organization: currentReport.supplierName, detail: reason }] };
    try { const saved = saveShipmentReport(updated, currentReport.version); setReport(saved); setFeedback({ tone: "success", message: "出货报告已取消" }); setCancelOpen(false); } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "数据加载失败，请刷新重试" }); setCancelOpen(false); }
  }
  function refresh() { const latest = getShipmentReport(id); if (latest) setReport(latest); setFeedback(undefined); setCancelOpen(false); }
  return <div className="page-stack detail-page"><DetailTitlebar report={currentReport} onBack={() => navigate("/app/supplier/shipment-reports")} actions={canCancel ? <>{currentReport.status === "rejected" && <button className="primary-small" onClick={() => navigate(`/app/supplier/shipment-reports/${currentReport.id}/edit`)}>修改并重新提报</button>}<button className="danger-outline-button" onClick={() => setCancelOpen(true)}>取消</button></> : undefined} /><ActionFeedback feedback={feedback} onRefresh={refresh} /><ShipmentDetailSections report={currentReport} />{cancelOpen && <CancelShipmentDialog report={currentReport} actor="supplier" onCancel={cancelReport} onClose={() => setCancelOpen(false)} />}</div>;
}

function PlatformShipmentReportsPage() {
  const navigate = useNavigate();
  const demoState = useDemoState();
  const reports = readShipmentReports();
  const retry = () => navigate(window.location.pathname, { replace: true });
  return <div className="page-stack"><div className="page-heading"><p>业务管理</p><h1>出货报告审核</h1><span>审核供应商提交的出货报告，驳回时必须填写审核意见。</span></div>{demoState === "loading" ? <PageSkeleton /> : demoState === "error" ? <ErrorState onRetry={retry} /> : <><section className="list-summary"><div><strong>{demoState === "empty" ? 0 : reports.filter((report) => report.status === "pending_review").length}</strong><span>待审核</span></div><div><strong>{demoState === "empty" ? 0 : reports.filter((report) => report.status === "approved").length}</strong><span>已通过</span></div><div><strong>{demoState === "empty" ? 0 : reports.filter((report) => report.status === "rejected").length}</strong><span>已驳回</span></div></section><section className="work-card shipment-list-card"><header><div><h2>出货报告列表</h2><p>按提报时间倒序展示</p></div><span className="list-count">共 {demoState === "empty" ? 0 : reports.length} 条</span></header>{demoState === "empty" ? <EmptyState /> : <div className="responsive-table"><table><thead><tr><th>业务编号</th><th>供应商</th><th>物料名称</th><th>物料料号</th><th>出货数量</th><th>出货时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{reports.map((report) => <ShipmentReportRow key={report.id} report={report} />)}</tbody></table></div>}</section></>}</div>;
}

function PlatformShipmentReportDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [report, setReport] = useState<ShipmentReport | undefined>(() => getShipmentReport(id));
  const [reviewReason, setReviewReason] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<"approved" | "rejected">("approved");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  if (!report) return <Navigate to="/app/platform/business/shipment-reports" replace />;
  const currentReport = report;

  function commit(updated: ShipmentReport, successMessage: string): boolean {
    try { const saved = saveShipmentReport(updated, currentReport.version); setReport(saved); setFeedback({ tone: "success", message: successMessage }); return true; } catch (error) { setFeedback({ tone: "error", message: error instanceof Error ? error.message : "数据加载失败，请刷新重试" }); setReviewOpen(false); setCancelOpen(false); return false; }
  }

  function refresh(): void { const latest = getShipmentReport(id); if (latest) setReport(latest); setFeedback(undefined); setReviewOpen(false); setCancelOpen(false); }

  function approve(): void {
    const time = "2026-08-11 16:10";
    const updated = { ...currentReport, status: "approved" as const, reviewReason: "审核通过", updatedAt: time, flowRecords: [...currentReport.flowRecords, { id: `${currentReport.id}-approved-${Date.now()}`, kind: "review_approved" as const, action: "平台审核通过", time, operator: "演示管理员", organization: "示例质量运营中心", detail: "审核通过" }] };
    if (commit(updated, "审核结果已提交")) setReviewOpen(false);
  }

  function reject(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!reviewReason.trim()) return;
    const time = "2026-08-11 16:10";
    const reason = reviewReason.trim();
    const updated = { ...currentReport, status: "rejected" as const, reviewReason: reason, updatedAt: time, flowRecords: [...currentReport.flowRecords, { id: `${currentReport.id}-rejected-${Date.now()}`, kind: "review_rejected" as const, action: "平台审核驳回", time, operator: "演示管理员", organization: "示例质量运营中心", detail: reason }] };
    if (commit(updated, "审核结果已提交")) setReviewOpen(false);
  }

  function cancelReport(reason: string): void {
    const time = "2026-08-12 17:30";
    const updated = { ...currentReport, status: "cancelled" as const, cancelReason: reason, cancelledBy: "platform" as const, updatedAt: time, flowRecords: [...currentReport.flowRecords, { id: `${currentReport.id}-cancelled-platform-${Date.now()}`, kind: "cancelled" as const, action: "平台取消", time, operator: "演示管理员", organization: "示例质量运营中心", detail: reason }] };
    if (commit(updated, "出货报告已取消")) setCancelOpen(false);
  }

  const canCancel = report.status === "pending_review" || report.status === "rejected";

  return <div className="page-stack detail-page">
    <DetailTitlebar report={report} onBack={() => navigate("/app/platform/business/shipment-reports")} actions={canCancel ? <>{report.status === "pending_review" && <button className="primary-small" onClick={() => { setReviewResult("approved"); setReviewOpen(true); }}>审核</button>}<button className="danger-outline-button" onClick={() => setCancelOpen(true)}>取消</button></> : undefined} />
    <ActionFeedback feedback={feedback} onRefresh={refresh} />
    <ShipmentDetailSections report={report} />
    {reviewOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={() => setReviewOpen(false)}><section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="shipment-review-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><h2 id="shipment-review-title">出货报告审核</h2><button aria-label="关闭审核弹窗" onClick={() => setReviewOpen(false)}><X size={21} /></button></header>
      <div className="dialog-body"><div className="dialog-business-no"><span>业务编号：</span><strong>{report.businessNo}</strong></div><fieldset><legend>审核结果 <em>*</em></legend><label><input type="radio" name="review-result" checked={reviewResult === "approved"} onChange={() => setReviewResult("approved")} />审核通过</label><label><input type="radio" name="review-result" checked={reviewResult === "rejected"} onChange={() => setReviewResult("rejected")} />审核驳回</label></fieldset>{reviewResult === "rejected" && <label className="dialog-textarea"><span className="dialog-field-label">驳回原因 <em>*</em></span><textarea required minLength={1} maxLength={100} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="请输入驳回原因（必填，最多100字）" aria-label="驳回原因" /><span className="dialog-counter">{reviewReason.length} / 100</span></label>}<label className="dialog-textarea"><span className="dialog-field-label">审核意见 <small>（选填）</small></span><textarea maxLength={100} placeholder="请输入审核意见（选填，最多100字）" /><span className="dialog-counter">0 / 100</span></label></div>
      <footer><button className="secondary-button" onClick={() => setReviewOpen(false)}>取消</button>{reviewResult === "approved" ? <button className="primary-small" onClick={approve}>提交审核</button> : <form onSubmit={reject}><button className="primary-small" type="submit">提交审核</button></form>}</footer>
    </section></div>}
    {cancelOpen && <CancelShipmentDialog report={report} actor="platform" onCancel={cancelReport} onClose={() => setCancelOpen(false)} />}
  </div>;
}

function NotificationPreviewPage({ role }: { role: DemoRole }) {
  const navigate = useNavigate(); const notifications = notificationsFromAudit(role);
  return <div className="page-stack notification-page"><div className="list-page-title"><h1>通知预览</h1>{role === "platform" && <button className="secondary-button" onClick={() => navigate("/app/platform/audit-logs")}>查看审计日志</button>}</div><section className="work-card notification-list"><header><div><h2>站内通知</h2><p>演示环境根据业务操作实时生成，不发送真实短信或邮件。</p></div><span className="list-count">共 {notifications.length} 条</span></header>{notifications.length ? notifications.map((item) => <article key={item.id}><span className="notification-mark"><Bell size={16} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></article>) : <div className="page-state compact"><Bell size={22} /><strong>暂无通知</strong><span>完成一项业务操作后将在此生成通知预览。</span></div>}</section></div>;
}

function AuditLogPage() {
  const [query, setQuery] = useState("");
  const access = qePlatformAccess();
  const qeLogs: AuditLogRecord[] = access?.administrator ? readQeAudit()
    .filter((entry) => access.session.organizationId === roleProfiles.platform.organizationId || entry.actor.organizationId === access.session.organizationId)
    .map((entry) => ({
      id: entry.id, action: entry.action, businessType: "QE 助手", businessNo: entry.businessNo,
      operator: entry.actor.name, organization: organizationNameById(entry.actor.organizationId), time: entry.time, detail: entry.detail,
    })) : [];
  const logs = [...readAuditLogs(), ...qeLogs].sort((a, b) => b.time.localeCompare(a.time))
    .filter((item) => !query.trim() || `${item.action}${item.businessNo}${item.operator}${item.organization}`.includes(query.trim()));
  return <div className="page-stack platform-admin-page"><div className="list-page-title"><h1>审计日志</h1><button className="secondary-button" onClick={() => exportRowsAsXlsx("审计日志", ["时间", "业务类型", "业务编号", "操作", "操作人", "组织", "详情"], logs.map((item) => [item.time, item.businessType, item.businessNo, item.action, item.operator, item.organization, item.detail]))}>导出</button></div><section className="admin-filter-card audit-filter"><input aria-label="搜索审计日志" placeholder="搜索业务编号/操作人/操作" value={query} onChange={(event) => setQuery(event.target.value)} /></section><section className="work-card admin-table-card"><div className="responsive-table"><table><thead><tr><th>操作时间</th><th>业务类型</th><th>业务编号</th><th>操作</th><th>操作人</th><th>组织</th><th>详情</th></tr></thead><tbody>{logs.map((item) => <tr key={item.id}><td>{item.time}</td><td>{item.businessType}</td><td>{item.businessNo || "—"}</td><td>{item.action}</td><td>{item.operator}</td><td>{item.organization}</td><td>{item.businessType === "QE 助手" ? <details><summary>查看记录</summary><pre className="qe-audit-details">{item.detail}</pre></details> : item.detail || "—"}</td></tr>)}{logs.length === 0 && <tr><td className="empty-cell" colSpan={7}>暂无审计日志</td></tr>}</tbody></table></div></section></div>;
}

const qePlatformPermissionsEvent = "quality-platform:platform-permissions";

function qePlatformAccess() {
  const session = readDemoSession();
  if (session?.role !== "platform" || session.status !== "enabled") return;
  const userId = session.userId === roleProfiles.platform.userId ? "platform-user-super-admin" : session.userId;
  const user = readPlatformUsers().find((entry) => entry.id === userId);
  if (!user || user.status !== "enabled" || !user.organizationIds.includes(session.organizationId)) return;
  const roles = readPlatformRoles().filter((role) => user.roleIds.includes(role.id));
  const permissions = new Set(roles.flatMap((role) => role.permissionCodes));
  return { session, user, permissions, administrator: roles.some((role) => role.system) };
}

function qeAssistantAccess() {
  const access = qePlatformAccess();
  if (access?.permissions.has("platform.business.record.read") &&
    [...access.permissions].some((permission) => permission.startsWith("platform.business.") && permission.endsWith(".access"))) return access;
}

function qeFields(values: Array<[string, string | number | undefined]>): QeField[] {
  return values.flatMap(([label, value]) => value === undefined || value === "" ? [] : [{ label, value }]);
}

function qeDefectRate(inspectionQty?: number, defectQty?: number) {
  return inspectionQty && defectQty !== undefined ? `${(defectQty / inspectionQty * 100).toFixed(2)}%` : undefined;
}

function qeBusinessRecord(
  row: {
    id: string; businessNo: string; status: string; updatedAt: string; flowRecords: FlowRecord[];
    materialNo?: string; supplierName?: string; attachmentName?: string; attachmentDataUrl?: string;
    eightDAttachmentName?: string; eightDAttachmentDataUrl?: string;
    replenishAttachmentName?: string; replenishAttachmentDataUrl?: string;
    reviewReason?: string; cancelReason?: string; remark?: string; eightDRemark?: string;
  },
  spec: Pick<QeRecord, "label" | "href" | "date" | "statusLabel" | "organization" | "organizationId">
    & Partial<Pick<QeRecord, "pending" | "followUp" | "aliases" | "missing" | "report">>,
  fields: Array<[string, string | number | undefined]>,
): QeRecord {
  const attachments: QeAttachment[] = [];
  if (row.attachmentName) attachments.push({
    name: row.attachmentName, dataUrl: row.attachmentDataUrl,
    approvedStandard: (row.id === "qe-demo-rule-iqc" && row.attachmentName === "SIP-QE-IQC-V1.txt") ||
      (row.id === "qe-demo-rule-pqc" && row.attachmentName === "SIP-QE-PQC-V1.txt"),
  });
  if (row.eightDAttachmentName) attachments.push({ name: row.eightDAttachmentName, dataUrl: row.eightDAttachmentDataUrl });
  if (row.replenishAttachmentName) attachments.push({ name: row.replenishAttachmentName, dataUrl: row.replenishAttachmentDataUrl });
  return {
    ...spec, key: spec.href, no: row.businessNo, status: row.status,
    updatedAt: row.updatedAt, material: row.materialNo, supplier: row.supplierName,
    attachments,
    fields: qeFields([
      ["业务编号", row.businessNo], ["物料料号", row.materialNo],
      ["供应商", row.supplierName ? "已关联供应商（名称已脱敏）" : undefined], ...fields,
      ["检验或提报备注", row.remark], ["8D备注", row.eightDRemark],
      ["审核意见", row.reviewReason], ["取消说明", row.cancelReason], ["当前状态", spec.statusLabel],
    ]),
    history: (row.flowRecords ?? []).map((item) => ({
      label: `流转记录 · ${item.time} · ${item.action}`, value: item.detail || item.action,
    })),
  };
}

function qeEightD(row: { status: string; supplierOrganizationId?: string; flowRecords: FlowRecord[] }) {
  const first = row.flowRecords.filter((item) => item.kind === "submitted_8d").map((item) => item.time).sort()[0];
  return {
    eightDRequired: Boolean(row.supplierOrganizationId && ["waiting_supplier", "pending_supplier", "pending_8d_review", "rejected_8d", "approved"].includes(row.status)),
    eightDSubmittedAt: first,
  };
}

function qeDynamicContext(
  pathname: string,
  canRead: (code: string) => boolean,
  allowedOrg: (id: string) => boolean,
): QeRecord | undefined {
  const match = matchPath("/app/platform/business/:code/:id", pathname);
  if (!match?.params.code || !match.params.id || match.params.id === "new") return;
  const business = readConfigurationBusinesses().find((item) =>
    !item.builtIn && item.status === "active" && encodeURIComponent(item.code) === match.params.code);
  if (!business || !canRead(business.code)) return;
  const version = readBusinessDefinitionConfigs().find((item) => item.businessId === business.id)?.versions.find((item) => item.active);
  if (!version?.permissions.read) return;
  const store = readDynamicBusinessRuntimeStore();
  const row = store.records.find((record) => record.businessId === business.id &&
    encodeURIComponent(record.id) === match.params.id && allowedOrg(record.organizationId));
  if (!row) return;
  const href = pathname.replace(/\/$/, "");
  const fields = (row.definitionSnapshot?.form ?? version.form).groups.flatMap((group) => group.fields
    .filter((field) => field.visible !== false)
    .map(({ label, fieldCode }): [string, string] => {
      const prefix = `${redact(label)}：`;
      return [redact(label), redact(prefix + dynamicFieldValue(row, fieldCode)).slice(prefix.length)];
    }));
  return {
    key: href, href, label: redact(business.name), no: row.id, status: row.archivedAt ? "completed" : row.status,
    statusLabel: row.status, date: row.createdAt.slice(0, 10), updatedAt: row.updatedAt,
    organizationId: row.organizationId, organization: row.organizationName,
    fields: qeFields([["业务编号", row.id], ...fields, ["当前状态", row.status]]),
    history: store.events.filter((event) => event.recordId === row.id).map((event) => ({
      label: `流转记录 · ${event.createdAt} · ${event.action}`, value: event.toStatus,
    })),
    attachments: [],
  };
}

function readQeData(contextPath?: string): QeData {
  const access = qeAssistantAccess();
  if (!access) throw new Error("当前账号无法使用 QE 助手");
  const { permissions, session, user } = access;
  const readable = (resource: string) => permissions.has("platform.business.record.read") &&
    permissions.has(`platform.business.${resource}.access`);
  const pending = (resource: string) => permissions.has("platform.business.record.review") &&
    (resource === "incoming_inspection" || permissions.has(`platform.home.${resource}.read`));
  const allowedOrg = (id?: string) => session.organizationId === roleProfiles.platform.organizationId ||
    Boolean(id && id === session.organizationId && user.organizationIds.includes(id));
  const direct = readDirectBusinessRecords().filter((row) => readable(directBusinessPermissionResources[row.businessType]) && allowedOrg(row.factoryOrganizationId));
  const audited = readAuditedBusinessRecords().filter((row) => readable(auditedBusinessPermissionResources[row.businessType]) && allowedOrg(row.factoryOrganizationId));
  const incoming = readable("incoming_inspection") ? readIncomingInspections().filter((row) => allowedOrg(row.factoryOrganizationId)) : [];
  const products = readable("production_inspection_daily") || readable("inbound_report")
    ? readProductData().filter((row) => allowedOrg(row.organizationId) && row.status === "enabled") : [];

  const records: QeRecord[] = [
    ...(readable("shipment_report") ? readShipmentReports() : []).filter((row) => allowedOrg(row.supplierOrganizationId)).map((row) => qeBusinessRecord(row, {
      label: "出货报告", href: `/app/platform/business/shipment-reports/${row.id}`, date: row.shipmentDate,
      statusLabel: shipmentStatusLabel(row.status), organization: "", organizationId: row.supplierOrganizationId,
      pending: row.status === "pending_review" && pending("shipment_report"),
      missing: row.attachmentName ? [] : ["出货报告附件"],
    }, [["物料名称", row.materialName], ["型号", row.model], ["订单号", row.orderNo], ["订单数量", row.orderQty], ["出货数量", row.shipmentQty]])),
    ...(readable("material_exception") ? readMaterialExceptions() : []).filter((row) => allowedOrg(row.reporterOrganizationId)).map((row) => qeBusinessRecord(row, {
      label: "物料异常", href: `/app/platform/business/material-exceptions/${row.id}`, date: row.businessDate,
      aliases: row.reporterOrganizationId === session.organizationId && permissions.has("platform.business.material_exception.submit")
        ? [`/app/platform/platform-business/material-exceptions/${row.id}`] : [],
      statusLabel: materialStatusLabel(row.status), organization: row.reporterOrganization, organizationId: row.reporterOrganizationId,
      pending: ["pending_review", "pending_8d_review"].includes(row.status) && pending("material_exception"),
      report: { ...qeEightD(row), exceptionSource: row.sourceIncomingInspectionNo ? "来料检验触发" :
        row.reporterOrganizationId === roleProfiles.platform.organizationId ? "平台提报" : "代工厂提报" },
      followUp: !["approved", "cancelled"].includes(row.status),
      missing: [!row.description?.trim() ? "异常说明" : "", !row.attachmentName ? "异常附件" : "",
        row.status === "pending_8d_review" && !row.eightDAttachmentName ? "8D附件" : ""].filter(Boolean),
    }, [["物料名称", row.materialName], ["型号", row.model], ["投入数量", row.inputQty],
      ["检验数量", row.inspectionQty], ["不良数量", row.defectQty], ["不良率", qeDefectRate(row.inspectionQty, row.defectQty)],
      ["异常描述", row.description], ["异常反馈时间", row.businessDate], ["提报时间", row.createdAt],
      ["来料检验来源", row.sourceIncomingInspectionNo]])),
    ...(readable("after_sales_exception") ? readAfterSalesExceptions() : []).filter(() => allowedOrg(roleProfiles.platform.organizationId)).map((row) => qeBusinessRecord(row, {
      label: "售后异常", href: `/app/platform/business/after-sales-exception/${row.id}`, date: row.businessDate,
      aliases: permissions.has("platform.business.after_sales_exception.submit")
        ? [`/app/platform/platform-business/after-sales-exception/${row.id}`] : [],
      statusLabel: afterSalesStatusLabel(row.status), organization: row.reporterOrganization, organizationId: roleProfiles.platform.organizationId,
      pending: row.status === "pending_8d_review" && pending("after_sales_exception"),
      report: qeEightD(row),
      followUp: !["approved", "cancelled"].includes(row.status),
      missing: [!row.description?.trim() ? "异常说明" : "", !row.attachmentName ? "异常附件" : "",
        row.status === "pending_8d_review" && !row.eightDAttachmentName ? "8D附件" : ""].filter(Boolean),
    }, [["物料名称", row.materialName], ["型号", row.model], ["投入数量", row.inputQty], ["不良数量", row.defectQty],
      ["退料数量", row.returnQty], ["异常描述", row.description]])),
    ...incoming.map((row) => qeBusinessRecord(row, {
      label: "来料检验", href: `/app/platform/business/incoming-inspections/${row.id}`, date: row.inspectionDate,
      statusLabel: incomingInspectionStatusLabel(row.status), organization: row.factoryOrganization, organizationId: row.factoryOrganizationId,
      pending: row.status === "pending_review" && pending("incoming_inspection"),
      report: { supplyMethod: row.supplyMethod },
      missing: row.inspectionResult === "unqualified" && !row.defectDescription?.trim() ? ["不良现象"] : [],
    }, [["物料名称", row.materialName], ["型号", row.model], ["来料数量", row.inputQty], ["检验数量", row.inspectionQty],
      ["不良数量", row.defectQty], ["不良率", qeDefectRate(row.inspectionQty, row.defectQty)],
      ["检验结果", row.inspectionResult === "qualified" ? "合格" : "不合格"],
      ["不良现象", row.defectDescription], ["处理方式", row.handlingMethod], ["关联物料异常", row.triggeredMaterialExceptionNo]])),
    ...direct.map((row) => qeBusinessRecord(row, {
      label: directBusinessLabels[row.businessType], href: `${directBusinessPath("platform", row.businessType)}/${row.id}`, date: row.businessDate,
      statusLabel: "已完成", organization: row.factoryOrganization, organizationId: row.factoryOrganizationId,
      report: {
        defects: row.defectDetails?.map((item) => ({ name: item.defect, count: item.quantity })),
        repairs: row.repairDetails?.map((item) => ({ name: item.defect, count: item.quantity })),
      },
    }, [["产品名称", row.productName], ["产品型号", row.productModel], ["订单号", row.orderNo], ["订单数量", row.orderQty],
      ["投入数量", row.inputQty], ["检验数量", row.inspectionQty], ["不良数量", row.defectQty], ["检验工序", row.inspectionProcess],
      ["不良率", row.businessType === "production_inspection" ? qeDefectRate(row.inspectionQty, row.defectQty) : undefined],
      ["异常描述", row.issueDescription], ["改善措施", row.improvementMeasure], ["问题位置", row.issueLocation],
      ["问题定位", row.issueCategory],
      ["责任部门", row.responsibleDepartment],
      ["处理进度", row.progress ? ({ pending: "未纠正", processing: "处理中", completed: "已纠正" } as const)[row.progress] : undefined],
      ...(row.defectDetails ?? []).map((entry): [string, string] => ["缺陷明细", `${entry.defect} · ${entry.quantity} 件`]),
      ...(row.repairDetails ?? []).map((entry): [string, string] => ["维修明细", [entry.defect, `${entry.quantity} 件`, entry.cause, entry.method].filter(Boolean).join(" · ")]),
      ...(row.repairDetails ?? []).map((entry): [string, string] => ["来源日报", entry.sourceProductionInspectionNo])])),
    ...audited.map((row) => qeBusinessRecord(row, {
      label: auditedBusinessLabels[row.businessType], href: `${auditedBusinessPath("platform", row.businessType)}/${row.id}`, date: row.businessDate,
      statusLabel: auditedStatusLabel(row.status), organization: row.factoryOrganization, organizationId: row.factoryOrganizationId,
      pending: row.status === "pending_review" && pending(auditedBusinessPermissionResources[row.businessType]),
    }, [["产品名称", row.productName], ["产品型号", row.productModel], ["物料名称", row.materialName],
      ["订单号", row.orderNo], ["订单数量", row.orderQty],
      ...(row.businessType === "inbound_report" ? [
        ["入库数量", row.inboundQty], ["入库合格类型", row.qualifiedType === "qualified" ? "合格" : "不合格"],
      ] as Array<[string, string | number]> : []),
      ...(row.businessType === "sporadic_return" ? [["退料原因", row.returnReason], ["退料数量", row.returnQty]] as Array<[string, string | number]> : []),
      ["试产信息", row.trialInfo]])),
    ...products.map((row): QeRecord => ({
      key: row.id, no: row.materialNo, href: `/app/platform/product-data?material=${encodeURIComponent(row.materialNo)}`,
      label: "基础数据", date: row.updatedAt, updatedAt: row.updatedAt, status: row.status, statusLabel: "已启用",
      organizationId: row.organizationId, organization: organizationNameById(row.organizationId), material: row.materialNo,
      history: [], attachments: [], fields: qeFields([["物料料号", row.materialNo], ["产品名称", row.productName],
        ["产品型号", row.productModel], ["物料数量", row.materialQty]]),
    })),
  ];
  if (contextPath) {
    const context = qeDynamicContext(contextPath, (code) => access.administrator || readable(code), allowedOrg);
    if (context && !records.some(({ href }) => href === context.href)) records.push(context);
  }
  if (permissions.has("platform.home.merchant_registration.read") && permissions.has("platform.merchant.organization.review") &&
    session.organizationId === roleProfiles.platform.organizationId) {
    for (const row of readMerchantApplications().filter((item) => item.reviewStatus === "pending")) {
      records.push(qeBusinessRecord({ ...row, status: row.reviewStatus, businessNo: row.merchantNo }, {
        label: "商家注册", href: `/app/platform/merchant-audits?application=${row.id}`, date: row.createdAt, statusLabel: "待审核",
        organization: "", organizationId: merchantOrganizationId(row), pending: true,
      }, []));
    }
  }
  const metricPermissions = [
    ["production_inspection_daily", "inbound_report"], ["production_inspection_daily"], ["production_inspection_daily"],
    ["inbound_report"], ["incoming_inspection"], ["incoming_inspection"], ["inbound_report", "sporadic_return"],
  ];
  const metrics = qualityMetricDefinitions.flatMap((metric, index) => metricPermissions[index].every(readable) ? [{
    ...metric,
    defaultOrganizationId: session.organizationId === roleProfiles.platform.organizationId ? undefined : session.organizationId,
    reading: (range: Period, organizationId?: string, materialNo?: string, supplier?: string) =>
      calculateMetric(metric.id, { range, organizationId, materialNo, supplier }, { direct, audited, incoming, products }),
  }] : []);
  const organizations = [...new Map(records.flatMap((row) => row.organizationId && row.organization && !row.supplier?.includes(row.organization)
    ? [[row.organizationId, row.organization] as const] : [])).entries()]
    .map(([id, name]) => ({ id, name: redact(name) }));
  const readableLabels = [
    ...Object.entries(directBusinessPermissionResources).filter(([, resource]) => readable(resource))
      .map(([type]) => directBusinessLabels[type as DirectBusinessType]),
    ...Object.entries(auditedBusinessPermissionResources).filter(([, resource]) => readable(resource))
      .map(([type]) => auditedBusinessLabels[type as AuditedBusinessType]),
    ...([["incoming_inspection", "来料检验"], ["material_exception", "物料异常"], ["after_sales_exception", "售后异常"],
      ["shipment_report", "出货报告"]] as const).filter(([resource]) => readable(resource)).map(([, label]) => label),
  ];
  const sourcePages: Record<string, string> = Object.fromEntries(Object.entries({
    "来料检验": "/app/platform/business/incoming-inspections",
    "物料异常": "/app/platform/business/material-exceptions",
    "售后异常": "/app/platform/business/after-sales-exception",
    "出货报告": "/app/platform/business/shipment-reports",
    ...Object.entries(directBusinessLabels).reduce<Record<string, string>>((paths, [code, label]) => {
      paths[label] = directBusinessPath("platform", code as DirectBusinessType);
      return paths;
    }, {}),
    ...Object.entries(auditedBusinessLabels).reduce<Record<string, string>>((paths, [code, label]) => {
      paths[label] = auditedBusinessPath("platform", code as AuditedBusinessType);
      return paths;
    }, {}),
  }).filter(([label]) => readableLabels.includes(label)));
  return { records, metrics, organizations, readableLabels, sourcePages, now: new Date() };
}

function QeEvidencePage() {
  const { search } = useLocation();
  const sample = readQeSample(new URLSearchParams(search).get("id") ?? "");
  let records: QeRecord[] = [];
  if (sample && qeAssistantAccess()) {
    const links = new Set(sample.rows);
    records = readQeData().records.filter(row => links.has(row.href)).sort((a, b) => b.date.localeCompare(a.date));
  }
  if (!sample || !records.length || records.length !== new Set(sample.rows).size) return <div className="page-stack"><h1>暂无可查看的统计样本</h1><Link to={qeAssistantPath}>返回 QE 助手</Link></div>;
  return <div className="page-stack">
    <header className="page-heading"><div><h1>{redact(sample.label)}</h1><p>{redact(sample.description)}</p></div>
      <Link to={qeAssistantPath} className="secondary-button">返回 QE 助手</Link>
    </header>
    <div className="responsive-table"><table>
      <thead><tr><th>业务单据</th><th>类型</th><th>组织</th><th>日期</th><th>当前状态</th></tr></thead>
      <tbody>{records.map(row => <tr key={row.key}><td><Link to={row.href}>{row.no}</Link></td>
        <td>{row.label}</td><td>{row.organization}</td><td>{row.date.slice(0, 10)}</td><td>{row.statusLabel}</td></tr>)}</tbody>
    </table></div>
  </div>;
}

function usePlatformQeAccess(role: DemoRole) {
  const [, setPermissionRevision] = useState(0);
  useEffect(() => {
    if (role !== "platform") return;
    const refresh = () => setPermissionRevision((value) => value + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener(qePlatformPermissionsEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(qePlatformPermissionsEvent, refresh);
    };
  }, [role]);
  return role === "platform" ? qeAssistantAccess() : undefined;
}

function PlatformQeAssistant({ access, page, home }: {
  access: NonNullable<ReturnType<typeof qeAssistantAccess>>; page?: boolean; home?: QeHomeContext;
}) {
  const { session, user, permissions } = access;
  const scopeKey = [session.organizationId, user.id, ...[...permissions].sort()].join("|");
  const Assistant = page ? QeAssistantPage : QeAssistant;
  return <Assistant key={scopeKey} load={readQeData} scopeKey={scopeKey} home={home} driver={configuredLlmDriver}
    organization={session.organizationName ?? organizationNameById(session.organizationId)}
    actor={{ id: user.id, name: user.name, organizationId: session.organizationId }} />;
}

export function ApplicationShell({ role, children }: { role: DemoRole; children?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [qeHome, setQeHome] = useState<QeHomeContext>();
  const access = usePlatformQeAccess(role);
  const { pathname } = useLocation();
  const assistantPage = role === "platform" && Boolean(matchPath(qeAssistantPath, pathname));
  const content = assistantPage
    ? (access ? <PlatformQeAssistant page access={access} /> : <MerchantBusinessAccessDenied role="platform" />)
    : children ?? (role === "platform" ? <PlatformHome onQeContextChange={setQeHome} /> : role === "supplier" ? <SupplierHome /> : <FactoryHome />);
  return (
    <div className="app-layout">
      <Sidebar role={role} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} canUseAssistant={Boolean(access)} />
      <div className="app-main">
        <Topbar role={role} onMenu={() => setMobileOpen(true)} />
        <div className="app-workspace">
          <main className="app-content">{content}</main>
        </div>
      </div>
      {access && !assistantPage && <PlatformQeAssistant access={access} home={children ? undefined : qeHome} />}
      <div className="demo-switcher" aria-label="切换演示身份"><span>演示身份</span>{quickEntries.map(({ role: nextRole, title, icon: Icon }) => <Link className={role === nextRole ? "active" : ""} key={nextRole} to={`/app/${nextRole}`} title={title} onClick={() => writeDemoSession(createDemoSession(nextRole))}><Icon size={16}/><span>{title}</span></Link>)}<Link className="freeze-link" to="/app/frozen" title="冻结页"><LockKeyhole size={16}/><span>冻结页</span></Link><button aria-label="收起演示切换"><X size={15}/></button></div>
    </div>
  );
}

function PermissionDeniedPage({ currentRole, requiredRole }: { currentRole: DemoRole; requiredRole: DemoRole }) {
  const navigate = useNavigate();
  return <main className="boundary-page"><div className="boundary-card"><span className="boundary-icon permission"><ShieldCheck size={28} /></span><p className="eyebrow">ACCESS CONTROL</p><h1>暂无访问权限</h1><p>当前演示身份为「{roleProfiles[currentRole].label}」，无法访问「{roleProfiles[requiredRole].label}」专属页面。</p><div className="boundary-actions"><button className="primary-button" onClick={() => navigate(`/app/${currentRole}`)}>返回当前工作台</button><button className="secondary-button" onClick={() => { clearDemoSession(); navigate("/"); }}>退出演示</button></div></div></main>;
}

export function FrozenOrganizationPage() {
  const session = readDemoSession() ?? createDemoSession("factory", "disabled");
  const profile = { ...roleProfiles[session.role], organization: session.organizationName ?? roleProfiles[session.role].organization };
  return <main className="boundary-page frozen-page"><div className="boundary-card"><span className="boundary-icon frozen"><LockKeyhole size={28} /></span><p className="eyebrow">ORGANIZATION FROZEN</p><h1>当前商家已冻结</h1><p>{profile.organization}（{profile.label}）当前处于停用状态，暂不可访问业务页面。</p><div className="freeze-note"><strong>冻结原因</strong><span>当前商家已冻结，如有疑问请联系平台。</span></div><div className="boundary-actions"><OrganizationRecoveryActions session={session} /></div></div></main>;
}

function DisabledMembershipPage() {
  const session = readDemoSession() ?? createDemoSession("supplier", "disabled");
  return <main className="boundary-page"><div className="boundary-card"><span className="boundary-icon permission"><LockKeyhole size={28} /></span><p className="eyebrow">MEMBERSHIP DISABLED</p><h1>当前组织成员已禁用</h1><p>您在「{session.organizationName ?? "当前组织"}」的成员资格已被禁用，无法继续访问该组织数据。</p><div className="boundary-actions"><OrganizationRecoveryActions session={session} /></div></div></main>;
}

function MerchantBusinessAccessDenied({ role = "supplier" }: { role?: DemoRole } = {}) {
  const navigate = useNavigate();
  const explanation = role === "platform" ? "请联系平台管理员分配业务查看权限。" : "当前成员没有此业务的当前组织权限，请联系商家超级管理员分配角色。";
  return <div className="page-stack"><section className="work-card merchant-user-denied"><ShieldCheck size={28} /><h1>暂无业务权限</h1><p>{explanation}</p><button className="primary-small" type="button" onClick={() => navigate(`/app/${role}`)}>返回工作台</button></section></div>;
}

export function canAccessOrganizationRecord(
  role: DemoRole,
  organizationId: string,
  record: { supplierOrganizationId?: string; reporterOrganizationId?: string; factoryOrganizationId?: string },
): boolean {
  if (role === "platform") return true;
  if (role === "supplier") return record.supplierOrganizationId === organizationId;
  return record.factoryOrganizationId === organizationId || record.reporterOrganizationId === organizationId;
}

function OrganizationRecoveryActions({ session }: { session: DemoSession }) {
  const navigate = useNavigate();
  if (session.role === "platform") return <button className="primary-button" onClick={() => { clearDemoSession(); navigate("/"); }}>返回登录页</button>;
  const store = readMerchantIdentityStore(merchantIdentitySources());
  const alternatives = readMerchantApplications().flatMap((application) => {
    const organizationId = merchantOrganizationId(application);
    const membership = store.memberships.find((entry) => entry.accountId === session.userId && entry.organizationId === organizationId && entry.status === "enabled");
    return application.reviewStatus === "approved" && application.usageStatus === "active" && organizationId !== session.organizationId && membership
      ? [{ application, membership }]
      : [];
  });
  const account = store.accounts.find((entry) => entry.id === session.userId);
  function switchOrganization(application: MerchantApplication, membership: MerchantMembership): void {
    if (!account) return;
    writeLastOrganization(account.id, membership.organizationId);
    writeDemoSession(createMerchantSession(application, account, membership));
    navigate(`/app/${merchantRole(application.merchantType)}`);
  }
  return <>{alternatives.map(({ application, membership }) => <button className="primary-button" key={membership.id} onClick={() => switchOrganization(application, membership)}>切换到{application.companyName}</button>)}<button className="secondary-button" onClick={() => { clearDemoSession(); navigate("/"); }}>退出登录</button></>;
}

function DisabledAccountPage() {
  const navigate = useNavigate();
  return <main className="boundary-page"><div className="boundary-card"><span className="boundary-icon permission"><LockKeyhole size={28} /></span><p className="eyebrow">ACCOUNT DISABLED</p><h1>当前账号已禁用</h1><p>该手机号账号已被平台停用，暂不能访问任何组织。</p><div className="boundary-actions"><button className="primary-button" onClick={() => { clearDemoSession(); navigate("/"); }}>返回登录页</button></div></div></main>;
}

function ProtectedAppRoute({ role, children, requiredPermission }: { role: DemoRole; children?: ReactNode; requiredPermission?: string }) {
  const session = ensureDemoSession(role);
  const merchantOrganization = readMerchantApplications().find((item) => merchantOrganizationId(item) === session.organizationId);
  const identityStore = role === "platform" ? undefined : readMerchantIdentityStore(merchantIdentitySources());
  const account = role === "platform" ? undefined : identityStore?.accounts.find((entry) => entry.id === session.userId);
  const membership = role === "platform" ? undefined : identityStore?.memberships.find((entry) =>
    entry.organizationId === session.organizationId && entry.accountId === session.userId);
  if (session.role !== role) return <PermissionDeniedPage currentRole={session.role} requiredRole={role} />;
  if (role !== "platform" && account?.status === "disabled") return <DisabledAccountPage />;
  if (role !== "platform" && merchantOrganization?.usageStatus === "inactive") return <FrozenOrganizationPage />;
  if (role !== "platform" && ((account && !membership) || membership?.status === "disabled")) return <DisabledMembershipPage />;
  if (session.status === "disabled") return <FrozenOrganizationPage />;
  if (requiredPermission && role !== "platform" && !hasMerchantPermission(merchantIdentitySources(), session.organizationId, session.userId, requiredPermission)) {
    return <ApplicationShell role={role}><MerchantBusinessAccessDenied /></ApplicationShell>;
  }
  return children ? <ApplicationShell role={role}>{children}</ApplicationShell> : <ApplicationShell role={role} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/merchant/register" element={<MerchantRegisterPage />} />
      <Route path="/app/platform" element={<ProtectedAppRoute role="platform" />} />
      <Route path={qeAssistantPath} element={<ProtectedAppRoute role="platform" />} />
      <Route path={evidencePath} element={<ProtectedAppRoute role="platform"><QeEvidencePage /></ProtectedAppRoute>} />
      <Route path="/app/platform/todos" element={<ProtectedAppRoute role="platform"><PlatformTodosPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/analysis/order-completion" element={<ProtectedAppRoute role="platform"><OrderCompletionAnalysisPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/analysis/customer-material-yield" element={<ProtectedAppRoute role="platform"><CustomerMaterialYieldAnalysisPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/product-data" element={<ProtectedAppRoute role="platform"><ProductDataPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/businesses" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="businesses" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/businesses/new" element={<ProtectedAppRoute role="platform"><BusinessDefinitionWorkbench isNew /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/businesses/:businessId" element={<ProtectedAppRoute role="platform"><BusinessDefinitionWorkbench /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/:code/new" element={<ProtectedAppRoute role="platform"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/:code/:id" element={<ProtectedAppRoute role="platform"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/:code" element={<ProtectedAppRoute role="platform"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/assets" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="assets" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/analytics" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="analytics" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/audit" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="audit" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/dictionaries" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="dictionaries" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/fields" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="fields" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/schemas" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="schemas" /></ProtectedAppRoute>} />
      <Route path="/app/platform/configuration/designer" element={<ProtectedAppRoute role="platform"><ConfigurationCenterPage view="designer" /></ProtectedAppRoute>} />
      <Route path="/app/platform/platform-business/material-exceptions" element={<ProtectedAppRoute role="platform"><MaterialExceptionListPage role="platform" surface="submission" /></ProtectedAppRoute>} />
      <Route path="/app/platform/platform-business/material-exceptions/new" element={<ProtectedAppRoute role="platform"><MaterialExceptionFormPage actor="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/platform-business/material-exceptions/:id" element={<ProtectedAppRoute role="platform"><MaterialExceptionDetailPage role="platform" surface="submission" /></ProtectedAppRoute>} />
      <Route path="/app/platform/platform-business/after-sales-exception" element={<ProtectedAppRoute role="platform"><AfterSalesListPage role="platform" surface="submission" /></ProtectedAppRoute>} />
      <Route path="/app/platform/platform-business/after-sales-exception/new" element={<ProtectedAppRoute role="platform"><AfterSalesFormPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/platform-business/after-sales-exception/:id" element={<ProtectedAppRoute role="platform"><AfterSalesDetailPage role="platform" surface="submission" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/shipment-reports" element={<ProtectedAppRoute role="platform"><PlatformShipmentReportsPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/shipment-reports/:id" element={<ProtectedAppRoute role="platform"><PlatformShipmentReportDetailPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/material-exceptions" element={<ProtectedAppRoute role="platform"><MaterialExceptionListPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/material-exceptions/:id" element={<ProtectedAppRoute role="platform"><MaterialExceptionDetailPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/incoming-inspections" element={<ProtectedAppRoute role="platform"><IncomingInspectionListPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/incoming-inspections/:id" element={<ProtectedAppRoute role="platform"><IncomingInspectionDetailPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/production-inspection-daily" element={<ProtectedAppRoute role="platform"><DirectBusinessListPage role="platform" type="production_inspection" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/production-inspection-daily/:id" element={<ProtectedAppRoute role="platform"><DirectBusinessDetailPage role="platform" type="production_inspection" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/maintenance-record" element={<ProtectedAppRoute role="platform"><DirectBusinessListPage role="platform" type="maintenance_record" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/maintenance-record/:id" element={<ProtectedAppRoute role="platform"><DirectBusinessDetailPage role="platform" type="maintenance_record" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/ipqc-patrol" element={<ProtectedAppRoute role="platform"><DirectBusinessListPage role="platform" type="ipqc_patrol" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/ipqc-patrol/:id" element={<ProtectedAppRoute role="platform"><DirectBusinessDetailPage role="platform" type="ipqc_patrol" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/sporadic-return" element={<ProtectedAppRoute role="platform"><AuditedBusinessListPage role="platform" type="sporadic_return" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/sporadic-return/:id" element={<ProtectedAppRoute role="platform"><AuditedBusinessDetailPage role="platform" type="sporadic_return" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/warehouse-in-report" element={<ProtectedAppRoute role="platform"><AuditedBusinessListPage role="platform" type="inbound_report" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/warehouse-in-report/:id" element={<ProtectedAppRoute role="platform"><AuditedBusinessDetailPage role="platform" type="inbound_report" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/trial-production-summary" element={<ProtectedAppRoute role="platform"><AuditedBusinessListPage role="platform" type="trial_summary" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/trial-production-summary/:id" element={<ProtectedAppRoute role="platform"><AuditedBusinessDetailPage role="platform" type="trial_summary" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/after-sales-exception" element={<ProtectedAppRoute role="platform"><AfterSalesListPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/business/after-sales-exception/:id" element={<ProtectedAppRoute role="platform"><AfterSalesDetailPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/merchants" element={<ProtectedAppRoute role="platform"><PlatformMerchantsPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/merchant-audits" element={<ProtectedAppRoute role="platform"><PlatformMerchantAuditsPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/merchants/:id" element={<ProtectedAppRoute role="platform"><PlatformMerchantDetailPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/users" element={<ProtectedAppRoute role="platform"><PlatformUsersPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/roles" element={<ProtectedAppRoute role="platform"><PlatformRolesPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/roles/:id/permissions" element={<ProtectedAppRoute role="platform"><RolePermissionPage /></ProtectedAppRoute>} />
      <Route path="/app/platform/notifications" element={<ProtectedAppRoute role="platform"><NotificationPreviewPage role="platform" /></ProtectedAppRoute>} />
      <Route path="/app/platform/audit-logs" element={<ProtectedAppRoute role="platform"><AuditLogPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier" element={<ProtectedAppRoute role="supplier" />} />
      <Route path="/app/supplier/business/:code/new" element={<ProtectedAppRoute role="supplier"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/business/:code/:id" element={<ProtectedAppRoute role="supplier"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/business/:code" element={<ProtectedAppRoute role="supplier"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/todos/:id" element={<ProtectedAppRoute role="supplier"><SupplierTodoRoute /></ProtectedAppRoute>} />
      <Route path="/app/supplier/shipment-reports" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.shipment_report.read"><SupplierShipmentReportsPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/shipment-reports/new" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.shipment_report.submit"><ShipmentReportFormPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/shipment-reports/:id" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.shipment_report.read"><SupplierShipmentReportDetailPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/shipment-reports/:id/edit" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.shipment_report.submit"><ShipmentReportFormPage /></ProtectedAppRoute>} />
      <Route path="/app/supplier/material-exceptions" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.material_exception.read"><MaterialExceptionListPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/material-exceptions/:id" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.material_exception.read"><MaterialExceptionDetailPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/after-sales-exception" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.after_sales_exception.read"><AfterSalesListPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/after-sales-exception/:id" element={<ProtectedAppRoute role="supplier" requiredPermission="merchant.business.after_sales_exception.read"><AfterSalesDetailPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/users" element={<ProtectedAppRoute role="supplier"><MerchantUsersPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/users/:id" element={<ProtectedAppRoute role="supplier"><MerchantUserDetailPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/roles" element={<ProtectedAppRoute role="supplier"><MerchantRolesPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/roles/:id/permissions" element={<ProtectedAppRoute role="supplier"><MerchantRolePermissionPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/supplier/notifications" element={<ProtectedAppRoute role="supplier"><NotificationPreviewPage role="supplier" /></ProtectedAppRoute>} />
      <Route path="/app/factory" element={<ProtectedAppRoute role="factory" />} />
      <Route path="/app/factory/business/:code/new" element={<ProtectedAppRoute role="factory"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/business/:code/:id" element={<ProtectedAppRoute role="factory"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/business/:code" element={<ProtectedAppRoute role="factory"><DynamicBusinessDataPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/todos/:id" element={<ProtectedAppRoute role="factory"><FactoryTodoRoute /></ProtectedAppRoute>} />
      <Route path="/app/factory/material-exceptions" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.material_exception.read"><MaterialExceptionListPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/material-exceptions/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.material_exception.submit"><MaterialExceptionFormPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/material-exceptions/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.material_exception.read"><MaterialExceptionDetailPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/material-exceptions/:id/edit" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.material_exception.submit"><MaterialExceptionFormPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/incoming-inspections" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.incoming_inspection.read"><IncomingInspectionListPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/incoming-inspections/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.incoming_inspection.submit"><IncomingInspectionFormPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/incoming-inspections/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.incoming_inspection.read"><IncomingInspectionDetailPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/incoming-inspections/:id/edit" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.incoming_inspection.submit"><IncomingInspectionFormPage /></ProtectedAppRoute>} />
      <Route path="/app/factory/production-inspection-daily" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.production_inspection_daily.read"><DirectBusinessListPage role="factory" type="production_inspection" /></ProtectedAppRoute>} />
      <Route path="/app/factory/production-inspection-daily/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.production_inspection_daily.submit"><DirectBusinessFormPage type="production_inspection" /></ProtectedAppRoute>} />
      <Route path="/app/factory/production-inspection-daily/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.production_inspection_daily.read"><DirectBusinessDetailPage role="factory" type="production_inspection" /></ProtectedAppRoute>} />
      <Route path="/app/factory/maintenance-record" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.repair_record.read"><DirectBusinessListPage role="factory" type="maintenance_record" /></ProtectedAppRoute>} />
      <Route path="/app/factory/maintenance-record/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.repair_record.submit"><DirectBusinessFormPage type="maintenance_record" /></ProtectedAppRoute>} />
      <Route path="/app/factory/maintenance-record/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.repair_record.read"><DirectBusinessDetailPage role="factory" type="maintenance_record" /></ProtectedAppRoute>} />
      <Route path="/app/factory/ipqc-patrol" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.ipqc_inspection.read"><DirectBusinessListPage role="factory" type="ipqc_patrol" /></ProtectedAppRoute>} />
      <Route path="/app/factory/ipqc-patrol/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.ipqc_inspection.submit"><DirectBusinessFormPage type="ipqc_patrol" /></ProtectedAppRoute>} />
      <Route path="/app/factory/ipqc-patrol/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.ipqc_inspection.read"><DirectBusinessDetailPage role="factory" type="ipqc_patrol" /></ProtectedAppRoute>} />
      <Route path="/app/factory/sporadic-return" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.sporadic_return.read"><AuditedBusinessListPage role="factory" type="sporadic_return" /></ProtectedAppRoute>} />
      <Route path="/app/factory/sporadic-return/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.sporadic_return.submit"><AuditedBusinessFormPage type="sporadic_return" /></ProtectedAppRoute>} />
      <Route path="/app/factory/sporadic-return/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.sporadic_return.read"><AuditedBusinessDetailPage role="factory" type="sporadic_return" /></ProtectedAppRoute>} />
      <Route path="/app/factory/sporadic-return/:id/edit" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.sporadic_return.submit"><AuditedBusinessFormPage type="sporadic_return" /></ProtectedAppRoute>} />
      <Route path="/app/factory/warehouse-in-report" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.inbound_report.read"><AuditedBusinessListPage role="factory" type="inbound_report" /></ProtectedAppRoute>} />
      <Route path="/app/factory/warehouse-in-report/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.inbound_report.submit"><AuditedBusinessFormPage type="inbound_report" /></ProtectedAppRoute>} />
      <Route path="/app/factory/warehouse-in-report/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.inbound_report.read"><AuditedBusinessDetailPage role="factory" type="inbound_report" /></ProtectedAppRoute>} />
      <Route path="/app/factory/warehouse-in-report/:id/edit" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.inbound_report.submit"><AuditedBusinessFormPage type="inbound_report" /></ProtectedAppRoute>} />
      <Route path="/app/factory/trial-production-summary" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.trial_production_summary.read"><AuditedBusinessListPage role="factory" type="trial_summary" /></ProtectedAppRoute>} />
      <Route path="/app/factory/trial-production-summary/new" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.trial_production_summary.submit"><AuditedBusinessFormPage type="trial_summary" /></ProtectedAppRoute>} />
      <Route path="/app/factory/trial-production-summary/:id" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.trial_production_summary.read"><AuditedBusinessDetailPage role="factory" type="trial_summary" /></ProtectedAppRoute>} />
      <Route path="/app/factory/trial-production-summary/:id/edit" element={<ProtectedAppRoute role="factory" requiredPermission="merchant.business.trial_production_summary.submit"><AuditedBusinessFormPage type="trial_summary" /></ProtectedAppRoute>} />
      <Route path="/app/factory/users" element={<ProtectedAppRoute role="factory"><MerchantUsersPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/users/:id" element={<ProtectedAppRoute role="factory"><MerchantUserDetailPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/roles" element={<ProtectedAppRoute role="factory"><MerchantRolesPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/roles/:id/permissions" element={<ProtectedAppRoute role="factory"><MerchantRolePermissionPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/factory/notifications" element={<ProtectedAppRoute role="factory"><NotificationPreviewPage role="factory" /></ProtectedAppRoute>} />
      <Route path="/app/frozen" element={<FrozenOrganizationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
