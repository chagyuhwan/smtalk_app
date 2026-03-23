#!/bin/bash

# NICE 본인인증을 위한 ngrok 자동 설정 스크립트

echo "🚀 NICE 본인인증 ngrok 설정 시작..."
echo ""

# 1. 백엔드 서버가 실행 중인지 확인
if ! lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  백엔드 서버가 실행되지 않았습니다."
    echo "백엔드 서버를 먼저 실행하세요: npm start"
    exit 1
fi

echo "✅ 백엔드 서버가 실행 중입니다 (포트 3000)"
echo ""

# 2. 기존 ngrok 프로세스 종료
pkill -f "ngrok http 3000" 2>/dev/null
sleep 1

# 3. ngrok 실행 (백그라운드)
echo "📡 ngrok 터널 생성 중..."
ngrok http 3000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 3

# 4. ngrok API에서 URL 가져오기
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ ngrok URL을 가져올 수 없습니다."
    echo "ngrok이 제대로 실행되었는지 확인하세요."
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo "✅ ngrok 터널 생성 완료!"
echo "📌 HTTPS URL: $NGROK_URL"
echo ""

# 5. .env 파일 업데이트
ENV_FILE=".env"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

if [ -f "$ENV_FILE" ]; then
    # 백업 생성
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo "📋 기존 .env 파일 백업: $BACKUP_FILE"
    
    # BACKEND_BASE_URL 업데이트 또는 추가
    if grep -q "BACKEND_BASE_URL" "$ENV_FILE"; then
        # 기존 값 업데이트
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|BACKEND_BASE_URL=.*|BACKEND_BASE_URL=$NGROK_URL|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|BACKEND_BASE_URL=.*|BACKEND_BASE_URL=$NGROK_URL|" "$ENV_FILE"
        fi
        echo "✅ BACKEND_BASE_URL 업데이트 완료"
    else
        # 새로 추가
        echo "" >> "$ENV_FILE"
        echo "# NICE 본인인증 백엔드 URL (ngrok)" >> "$ENV_FILE"
        echo "BACKEND_BASE_URL=$NGROK_URL" >> "$ENV_FILE"
        echo "✅ BACKEND_BASE_URL 추가 완료"
    fi
else
    # .env 파일이 없으면 생성
    echo "# NICE 본인인증 백엔드 URL (ngrok)" > "$ENV_FILE"
    echo "BACKEND_BASE_URL=$NGROK_URL" >> "$ENV_FILE"
    echo "✅ .env 파일 생성 완료"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 설정 완료!"
echo ""
echo "📌 다음 URL을 NICE 관리 페이지에 등록하세요:"
echo "   $NGROK_URL/api/nice/callback"
echo ""
echo "📋 NICE 관리 페이지 설정 방법:"
echo "   1. https://www.niceid.co.kr 에 로그인"
echo "   2. '서비스 관리' > '서비스 설정' 메뉴로 이동"
echo "   3. 'Return URL' 또는 '콜백 URL'에 다음 URL 등록:"
echo "      $NGROK_URL/api/nice/callback"
echo "   4. 저장 후 5-10분 대기"
echo ""
echo "⚠️  주의사항:"
echo "   - ngrok 무료 버전은 URL이 매번 변경됩니다"
echo "   - 이 스크립트를 다시 실행하면 새로운 URL로 업데이트됩니다"
echo "   - ngrok 프로세스는 백그라운드에서 실행 중입니다 (PID: $NGROK_PID)"
echo ""
echo "🛑 ngrok 중지: kill $NGROK_PID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
