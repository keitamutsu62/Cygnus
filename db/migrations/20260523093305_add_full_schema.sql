-- Create "stores" table
CREATE TABLE `stores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(500) NULL,
  `phone` varchar(20) NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_stores_salon_id` (`salon_id`),
  CONSTRAINT `fk_stores_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "business_hours" table
CREATE TABLE `business_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `store_id` bigint unsigned NOT NULL,
  `open_time` time NOT NULL,
  `close_time` time NOT NULL,
  `closed_weekday` tinyint NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_business_hours_store` (`store_id`),
  CONSTRAINT `fk_business_hours_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "daily_sales" table
CREATE TABLE `daily_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `store_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `total_sales` int unsigned NOT NULL DEFAULT 0,
  `client_count` int unsigned NOT NULL DEFAULT 0,
  `tech_sales` int unsigned NOT NULL DEFAULT 0,
  `retail_sales` int unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_daily_sales_store_date` (`store_id`, `date`),
  CONSTRAINT `fk_daily_sales_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "dealers" table
CREATE TABLE `dealers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_method` enum('LINE','email') NOT NULL,
  `contact_info` varchar(255) NOT NULL,
  `status` enum('active','inactive','pending') NOT NULL DEFAULT "active",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_dealers_salon` (`salon_id`),
  CONSTRAINT `fk_dealers_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "materials" table
CREATE TABLE `materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `brand` varchar(255) NULL,
  `category` enum('カラー','パーマ','シャンプー・トリートメント','スタイリング','物販','その他') NOT NULL,
  `size_amount` int unsigned NULL,
  `size_unit` varchar(10) NULL,
  `stock_unit` varchar(10) NOT NULL DEFAULT "本",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_materials_salon` (`salon_id`),
  CONSTRAINT `fk_materials_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "inventories" table
CREATE TABLE `inventories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `store_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT 0,
  `threshold` int unsigned NOT NULL DEFAULT 0,
  `status` enum('要発注','注意','正常','過剰') NOT NULL DEFAULT "正常",
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_inventories_material` (`material_id`),
  UNIQUE INDEX `idx_inventories_store_material` (`store_id`, `material_id`),
  CONSTRAINT `fk_inventories_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `fk_inventories_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "menus" table
CREATE TABLE `menus` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` int unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_menus_salon` (`salon_id`),
  CONSTRAINT `fk_menus_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "menu_materials" table
CREATE TABLE `menu_materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `required_quantity` decimal(8,2) unsigned NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_menu_materials_material` (`material_id`),
  UNIQUE INDEX `idx_menu_materials_unique` (`menu_id`, `material_id`),
  CONSTRAINT `fk_menu_materials_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `fk_menu_materials_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Modify "staffs" table
ALTER TABLE `staffs` ADD COLUMN `store_id` bigint unsigned NULL AFTER `salon_id`, ADD COLUMN `name` varchar(255) NOT NULL AFTER `store_id`, ADD COLUMN `avatar_initials` varchar(4) NULL AFTER `role`, ADD INDEX `fk_staffs_store` (`store_id`), ADD CONSTRAINT `fk_staffs_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL;
-- Create "notification_settings" table
CREATE TABLE `notification_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `inventory_alert` bool NOT NULL DEFAULT 1,
  `order_complete` bool NOT NULL DEFAULT 1,
  `daily_report` bool NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_notification_settings_staff` (`staff_id`),
  CONSTRAINT `fk_notification_settings_staff` FOREIGN KEY (`staff_id`) REFERENCES `staffs` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "orders" table
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `store_id` bigint unsigned NOT NULL,
  `dealer_id` bigint unsigned NOT NULL,
  `status` enum('pending','sent','received','delivered') NOT NULL DEFAULT "pending",
  `is_next_month_invoice` bool NOT NULL DEFAULT 0,
  `sent_at` datetime NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_orders_dealer` (`dealer_id`),
  INDEX `fk_orders_salon` (`salon_id`),
  INDEX `idx_orders_store_status` (`store_id`, `status`),
  CONSTRAINT `fk_orders_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealers` (`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `fk_orders_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "order_items" table
CREATE TABLE `order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `material_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit` varchar(10) NOT NULL,
  `estimated_cost` int unsigned NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_order_items_material` (`material_id`),
  INDEX `fk_order_items_order` (`order_id`),
  CONSTRAINT `fk_order_items_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON UPDATE NO ACTION ON DELETE RESTRICT,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "pos_integrations" table
CREATE TABLE `pos_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `salon_id` bigint unsigned NOT NULL,
  `pos_system` enum('smaregi','square','other') NOT NULL,
  `account_id` varchar(255) NULL,
  `status` enum('connected','disconnected') NOT NULL DEFAULT "disconnected",
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_pos_integrations_unique` (`salon_id`, `pos_system`),
  CONSTRAINT `fk_pos_integrations_salon` FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "staff_daily_sales" table
CREATE TABLE `staff_daily_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint unsigned NOT NULL,
  `store_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `total_sales` int unsigned NOT NULL DEFAULT 0,
  `client_count` int unsigned NOT NULL DEFAULT 0,
  `unit_price` int unsigned NOT NULL DEFAULT 0,
  `retail_sales` int unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_staff_daily_sales_store` (`store_id`),
  UNIQUE INDEX `idx_staff_daily_sales_unique` (`staff_id`, `date`),
  CONSTRAINT `fk_staff_daily_sales_staff` FOREIGN KEY (`staff_id`) REFERENCES `staffs` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `fk_staff_daily_sales_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- Create "staff_menu_sales" table
CREATE TABLE `staff_menu_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_daily_sale_id` bigint unsigned NOT NULL,
  `menu_id` bigint unsigned NOT NULL,
  `count` int unsigned NOT NULL DEFAULT 0,
  `amount` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `fk_staff_menu_sales_daily` (`staff_daily_sale_id`),
  INDEX `fk_staff_menu_sales_menu` (`menu_id`),
  CONSTRAINT `fk_staff_menu_sales_daily` FOREIGN KEY (`staff_daily_sale_id`) REFERENCES `staff_daily_sales` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `fk_staff_menu_sales_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON UPDATE NO ACTION ON DELETE RESTRICT
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
