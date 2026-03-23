/**
 * Firebase 인증 제공자 구현
 * 기존 FirebaseAuthService를 인터페이스에 맞게 래핑
 */

import { IAuthProvider, AuthResult, VerifyResult, AuthUser } from '../../types/AuthProvider';
import { firebaseAuthService } from '../FirebaseAuthService';
import { User } from 'firebase/auth';

export class FirebaseAuthProvider implements IAuthProvider {
  async sendVerificationCode(phoneNumber: string): Promise<AuthResult> {
    const result = await firebaseAuthService.sendVerificationCode(phoneNumber);
    return {
      success: result.success,
      message: result.message,
      sessionId: result.verificationId || result.sessionId,
      verificationId: result.verificationId,
    };
  }

  async verifyCode(code: string, sessionId?: string): Promise<VerifyResult> {
    const result = await firebaseAuthService.verifyCode(code);
    return {
      success: result.success,
      message: result.message,
      verified: result.verified,
      user: result.user ? {
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber,
        firebaseUser: result.user,
      } : undefined,
    };
  }

  getCurrentUser(): AuthUser | null {
    const user = firebaseAuthService.getCurrentUser();
    if (!user) return null;
    return {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      firebaseUser: user,
    };
  }

  async signOut(): Promise<void> {
    await firebaseAuthService.signOut();
  }

  resetConfirmation(): void {
    firebaseAuthService.resetConfirmation();
  }
}
