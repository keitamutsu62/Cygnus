-- Create "invitations" table
CREATE TABLE `invitations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `invited_by_staff_id` bigint unsigned NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `role` enum('admin','staff') NOT NULL DEFAULT "staff",
  `status` enum('pending','accepted','expired') NOT NULL DEFAULT "pending",
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_invitations_staff` (`invited_by_staff_id`),
  INDEX `idx_invitations_email_salon` (`salon_id`, `email`),
  UNIQUE INDEX `idx_invitations_token` (`token`),
  CONSTRAINT `fk_invitations_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `fk_invitations_staff` FOREIGN KEY (`invited_by_staff_id`) REFERENCES `staffs` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "plans" table
CREATE TABLE `plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `max_staff_count` int unsigned NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "subscriptions" table
CREATE TABLE `subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `plan_id` bigint unsigned NOT NULL,
  `status` enum('active','cancelled','expired') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_subscriptions_plan` (`plan_id`),
  UNIQUE INDEX `idx_subscriptions_salon` (`salon_id`),
  CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT `fk_subscriptions_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
