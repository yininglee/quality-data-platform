CREATE TEMP TABLE canonical_permission_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO canonical_permission_catalog (code, name) VALUES
  ('platform.home.merchant_registration.read', '商家注册待办'),
  ('platform.home.shipment_report.read', '出货报告待办'),
  ('platform.home.material_exception.read', '物料异常待办'),
  ('platform.home.after_sales_exception.read', '售后异常待办'),
  ('platform.home.sporadic_return.read', '零星退料待办'),
  ('platform.home.inbound_report.read', '入库报告待办'),
  ('platform.home.trial_production_summary.read', '试产及生产总结待办'),
  ('platform.merchant.organization.read', '商家-查看'),
  ('platform.merchant.organization.review', '商家-审核'),
  ('platform.merchant.organization.status', '商家-启用禁用'),
  ('platform.merchant.organization.export', '商家-导出'),
  ('platform.business.material_exception.submit', '平台提报物料异常'),
  ('platform.business.after_sales_exception.submit', '平台提报售后异常'),
  ('platform.business.shipment_report.access', '出货报告TAB'),
  ('platform.business.material_exception.access', '物料异常TAB'),
  ('platform.business.after_sales_exception.access', '售后异常TAB'),
  ('platform.business.incoming_inspection.access', '来料检验TAB'),
  ('platform.business.production_inspection_daily.access', '生产检验日报TAB'),
  ('platform.business.repair_record.access', '维修记录TAB'),
  ('platform.business.ipqc_inspection.access', 'IPQC巡线问题记录TAB'),
  ('platform.business.sporadic_return.access', '零星退料记录TAB'),
  ('platform.business.inbound_report.access', '入库报告TAB'),
  ('platform.business.trial_production_summary.access', '试产及生产总结TAB'),
  ('platform.business.record.read', '业务记录-查看'),
  ('platform.business.record.review', '业务记录-审核'),
  ('platform.business.record.export', '业务记录-导出'),
  ('platform.admin.user.read', '平台用户-查看'),
  ('platform.admin.user.create', '平台用户-新增'),
  ('platform.admin.user.update', '平台用户-编辑'),
  ('platform.admin.user.delete', '平台用户-删除'),
  ('platform.admin.user.status', '平台用户-启用禁用'),
  ('platform.admin.user.export', '平台用户-导出'),
  ('platform.admin.role.read', '平台角色-查看'),
  ('platform.admin.role.create', '平台角色-新增'),
  ('platform.admin.role.update', '平台角色-编辑'),
  ('platform.admin.role.delete', '平台角色-删除'),
  ('platform.admin.role.export', '平台角色-导出'),
  ('platform.admin.role_permission.update', '配置平台角色权限'),
  ('merchant.home.shipment_report.read', '出货报告重新提报待办'),
  ('merchant.home.material_exception.read', '物料异常待办'),
  ('merchant.home.after_sales_exception.read', '售后异常任务待办'),
  ('merchant.business.shipment_report.read', '出货报告-查看'),
  ('merchant.business.shipment_report.submit', '出货报告-提报'),
  ('merchant.business.shipment_report.export', '出货报告-导出'),
  ('merchant.business.material_exception.read', '物料异常-查看'),
  ('merchant.business.material_exception.handle', '物料异常-处理'),
  ('merchant.business.material_exception.export', '物料异常-导出'),
  ('merchant.business.after_sales_exception.read', '售后异常-查看'),
  ('merchant.business.after_sales_exception.handle', '售后异常-处理'),
  ('merchant.business.after_sales_exception.export', '售后异常-导出'),
  ('merchant.admin.user.read', '商家用户-查看'),
  ('merchant.admin.user.create', '商家用户-新增'),
  ('merchant.admin.user.update', '商家用户-编辑'),
  ('merchant.admin.user.delete', '商家用户-删除'),
  ('merchant.admin.user.status', '商家用户-启用禁用'),
  ('merchant.admin.user.export', '商家用户-导出'),
  ('merchant.admin.role.read', '商家角色-查看'),
  ('merchant.admin.role.create', '商家角色-新增'),
  ('merchant.admin.role.update', '商家角色-编辑'),
  ('merchant.admin.role.delete', '商家角色-删除'),
  ('merchant.admin.role.export', '商家角色-导出'),
  ('merchant.admin.role_permission.update', '配置商家角色权限'),
  ('merchant.home.incoming_inspection.read', '被驳回来料检验待办'),
  ('merchant.home.sporadic_return.read', '被驳回零星退料待办'),
  ('merchant.home.inbound_report.read', '被驳回入库报告待办'),
  ('merchant.home.trial_production_summary.read', '被驳回试产及生产总结待办'),
  ('merchant.business.material_exception.submit', '物料异常-提报'),
  ('merchant.business.incoming_inspection.read', '来料检验-查看'),
  ('merchant.business.incoming_inspection.submit', '来料检验-提报'),
  ('merchant.business.incoming_inspection.export', '来料检验-导出'),
  ('merchant.business.production_inspection_daily.read', '生产检验日报-查看'),
  ('merchant.business.production_inspection_daily.submit', '生产检验日报-提报'),
  ('merchant.business.production_inspection_daily.export', '生产检验日报-导出'),
  ('merchant.business.repair_record.read', '维修记录-查看'),
  ('merchant.business.repair_record.submit', '维修记录-提报'),
  ('merchant.business.repair_record.export', '维修记录-导出'),
  ('merchant.business.ipqc_inspection.read', 'IPQC巡线问题记录-查看'),
  ('merchant.business.ipqc_inspection.submit', 'IPQC巡线问题记录-提报'),
  ('merchant.business.ipqc_inspection.export', 'IPQC巡线问题记录-导出'),
  ('merchant.business.sporadic_return.read', '零星退料记录-查看'),
  ('merchant.business.sporadic_return.submit', '零星退料记录-提报'),
  ('merchant.business.sporadic_return.export', '零星退料记录-导出'),
  ('merchant.business.inbound_report.read', '入库报告-查看'),
  ('merchant.business.inbound_report.submit', '入库报告-提报'),
  ('merchant.business.inbound_report.export', '入库报告-导出'),
  ('merchant.business.trial_production_summary.read', '试产及生产总结-查看'),
  ('merchant.business.trial_production_summary.submit', '试产及生产总结-提报'),
  ('merchant.business.trial_production_summary.export', '试产及生产总结-导出');

