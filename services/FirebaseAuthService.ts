/**
 * Firebase Authentication 서비스
 * 전화번호 인증 및 사용자 관리
 * 
 * Firebase 웹 SDK를 사용합니다 (React Native Expo 환경)
 * iOS에서는 reCAPTCHA 제한으로 인해 네이티브 빌드가 필요할 수 있습니다.
 */

import { 
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  User,
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
  private verificationId: string | null = null;

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
   */
  async sendVerificationCode(
    phoneNumber: string
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

      // 웹 SDK 사용
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      
      // iOS에서 웹 SDK 사용 시 reCAPTCHA verifier가 필요하지만 제공할 수 없으므로
      // 에러를 더 명확하게 처리
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        internationalPhone
      );
      
      console.log('인증 코드 발송 성공, verificationId:', verificationId);
      
      this.verificationId = verificationId;
      
      return {
        success: true,
        message: '인증 코드가 발송되었습니다.',
        verificationId: verificationId,
        sessionId: verificationId,
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
      } else if (error.code === 'auth/argument-error') {
        if (Platform.OS === 'ios') {
          // iOS에서 reCAPTCHA 문제로 발생하는 경우
          // Firebase 웹 SDK는 iOS에서 reCAPTCHA verifier가 필요한데 React Native에서는 제공할 수 없음
          errorMessage = 'iOS에서는 현재 Firebase 전화번호 인증이 제한됩니다.\n\n개발 단계에서는 Android 기기에서 테스트해주시거나, 다음주 예정된 NICE 성인인증 전환을 기다려주세요.';
        } else {
          errorMessage = '인증 설정에 문제가 있습니다. Firebase Console에서 설정을 확인해주세요.';
        }
      } else if (error.message) {
        errorMessage = error.message;
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
      if (!this.verificationId) {
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

      // PhoneAuthCredential 생성 및 인증
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const credential = PhoneAuthProvider.credential(
        this.verificationId,
        code
      );
      
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      // verificationId 초기화
      this.verificationId = null;

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
      this.verificationId = null;
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
    this.verificationId = null;
  }
}

export const firebaseAuthService = new FirebaseAuthService();
