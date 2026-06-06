#!/bin/bash
set -e

ECR_URI="219078481395.dkr.ecr.ap-northeast-1.amazonaws.com/cygnus-loop-backend"
REGION="ap-northeast-1"
IMAGE_TAG="${1:-latest}"

echo "==> ECR ログイン"
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_URI

echo "==> ビルド (モノレポルートから)"
cd "$(dirname "$0")/.."
docker build \
  --platform linux/amd64 \
  -f services/loop/backend/Dockerfile \
  -t "$ECR_URI:$IMAGE_TAG" \
  .

echo "==> プッシュ"
docker push "$ECR_URI:$IMAGE_TAG"

echo "==> ECS サービス更新"
aws ecs update-service \
  --region $REGION \
  --cluster cygnus \
  --service cygnus-loop-backend \
  --force-new-deployment \
  --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
  --output table

echo "==> デプロイ完了: $ECR_URI:$IMAGE_TAG"
