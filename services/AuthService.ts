/**
 * 인증 API 서비스
 * 전화번호 인증 및 회원가입/로그인 처리
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';

export interface SendVerificationCodeRequest {
  phoneNumber: string;
}

export interface SendVerificationCodeResponse {
  success: boolean;
  message: string;
  sessionId?: string; // 인증 세션 ID
}

export interface VerifyCodeRequest {
  phoneNumber: string;
  code: string;
  sessionId: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  verified: boolean;
  token?: string; // 임시 토큰 (회원가입 완료 전)
}

export interface SignupRequest {
  phoneNumber: string;
  name: string;
  gender?: 'male' | 'female';
  age?: number;
  token: string; // 인증 완료 토큰
}

export interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    phoneNumber: string;
    name: string;
    gender?: 'male' | 'female';
    age?: number;
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface LoginRequest {
  phoneNumber: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean; // 인증 코드 필요 여부
  sessionId?: string;
}

class AuthService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 전화번호 형식 검증
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // 한국 전화번호 형식: 010-1234-5678 또는 01012345678
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
   * 인증 코드 발송
   */
  async sendVerificationCode(
    phoneNumber: string
  ): Promise<SendVerificationCodeResponse> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);
      
      if (!this.validatePhoneNumber(normalized)) {
        return {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다. (010-1234-5678)',
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalized,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: '인증 코드 발송에 실패했습니다.',
        }));
        return {
          success: false,
          message: errorData.message || '인증 코드 발송에 실패했습니다.',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: '인증 코드가 발송되었습니다.',
        sessionId: data.sessionId,
      };
    } catch (error: any) {
      console.error('인증 코드 발송 오류:', error);
      return {
        success: false,
        message: error.message || '네트워크 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 인증 코드 검증
   */
  async verifyCode(
    phoneNumber: string,
    code: string,
    sessionId: string
  ): Promise<VerifyCodeResponse> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);

      if (!this.validatePhoneNumber(normalized)) {
        return {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다.',
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

      const response = await fetch(`${this.baseUrl}/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalized,
          code,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: '인증 코드 검증에 실패했습니다.',
        }));
        return {
          success: false,
          message: errorData.message || '인증 코드가 올바르지 않습니다.',
          verified: false,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: '인증이 완료되었습니다.',
        verified: data.verified || false,
        token: data.token,
      };
    } catch (error: any) {
      console.error('인증 코드 검증 오류:', error);
      return {
        success: false,
        message: error.message || '네트워크 오류가 발생했습니다.',
        verified: false,
      };
    }
  }

  /**
   * 회원가입
   */
  async signup(request: SignupRequest): Promise<SignupResponse> {
    try {
      const normalized = this.normalizePhoneNumber(request.phoneNumber);

      if (!this.validatePhoneNumber(normalized)) {
        return {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다.',
        };
      }

      if (!request.name || request.name.trim().length < 2) {
        return {
          success: false,
          message: '이름은 2자 이상 입력해주세요.',
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalized,
          name: request.name.trim(),
          gender: request.gender,
          age: request.age,
          token: request.token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: '회원가입에 실패했습니다.',
        }));
        return {
          success: false,
          message: errorData.message || '회원가입에 실패했습니다.',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      return {
        success: false,
        message: error.message || '네트워크 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 로그인 (전화번호로 로그인 요청)
   */
  async login(phoneNumber: string): Promise<LoginResponse> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);

      if (!this.validatePhoneNumber(normalized)) {
        return {
          success: false,
          message: '올바른 전화번호 형식이 아닙니다.',
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalized,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: '로그인에 실패했습니다.',
        }));
        return {
          success: false,
          message: errorData.message || '로그인에 실패했습니다.',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || '인증 코드가 발송되었습니다.',
        requiresVerification: data.requiresVerification !== false,
        sessionId: data.sessionId,
      };
    } catch (error: any) {
      console.error('로그인 오류:', error);
      return {
        success: false,
        message: error.message || '네트워크 오류가 발생했습니다.',
      };
    }
  }

  /**
   * 로그인 인증 코드 검증 (기존 사용자)
   */
  async verifyLoginCode(
    phoneNumber: string,
    code: string,
    sessionId: string
  ): Promise<SignupResponse> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);

      const response = await fetch(`${this.baseUrl}/auth/verify-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalized,
          code,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: '인증 코드 검증에 실패했습니다.',
        }));
        return {
          success: false,
          message: errorData.message || '인증 코드가 올바르지 않습니다.',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: '로그인되었습니다.',
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (error: any) {
      console.error('로그인 인증 코드 검증 오류:', error);
      return {
        success: false,
        message: error.message || '네트워크 오류가 발생했습니다.',
      };
    }
  }
}

export const authService = new AuthService();

