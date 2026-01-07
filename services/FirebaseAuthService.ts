/**
 * Firebase Authentication 서비스
 * 전화번호 인증 및 사용자 관리
 * 
 * Firebase 웹 SDK를 사용합니다 (React Native Expo 환경)
 */

import { 
  signInWithPhoneNumber, 
  PhoneAuthProvider, 
  signInWithCredential,
  signOut as firebaseSignOut,
  User,
  ConfirmationResult,
  RecaptchaVerifier,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';

export interface PhoneAuthResult {
  success: boolean;
  message: string;
  verificationId?: string;
  sessionId?: string;
}

export interface VerifyCodeResult {
  success: boolean;
  message: string;
  user?: User;
  verified: boolean;
}

class FirebaseAuthService {
  private confirmationResult: ConfirmationResult | null = null;

  /**
   * 전화번호 형식 검증
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/[-\s]/g, '');
    return /^010\d{8}$/.test(cleaned);
  }

  /**
   * 전화번호 정규화 (하이픈 제거)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[-\s]/g, '');
  }

  /**
   * 전화번호를 국제 형식으로 변환 (+82)
   */
  private formatInternationalPhone(phoneNumber: string): string {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    if (normalized.startsWith('010')) {
      return `+82${normalized.substring(1)}`;
    }
    return `+82${normalized}`;
  }

  /**
   * 인증 코드 발송
   * @param phoneNumber 전화번호 (010-1234-5678 형식)
   * @param recaptchaVerifier reCAPTCHA verifier (Firebase 웹 SDK RecaptchaVerifier)
   */
  async sendVerificationCode(
    phoneNumber: string, 
    recaptchaVerifier: RecaptchaVerifier
  ): Promise<PhoneAuthResult> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);

      if (!this.validatePhoneNumber(normalized)) {
        return {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다. (010-1234-5678)',
        };
      }

      const internationalPhone = this.formatInternationalPhone(normalized);
      console.log('국제 형식 전화번호:', internationalPhone);
      console.log('플랫폼:', Platform.OS);

      // Firebase 웹 SDK를 사용하여 전화번호 인증
      const confirmation = await signInWithPhoneNumber(
        auth,
        internationalPhone,
        recaptchaVerifier
      );
      
      console.log('인증 코드 발송 성공, verificationId:', confirmation.verificationId);
      
      this.confirmationResult = confirmation;
      
      return {
        success: true,
        message: '인증 코드가 발송되었습니다.',
        verificationId: confirmation.verificationId,
        sessionId: confirmation.verificationId,
      };
    } catch (error: any) {
      console.error('인증 코드 발송 오류:', error);
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('전체 에러:', JSON.stringify(error, null, 2));
      
      let errorMessage = '인증 코드 발송에 실패했습니다.';
      
      // Firebase 에러 코드별 처리
      if (error.code === 'auth/too-many-requests') {
        errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = '올바른 전화번호 형식이 아닙니다.';
      } else if (error.code === 'auth/missing-phone-number') {
        errorMessage = '전화번호를 입력해주세요.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = '일일 인증 코드 발송 한도를 초과했습니다. 내일 다시 시도해주세요.';
      } else if (error.code === 'auth/app-not-authorized') {
        errorMessage = '앱이 인증되지 않았습니다. Firebase Console에서 설정을 확인해주세요.';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA 검증에 실패했습니다. 다시 시도해주세요.';
      } else if (error.message) {
        errorMessage = `${error.message} (코드: ${error.code || 'unknown'})`;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * 인증 코드 검증
   */
  async verifyCode(code: string): Promise<VerifyCodeResult> {
    try {
      if (!this.confirmationResult) {
        return {
          success: false,
          message: '인증 세션이 만료되었습니다. 다시 시도해주세요.',
          verified: false,
        };
      }

      if (!code || code.length !== 6) {
        return {
          success: false,
          message: '인증 코드는 6자리 숫자입니다.',
          verified: false,
        };
      }

      // Firebase 웹 SDK를 사용하여 인증 코드 검증
      const result = await this.confirmationResult.confirm(code);
      const user = result.user;
      
      // confirmationResult 초기화
      this.confirmationResult = null;

      return {
        success: true,
        message: '인증이 완료되었습니다.',
        user,
        verified: true,
      };
    } catch (error: any) {
      console.error('인증 코드 검증 오류:', error);
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);

      let errorMessage = '인증 코드가 올바르지 않습니다.';
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = '인증 코드가 올바르지 않습니다.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = '인증 코드가 만료되었습니다. 다시 발송해주세요.';
      } else if (error.code === 'auth/session-expired') {
        errorMessage = '인증 세션이 만료되었습니다. 다시 시도해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        verified: false,
      };
    }
  }

  /**
   * 현재 로그인된 사용자 가져오기
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * 인증 상태 변경 감지
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { onAuthStateChanged } = require('firebase/auth');
    return onAuthStateChanged(auth, callback);
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<void> {
    try {
      console.log('로그아웃 시작');
      await firebaseSignOut(auth);
      this.confirmationResult = null;
      console.log('로그아웃 성공');
    } catch (error: any) {
      console.error('로그아웃 오류:', error);
      console.error('에러 상세:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      throw new Error(`로그아웃 실패: ${error?.message || '알 수 없는 오류'}`);
    }
  }

  /**
   * 인증 세션 초기화
   */
  resetConfirmation(): void {
    this.confirmationResult = null;
  }
}

export const firebaseAuthService = new FirebaseAuthService();
