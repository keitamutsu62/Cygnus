-- treatments.customer_id を NULL 許容に変更（顧客未紐付けの会計に対応）
ALTER TABLE treatments
  MODIFY COLUMN customer_id bigint unsigned NULL COMMENT 'LOOPの顧客台帳（未紐付けはNULL）',
  DROP FOREIGN KEY fk_treatments_customer;

ALTER TABLE treatments
  ADD CONSTRAINT fk_treatments_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL;
