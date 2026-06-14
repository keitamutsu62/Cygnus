-- profiles.avatar_url を VARCHAR(1024) から MEDIUMTEXT に拡張する。
-- R2 未設定時は LocalStorage が base64 data URL をそのまま保存するため、
-- VARCHAR(1024) では MySQL STRICT モードでエラーになる。
-- MEDIUMTEXT (最大 16MB) に変更して base64 画像 (~50KB) を受け入れられるようにする。
ALTER TABLE `profiles`
  MODIFY COLUMN `avatar_url` MEDIUMTEXT NULL;
