-- Phase C: 会計×口コミ突き合わせ観測パターンを保存
ALTER TABLE staff_analyses
  ADD COLUMN observations JSON NULL AFTER narratives;
