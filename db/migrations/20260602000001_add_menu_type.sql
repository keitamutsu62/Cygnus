-- menus テーブルに menu_type を追加（施術メニュー / 物販商品 の区分）
ALTER TABLE menus
  ADD COLUMN menu_type ENUM('treatment', 'retail') NOT NULL DEFAULT 'treatment' AFTER name;
