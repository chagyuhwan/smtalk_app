# 배포 가이드

실제 앱스토어/플레이스토어 배포를 위한 단계별 가이드입니다.

---

## 📋 배포 전 필수 체크리스트

### 1단계: 법적 요구사항 완료 (최우선)

#### 1.1 약관 및 개인정보 처리방침 완성
- [ ] `screens/PrivacyPolicyScreen.tsx` 수정
  - `[회사명]` → 실제 회사명으로 변경
  - `[서비스명]` → 실제 서비스명으로 변경
  - `[시행일]` → 실제 시행일자로 변경
  - `[성명]`, `[이메일 주소]`, `[전화번호]` → 실제 연락처로 변경
  - 법무 검토 완료

- [ ] `screens/TermsOfServiceScreen.tsx` 수정
  - `[회사명]` → 실제 회사명으로 변경
  - `[서비스명]` → 실제 서비스명으로 변경
  - `[시행일]` → 실제 시행일자로 변경
  - 법무 검토 완료

#### 1.2 성인인증 시스템
- [ ] **현재 상태**: 나이 검증만 구현됨 (만 19세 이상)
- [ ] **추가 필요**: 본인인증 서비스 연동 (NICE평가정보, KG모빌리언스 등)
  - 본인인증 API 연동
  - 성인인증 완료 여부 Firestore 저장
  - 미성년자 차단 강화

---

## 🔧 2단계: 프로덕션 환경 설정

### 2.1 Firebase 프로덕션 설정

#### Firebase Console 설정
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **프로덕션 환경 분리** (권장)
   - 개발용 프로젝트와 프로덕션 프로젝트 분리
   - 또는 개발/프로덕션 환경별 앱 추가

#### Firebase 설정 파일
- [ ] `GoogleService-Info.plist` (iOS) 확인
  - Firebase Console → 프로젝트 설정 → iOS 앱 → 다운로드
  - 프로젝트 루트에 배치
  - `.gitignore`에 포함되어 있는지 확인 (보안)

- [ ] `google-services.json` (Android) 확인
  - Firebase Console → 프로젝트 설정 → Android 앱 → 다운로드
  - `android/app/` 폴더에 배치
  - `.gitignore`에 포함되어 있는지 확인

#### Firebase 보안 규칙 확인
- [ ] `firestore.rules` 검토 및 테스트
  - Firebase Console → Firestore Database → 규칙
  - 프로덕션 규칙 배포
  - 보안 규칙 시뮬레이터로 테스트

- [ ] Storage 보안 규칙 확인
  - Firebase Console → Storage → 규칙
  - 업로드/다운로드 권한 확인

### 2.2 환경 변수 설정

#### .env 파일 생성 (선택사항)
```bash
# .env.production
EXPO_PUBLIC_FIREBASE_API_KEY=your_production_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_production_app_id
```

**주의**: `.env` 파일은 `.gitignore`에 포함되어 있어야 합니다.

---

## 📱 3단계: 앱 빌드 준비

### 3.1 app.json 최종 확인

#### 필수 항목 확인
- [ ] `name`: 앱 이름 (한글 가능)
- [ ] `slug`: URL 슬러그 (영문, 소문자, 하이픈만)
- [ ] `version`: 버전 번호 (예: "1.0.0")
- [ ] `ios.bundleIdentifier`: iOS 번들 ID (예: "com.kanc.randomchat")
- [ ] `android.package`: Android 패키지명 (예: "com.kanc.randomchat")
- [ ] `ios.buildNumber`: iOS 빌드 번호 (증가 필요)
- [ ] `android.versionCode`: Android 버전 코드 (증가 필요)

#### 앱 아이콘 및 스플래시
- [ ] `icon`: 앱 아이콘 (1024x1024px PNG)
- [ ] `splash.image`: 스플래시 이미지
- [ ] `ios.adaptiveIcon`: Android 적응형 아이콘

### 3.2 프로덕션 빌드 전 확인사항

#### 코드 최적화
- [ ] `__DEV__` 플래그로 감싼 디버그 코드 제거 확인
- [ ] 콘솔 로그 최소화 (프로덕션에서는 제거 권장)
- [ ] 에러 핸들링 강화 확인

#### 성능 최적화
- [ ] 이미지 최적화 확인
- [ ] 불필요한 의존성 제거
- [ ] 번들 크기 확인

