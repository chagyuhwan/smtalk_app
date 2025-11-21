# 크래시 리포팅 설정 가이드

## 구현 완료

Firestore 기반 크래시 리포팅이 구현되었습니다.

## 기능

### 1. 자동 크래시 리포팅
- 전역 에러 핸들러가 모든 크래시를 자동으로 캡처
- Firestore의 `errorLogs` 컬렉션에 저장

### 2. 수동 에러 리포팅
```typescript
import { errorReportingService } from './services/ErrorReportingService';

// 에러 로깅
await errorReportingService.logError(error, { context: 'additional info' });

// 크래시 로깅
await errorReportingService.logCrash(error, { context: 'crash context' });

// 사용자 정의 에러
await errorReportingService.logCustomError('에러 메시지', { context });
```

### 3. 사용자 ID 설정
- 로그인 시 자동으로 사용자 ID 설정
- 로그아웃 시 자동으로 제거

## Firestore 구조

### errorLogs 컬렉션
```typescript
{
  message: string;           // 에러 메시지
  code?: string;            // 에러 코드
  stack?: string;           // 스택 트레이스
  context?: object;         // 추가 컨텍스트
  userId?: string;          // 사용자 ID
  timestamp: Timestamp;     // 에러 발생 시간
  platform: 'ios' | 'android'; // 플랫폼
  appVersion: string;       // 앱 버전
  buildNumber: string;      // 빌드 번호
  deviceInfo: {
    os: string;
    version: string;
  };
  createdAt: Timestamp;     // 저장 시간
}
```

## Firestore 보안 규칙

```javascript
match /errorLogs/{errorId} {
  // 모든 인증된 사용자는 에러 로그를 작성할 수 있음
  allow create: if request.auth != null;
  
  // 관리자만 에러 로그를 읽을 수 있음
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
  
  // 에러 로그는 수정/삭제 불가 (읽기 전용)
  allow update, delete: if false;
}
```

## Firebase Console에서 확인

1. Firebase Console 접속
2. Firestore Database로 이동
3. `errorLogs` 컬렉션 확인
4. 에러 로그 조회 및 분석

## 에러 분석

### 필터링
- `platform`: iOS 또는 Android
- `userId`: 특정 사용자의 에러만 조회
- `timestamp`: 시간대별 에러 조회
- `message`: 에러 메시지로 검색

### 통계
- 플랫폼별 에러 발생률
- 사용자별 에러 발생률
- 시간대별 에러 발생률
- 에러 유형별 분류

## 향후 개선 사항

### 네이티브 빌드 전환 시
네이티브 빌드로 전환하면 Firebase Crashlytics를 사용할 수 있습니다:

```typescript
// @react-native-firebase/crashlytics 사용
import crashlytics from '@react-native-firebase/crashlytics';

// 크래시 리포팅
crashlytics().recordError(error);
crashlytics().setUserId(userId);
crashlytics().setAttribute('key', 'value');
```

### Sentry 사용 (선택)
Sentry는 Expo에서 잘 지원되며 더 강력한 기능을 제공합니다:

```bash
npm install @sentry/react-native
```

## 테스트

### 개발 환경에서 테스트
```typescript
import { errorReportingService } from './services/ErrorReportingService';

// 테스트 크래시 발생
await errorReportingService.testCrash();
```

### 실제 에러 발생 테스트
```typescript
// 의도적으로 에러 발생
throw new Error('테스트 에러');
```

## 주의사항

1. **개인정보**: 에러 로그에 개인정보가 포함되지 않도록 주의
2. **비용**: Firestore 읽기/쓰기 비용 고려
3. **보안**: 관리자만 에러 로그를 읽을 수 있도록 설정
4. **보관 기간**: 오래된 에러 로그는 주기적으로 삭제 권장

## 문제 해결

### 에러 로그가 저장되지 않는 경우
1. Firestore 보안 규칙 확인
2. 사용자 인증 상태 확인
3. 네트워크 연결 확인
4. 콘솔 로그 확인

### Firestore 비용이 증가하는 경우
1. 에러 로그 보관 기간 설정
2. 중요 에러만 저장하도록 필터링
3. 배치 처리로 저장 빈도 조절


