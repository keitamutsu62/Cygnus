-- studio_memos の (cygnus_account_id, memo_date) ユニーク制約を削除し、
-- 1日に複数のメモを保存できるようにする。
-- fk_memo_account が uq_account_date を使っているため、先に代替インデックスを追加してから DROP する。
ALTER TABLE `studio_memos` ADD INDEX `idx_memo_account` (`cygnus_account_id`);
ALTER TABLE `studio_memos` DROP INDEX `uq_account_date`;
