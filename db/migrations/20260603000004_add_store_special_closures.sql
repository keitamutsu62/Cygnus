CREATE TABLE store_special_closures (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id   BIGINT UNSIGNED NOT NULL,
  date       DATE            NOT NULL,
  note       VARCHAR(100)    NOT NULL DEFAULT '',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_date (store_id, date),
  CONSTRAINT fk_ssc_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
);
