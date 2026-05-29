-- Add "retail_sales" table for individual retail transaction records
CREATE TABLE `retail_sales` (
  `id`           bigint unsigned  NOT NULL AUTO_INCREMENT,
  `staff_id`     bigint unsigned  NOT NULL,
  `store_id`     bigint unsigned  NOT NULL,
  `salon_id`     bigint unsigned  NOT NULL,
  `product_name` varchar(255)     NOT NULL,
  `price`        int unsigned     NOT NULL DEFAULT 0,
  `sold_at`      datetime         NOT NULL,
  `created_at`   datetime         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_retail_sales_staff`  (`staff_id`),
  INDEX `idx_retail_sales_store`  (`store_id`),
  INDEX `idx_retail_sales_sold_at`(`sold_at`),
  CONSTRAINT `fk_retail_sales_staff` FOREIGN KEY (`staff_id`) REFERENCES `staffs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_retail_sales_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
