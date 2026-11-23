import { z } from "zod";

export * from "./permissions.ts";

export const organizationTypeSchema = z.enum(["platform", "merchant"]);
export const merchantTypeSchema = z.enum(["supplier", "factory"]);
export const auditStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const usageStatusSchema = z.enum(["enabled", "disabled"]);
export const userStatusSchema = z.enum(["enabled", "disabled"]);
export const accountStatusSchema = userStatusSchema;
export const membershipStatusSchema = userStatusSchema;

export const businessTypeCodeSchema = z.enum([
  "shipment_report",
  "material_exception",
  "after_sales_exception",
  "incoming_inspection",
  "production_inspection_daily",
  "repair_record",
  "ipqc_inspection",
  "sporadic_return",
  "inbound_report",
  "trial_production_summary",
]);

export const businessStateSchema = z.enum([
  "draft",
  "pending_review",
  "rejected",
  "pending_assignment",
  "pending_8d",
  "pending_8d_review",
  "pending_return",
  "pending_replenishment",
  "completed",
  "approved",
  "cancelled",
]);

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  type: organizationTypeSchema,
  merchantType: merchantTypeSchema.nullable(),
  auditStatus: auditStatusSchema,
  usageStatus: usageStatusSchema,
});

export const userSchema = z.object({
  id: z.string().uuid(),
  mobile: z.string().regex(/^1\d{10}$/),
  name: z.string().min(1).max(50),
  status: userStatusSchema,
  defaultOrganizationId: z.string().uuid(),
});

export const accountSchema = userSchema.extend({
  email: z.string().email().nullable(),
  passwordHash: z.string().min(1).nullable(),
  lastLoginAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const membershipSchema = z.object({
  id: z.string().min(1),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: membershipStatusSchema,
  position: z.string().max(50),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const membershipRoleSchema = z.object({
  membershipId: z.string().min(1),
  roleId: z.string().uuid(),
});

export const roleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  builtIn: z.boolean(),
});

export const formTemplateVersionSchema = z.object({
  id: z.string().uuid(),
  businessTypeCode: businessTypeCodeSchema,
  version: z.number().int().positive(),
  status: z.enum(["draft", "published", "retired"]),
  fieldSchema: z.record(z.unknown()),
  layout: z.record(z.unknown()),
});

export const workflowVersionSchema = z.object({
  id: z.string().uuid(),
  businessTypeCode: businessTypeCodeSchema,
  version: z.number().int().positive(),
  status: z.enum(["draft", "published", "retired"]),
  definition: z.object({
    initialState: businessStateSchema,
    states: z.array(businessStateSchema).min(1),
    transitions: z.array(z.object({
      from: businessStateSchema,
      command: z.string().min(1),
      to: businessStateSchema,
      actor: z.enum(["platform", "supplier", "factory"]),
    })),
  }),
});

export const businessRecordSchema = z.object({
  id: z.string().uuid(),
  businessNo: z.string().min(8).max(50),
  businessTypeCode: businessTypeCodeSchema,
  submitterOrganizationId: z.string().uuid(),
  currentHandlerOrganizationId: z.string().uuid().nullable(),
  formTemplateVersionId: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  state: businessStateSchema,
  formData: z.record(z.unknown()),
  version: z.number().int().positive(),
  submittedAt: z.string().datetime({ offset: true }),
});

export const workflowEventSchema = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
  fromState: businessStateSchema.nullable(),
  toState: businessStateSchema,
  command: z.string().min(1),
  actorUserId: z.string().uuid(),
  actorOrganizationId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  payload: z.record(z.unknown()),
});

export const todoTaskSchema = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
  taskType: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  handlerType: z.enum(["platform", "merchant"]),
  handlerOrganizationId: z.string().uuid().nullable(),
  status: z.enum(["pending", "completed", "cancelled"]),
  createdAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
});

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
  fieldCode: z.literal("FIELD_009"),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().max(10 * 1024 * 1024),
  storageKey: z.string().min(1),
});

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  traceId: z.string().min(1).max(100),
  detail: z.record(z.unknown()),
});

export const seedManifestSchema = z.object({
  seed: z.string().min(1),
  schemaVersion: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  timezone: z.literal("Asia/Shanghai"),
  counts: z.record(z.number().int().nonnegative()),
  scenarios: z.array(z.object({
    id: z.string().uuid(),
    code: z.string().min(1),
    anomalyLabel: z.string().min(1),
    rootCauseCode: z.string().min(1),
  })),
});

export type Organization = z.infer<typeof organizationSchema>;
export type User = z.infer<typeof userSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
export type Role = z.infer<typeof roleSchema>;
export type BusinessTypeCode = z.infer<typeof businessTypeCodeSchema>;
export type BusinessState = z.infer<typeof businessStateSchema>;
export type BusinessRecord = z.infer<typeof businessRecordSchema>;
export type TodoTask = z.infer<typeof todoTaskSchema>;
export type SeedManifest = z.infer<typeof seedManifestSchema>;