CREATE TEMP TABLE legacy_permission_validation (
  invalid_count INTEGER NOT NULL CHECK (invalid_count = 0)
);

INSERT INTO legacy_permission_validation (invalid_count)
SELECT COUNT(*)
FROM role_permissions AS rp
LEFT JOIN canonical_permission_catalog AS canonical ON canonical.code = rp.permission_code
WHERE canonical.code IS NULL
  AND rp.permission_code NOT IN (
    'dashboard:read', 'todo:read', 'business:read', 'business:submit',
    'business:review', 'business:assign', 'business:submit-8d',
    'user:manage', 'role:manage'
  );

INSERT OR IGNORE INTO permissions (code, name)
SELECT code, name FROM canonical_permission_catalog;

INSERT OR IGNORE INTO role_permissions (role_id, permission_code)
SELECT rp.role_id, canonical.code
FROM role_permissions AS rp
JOIN roles AS role ON role.id = rp.role_id
JOIN organizations AS organization ON organization.id = role.organization_id
JOIN canonical_permission_catalog AS canonical ON (
  (rp.permission_code IN ('dashboard:read', 'todo:read') AND (
    (organization.type = 'platform' AND canonical.code LIKE 'platform.home.%.read') OR
    (organization.merchant_type = 'supplier' AND canonical.code IN (
      'merchant.home.shipment_report.read', 'merchant.home.material_exception.read', 'merchant.home.after_sales_exception.read'
    )) OR
    (organization.merchant_type = 'factory' AND canonical.code IN (
      'merchant.home.material_exception.read', 'merchant.home.incoming_inspection.read',
      'merchant.home.sporadic_return.read', 'merchant.home.inbound_report.read',
      'merchant.home.trial_production_summary.read'
    ))
  )) OR
  (rp.permission_code = 'business:read' AND (
    (organization.type = 'platform' AND (canonical.code LIKE 'platform.business.%.access' OR canonical.code = 'platform.business.record.read')) OR
    (organization.merchant_type = 'supplier' AND canonical.code IN (
      'merchant.business.shipment_report.read', 'merchant.business.material_exception.read',
      'merchant.business.after_sales_exception.read'
    )) OR
    (organization.merchant_type = 'factory' AND canonical.code IN (
      'merchant.business.material_exception.read', 'merchant.business.incoming_inspection.read',
      'merchant.business.production_inspection_daily.read', 'merchant.business.repair_record.read',
      'merchant.business.ipqc_inspection.read', 'merchant.business.sporadic_return.read',
      'merchant.business.inbound_report.read', 'merchant.business.trial_production_summary.read'
    ))
  )) OR
  (rp.permission_code = 'business:submit' AND (
    (organization.type = 'platform' AND canonical.code IN (
      'platform.business.material_exception.submit', 'platform.business.after_sales_exception.submit'
    )) OR
    (organization.merchant_type = 'supplier' AND canonical.code = 'merchant.business.shipment_report.submit') OR
    (organization.merchant_type = 'factory' AND canonical.code LIKE 'merchant.business.%.submit')
  )) OR
  (rp.permission_code = 'business:review' AND organization.type = 'platform' AND canonical.code = 'platform.business.record.review') OR
  (rp.permission_code = 'business:assign' AND organization.type = 'platform' AND canonical.code IN (
    'platform.business.material_exception.access', 'platform.business.record.review'
  )) OR
  (rp.permission_code = 'business:submit-8d' AND organization.merchant_type = 'supplier' AND canonical.code = 'merchant.business.material_exception.handle') OR
  (rp.permission_code = 'user:manage' AND (
    (organization.type = 'platform' AND canonical.code LIKE 'platform.admin.user.%') OR
    (organization.type = 'merchant' AND canonical.code LIKE 'merchant.admin.user.%')
  )) OR
  (rp.permission_code = 'role:manage' AND (
    (organization.type = 'platform' AND canonical.code LIKE 'platform.admin.role%') OR
    (organization.type = 'merchant' AND canonical.code LIKE 'merchant.admin.role%')
  ))
)
WHERE rp.permission_code IN (
  'dashboard:read', 'todo:read', 'business:read', 'business:submit',
  'business:review', 'business:assign', 'business:submit-8d',
  'user:manage', 'role:manage'
);

