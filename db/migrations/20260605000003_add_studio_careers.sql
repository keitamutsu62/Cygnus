CREATE TABLE `studio_careers` (
  `id`                 bigint unsigned  NOT NULL AUTO_INCREMENT,
  `cygnus_account_id`  bigint unsigned  NOT NULL,
  `salon_name`         varchar(255)     NOT NULL,
  `role`               varchar(255)     NOT NULL,
  `start_year`         smallint unsigned NOT NULL,
  `start_month`        tinyint unsigned  NOT NULL,
  `end_year`           smallint unsigned NULL,
  `end_month`          tinyint unsigned  NULL,
  `is_current`         bool             NOT NULL DEFAULT 0,
  `created_at`         datetime         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         datetime         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_careers_account` (`cygnus_account_id`),
  CONSTRAINT `fk_careers_account` FOREIGN KEY (`cygnus_account_id`) REFERENCES `cygnus_accounts` (`id`) ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
