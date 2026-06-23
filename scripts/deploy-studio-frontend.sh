#!/bin/bash
set -e

REGION="ap-northeast-1"
STUDIO_S3="cygnus-studio-frontend"
STUDIO_CF_ID="E3GYCGERB2N9OO"

echo "╔══════════════════════════════════════════╗"
echo "║  Cygnus STUDIO フロントエンド デプロイ   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

echo "▶ [1/3] ビルド..."
cd services/studio/frontend
VITE_API_BASE="https://api.cygnus.style" npm run build
cd ../../..
echo "✅ ビルド完了"
echo ""

echo "▶ [2/3] S3アップロード..."
aws s3 sync services/studio/frontend/dist/ "s3://$STUDIO_S3/" --delete --region "$REGION"
echo "✅ S3アップロード完了"
echo ""

echo "▶ [3/3] CloudFront キャッシュクリア..."
aws cloudfront create-invalidation --distribution-id "$STUDIO_CF_ID" --paths "/*"
echo "✅ CloudFront キャッシュクリア完了"
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  デプロイ完了！                                      ║"
echo "║  URL: https://studio.cygnus.style                   ║"
echo "╚══════════════════════════════════════════════════════╝"
