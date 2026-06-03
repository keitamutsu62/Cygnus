-- Step 1: Expand enum to include both old and new values
ALTER TABLE materials
  MODIFY COLUMN category ENUM(
    'カラー', 'カラー剤',
    'パーマ', 'パーマ剤',
    'シャンプー・トリートメント',
    'スタイリング', 'スタイリング剤',
    '物販', 'その他'
  ) NOT NULL;

-- Step 2: Rename existing values
UPDATE materials SET category = 'カラー剤'      WHERE category = 'カラー';
UPDATE materials SET category = 'パーマ剤'      WHERE category = 'パーマ';
UPDATE materials SET category = 'スタイリング剤' WHERE category = 'スタイリング';

-- Step 3: Remove old enum values
ALTER TABLE materials
  MODIFY COLUMN category ENUM(
    'カラー剤', 'パーマ剤',
    'シャンプー・トリートメント',
    'スタイリング剤', '物販', 'その他'
  ) NOT NULL;
