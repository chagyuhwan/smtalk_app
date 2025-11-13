# Random Chat - Windows 환경 실행 가이드

React Native + Expo 기반의 랜덤 채팅 앱입니다.

## 📋 사전 요구사항

### 1. Node.js 설치
- **다운로드**: [Node.js 공식 사이트](https://nodejs.org/) (LTS 버전 권장)
- **설치 확인**:
  ```bash
  node --version
  npm --version
  ```

### 2. Git 설치
- **다운로드**: [Git 공식 사이트](https://git-scm.com/download/win)
- **설치 확인**:
  ```bash
  git --version
  ```

### 3. Android Studio 설치
- **다운로드**: [Android Studio 공식 사이트](https://developer.android.com/studio)
- **설치 시 필수 구성요소**:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device (AVD)
  - Performance (Intel HAXM) - Intel CPU인 경우

### 4. Java JDK 설치
- **다운로드**: [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 또는 [OpenJDK](https://adoptium.net/)
- **권장 버전**: JDK 17 이상
- **설치 확인**:
  ```bash
  java -version
  ```

### 5. 환경 변수 설정

#### JAVA_HOME 설정
1. 시스템 속성 → 고급 → 환경 변수
2. 시스템 변수에서 **새로 만들기**:
   - 변수 이름: `JAVA_HOME`
   - 변수 값: JDK 설치 경로 (예: `C:\Program Files\Java\jdk-17`)
3. Path 변수에 추가:
   - `%JAVA_HOME%\bin`

#### ANDROID_HOME 설정
1. 시스템 변수에서 **새로 만들기**:
   - 변수 이름: `ANDROID_HOME`
   - 변수 값: Android SDK 경로 (예: `C:\Users\사용자명\AppData\Local\Android\Sdk`)
2. Path 변수에 추가:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

> **참고**: Android SDK 경로는 Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK에서 확인 가능합니다.

## 🚀 프로젝트 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/사용자명/random_chat.git
cd random_chat
```

### 2. 의존성 설치
```bash
npm install
```

### 3. Firebase 설정 파일 확인
프로젝트에 다음 파일들이 포함되어 있는지 확인:
- `android/app/google-services.json` (Android용)
- `GoogleService-Info.plist` (iOS용, Windows에서는 불필요)

> **중요**: Firebase 프로젝트를 새로 만든 경우, Firebase Console에서 해당 파일들을 다운로드하여 프로젝트에 추가해야 합니다.

### 4. Android 에뮬레이터 실행
1. Android Studio 실행
2. **Tools** → **Device Manager**
3. **Create Device** 클릭
4. 원하는 기기 선택 (예: Pixel 5)
5. 시스템 이미지 선택 (API 33 이상 권장)
6. 에뮬레이터 생성 후 **▶️ Play** 버튼 클릭

또는 명령어로 확인:
```bash
adb devices
```

### 5. 프로젝트 실행

#### 방법 1: Expo 개발 서버 실행 (권장)
```bash
npm start
```
터미널에서 `a` 키를 눌러 Android 앱 실행

#### 방법 2: 직접 Android 빌드 및 실행
```bash
npm run android
```

## 🔧 문제 해결

### 에뮬레이터가 보이지 않는 경우
```bash
# ADB 재시작
adb kill-server
adb start-server
adb devices
```

### Metro 번들러 포트 충돌
```bash
# 포트 8081 사용 중인 프로세스 종료
npx react-native start --port 8081
```

### Gradle 빌드 오류
```bash
# Android 프로젝트 클린
cd android
./gradlew clean
cd ..
```

### 캐시 문제
```bash
# npm 캐시 클리어
npm start -- --reset-cache

# 또는
npx expo start --clear
```

### Firebase 연결 오류
- `google-services.json` 파일이 `android/app/` 폴더에 올바르게 위치하는지 확인
- Firebase 프로젝트의 패키지 이름이 `com.kanc.randomchat`과 일치하는지 확인

## 📱 실제 기기에서 실행하기

### USB 디버깅 활성화
1. Android 기기에서 **설정** → **휴대전화 정보**
2. **빌드 번호**를 7번 연속 탭하여 개발자 옵션 활성화
3. **설정** → **개발자 옵션** → **USB 디버깅** 활성화
4. USB로 PC에 연결
5. 기기에서 USB 디버깅 허용 확인

### 실행
```bash
adb devices  # 연결된 기기 확인
npm run android
```

## 📝 추가 참고사항

- Windows에서는 **iOS 빌드가 불가능**합니다. iOS는 macOS에서만 빌드 가능합니다.
- 첫 빌드는 시간이 오래 걸릴 수 있습니다 (10-20분).
- Android Studio의 에뮬레이터는 RAM을 많이 사용하므로, 최소 8GB 이상의 RAM을 권장합니다.

## 🆘 도움이 필요한 경우

- Expo 문서: https://docs.expo.dev/
- React Native 문서: https://reactnative.dev/docs/getting-started
- Android Studio 가이드: https://developer.android.com/studio/intro

