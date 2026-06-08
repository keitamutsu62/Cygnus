-- +goose Up
CREATE TABLE password_reset_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id   BIGINT UNSIGNED NOT NULL,
  token      VARCHAR(64)     NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token (token),
  CONSTRAINT fk_prt_staff FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +goose Down
DROP TABLE IF EXISTS password_reset_tokens;
