-- スタッフAI分析（Phase A: 観測値ベース）
-- 「解釈しない・指図しない・観測値のみ」の設計原則に沿ったスキーマ
CREATE TABLE staff_analyses (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id            BIGINT UNSIGNED NOT NULL,
  metrics             JSON            NOT NULL COMMENT '数値指標（★5率・件数・指名比率など、決定論的に集計した値）',
  comment_elements    JSON            NOT NULL COMMENT 'コメントから抽出した要素とその集計件数',
  narratives          JSON            NOT NULL COMMENT '淡々とした事実文（strength/room/mirror。changeはPhase B）',
  review_count        INT UNSIGNED    NOT NULL,
  generated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_analyses_staff (staff_id),
  CONSTRAINT fk_staff_analyses_staff FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
