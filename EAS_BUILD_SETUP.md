# EAS Build 설정 가이드

## Firebase 설정 파일 업로드

`google-services.json`과 `GoogleService-Info.plist` 파일이 `.gitignore`에 포함되어 있어 EAS Build에 자동으로 포함되지 않습니다.
EAS 환경 변수를 사용하여 파일을 제공해야 합니다.

### 방법 1: EAS CLI로 파일 환경 변수 설정 (권장)

#### Android용 google-services.json 설정:
```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value-file ./google-services.json
```

#### iOS용 GoogleService-Info.plist 설정:
```bash
eas secret:create --scope project --name GOOGLE_SERVICES_PLIST --type file --value-file ./GoogleService-Info.plist
```

### 방법 2: eas.json에 envFiles 설정 추가

`eas.json`의 각 빌드 프로필에 `envFiles`를 추가할 수 있습니다.

### 방법 3: .gitignore에서 제외 (보안상 권장하지 않음)

`.gitignore`에서 해당 파일들을 제거하고 Git에 추가:
```bash
git rm --cached google-services.json GoogleService-Info.plist
# .gitignore에서 해당 라인 제거
git add google-services.json GoogleService-Info.plist
git commit -m "Add Firebase config files"
```

**주의**: 이 방법은 민감한 정보가 포함된 파일을 Git에 커밋하게 되므로 보안상 권장하지 않습니다.

## 권장 방법

**방법 1 (EAS Secret)**을 사용하는 것을 강력히 권장합니다.

