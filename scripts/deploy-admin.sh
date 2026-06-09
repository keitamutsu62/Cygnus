#!/bin/bash
set -e

REGION="ap-northeast-1"
ECR_URI="219078481395.dkr.ecr.ap-northeast-1.amazonaws.com/cygnus-loop-backend"
ADMIN_S3="cygnus-admin-frontend"
API_BASE="https://api.cygnus.style"

echo "╔══════════════════════════════════════╗"
echo "║   Cygnus Admin デプロイスクリプト    ║"
echo "╚══════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# ① Terraform apply
echo "▶ [1/5] Terraform apply..."
cd infra
terraform apply -auto-approve
CF_ID=$(terraform output -json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('admin_cloudfront_id',{}).get('value',''))" 2>/dev/null || echo "")
cd ..
echo "✅ インフラ更新完了"
echo ""

# ② 本番RDBのマイグレーション
echo "▶ [2/5] 本番DBマイグレーション..."
RDS_HOST=$(cd infra && terraform output -raw db_endpoint 2>/dev/null || echo "")
if [ -n "$RDS_HOST" ]; then
  mysql -h "$RDS_HOST" -u cygnus -p"$(cd infra && terraform output -raw db_password 2>/dev/null)" cygnus_dev <<'SQL'
CREATE TABLE IF NOT EXISTS admin_appointments (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_name VARCHAR(255) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  date       DATE NOT NULL,
  time       VARCHAR(5) NULL,
  status     ENUM('scheduled','done','cancelled') NOT NULL DEFAULT 'scheduled',
  notes      TEXT NULL,
  result     TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
);
SQL
  echo "✅ DBマイグレーション完了"
else
  echo "⚠️  RDSエンドポイント取得失敗 - 手動でマイグレーションしてください"
fi
echo ""

# ③ バックエンドデプロイ
echo "▶ [3/5] バックエンド ビルド & デプロイ..."
bash scripts/deploy-loop-backend.sh
echo "✅ バックエンドデプロイ完了"
echo ""

# ④ フロントエンドビルド
echo "▶ [4/5] Admin フロントエンド ビルド..."
cd services/admin/frontend
VITE_API_BASE="$API_BASE" npm run build
cd ../../..
echo "✅ フロントエンドビルド完了"
echo ""

# ⑤ S3アップロード & CloudFrontキャッシュクリア
echo "▶ [5/5] S3アップロード..."
aws s3 sync services/admin/frontend/dist/ "s3://$ADMIN_S3/" --delete --region "$REGION"

if [ -n "$CF_ID" ]; then
  echo "CloudFront キャッシュクリア中..."
  aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*"
else
  echo "⚠️  CloudFront IDを手動で確認してキャッシュをクリアしてください"
  echo "   aws cloudfront create-invalidation --distribution-id <ID> --paths '/*'"
fi
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  デプロイ完了！                                      ║"
echo "║  URL: https://admin.cygnus.style                    ║"
echo "╚══════════════════════════════════════════════════════╝"
