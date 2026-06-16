-- studio_memos の (cygnus_account_id, memo_date) ユニーク制約を削除し、
-- 1日に複数のメモを保存できるようにする。
ALTER TABLE `studio_memos`
  DROP INDEX `uq_account_date`;
