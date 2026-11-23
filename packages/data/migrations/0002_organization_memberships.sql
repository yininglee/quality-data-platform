ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN last_login_at TEXT;

CREATE TABLE organization_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')) DEFAULT 'enabled',
  position TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, organization_id)
);

CREATE TABLE membership_roles (
  membership_id TEXT NOT NULL REFERENCES organization_memberships(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (membership_id, role_id)
);

CREATE TRIGGER validate_membership_role_organization_before_insert
BEFORE INSERT ON membership_roles
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM organization_memberships AS membership
    JOIN roles AS role ON role.id = NEW.role_id
    WHERE membership.id = NEW.membership_id
      AND membership.organization_id = role.organization_id
  ) THEN RAISE(ABORT, 'membership role organization mismatch') END;
END;

INSERT INTO organization_memberships (id, user_id, organization_id, status, position, created_at, updated_at)
SELECT 'membership-' || user_id || '-' || organization_id,
       user_id, organization_id, 'enabled', '', '2026-08-27T00:00:00.000+08:00', '2026-08-27T00:00:00.000+08:00'
FROM user_organizations;

CREATE TEMP TABLE migration_membership_role_validation (
  invalid_count INTEGER NOT NULL CHECK (invalid_count = 0)
);

INSERT INTO migration_membership_role_validation (invalid_count)
SELECT COUNT(*)
FROM user_roles AS ur
JOIN roles AS r ON r.id = ur.role_id
LEFT JOIN user_organizations AS uo
  ON uo.user_id = ur.user_id AND uo.organization_id = r.organization_id
WHERE uo.user_id IS NULL;

INSERT INTO membership_roles (membership_id, role_id)
SELECT 'membership-' || uo.user_id || '-' || uo.organization_id, ur.role_id
FROM user_roles AS ur
JOIN roles AS r ON r.id = ur.role_id
JOIN user_organizations AS uo
  ON uo.user_id = ur.user_id AND uo.organization_id = r.organization_id;

DROP TABLE migration_membership_role_validation;

CREATE INDEX idx_memberships_user_status ON organization_memberships (user_id, status);
CREATE INDEX idx_memberships_organization_status ON organization_memberships (organization_id, status);
