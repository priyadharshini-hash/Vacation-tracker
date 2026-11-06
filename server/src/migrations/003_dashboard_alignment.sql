-- Align leave types with the official Vacation Tracker dashboard:
-- Personal Leave (pinned default), Sick Leave, Travel Work Leave.

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

UPDATE leave_types SET name = 'Personal Leave'
WHERE name = 'Annual' AND NOT EXISTS (SELECT 1 FROM leave_types WHERE name = 'Personal Leave');

UPDATE leave_types SET name = 'Sick Leave'
WHERE name = 'Sick' AND NOT EXISTS (SELECT 1 FROM leave_types WHERE name = 'Sick Leave');

INSERT INTO leave_types (name, default_days_per_year)
VALUES ('Travel Work Leave', 5)
ON CONFLICT (name) DO NOTHING;

-- Pin Personal Leave as the default unless an admin already chose one.
UPDATE leave_types SET is_default = true
WHERE name = 'Personal Leave'
  AND NOT EXISTS (SELECT 1 FROM leave_types WHERE is_default = true);

-- Give every existing user a balance row for each leave type this year.
INSERT INTO leave_balances (user_id, leave_type_id, year, allotted_days, used_days)
SELECT u.id, lt.id, EXTRACT(YEAR FROM CURRENT_DATE)::int, lt.default_days_per_year, 0
FROM users u
CROSS JOIN leave_types lt
ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
