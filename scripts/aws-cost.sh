#!/bin/bash
# AWS コスト表示スクリプト
# Cost Explorer が有効なら実績値、未有効なら推定値を表示

REGION="ap-northeast-1"
RATE=147  # 1USD = 147円

# 色定義
RED='\033[0;31m'
YLW='\033[0;33m'
GRN='\033[0;32m'
CYN='\033[0;36m'
BLD='\033[1m'
RST='\033[0m'

clear
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "${BLD}  Cygnus AWS コストモニター  $(date '+%Y/%m/%d %H:%M:%S')${RST}"
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo ""

# ─── 実績コスト（Cost Explorer） ────────────────────────
TODAY=$(date '+%Y-%m-%d')
MONTH_START=$(date '+%Y-%m-01')

ACTUAL=$(aws ce get-cost-and-usage \
  --time-period Start=${MONTH_START},End=${TODAY} \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[*].{s:Keys[0],c:Metrics.UnblendedCost.Amount}' \
  --output json 2>/dev/null)

if [ $? -eq 0 ] && [ "$ACTUAL" != "null" ] && [ -n "$ACTUAL" ]; then
  echo -e "${BLD}【今月の実績】${RST}"
  echo "$ACTUAL" | python3 -c "
import json, sys
rate = $RATE
data = json.load(sys.stdin)
total = 0
rows = []
for item in data:
    svc = item['s']
    cost_usd = float(item['c'])
    if cost_usd < 0.001: continue
    cost_jpy = cost_usd * rate
    total += cost_usd
    # サービス名を短縮
    short = svc.replace('Amazon ','').replace('AWS ','').replace('Elastic Compute Cloud','EC2').replace('Relational Database Service','RDS').replace('CloudFront','CloudFront').replace('Elastic Load Balancing','ALB').replace('Simple Storage Service','S3').replace('Route 53','Route53').replace('EC2 Container Service','ECS').replace('Systems Manager','SSM')
    rows.append((cost_usd, f'  {short:<35} \${cost_usd:6.2f}  ¥{cost_jpy:,.0f}'))
for _, row in sorted(rows, reverse=True):
    print(row)
print(f'  {\"─\"*50}')
print(f'  {\"合計\":<35} \${total:6.2f}  ¥{total*rate:,.0f}')
"
else
  echo -e "${YLW}  ⚠ Cost Explorer 未有効（推定値を表示中）${RST}"
  echo -e "${CYN}    有効化: AWSコンソール → アカウント → Cost Explorer${RST}"
fi

echo ""

# ─── 月次推定コスト ──────────────────────────────────────
echo -e "${BLD}【月次推定コスト（東京リージョン）】${RST}"

# ECS Fargate (0.25vCPU, 0.5GB, 24h x 30day)
ECS_USD=$(echo "scale=4; 0.25 * 0.05056 * 720 + 0.5 * 0.00553 * 720" | bc)
# RDS db.t4g.micro
RDS_USD=$(echo "scale=4; 0.026 * 720" | bc)
# ALB (固定費のみ)
ALB_USD=$(echo "scale=4; 0.0243 * 720" | bc)
# CloudFront (2distributions, 軽量)
CF_USD="0.50"
# Route53
R53_USD="0.50"
# S3
S3_USD="0.10"

python3 -c "
rate = $RATE
items = [
    ('ECS Fargate (APIサーバー 24h稼働)', $ECS_USD),
    ('RDS MySQL db.t4g.micro',            $RDS_USD),
    ('ALB ロードバランサー',               $ALB_USD),
    ('CloudFront × 2',                   $CF_USD),
    ('Route 53',                          $R53_USD),
    ('S3',                                $S3_USD),
]
total = sum(c for _,c in items)
for name, cost in items:
    print(f'  {name:<35} \${cost:5.2f}  ¥{cost*rate:,.0f}')
print(f'  {\"─\"*50}')
print(f'  {\"合計（月額）\":<35} \${total:5.2f}  ¥{total*rate:,.0f}')
"

echo ""

# ─── ECS サービス稼働状況 ───────────────────────────────
echo -e "${BLD}【ECS 稼働状況】${RST}"
aws ecs describe-services \
  --region $REGION \
  --cluster cygnus \
  --services cygnus-loop-backend \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}' \
  --output json 2>/dev/null | python3 -c "
import json,sys
d = json.load(sys.stdin)
status = '✅ 稼働中' if d['running'] > 0 else '⚠ 停止中'
print(f'  LOOP backend  {status}  (desired:{d[\"desired\"]} running:{d[\"running\"]})')
" 2>/dev/null || echo "  取得できませんでした"

echo ""
echo -e "${BLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}"
echo -e "  ${CYN}更新間隔: 60秒  終了: Ctrl+C${RST}"
