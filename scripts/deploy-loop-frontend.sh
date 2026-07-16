#!/bin/bash
set -e

REGION="ap-northeast-1"
# NOTE: loop.cygnus.style はピボット前の旧版。デプロイ対象は loop-v2 のみ。
LOOP_V2_S3="cygnus-loop-v2-frontend"
LOOP_V2_CF_ID="E1YC69DDLJV5R"

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
aws s3 sync services/loop/frontend/dist/ "s3://$LOOP_V2_S3/" --delete --region "$REGION" --exclude "index.html"
# index.html だけは no-cache（PWA が古い HTML を掴んで新JS参照を取りこぼすのを防ぐ）
aws s3 cp services/loop/frontend/dist/index.html "s3://$LOOP_V2_S3/index.html" \
  --region "$REGION" --cache-control "no-cache, no-store, must-revalidate" --content-type "text/html"
echo "✅ S3アップロード完了"
echo ""

echo "▶ [3/3] CloudFront キャッシュクリア..."
aws cloudfront create-invalidation --distribution-id "$LOOP_V2_CF_ID" --paths "/*"
echo "✅ CloudFront キャッシュクリア完了"
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  デプロイ完了！                                      ║"
echo "║  URL: https://loop-v2.cygnus.style                   ║"
echo "╚══════════════════════════════════════════════════════╝"
