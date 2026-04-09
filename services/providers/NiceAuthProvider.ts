/**
 * NICE 본인인증 제공자 구현
 * 
 * NICE API 연동 시 이 파일을 수정하여 구현하세요.
 * NICE API 문서를 참고하여 실제 API 호출 로직을 추가해야 합니다.
 */

import { IAuthProvider, AuthResult, VerifyResult, AuthUser } from '../../types/AuthProvider';
import { NICE_CONFIG } from '../../config/nice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

// 인증 세션 정보 저장 키
const NICE_SESSION_KEY = '@nice_auth_session';

interface NiceAuthSession {
  requestNo: string;
  transactionId: string;
  authUrl: string;
  phoneNumber: string;
}

export class NiceAuthProvider implements IAuthProvider {
  // 백엔드 프록시 서버 URL
  private backendUrl = NICE_CONFIG.backendUrl;
  
  // NICE API 설정 (참고용, 실제로는 백엔드에서 사용)
  private baseUrl = NICE_CONFIG.baseUrl;
  private version = NICE_CONFIG.version;
  private clientId = NICE_CONFIG.clientId;
  private secretKey = NICE_CONFIG.secretKey;
  private devLang = NICE_CONFIG.devLang;
  
  // 접근 토큰 캐시 (24시간 유효)
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  
  // 인증 세션 정보
  private authSession: NiceAuthSession | null = null;

