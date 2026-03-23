/**
 * 인증 제공자 인터페이스
 * Firebase, NICE 등 다양한 인증 방식을 지원하기 위한 추상화
 */

import { User } from 'firebase/auth';

/**
 * 인증 제공자 타입
 */
export type AuthProviderType = 'firebase' | 'nice';

/**
 * 인증 결과
 */
export interface AuthResult {
  success: boolean;
  message: string;
  sessionId?: string;
  verificationId?: string;
}

/**
 * 인증 코드 검증 결과
 */
export interface VerifyResult {
  success: boolean;
  message: string;
  verified: boolean;
  user?: AuthUser;
}

/**
 * 인증된 사용자 정보
 */
export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
  // Firebase User 객체를 직접 반환할 수도 있음
  firebaseUser?: User;
}

/**
 * 인증 제공자 인터페이스
 */
export interface IAuthProvider {
  /**
   * 인증 코드 발송
   * @param phoneNumber 전화번호 (010-1234-5678 형식)
   */
  sendVerificationCode(phoneNumber: string): Promise<AuthResult>;
  
  /**
   * 인증 코드 검증
   * @param code 인증 코드
   * @param sessionId 세션 ID (선택사항)
   */
  verifyCode(code: string, sessionId?: string): Promise<VerifyResult>;
  
  /**
   * 현재 인증된 사용자 정보 가져오기
   */
  getCurrentUser(): AuthUser | null;
  
  /**
   * 로그아웃
   */
  signOut(): Promise<void>;
  
  /**
   * 인증 세션 초기화
   */
  resetConfirmation(): void;
}
