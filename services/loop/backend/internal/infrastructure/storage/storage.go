package storage

import "context"

// ImageStorage は画像の保存先を抽象化するインターフェース。
// ローカル（base64 DB保存）と R2（CDN）を同じインターフェースで扱う。
type ImageStorage interface {
	// Upload はフロントから受け取った base64 データURL を受け取り、
	// 保存後にアクセス可能な URL を返す。
	Upload(ctx context.Context, dataURL string) (string, error)
}
