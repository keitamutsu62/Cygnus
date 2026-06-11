SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'avatar_url'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `profiles` ADD COLUMN `avatar_url` varchar(1024) NULL AFTER `cygnus_account_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
