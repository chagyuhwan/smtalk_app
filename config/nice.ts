/**
 * NICE 본인인증 설정 (클라이언트)
 *
 * 보안 원칙:
 * - 클라이언트는 NICE Client ID/Secret을 절대 보유하지 않습니다.
 * - 모든 NICE API 호출은 백엔드 프록시 서버(backendUrl)를 통해서만 수행됩니다.
 * - EXPO_PUBLIC_* 값은 앱 번들에 그대로 노출되므로 시크릿을 넣으면 안 됩니다.
 */

// 클라이언트가 실제로 필요한 값은 백엔드 프록시 URL 뿐입니다.
const backendUrl = process.env.EXPO_PUBLIC_NICE_BACKEND_URL;

// 프로덕션 환경에서는 백엔드 URL이 반드시 설정되어야 합니다.
if (!__DEV__ && !backendUrl) {
  throw new Error(
    'EXPO_PUBLIC_NICE_BACKEND_URL 환경 변수가 설정되지 않았습니다.\n' +
    '프로덕션 빌드에서는 NICE 백엔드 프록시 서버 URL이 필요합니다.'
  );
}

export const NICE_CONFIG = {
  // 백엔드 프록시 서버 URL (필수)
  backendUrl: backendUrl || (__DEV__ ? 'http://localhost:3000' : ''),

  // NICE API Base URL (참고용 - 실제 호출은 백엔드에서 수행)
  baseUrl: process.env.EXPO_PUBLIC_NICE_API_URL || 'https://auth.niceid.co.kr',

  // API Version
  version: 'v1.0',

  // 개발 환경 정보 (X-Intc-DevLang 헤더용)
  devLang: process.env.EXPO_PUBLIC_NICE_DEV_LANG || 'React Native/TypeScript',
};
