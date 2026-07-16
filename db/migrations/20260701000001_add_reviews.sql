CREATE TABLE reviews (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  salon_id       BIGINT UNSIGNED  NOT NULL,
  staff_id       BIGINT UNSIGNED  NULL,
  menu_id        BIGINT UNSIGNED  NULL,
  rating_overall TINYINT UNSIGNED NOT NULL,
  rating_finish  TINYINT UNSIGNED NOT NULL,
  rating_service TINYINT UNSIGNED NOT NULL,
  comment        TEXT             NULL,
  created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_salon_created (salon_id, created_at),
  KEY idx_reviews_staff_created (staff_id, created_at),
  CONSTRAINT fk_reviews_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_staff FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE SET NULL,
  CONSTRAINT fk_reviews_menu  FOREIGN KEY (menu_id)  REFERENCES menus(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
