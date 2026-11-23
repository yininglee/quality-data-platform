import type { BusinessRecord, BusinessTypeCode, Membership, Organization, Role } from "@quality-platform/contracts";

export const BUSINESS_TYPE_CATALOG: ReadonlyArray<{
  code: BusinessTypeCode;
  name: string;
  prefix: string;
  submitter: "platform" | "supplier" | "factory";
  requiresPlatformReview: boolean;
}> = [
  { code: "shipment_report", name: "出货报告", prefix: "SR", submitter: "supplier", requiresPlatformReview: true },
  { code: "material_exception", name: "物料异常", prefix: "ME", submitter: "factory", requiresPlatformReview: true },
  { code: "after_sales_exception", name: "售后异常", prefix: "SA", submitter: "platform", requiresPlatformReview: false },
  { code: "incoming_inspection", name: "来料检验", prefix: "IQC", submitter: "factory", requiresPlatformReview: true },
  { code: "production_inspection_daily", name: "生产检验日报", prefix: "PID", submitter: "factory", requiresPlatformReview: false },
  { code: "repair_record", name: "维修记录", prefix: "RR", submitter: "factory", requiresPlatformReview: false },
  { code: "ipqc_inspection", name: "IPQC巡线", prefix: "IPQC", submitter: "factory", requiresPlatformReview: false },
  { code: "sporadic_return", name: "零星退料", prefix: "RT", submitter: "factory", requiresPlatformReview: true },
  { code: "inbound_report", name: "入库报告", prefix: "IR", submitter: "factory", requiresPlatformReview: true },
  { code: "trial_production_summary", name: "试产及生产总结", prefix: "TPS", submitter: "factory", requiresPlatformReview: true },
];

export function canOrganizationViewRecord(
  organization: Organization,
  record: Pick<BusinessRecord, "submitterOrganizationId" | "currentHandlerOrganizationId">,
  traversedOrganizationIds: readonly string[] = [],
): boolean {
  if (organization.type === "platform") return true;
  return organization.id === record.submitterOrganizationId
    || organization.id === record.currentHandlerOrganizationId
    || traversedOrganizationIds.includes(organization.id);
}

type MembershipOrganization = Pick<Membership, "organizationId" | "status">;
type OrganizationAvailability = Pick<Organization, "id" | "type" | "auditStatus" | "usageStatus">;

export function isMembershipAvailable(
  membership: MembershipOrganization,
  organization: OrganizationAvailability | undefined,
): boolean {
  return membership.status === "enabled"
    && organization?.auditStatus === "approved"
    && organization.usageStatus === "enabled";
}

export function chooseDefaultOrganization(
  memberships: readonly MembershipOrganization[],
  organizations: readonly OrganizationAvailability[],
  previousOrganizationId?: string | null,
): string | null {
  const available = memberships.filter((membership) =>
    isMembershipAvailable(membership, organizations.find((organization) => organization.id === membership.organizationId)),
  );
  const platformMembership = available.find((membership) =>
    organizations.find((organization) => organization.id === membership.organizationId)?.type === "platform");
  if (platformMembership) return platformMembership.organizationId;
  if (previousOrganizationId && available.some((membership) => membership.organizationId === previousOrganizationId)) {
    return previousOrganizationId;
  }
  return [...available].sort((left, right) => left.organizationId.localeCompare(right.organizationId))[0]?.organizationId ?? null;
}

export function isRoleAssignmentAllowed(
  membership: Pick<Membership, "organizationId">,
  role: Pick<Role, "organizationId">,
): boolean {
  return membership.organizationId === role.organizationId;
}

export function aggregateOrganizationPermissions(
  membership: Pick<Membership, "organizationId" | "status">,
  roles: readonly (Pick<Role, "id" | "organizationId"> & { permissionCodes: readonly string[] })[],
  membershipRoleIds: readonly string[],
  platformGrantedPermissionCodes: readonly string[],
): string[] {
  if (membership.status !== "enabled") return [];
  const granted = new Set(platformGrantedPermissionCodes);
  const permissions = new Set<string>();
  for (const role of roles) {
    if (membershipRoleIds.includes(role.id) && isRoleAssignmentAllowed(membership, role)) {
      for (const permission of role.permissionCodes) {
        if (granted.has(permission)) permissions.add(permission);
      }
    }
  }
  return [...permissions].sort();
}
