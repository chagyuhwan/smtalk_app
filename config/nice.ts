/**
 * NICE 본인인증 설정
 * 
 * 프로덕션 환경에서는 반드시 환경 변수를 설정해야 합니다.
 */

// 필수 환경 변수 확인
const requiredEnvVars = {
  backendUrl: process.env.EXPO_PUBLIC_NICE_BACKEND_URL,
  clientId: process.env.EXPO_PUBLIC_NICE_CLIENT_ID,
  clientSecret: process.env.EXPO_PUBLIC_NICE_CLIENT_SECRET,
};

// 프로덕션 환경에서 필수 환경 변수 확인
if (!__DEV__) {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingVars.length > 0) {
    throw new Error(
      `필수 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}\n` +
      '프로덕션 환경에서는 모든 NICE 설정을 환경 변수로 제공해야 합니다.'
    );
  }
}

export const NICE_CONFIG = {
  // 백엔드 프록시 서버 URL (필수)
  backendUrl: process.env.EXPO_PUBLIC_NICE_BACKEND_URL || 
    (__DEV__ ? 'http://localhost:3000' : ''),
  
  // NICE API Base URL
  baseUrl: process.env.EXPO_PUBLIC_NICE_API_URL || 'https://auth.niceid.co.kr',
  
  // API Version
  version: 'v1.0',
  
  // Client ID (백엔드에서 사용, 프로덕션에서는 필수)
  clientId: process.env.EXPO_PUBLIC_NICE_CLIENT_ID || '',
  
  // Secret Key (백엔드에서 사용, 프로덕션에서는 필수)
  secretKey: process.env.EXPO_PUBLIC_NICE_CLIENT_SECRET || '',
  
  // 개발 환경 정보 (X-Intc-DevLang 헤더용)
  devLang: process.env.EXPO_PUBLIC_NICE_DEV_LANG || 'React Native/TypeScript',
};
