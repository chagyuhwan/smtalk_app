/**
 * 인증 제공자 Factory
 * 설정에 따라 적절한 인증 제공자를 반환합니다.
 */

import { IAuthProvider, AuthProviderType } from '../types/AuthProvider';
import { AUTH_PROVIDER_TYPE } from '../constants/auth';
import { FirebaseAuthProvider } from './providers/FirebaseAuthProvider';
import { NiceAuthProvider } from './providers/NiceAuthProvider';
import { logger } from '../utils/logger';

class AuthProviderFactory {
  private static instance: IAuthProvider | null = null;
  private static currentType: AuthProviderType | null = null;

  /**
   * 현재 설정된 인증 제공자 가져오기
   */
  static getProvider(): IAuthProvider {
    // 이미 생성된 인스턴스가 있고 타입이 같으면 재사용
    if (this.instance && this.currentType === AUTH_PROVIDER_TYPE) {
      return this.instance;
    }

    // 타입이 변경되었거나 처음 생성하는 경우
    this.currentType = AUTH_PROVIDER_TYPE;

    switch (AUTH_PROVIDER_TYPE) {
      case 'nice':
        logger.log('[AuthProviderFactory] NICE 인증 제공자 생성');
        this.instance = new NiceAuthProvider();
        break;
      case 'firebase':
      default:
        logger.log('[AuthProviderFactory] Firebase 인증 제공자 생성');
        this.instance = new FirebaseAuthProvider();
        break;
    }

    return this.instance;
  }

  /**
   * 특정 인증 제공자로 설정 (테스트용)
   */
  static setProvider(provider: IAuthProvider, type: AuthProviderType): void {
    this.instance = provider;
    this.currentType = type;
    logger.log(`[AuthProviderFactory] 인증 제공자를 ${type}로 수동 설정`);
  }

  /**
   * 인증 제공자 리셋 (주로 테스트용)
   */
  static reset(): void {
    this.instance = null;
    this.currentType = null;
    logger.log('[AuthProviderFactory] 인증 제공자 리셋');
  }

  /**
   * 현재 사용 중인 인증 제공자 타입 가져오기
   */
  static getCurrentType(): AuthProviderType {
    return AUTH_PROVIDER_TYPE;
  }
}

// 싱글톤 인스턴스 export
export const authProvider = AuthProviderFactory.getProvider();

// Factory 클래스도 export (테스트나 특수한 경우에 사용)
export { AuthProviderFactory };
