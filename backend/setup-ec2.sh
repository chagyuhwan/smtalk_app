#!/bin/bash
# EC2(Ubuntu 22.04) 최초 1회 실행 — Node.js, pm2, nginx, certbot 설치
set -euo pipefail

echo "=== smtalk EC2 초기 설정 ==="

if [ "$(id -u)" -eq 0 ]; then
  echo "root가 아닌 일반 사용자(ubuntu)로 실행하세요."
  exit 1
fi

sudo apt-get update -y
sudo apt-get install -y curl git nginx certbot python3-certbot-nginx

if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo npm install -g pm2

mkdir -p ~/smtalk-backend
mkdir -p /var/www/smtalk 2>/dev/null || sudo mkdir -p /var/www/smtalk

# 정책 HTML (nginx 정적 경로용, server.js에서도 제공)
if [ -f ~/smtalk-backend/privacy-policy.html ]; then
  sudo cp ~/smtalk-backend/*.html /var/www/smtalk/ 2>/dev/null || true
fi

echo ""
echo "=== 설치 완료 ==="
echo "Node: $(node -v)"
echo "pm2: $(pm2 -v)"
echo ""
echo "다음: 로컬 PC에서 deploy-to-ec2.ps1 실행 (코드 업로드 + nginx + SSL)"
echo "또는 ~/smtalk-backend/.env 작성 후:"
echo "  cd ~/smtalk-backend && npm install && pm2 start server.js --name smtalk-api"
echo "  pm2 save && pm2 startup"
