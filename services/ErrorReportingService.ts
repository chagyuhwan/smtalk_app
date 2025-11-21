/**
 * 에러 리포팅 서비스
 * 크래시 및 에러 로깅
 * 
 * Firestore에 에러를 저장하여 크래시 리포팅 기능을 구현합니다.
 * Expo 환경에서는 네이티브 Crashlytics를 사용할 수 없으므로
 * Firestore를 활용한 커스텀 크래시 리포팅을 사용합니다.
 * 
 * 향후 네이티브 빌드로 전환 시 Firebase Crashlytics로 교체 가능합니다.
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  timestamp: number;
}

class ErrorReportingService {
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100; // 최대 로그 개수
  private initialized = false;
  private currentUserId: string | null = null;
  private enabled = true; // 프로덕션에서만 활성화

  /**
   * 초기화
   */
  initialize(): void {
    if (this.initialized) return;
    
    this.initialized = true;
    // 개발 환경에서도 활성화 (테스트 가능하도록)
    // 프로덕션에서만 활성화하려면: this.enabled = !__DEV__;
    this.enabled = true;
    
    console.log('Error Reporting Service 초기화 완료', { enabled: this.enabled });
  }

  /**
   * 에러 로깅
   */
  async logError(
    error: Error | string,
    context?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      const errorInfo: ErrorInfo = {
        message: typeof error === 'string' ? error : error.message,
        code: typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
        stack: typeof error === 'object' && error.stack ? error.stack : undefined,
        context,
        userId: userId || this.currentUserId || undefined,
        timestamp: Date.now(),
      };

      // 로컬 로그에 추가
      this.errorLog.push(errorInfo);
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog.shift(); // 오래된 로그 제거
      }

      // 개발 환경에서는 콘솔에 출력
      if (__DEV__) {
        console.error('[Error Reporting]', errorInfo);
      }

      // 프로덕션 환경에서만 Firestore에 저장
      if (this.enabled && this.initialized) {
        try {
          await this.saveToFirestore(errorInfo);
        } catch (firestoreError) {
          // Firestore 저장 실패해도 앱은 계속 작동
          console.error('Firestore 에러 저장 실패:', firestoreError);
        }
      }
    } catch (reportingError) {
      // 에러 리포팅 자체가 실패해도 앱은 계속 작동
      console.error('에러 리포팅 실패:', reportingError);
    }
  }

  /**
   * Firestore에 에러 저장
   */
  private async saveToFirestore(errorInfo: ErrorInfo): Promise<void> {
    try {
      const errorDoc = {
        message: errorInfo.message,
        code: errorInfo.code || null,
        stack: errorInfo.stack || null,
        context: errorInfo.context || {},
        userId: errorInfo.userId || null,
        timestamp: Timestamp.fromMillis(errorInfo.timestamp),
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
        deviceInfo: {
          os: Platform.OS,
          version: Platform.Version,
        },
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'errorLogs'), errorDoc);
    } catch (error) {
      // Firestore 저장 실패는 조용히 처리 (무한 루프 방지)
      console.error('Firestore 에러 저장 실패:', error);
    }
  }

  /**
   * 크래시 로깅
   */
  async logCrash(error: Error, context?: Record<string, any>): Promise<void> {
    await this.logError(error, { ...context, isCrash: true, fatal: true });
  }

  /**
   * 사용자 정의 에러 로깅
   */
  async logCustomError(
    message: string,
    context?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.logError(new Error(message), context, userId);
  }

  /**
   * 에러 로그 조회 (디버깅용)
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * 에러 로그 초기화
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * 사용자 ID 설정
   */
  setUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  /**
   * 사용자 속성 설정
   * 다음 에러 로그에 포함됩니다.
   */
  setUserAttribute(name: string, value: string): void {
    // 사용자 속성은 context에 포함되어 저장됩니다.
    // 필요시 별도로 관리할 수 있습니다.
  }

  /**
   * 에러 리포팅 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 테스트 크래시 발생 (개발용)
   */
  async testCrash(): Promise<void> {
    if (__DEV__) {
      await this.logCrash(new Error('테스트 크래시'), {
        test: true,
        timestamp: Date.now(),
      });
    }
  }
}

export const errorReportingService = new ErrorReportingService();

/**
 * 전역 에러 핸들러 설정
 */
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // 에러 리포팅 (비동기이지만 await 없이 호출)
    errorReportingService.logCrash(error, {
      isFatal: isFatal || false,
      platform: 'react-native',
    }).catch((reportingError) => {
      // 에러 리포팅 실패는 조용히 처리
      console.error('전역 에러 핸들러 리포팅 실패:', reportingError);
    });
    
    // 원래 핸들러 호출
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// 서비스 초기화
errorReportingService.initialize();

