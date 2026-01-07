#!/bin/bash
# EAS Build 전에 Firebase 설정 파일을 복사하는 스크립트
# 이 스크립트는 빌드 전에 실행되어야 합니다

if [ ! -f "./google-services.json" ]; then
    echo "Error: google-services.json 파일이 없습니다."
    exit 1
fi

if [ ! -f "./GoogleService-Info.plist" ]; then
    echo "Error: GoogleService-Info.plist 파일이 없습니다."
    exit 1
fi

echo "Firebase 설정 파일 확인 완료"
