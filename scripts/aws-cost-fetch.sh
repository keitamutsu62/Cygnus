#!/bin/bash
# バックグラウンドでAWSデータを取得してキャッシュに保存
# launchd または手動で定期実行する

CACHE="/tmp/cygnus-aws-cost.cache"
RATE=147

# ECS稼働状況
RUNNING=$(aws ecs describe-services \
  --region ap-northeast-1 \
  --cluster cygnus \
  --services cygnus-loop-backend \
  --query 'services[0].runningCount' \
  --cli-read-timeout 5 \
  --cli-connect-timeout 3 \
  --output text 2>/dev/null)

[ "$RUNNING" = "1" ] && ECS="API:✅" || ECS="API:⚠"

# Cost Explorer から実績取得（有効なら）
TODAY=$(date '+%Y-%m-%d')
MONTH_START=$(date '+%Y-%m-01')

ACTUAL=$(aws ce get-cost-and-usage \
  --time-period Start=${MONTH_START},End=${TODAY} \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --cli-read-timeout 5 \
  --cli-connect-timeout 3 \
  --output text 2>/dev/null)

if [ -n "$ACTUAL" ] && [ "$ACTUAL" != "None" ] && [ "$ACTUAL" != "null" ]; then
  JPY=$(python3 -c "print(f'¥{float(\"$ACTUAL\")*$RATE:,.0f}')" 2>/dev/null)
  LABEL="実績 ${JPY}"
else
  LABEL="推定 ¥7,115/月"
fi

echo " 💰 ${LABEL}  ${ECS} " > "$CACHE"
