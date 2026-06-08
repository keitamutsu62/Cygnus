#!/bin/bash
# tmuxの右下ペインで常時表示するコストウォッチャー
RATE=147

while true; do
  clear

  # ECS稼働状況
  RUNNING=$(aws ecs describe-services \
    --region ap-northeast-1 \
    --cluster cygnus \
    --services cygnus-loop-backend \
    --query 'services[0].runningCount' \
    --cli-read-timeout 5 \
    --cli-connect-timeout 3 \
    --output text 2>/dev/null)
  [ "$RUNNING" = "1" ] && ECS="✅ 稼働中" || ECS="⚠  停止中"

  # Cost Explorer（有効なら実績、なければ推定）
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
    COST=$(python3 -c "print(f'¥{float(\"$ACTUAL\")*$RATE:,.0f}')" 2>/dev/null)
    KIND="実績"
  else
    COST="¥7,115"
    KIND="推定"
  fi

  echo "┌─────────────────┐"
  echo "│  💰 AWS コスト  │"
  echo "├─────────────────┤"
  echo "│ ${KIND}: ${COST}/月  │" | awk '{printf "│ %-16s│\n", substr($0,3)}'
  printf "│ %-16s│\n" "${KIND}: ${COST}/月"
  echo "├─────────────────┤"
  printf "│ API  %-11s│\n" "$ECS"
  echo "├─────────────────┤"
  printf "│ %-16s│\n" "$(date '+%m/%d %H:%M') 更新"
  echo "└─────────────────┘"

  sleep 300  # 5分ごとに更新
done