---

## 🍎 4단계: iOS 앱스토어 배포

### 4.1 Apple Developer 계정 준비
- [ ] Apple Developer Program 가입 ($99/년)
- [ ] Apple ID로 로그인
- [ ] 인증서 및 프로비저닝 프로파일 생성

### 4.2 App Store Connect 설정
1. [App Store Connect](https://appstoreconnect.apple.com/) 접속
2. **앱 정보** 생성
   - 앱 이름
   - 기본 언어
   - 번들 ID (app.json의 bundleIdentifier와 일치)
   - SKU (고유 식별자)

3. **앱 등급 설정**
   - 콘텐츠 등급: **17+ 또는 18+** (성인 콘텐츠)
   - 성인 콘텐츠 관련 질문 답변

4. **가격 및 판매 지역** 설정

### 4.3 앱 정보 입력
- [ ] **앱 설명** 작성
  - 주요 기능 설명
  - 사용자 혜택
  - 키워드 최적화

- [ ] **스크린샷** 준비
  - iPhone 6.7인치 (1290x2796px) - 필수
  - iPhone 6.5인치 (1284x2778px) - 필수
  - iPhone 5.5인치 (1242x2208px) - 선택
  - 최소 3개, 최대 10개

- [ ] **앱 아이콘** (1024x1024px)
- [ ] **프로모션 이미지** (선택, 1242x2688px)

### 4.4 개인정보 및 법적 정보
- [ ] **개인정보 처리방침 URL** 입력
  - 웹사이트에 호스팅된 URL
  - 또는 앱 내 화면 (권장: 웹 URL)

- [ ] **지원 URL** 입력
  - 고객센터 웹사이트
  - 또는 이메일 주소

- [ ] **저작권** 정보 입력

### 4.5 빌드 및 제출

#### EAS Build 사용 (권장)
```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 로그인
eas login

# iOS 빌드 (프로덕션)
eas build --platform ios --profile production

# 빌드 완료 후 App Store Connect에 업로드
eas submit --platform ios
```

#### 수동 빌드
```bash
# 네이티브 프로젝트 생성
npx expo prebuild

# iOS 빌드
cd ios
pod install
# Xcode에서 Archive 생성 및 업로드
```

### 4.6 심사 제출
- [ ] 빌드가 App Store Connect에 업로드됨
- [ ] 앱 정보 모두 입력 완료
- [ ] **심사용 정보** 입력
  - 연락처 정보
  - 심사 노트 (선택사항)
- [ ] **제출 검토** 클릭

**심사 소요 시간**: 보통 1-2주 (성인 콘텐츠 앱은 더 오래 걸릴 수 있음)

---

## 🤖 5단계: Android 플레이스토어 배포

### 5.1 Google Play Console 계정 준비
- [ ] Google Play Console 계정 생성 ($25 일회성)
- [ ] 개발자 계정 등록 완료

### 5.2 앱 생성 및 설정
1. [Google Play Console](https://play.google.com/console/) 접속
2. **앱 만들기** 클릭
3. **앱 세부정보** 입력
   - 앱 이름
   - 기본 언어
   - 앱 또는 게임 선택
   - 무료/유료 선택

### 5.3 콘텐츠 등급 설정
- [ ] **콘텐츠 등급 설문** 완료
  - 성인 콘텐츠: **18+** 선택
  - 관련 질문 답변

### 5.4 앱 정보 입력
- [ ] **앱 설명** 작성
  - 짧은 설명 (80자)
  - 전체 설명 (4000자)
  - 키워드 최적화

- [ ] **그래픽 자산** 준비
  - 앱 아이콘 (512x512px)
  - 기능 그래픽 (1024x500px) - 필수
  - 스크린샷 (최소 2개, 최대 8개)
    - 휴대전화: 최소 1080x1920px
    - 7인치 태블릿: 최소 1200x1920px
    - 10인치 태블릿: 최소 1600x2560px

- [ ] **프로모션 비디오** (선택)

### 5.5 개인정보 및 법적 정보
- [ ] **개인정보 처리방침 URL** 입력
- [ ] **데이터 안전성** 정보 입력
  - 수집하는 데이터 유형
  - 데이터 사용 목적
  - 데이터 공유 여부

### 5.6 앱 서명 키 생성
```bash
# 키스토어 생성 (최초 1회만)
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000

# 키스토어 정보를 android/keystore.properties에 저장 (Git에 커밋하지 않기!)
```

### 5.7 빌드 및 제출

#### EAS Build 사용 (권장)
```bash
# Android 빌드 (프로덕션)
eas build --platform android --profile production

# 빌드 완료 후 Play Store에 업로드
eas submit --platform android
```

#### 수동 빌드
```bash
# 네이티브 프로젝트 생성
npx expo prebuild

# Android 빌드
cd android
./gradlew assembleRelease

# APK 또는 AAB 파일 생성됨
# android/app/build/outputs/bundle/release/app-release.aab
```

### 5.8 내부 테스트 (권장)
- [ ] **내부 테스트** 트랙에 업로드
- [ ] 테스터 추가 및 테스트
- [ ] 버그 수정 후 프로덕션 배포

### 5.9 프로덕션 배포
- [ ] **프로덕션** 트랙에 업로드
- [ ] **검토 제출** 클릭

**심사 소요 시간**: 보통 1-3일

---

## 🔐 6단계: 보안 및 모니터링 설정

### 6.1 Firebase Crashlytics 설정 (권장)
```bash
# Firebase Crashlytics 설치
npm install @react-native-firebase/crashlytics

# ErrorReportingService.ts 업데이트
# TODO 부분에 Crashlytics 연동 코드 추가
```

### 6.2 Firebase Analytics 확인
- [ ] Analytics 이벤트가 정상 작동하는지 확인
- [ ] 대시보드에서 데이터 확인

### 6.3 보안 확인
- [ ] API 키가 코드에 하드코딩되지 않았는지 확인
- [ ] `.gitignore`에 민감한 파일 포함 확인
- [ ] Firebase 보안 규칙 최종 확인

---

## 📊 7단계: 배포 후 모니터링

### 7.1 앱스토어/플레이스토어 모니터링
- [ ] 리뷰 모니터링
- [ ] 평점 관리
- [ ] 크래시 리포트 확인

### 7.2 Firebase 모니터링
- [ ] Crashlytics 크래시 로그 확인
- [ ] Analytics 사용자 행동 분석
- [ ] Performance 모니터링

### 7.3 업데이트 준비
- [ ] 버전 번호 증가 (`app.json`)
- [ ] 빌드 번호 증가 (`ios.buildNumber`, `android.versionCode`)
- [ ] 변경사항 문서화

---

## 🚨 주의사항

### iOS 앱스토어
- **성인 콘텐츠 앱**: 심사가 더 엄격함
- **본인인증**: 필수 (만 19세 이상)
- **개인정보 처리방침**: 반드시 웹 URL 제공
- **심사 거부 시**: 수정 후 재제출 (1-2주 소요)

### Android 플레이스토어
- **콘텐츠 등급**: 18+ 필수
- **데이터 안전성**: 상세히 입력 필요
- **개인정보 처리방침**: 필수
- **심사 거부 시**: 수정 후 재제출 (1-3일 소요)

### 공통
- **성매매 관련 콘텐츠**: 절대 금지 (즉시 삭제)
- **미성년자 보호**: 최우선 과제
- **개인정보 보호**: GDPR, 개인정보 보호법 준수

---

## 📝 체크리스트 요약

### 배포 전 필수 항목
- [ ] 약관 및 개인정보 처리방침 완성 및 법무 검토
- [ ] 성인인증 시스템 구현 (본인인증 연동)
- [ ] Firebase 프로덕션 환경 설정
- [ ] 앱 아이콘 및 스크린샷 준비
- [ ] 앱 설명 및 키워드 작성
- [ ] 빌드 및 테스트 완료

### 배포 후 필수 항목
- [ ] 모니터링 설정
- [ ] 리뷰 관리
- [ ] 크래시 리포트 확인
- [ ] 사용자 피드백 수집

---

## 🔗 유용한 링크

- [Expo 배포 가이드](https://docs.expo.dev/distribution/introduction/)
- [EAS Build 문서](https://docs.expo.dev/build/introduction/)
- [Apple Developer](https://developer.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [Firebase Console](https://console.firebase.google.com/)

---

*마지막 업데이트: 2024년*


