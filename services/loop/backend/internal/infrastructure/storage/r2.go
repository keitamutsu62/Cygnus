package storage

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Storage は Cloudflare R2 に画像をアップロードする実装。
// R2 は S3 互換 API を提供するため aws-sdk-go-v2/service/s3 で接続する。
//
// 必要な環境変数:
//   R2_ACCOUNT_ID  : Cloudflareアカウント ID
//   R2_ACCESS_KEY  : R2 API トークンのアクセスキー
//   R2_SECRET_KEY  : R2 API トークンのシークレット
//   R2_BUCKET      : バケット名（例: cygnus-works）
//   R2_PUBLIC_URL  : 公開ドメイン（例: https://works.example.com）
type R2Storage struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

func NewR2Storage(accountID, accessKey, secretKey, bucket, publicURL string) *R2Storage {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	client := s3.New(s3.Options{
		Region:      "auto",
		BaseEndpoint: aws.String(endpoint),
		Credentials: credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
	})
	return &R2Storage{client: client, bucket: bucket, publicURL: strings.TrimRight(publicURL, "/")}
}

// Upload はフロントから受け取った "data:<mime>;base64,<data>" を
// R2 にアップロードし、CDN URL を返す。
func (s *R2Storage) Upload(ctx context.Context, dataURL string) (string, error) {
	mimeType, raw, err := parseDataURL(dataURL)
	if err != nil {
		return "", fmt.Errorf("R2Storage.Upload parse: %w", err)
	}

	decoded, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return "", fmt.Errorf("R2Storage.Upload decode: %w", err)
	}

	ext := extFromMIME(mimeType)
	key := fmt.Sprintf("works/%d%s", time.Now().UnixNano(), ext)

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(decoded),
		ContentType: aws.String(mimeType),
	})
	if err != nil {
		return "", fmt.Errorf("R2Storage.Upload put: %w", err)
	}

	return fmt.Sprintf("%s/%s", s.publicURL, key), nil
}

// parseDataURL は "data:<mime>;base64,<data>" を分解する。
func parseDataURL(dataURL string) (mimeType, data string, err error) {
	if !strings.HasPrefix(dataURL, "data:") {
		return "", "", fmt.Errorf("not a data URL")
	}
	rest := dataURL[len("data:"):]
	semi := strings.Index(rest, ";")
	if semi < 0 {
		return "", "", fmt.Errorf("invalid data URL format")
	}
	mimeType = rest[:semi]
	after := rest[semi+1:]
	if !strings.HasPrefix(after, "base64,") {
		return "", "", fmt.Errorf("only base64 data URLs are supported")
	}
	data = after[len("base64,"):]
	return mimeType, data, nil
}

func extFromMIME(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg"
	}
}
