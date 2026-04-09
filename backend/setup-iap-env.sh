#!/bin/bash
KEY_FILE="/home/ec2-user/google-play-key.json"
ENV_FILE="/home/ec2-user/smtalk-backend/.env"

EMAIL=$(node -e "const k=require('$KEY_FILE'); process.stdout.write(k.client_email);")
PRIVATE_KEY=$(node -e "const k=require('$KEY_FILE'); process.stdout.write(k.private_key.replace(/\n/g,'\\\\n'));")

# 기존 GOOGLE_PLAY 설정 제거 후 추가
sed -i '/^GOOGLE_PLAY_CLIENT_EMAIL/d' "$ENV_FILE"
sed -i '/^GOOGLE_PLAY_PRIVATE_KEY/d' "$ENV_FILE"

echo "GOOGLE_PLAY_CLIENT_EMAIL=$EMAIL" >> "$ENV_FILE"
echo "GOOGLE_PLAY_PRIVATE_KEY=\"$PRIVATE_KEY\"" >> "$ENV_FILE"

echo "✅ .env 파일에 Google Play 서비스 계정 등록 완료"
echo "EMAIL: $EMAIL"
grep GOOGLE_PLAY_CLIENT_EMAIL "$ENV_FILE"
