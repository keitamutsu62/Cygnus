package storage

import "context"

// LocalStorage は base64 データURL をそのまま返す実装。
// R2 が未設定の開発環境・β版で使用する。
type LocalStorage struct{}

func NewLocalStorage() *LocalStorage { return &LocalStorage{} }

func (s *LocalStorage) Upload(_ context.Context, dataURL string) (string, error) {
	return dataURL, nil
}
