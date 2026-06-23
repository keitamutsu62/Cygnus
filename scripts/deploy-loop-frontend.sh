#!/bin/bash
set -e

REGION="ap-northeast-1"
LOOP_S3="cygnus-loop-frontend"
LOOP_CF_ID="E2AV5TA9PJA0VR"

echo "╔══════════════════════════════════════╗"
echo "║  Cygnus LOOP フロントエンド デプロイ  ║"
echo "╚══════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

echo "▶ [1/3] ビルド..."
cd services/loop/frontend
VITE_API_BASE="https://api.cygnus.style" npm run build
cd ../../..
echo "✅ ビルド完了"
echo ""

echo "▶ [2/3] S3アップロード..."
aws s3 sync services/loop/frontend/dist/ "s3://$LOOP_S3/" --delete --region "$REGION"
echo "✅ S3アップロード完了"
echo ""

echo "▶ [3/3] CloudFront キャッシュクリア..."
aws cloudfront create-invalidation --distribution-id "$LOOP_CF_ID" --paths "/*"
echo "✅ CloudFront キャッシュクリア完了"
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  デプロイ完了！                                      ║"
echo "║  URL: https://loop.cygnus.style                     ║"
echo "╚══════════════════════════════════════════════════════╝"
