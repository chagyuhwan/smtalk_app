/**
 * 인증 방식 설정
 * 
 * 'firebase': Firebase 전화번호 인증 사용
 * 'nice': NICE 본인인증 사용
 * 
 * NICE 인증으로 전환할 때는 이 값을 'nice'로 변경하면 됩니다.
 */

import { AuthProviderType } from '../types/AuthProvider';

// 환경 변수에서 읽어오거나 기본값 사용
// NICE 본인인증만 사용
export const AUTH_PROVIDER_TYPE: AuthProviderType = 
  (process.env.EXPO_PUBLIC_AUTH_PROVIDER as AuthProviderType) || 'nice';
