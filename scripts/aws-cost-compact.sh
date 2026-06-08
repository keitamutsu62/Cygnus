#!/bin/bash
# tmuxステータスバー用（キャッシュファイルを読むだけ・瞬時に表示）
CACHE="/tmp/cygnus-aws-cost.cache"

if [ -f "$CACHE" ]; then
  cat "$CACHE"
else
  echo " 💰 推定 ¥7,115/月  API:… "
fi
