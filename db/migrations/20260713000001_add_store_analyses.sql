-- 店舗週次AI分析（Weekly Insight）
-- staff_analyses と同型の設計原則: 観測値ベース、解釈しない、指図しない
CREATE TABLE store_analyses (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id              BIGINT UNSIGNED NOT NULL,
  metrics               JSON            NOT NULL COMMENT '数値指標（売上・客単価・客数・口コミ・★5率など）',
  comment_elements      JSON            NOT NULL COMMENT '直近7日のコメント要素とその集計件数',
  narratives            JSON            NOT NULL COMMENT '淡々とした事実文（strength/change/room/mirror）',
  observations          JSON            NULL     COMMENT '検出したパターン観測',
  previous_metrics      JSON            NULL     COMMENT '前回観測時の数値（変化検出用）',
  previous_generated_at DATETIME        NULL,
  review_count          INT UNSIGNED    NOT NULL COMMENT '週次口コミ件数',
  generated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_analyses_store (store_id),
  CONSTRAINT fk_store_analyses_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
