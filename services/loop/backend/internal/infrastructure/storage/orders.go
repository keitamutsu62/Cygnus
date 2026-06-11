package storage

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// OrderStorage は発注書PDFをS3に保存し、Presigned URLを生成する。
type OrderStorage struct {
	client *s3.Client
	bucket string
	region string
}

func NewOrderStorage(bucket, region string) (*OrderStorage, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("OrderStorage config: %w", err)
	}
	return &OrderStorage{
		client: s3.NewFromConfig(cfg),
		bucket: bucket,
		region: region,
	}, nil
}

// Upload はPDFバイト列をS3にアップロードし、30日有効なPresigned URLを返す。
func (o *OrderStorage) Upload(ctx context.Context, key string, pdfBytes []byte) (string, error) {
	_, err := o.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(o.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(pdfBytes),
		ContentType: aws.String("application/pdf"),
	})
	if err != nil {
		return "", fmt.Errorf("OrderStorage upload: %w", err)
	}

	presigner := s3.NewPresignClient(o.client)
	req, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(o.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(30*24*time.Hour))
	if err != nil {
		return "", fmt.Errorf("OrderStorage presign: %w", err)
	}
	return req.URL, nil
}