  /**
   * Base64UrlEncoding 구현
   * Base64.getUrlEncoder().withoutPadding()과 동일한 동작
   */
  private base64UrlEncode(str: string): string {
    // Base64 인코딩
    const base64 = btoa(str);
    // URL-safe 변환: + -> -, / -> _, = 제거
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * 고유한 요청 번호 생성 (20-50 byte)
   */
  private generateRequestNo(): string {
    // 타임스탬프 + 랜덤 문자열로 고유 번호 생성
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${this.clientId}_${timestamp}_${random}`.substring(0, 50);
  }

  /**
   * 전화번호 형식 검증
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/[-\s]/g, '');
    return /^010\d{8}$/.test(cleaned);
  }

  /**
   * 전화번호 정규화
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[-\s]/g, '');
  }

  /**
   * 인증 요청 (본인인증 시작)
   * 
   * NICE 본인인증 플로우:
   * 1. 접근 토큰 발급
   * 2. 인증 URL 요청
   * 3. WebView에서 인증 진행
   * 4. 인증 결과 확인
   */
  async sendVerificationCode(phoneNumber: string): Promise<AuthResult> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);

      if (!this.validatePhoneNumber(normalized)) {
        return {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다. (010-1234-5678)',
        };
      }

      logger.log('[NICE] 본인인증 요청 시작:', normalized);

      // 1. 접근 토큰 발급
      const token = await this.getAccessToken();
      if (!token) {
        return {
          success: false,
          message: '인증 토큰 발급에 실패했습니다.',
        };
      }

      // 2. 인증 URL 요청
      const authUrlResponse = await this.requestAuthUrl(token, normalized);
      if (!authUrlResponse.success || !authUrlResponse.authUrl) {
        return {
          success: false,
          message: authUrlResponse.message || '인증 URL 요청에 실패했습니다.',
        };
      }

      // 인증 세션 정보 저장
      if (authUrlResponse.sessionId && authUrlResponse.authUrl) {
        this.authSession = {
          requestNo: authUrlResponse.requestNo || '',
          transactionId: authUrlResponse.transactionId || authUrlResponse.sessionId,
          authUrl: authUrlResponse.authUrl,
          phoneNumber: normalized,
        };
        
        // AsyncStorage에 저장 (WebView에서 인증 완료 후 사용)
        await AsyncStorage.setItem(NICE_SESSION_KEY, JSON.stringify(this.authSession));
      }

      return {
        success: true,
        message: '본인인증 화면으로 이동합니다.',
        sessionId: authUrlResponse.transactionId || authUrlResponse.sessionId,
        verificationId: authUrlResponse.authUrl, // WebView에서 사용할 인증 URL
      };
    } catch (error: any) {
      console.error('[NICE] 본인인증 요청 오류:', error);
      return {
        success: false,
        message: error.message || '본인인증 요청에 실패했습니다.',
      };
    }
  }

  /**
   * 인증 URL 요청 (백엔드 서버를 통해)
   */
  private async requestAuthUrl(token: string, phoneNumber: string): Promise<{
    success: boolean;
    message?: string;
    authUrl?: string;
    transactionId?: string;
    requestNo?: string;
    sessionId?: string;
  }> {
    try {
      const url = `${this.backendUrl}/api/nice/auth-url`;
      
      logger.log('[NICE] 인증 URL 요청 (백엔드):', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: token,
          phone_number: phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[NICE] 인증 URL 요청 실패:', response.status, errorData);
        return {
          success: false,
          message: errorData.error || `인증 URL 요청 실패 (${response.status})`,
        };
      }

      const data = await response.json();
      logger.log('[NICE] 인증 URL 응답:', data);
      
      if (!data.success || !data.data) {
        return {
          success: false,
          message: data.error || '인증 URL 요청에 실패했습니다.',
        };
      }
      
      return {
        success: true,
        authUrl: data.data.auth_url,
        transactionId: data.data.transaction_id,
        requestNo: data.data.request_no,
        sessionId: data.data.transaction_id, // 호환성을 위해 transactionId를 sessionId로도 제공
      };
    } catch (error: any) {
      console.error('[NICE] 인증 URL 요청 오류:', error);
      return {
        success: false,
        message: error.message || '인증 URL 요청 중 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 인증 코드 검증 (본인인증 완료 확인)
   * 
   * NICE 본인인증은 WebView에서 완료되므로,
   * web_transaction_id를 사용하여 인증 결과를 확인합니다.
   * 
   * @param code 인증 코드 (NICE에서는 사용하지 않지만 호환성을 위해 유지)
   * @param sessionId web_transaction_id (WebView에서 return_url로 받은 값)
   */
  async verifyCode(code: string, sessionId?: string): Promise<VerifyResult> {
    try {
      // web_transaction_id는 sessionId로 전달됨
      // 또는 AsyncStorage에서 세션 정보를 가져옴
      let webTransactionId = sessionId;
      let session: NiceAuthSession | null = this.authSession;
      
      // 세션이 없으면 AsyncStorage에서 가져오기
      if (!session) {
        try {
          const stored = await AsyncStorage.getItem(NICE_SESSION_KEY);
          if (stored) {
            session = JSON.parse(stored);
          }
        } catch (error) {
          logger.warn('[NICE] 세션 정보 로드 실패:', error);
        }
      }
      
      // web_transaction_id가 필수입니다
      // WebView에서 return_url로 받은 web_transaction_id를 사용해야 함
      if (!webTransactionId) {
        return {
          success: false,
          message: '인증 정보가 없습니다. WebView에서 인증을 완료해주세요.',
          verified: false,
        };
      }
      
      // 세션이 없으면 AsyncStorage에서 다시 시도
      if (!session) {
        try {
          const stored = await AsyncStorage.getItem(NICE_SESSION_KEY);
          if (stored) {
            session = JSON.parse(stored);
          }
        } catch (error) {
          logger.warn('[NICE] 세션 정보 로드 실패:', error);
        }
      }
      
      if (!session) {
        return {
          success: false,
          message: '인증 세션이 만료되었습니다. 다시 시도해주세요.',
          verified: false,
        };
      }

      logger.log('[NICE] 본인인증 결과 확인 시작:', { 
        webTransactionId, 
        transactionId: session.transactionId,
        requestNo: session.requestNo 
      });

      // 접근 토큰 발급
      const token = await this.getAccessToken();
      if (!token) {
        return {
          success: false,
          message: '인증 토큰 발급에 실패했습니다.',
          verified: false,
        };
      }

      // 인증 결과 요청
      const result = await this.requestAuthResult(
        token, 
        webTransactionId,
        session.transactionId,
        session.requestNo
      );
      
      if (!result.success || !result.verified) {
        return {
          success: false,
          message: result.message || '본인인증에 실패했습니다.',
          verified: false,
        };
      }

      // 인증 성공 시 사용자 정보 생성
      const userId = `nice_${session.transactionId}`;
      const phoneNumber = result.phoneNumber || session.phoneNumber || null;
      
      // 인증된 사용자 정보를 AsyncStorage에 저장 (getCurrentUser에서 사용)
      const userInfo = {
        uid: userId,
        phoneNumber: phoneNumber,
        transactionId: session.transactionId,
        verifiedAt: Date.now(),
      };
      await AsyncStorage.setItem('@nice_current_user', JSON.stringify(userInfo));
      
      // 세션 정보 정리 (인증 완료 후 세션은 유지하지 않음)
      this.authSession = null;
      await AsyncStorage.removeItem(NICE_SESSION_KEY);
      
      return {
        success: true,
        message: '본인인증이 완료되었습니다.',
        verified: true,
        customToken: result.customToken,
        user: {
          uid: userId,
          phoneNumber: phoneNumber,
        },
      };
    } catch (error: any) {
      console.error('[NICE] 본인인증 검증 오류:', error);
      return {
        success: false,
        message: error.message || '본인인증 검증에 실패했습니다.',
        verified: false,
      };
    }
  }

  /**
   * 인증 결과 요청 (백엔드 서버를 통해)
   * 
   * @param token 접근 토큰
   * @param webTransactionId WebView에서 return_url로 받은 web_transaction_id
   * @param transactionId /auth/url에서 받은 transaction_id
   * @param requestNo /auth/url에서 요청한 request_no
   */
  private async requestAuthResult(
    token: string, 
    webTransactionId: string,
    transactionId: string,
    requestNo: string
  ): Promise<{
    success: boolean;
    verified: boolean;
    message?: string;
    phoneNumber?: string;
    customToken?: string;
  }> {
    try {
      const url = `${this.backendUrl}/api/nice/auth-result`;
      
      logger.log('[NICE] 인증 결과 요청 (백엔드):', url, { 
        webTransactionId, 
        transactionId, 
        requestNo 
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: token,
          web_transaction_id: webTransactionId,
          transaction_id: transactionId,
          request_no: requestNo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[NICE] 인증 결과 요청 실패:', response.status, errorData);
        return {
          success: false,
          verified: false,
          message: errorData.error || `인증 결과 확인 실패 (${response.status})`,
        };
      }

      const data = await response.json();
      logger.log('[NICE] 인증 결과 응답:', data);
      
      if (!data.success) {
        return {
          success: false,
          verified: false,
          message: data.error || '본인인증에 실패했습니다.',
        };
      }
      
      // NICE API 응답에서 사용자 정보 추출
      const userInfo = data.data?.userInfo || data.data || {};
      const phoneNumber = userInfo.mobile_no || userInfo.mobileNo || userInfo.phoneNumber || userInfo.phone || null;
      
      logger.log('[NICE] 인증 결과 사용자 정보:', userInfo);
      
      return {
        success: true,
        verified: data.verified || false,
        phoneNumber: phoneNumber,
        customToken: data.customToken || undefined,
        message: data.message || '본인인증이 완료되었습니다.',
      };
    } catch (error: any) {
      console.error('[NICE] 인증 결과 요청 오류:', error);
      return {
        success: false,
        verified: false,
        message: error.message || '인증 결과 확인 중 오류가 발생했습니다.',
      };
    }
  }

  getCurrentUser(): AuthUser | null {
    // NICE 인증에서는 인증 완료 후 저장된 사용자 정보 사용
    // 주의: AsyncStorage는 비동기이므로 동기적으로는 null 반환
    // 실제 사용 시에는 PhoneAuthScreen에서 userId state를 사용
    return null;
  }

  async signOut(): Promise<void> {
    // NICE 세션 종료
    this.authSession = null;
    await AsyncStorage.removeItem(NICE_SESSION_KEY);
    await AsyncStorage.removeItem('@nice_current_user');
    this.accessToken = null;
    this.tokenExpiry = 0;
    logger.log('[NICE] 로그아웃 완료');
  }

  resetConfirmation(): void {
    // 세션 초기화
    this.authSession = null;
    AsyncStorage.removeItem(NICE_SESSION_KEY).catch((error) => {
      logger.warn('[NICE] 세션 초기화 실패:', error);
    });
    logger.log('[NICE] 인증 세션 초기화');
  }

  /**
   * WebView에서 인증 완료 후 호출
   * return_url로 리다이렉트된 web_transaction_id를 받아서 인증 결과 확인
   * 
   * @param webTransactionId WebView에서 return_url로 받은 web_transaction_id
   */
  async handleAuthCallback(webTransactionId: string): Promise<VerifyResult> {
    return this.verifyCode('', webTransactionId);
  }

  /**
   * NICE API Access Token 발급 (백엔드 서버를 통해)
   * 
   * 백엔드 프록시 서버를 통해 토큰을 발급받습니다.
   * - access token은 24시간 유효합니다.
   */
  private async getAccessToken(): Promise<string> {
    // 토큰이 유효하면 캐시된 토큰 반환 (24시간 유효)
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const url = `${this.backendUrl}/api/nice/token`;
      
      logger.log('[NICE] 접근 토큰 발급 요청 (백엔드):', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[NICE] 토큰 발급 실패:', response.status, errorData);
        throw new Error(
          errorData.error || `토큰 발급 실패 (${response.status})\n\n` +
          '백엔드 서버가 실행 중인지 확인하세요.\n' +
          `서버 URL: ${this.backendUrl}`
        );
      }

      const data = await response.json();
      logger.log('[NICE] 토큰 발급 응답:', data);
      
      if (!data.success || !data.data?.access_token) {
        throw new Error(data.error || '토큰 발급에 실패했습니다.');
      }
      
      // 응답 받은 access_token 문자열 그대로 사용
      this.accessToken = data.data.access_token;
      
      // expires_in은 밀리초 단위 타임스탬프로 제공됨
      if (data.data.expires_in) {
        this.tokenExpiry = data.data.expires_in - 60000; // 1분 여유
      } else {
        // 24시간 유효 (23시간 59분으로 설정하여 여유 확보)
        const expiresIn = 24 * 60 * 60 * 1000; // 24시간 (밀리초)
        this.tokenExpiry = Date.now() + expiresIn - 60000; // 1분 여유
      }

      return this.accessToken;
    } catch (error: any) {
      console.error('[NICE] 토큰 발급 오류:', error);
      throw error;
    }
  }
}
