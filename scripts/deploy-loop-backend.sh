#!/bin/bash
set -e

ECR_URI="219078481395.dkr.ecr.ap-northeast-1.amazonaws.com/cygnus-loop-backend"
REGION="ap-northeast-1"
SERVICE="cygnus-loop-backend"
CLUSTER="cygnus"
IMAGE_TAG="prod-$(date +%Y%m%d%H%M)"

echo "==> ECR ログイン"
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_URI

echo "==> ビルド (モノレポルートから): $IMAGE_TAG"
cd "$(dirname "$0")/.."
docker build \
  --platform linux/amd64 \
  -f services/loop/backend/Dockerfile \
  -t "$ECR_URI:$IMAGE_TAG" \
  .

echo "==> プッシュ"
docker push "$ECR_URI:$IMAGE_TAG"

echo "==> タスク定義更新"
CURRENT_TASK_DEF=$(aws ecs describe-task-definition \
  --region $REGION \
  --task-definition $SERVICE \
  --query 'taskDefinition' \
  --output json)

NEW_TASK_DEF=$(echo "$CURRENT_TASK_DEF" | python3 -c "
import json,sys
td=json.load(sys.stdin)
td['containerDefinitions'][0]['image']='$ECR_URI:$IMAGE_TAG'
for k in ['taskDefinitionArn','revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy']:
    td.pop(k,None)
print(json.dumps(td))
")

NEW_REVISION=$(aws ecs register-task-definition \
  --region $REGION \
  --cli-input-json "$NEW_TASK_DEF" \
  --query 'taskDefinition.revision' \
  --output text)
echo "    task definition revision: $NEW_REVISION"

echo "==> ECS サービス更新"
aws ecs update-service \
  --region $REGION \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition "$SERVICE:$NEW_REVISION" \
  --force-new-deployment \
  --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
  --output table

echo "==> デプロイ完了: $ECR_URI:$IMAGE_TAG (revision $NEW_REVISION)"
