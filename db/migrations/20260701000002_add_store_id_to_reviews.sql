ALTER TABLE reviews
  ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER salon_id,
  ADD KEY idx_reviews_store_created (store_id, created_at),
  ADD CONSTRAINT fk_reviews_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
