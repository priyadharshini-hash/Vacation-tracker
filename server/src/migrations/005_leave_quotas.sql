-- Editable yearly quotas and "unlimited" leave types.

ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN NOT NULL DEFAULT false;

-- Company policy: Personal 10 days, Travel Work 10 days, Sick unlimited.
UPDATE leave_types SET default_days_per_year = 10 WHERE name IN ('Personal Leave', 'Travel Work Leave');
UPDATE leave_types SET is_unlimited = true, default_days_per_year = 0 WHERE name = 'Sick Leave';

-- Apply the new quotas to everyone's current-year balances (used days are kept).
UPDATE leave_balances b
SET allotted_days = lt.default_days_per_year
FROM leave_types lt
WHERE lt.id = b.leave_type_id
  AND lt.name IN ('Personal Leave', 'Travel Work Leave')
  AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)::int;
