-- Add pricing columns to plans (base + per-staff)
ALTER TABLE `plans`
  ADD COLUMN `base_price`       INT UNSIGNED NOT NULL DEFAULT 0 AFTER `max_staff_count`,
  ADD COLUMN `per_staff_price`  INT UNSIGNED NOT NULL DEFAULT 0 AFTER `base_price`;

-- Set standard plan pricing: ¥9,800 base + ¥980/staff
UPDATE `plans` SET base_price = 9800, per_staff_price = 980;

-- Add is_internal flag to salons (test/internal accounts excluded from MRR)
ALTER TABLE `salons`
  ADD COLUMN `is_internal` TINYINT(1) NOT NULL DEFAULT 0 AFTER `name`;

-- All existing salons are test accounts
UPDATE `salons` SET is_internal = 1;
