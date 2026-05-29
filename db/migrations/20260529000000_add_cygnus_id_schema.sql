-- ============================================================
-- Cygnus ID 中心設計への再設計
-- 追加テーブル: cygnus_accounts / salon_memberships /
--               profiles / works /
--               cygnus_customers / appointments / follows / saved_works /
--               treatments
-- 既存テーブル変更: staffs(+cygnus_account_id), menus(+duration)
-- ============================================================

-- ── 1. cygnus_accounts ──────────────────────────────────────
-- スタイリスト専用の基盤ID。店舗を跨いで技術・履歴・信頼を積み上げる。
-- ユーザーが意識する識別子は cygnus_id (CYG-XXXXX) だが内部専用。
CREATE TABLE `cygnus_accounts` (
  `id`            bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_id`     varchar(20)     NOT NULL COMMENT 'CYG-XXXXX format',
  `email`         varchar(255)    NOT NULL,
  `password_hash` varchar(255)    NOT NULL,
  `display_name`  varchar(255)    NOT NULL,
  `avatar_initials` varchar(4)    NULL,
  `created_at`    datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_cygnus_accounts_cygnus_id` (`cygnus_id`),
  UNIQUE INDEX `idx_cygnus_accounts_email` (`email`)
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 2. salon_memberships ────────────────────────────────────
-- どのアカウントがどのサロン・店舗に在籍しているか。
-- staffs.salon_id / staffs.role の役割を将来的に置き換える。
CREATE TABLE `salon_memberships` (
  `id`                 bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_account_id`  bigint unsigned NOT NULL,
  `salon_id`           bigint unsigned NOT NULL,
  `store_id`           bigint unsigned NULL,
  `role`               enum('owner','admin','staff') NOT NULL DEFAULT 'staff',
  `is_active`          bool            NOT NULL DEFAULT 1,
  `joined_at`          datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at`            datetime        NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_salon_memberships_unique` (`cygnus_account_id`, `salon_id`),
  INDEX `idx_salon_memberships_salon` (`salon_id`),
  INDEX `idx_salon_memberships_store` (`store_id`),
  CONSTRAINT `fk_salon_memberships_account` FOREIGN KEY (`cygnus_account_id`) REFERENCES `cygnus_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_salon_memberships_salon`   FOREIGN KEY (`salon_id`)          REFERENCES `salons` (`id`)           ON DELETE CASCADE,
  CONSTRAINT `fk_salon_memberships_store`   FOREIGN KEY (`store_id`)          REFERENCES `stores` (`id`)           ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 3. staffs への移行カラム追加 ────────────────────────────
-- 既存スタッフが Cygnus ID に紐付いたら cygnus_account_id を設定する。
-- 移行完了まで NULL を許容し、staffs は後方互換として残す。
ALTER TABLE `staffs`
  ADD COLUMN `cygnus_account_id` bigint unsigned NULL AFTER `id`,
  ADD INDEX  `idx_staffs_cygnus_account` (`cygnus_account_id`),
  ADD CONSTRAINT `fk_staffs_cygnus_account` FOREIGN KEY (`cygnus_account_id`) REFERENCES `cygnus_accounts` (`id`) ON DELETE SET NULL;

-- ── 4. menus への duration 追加 ─────────────────────────────
-- RESERVE の空き枠計算・appointments の end_at 算出に使用。
ALTER TABLE `menus`
  ADD COLUMN `duration` smallint unsigned NULL COMMENT '分単位' AFTER `price`;

-- ── 5. profiles (STUDIO) ────────────────────────────────────
-- スタイリストが能動的に登録する「見せたい自分」の情報。
-- cygnus_account 1件につき 1プロフィール。
CREATE TABLE `profiles` (
  `id`                 bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_account_id`  bigint unsigned NOT NULL,
  `bio`                text            NULL,
  `specialties`        json            NULL COMMENT '["カラー","カット"] など',
  `instagram_url`      varchar(255)    NULL,
  `is_published`       bool            NOT NULL DEFAULT 0,
  `created_at`         datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_profiles_account` (`cygnus_account_id`),
  CONSTRAINT `fk_profiles_account` FOREIGN KEY (`cygnus_account_id`) REFERENCES `cygnus_accounts` (`id`) ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 6. works (STUDIO) ───────────────────────────────────────
-- スタイリストが登録する作品。RESERVE の検索・保存の対象。
CREATE TABLE `works` (
  `id`                 bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_account_id`  bigint unsigned NOT NULL,
  `menu_id`            bigint unsigned NULL COMMENT 'LOOP のメニューと紐付け',
  `title`              varchar(255)    NULL,
  `description`        text            NULL,
  `image_url`          varchar(500)    NOT NULL,
  `tags`               json            NULL COMMENT '["ハイライト","透明感"] など',
  `is_published`       bool            NOT NULL DEFAULT 1,
  `created_at`         datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_works_account` (`cygnus_account_id`),
  INDEX `idx_works_menu` (`menu_id`),
  INDEX `idx_works_published_at` (`is_published`, `created_at`),
  CONSTRAINT `fk_works_account` FOREIGN KEY (`cygnus_account_id`) REFERENCES `cygnus_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_works_menu`    FOREIGN KEY (`menu_id`)           REFERENCES `menus` (`id`)            ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 7. cygnus_customers (RESERVE) ───────────────────────────
-- お客さん専用ID。フォロー先・来店履歴・傾向などを蓄積する内部ID。
-- 識別子は cygnus_customer_id (CCU-XXXXX)、ユーザーが意識する必要はない。
CREATE TABLE `cygnus_customers` (
  `id`                   bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_customer_id`   varchar(20)     NOT NULL COMMENT 'CCU-XXXXX format',
  `line_user_id`         varchar(255)    NULL COMMENT 'LINE ログイン連携',
  `display_name`         varchar(255)    NOT NULL,
  `profile_image_url`    varchar(500)    NULL,
  `created_at`           datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_cygnus_customers_cygnus_id` (`cygnus_customer_id`),
  UNIQUE INDEX `idx_cygnus_customers_line` (`line_user_id`)
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 8. appointments (RESERVE) ───────────────────────────────
-- お客さんとスタイリストの予約。RESERVE 経由の予約のみが対象。
-- ホットペッパー等は treatments に直接記録される。
CREATE TABLE `appointments` (
  `id`                   bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_customer_id`   bigint unsigned NOT NULL,
  `cygnus_account_id`    bigint unsigned NOT NULL COMMENT '担当スタイリスト',
  `salon_id`             bigint unsigned NOT NULL,
  `store_id`             bigint unsigned NULL,
  `menu_id`              bigint unsigned NULL,
  `menu_name`            varchar(255)    NOT NULL COMMENT '履歴保持のため非正規化',
  `price`                int unsigned    NOT NULL DEFAULT 0,
  `duration_minutes`     smallint unsigned NULL,
  `start_at`             datetime        NOT NULL,
  `end_at`               datetime        NOT NULL,
  `status`               enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `cancel_reason`        varchar(500)    NULL,
  `notes`                text            NULL,
  `created_at`           datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_appointments_customer`  (`cygnus_customer_id`),
  INDEX `idx_appointments_account`   (`cygnus_account_id`),
  INDEX `idx_appointments_salon`     (`salon_id`),
  INDEX `idx_appointments_start_at`  (`start_at`),
  CONSTRAINT `fk_appointments_customer` FOREIGN KEY (`cygnus_customer_id`) REFERENCES `cygnus_customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_appointments_account`  FOREIGN KEY (`cygnus_account_id`)  REFERENCES `cygnus_accounts` (`id`)  ON DELETE RESTRICT,
  CONSTRAINT `fk_appointments_salon`    FOREIGN KEY (`salon_id`)            REFERENCES `salons` (`id`)           ON DELETE CASCADE,
  CONSTRAINT `fk_appointments_store`    FOREIGN KEY (`store_id`)            REFERENCES `stores` (`id`)           ON DELETE SET NULL,
  CONSTRAINT `fk_appointments_menu`     FOREIGN KEY (`menu_id`)             REFERENCES `menus` (`id`)            ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 9. follows (RESERVE) ────────────────────────────────────
-- お客さんがスタイリストをフォローする関係。
-- フォロー解除は論理削除ではなくレコード削除。
CREATE TABLE `follows` (
  `id`                   bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_customer_id`   bigint unsigned NOT NULL,
  `cygnus_account_id`    bigint unsigned NOT NULL COMMENT 'フォロー先スタイリスト',
  `created_at`           datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_follows_unique`   (`cygnus_customer_id`, `cygnus_account_id`),
  INDEX `idx_follows_account`         (`cygnus_account_id`),
  CONSTRAINT `fk_follows_customer` FOREIGN KEY (`cygnus_customer_id`) REFERENCES `cygnus_customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_follows_account`  FOREIGN KEY (`cygnus_account_id`)  REFERENCES `cygnus_accounts` (`id`)  ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 10. saved_works (RESERVE) ────────────────────────────────
-- お客さんが保存した作品。ハートボタンの保存先。
CREATE TABLE `saved_works` (
  `id`                   bigint unsigned NOT NULL AUTO_INCREMENT,
  `cygnus_customer_id`   bigint unsigned NOT NULL,
  `work_id`              bigint unsigned NOT NULL,
  `created_at`           datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_saved_works_unique` (`cygnus_customer_id`, `work_id`),
  INDEX `idx_saved_works_work`          (`work_id`),
  CONSTRAINT `fk_saved_works_customer` FOREIGN KEY (`cygnus_customer_id`) REFERENCES `cygnus_customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_works_work`     FOREIGN KEY (`work_id`)            REFERENCES `works` (`id`)            ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ── 11. treatments (LOOP) ────────────────────────────────────
-- 施術記録。RESERVE 経由・ホットペッパー・ウォークインすべてを対象とするため
-- LOOP が保持する。appointment_id は RESERVE 経由の場合のみ設定。
CREATE TABLE `treatments` (
  `id`                bigint unsigned  NOT NULL AUTO_INCREMENT,
  `staff_id`          bigint unsigned  NOT NULL COMMENT '施術担当スタッフ',
  `customer_id`       bigint unsigned  NOT NULL COMMENT 'LOOPの顧客台帳',
  `salon_id`          bigint unsigned  NOT NULL,
  `store_id`          bigint unsigned  NULL,
  `menu_id`           bigint unsigned  NULL COMMENT 'フリーテキスト施術は NULL',
  `menu_name`         varchar(255)     NOT NULL COMMENT '履歴保持のため非正規化',
  `price`             int unsigned     NOT NULL DEFAULT 0,
  `duration_minutes`  smallint unsigned NULL,
  `source`            enum('reserve','hotpepper','line','walkin','other') NOT NULL DEFAULT 'walkin',
  `appointment_id`    bigint unsigned  NULL COMMENT 'RESERVE 経由のみ設定',
  `performed_at`      datetime         NOT NULL,
  `notes`             text             NULL,
  `created_at`        datetime         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_treatments_staff`        (`staff_id`),
  INDEX `idx_treatments_customer`     (`customer_id`),
  INDEX `idx_treatments_salon`        (`salon_id`),
  INDEX `idx_treatments_performed_at` (`performed_at`),
  INDEX `idx_treatments_appointment`  (`appointment_id`),
  CONSTRAINT `fk_treatments_staff`       FOREIGN KEY (`staff_id`)       REFERENCES `staffs` (`id`)       ON DELETE RESTRICT,
  CONSTRAINT `fk_treatments_customer`    FOREIGN KEY (`customer_id`)    REFERENCES `customers` (`id`)    ON DELETE RESTRICT,
  CONSTRAINT `fk_treatments_salon`       FOREIGN KEY (`salon_id`)       REFERENCES `salons` (`id`)       ON DELETE CASCADE,
  CONSTRAINT `fk_treatments_store`       FOREIGN KEY (`store_id`)       REFERENCES `stores` (`id`)       ON DELETE SET NULL,
  CONSTRAINT `fk_treatments_menu`        FOREIGN KEY (`menu_id`)        REFERENCES `menus` (`id`)        ON DELETE SET NULL,
  CONSTRAINT `fk_treatments_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
