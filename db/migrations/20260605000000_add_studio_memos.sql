CREATE TABLE studio_memos (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  cygnus_account_id BIGINT UNSIGNED  NOT NULL,
  memo_date         DATE             NOT NULL,
  text              TEXT             NOT NULL,
  created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_account_date (cygnus_account_id, memo_date),
  CONSTRAINT fk_memo_account FOREIGN KEY (cygnus_account_id) REFERENCES cygnus_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