DELETE FROM role_permissions
WHERE permission_code IN (
  'dashboard:read', 'todo:read', 'business:read', 'business:submit',
  'business:review', 'business:assign', 'business:submit-8d',
  'user:manage', 'role:manage'
);

DELETE FROM permissions
WHERE code IN (
  'dashboard:read', 'todo:read', 'business:read', 'business:submit',
  'business:review', 'business:assign', 'business:submit-8d',
  'user:manage', 'role:manage'
);

CREATE TRIGGER validate_membership_role_organization_before_update
BEFORE UPDATE OF membership_id, role_id ON membership_roles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM organization_memberships AS membership
    JOIN roles AS role ON role.id = NEW.role_id
    WHERE membership.id = NEW.membership_id
      AND membership.organization_id = role.organization_id
  ) THEN RAISE(ABORT, 'membership role organization mismatch') END;
END;

CREATE TRIGGER protect_membership_organization_with_roles
BEFORE UPDATE OF organization_id ON organization_memberships
WHEN EXISTS (
  SELECT 1
  FROM membership_roles AS assignment
  JOIN roles AS role ON role.id = assignment.role_id
  WHERE assignment.membership_id = OLD.id
    AND role.organization_id <> NEW.organization_id
)
BEGIN
  SELECT RAISE(ABORT, 'membership role organization mismatch');
END;

CREATE TRIGGER protect_role_organization_with_memberships
BEFORE UPDATE OF organization_id ON roles
WHEN EXISTS (
  SELECT 1
  FROM membership_roles AS assignment
  JOIN organization_memberships AS membership ON membership.id = assignment.membership_id
  WHERE assignment.role_id = OLD.id
    AND membership.organization_id <> NEW.organization_id
)
BEGIN
  SELECT RAISE(ABORT, 'membership role organization mismatch');
END;

DROP TABLE legacy_permission_validation;
DROP TABLE canonical_permission_catalog;
