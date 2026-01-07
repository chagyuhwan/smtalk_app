/**
 * 앱 전역 상수 정의
 */

// 포인트 관련 상수
export const POINTS = {
  INITIAL: 100, // 초기 포인트
  ATTENDANCE_REWARD: 50, // 출석체크 보상
  POST_REWARD: 20, // 게시글 작성 보상 (추정)
  CHAT_COST: 50, // 채팅 시작 비용
  DEFAULT: 100, // 기본 포인트 값
} as const;

// 시간 관련 상수 (밀리초)
export const TIME = {
  MILLIS_PER_SECOND: 1000,
  MILLIS_PER_MINUTE: 60 * 1000,
  MILLIS_PER_HOUR: 60 * 60 * 1000,
  MILLIS_PER_DAY: 24 * 60 * 60 * 1000,
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS: 30, // 탈퇴 예정 기간 (일)
  ACCOUNT_DELETION_GRACE_PERIOD_MS: 30 * 24 * 60 * 60 * 1000, // 탈퇴 예정 기간 (밀리초)
} as const;

// 사용자 관련 상수
export const USER = {
  MIN_AGE: 19, // 최소 가입 나이
  MAX_AGE: 80, // 최대 나이
  MIN_NAME_LENGTH: 2, // 최소 이름 길이
  MAX_NAME_LENGTH: 20, // 최대 이름 길이
  MIN_BIO_LENGTH: 2, // 최소 자기소개 길이
} as const;

// 나이 그룹
export const AGE_GROUPS = {
  TWENTIES: { min: 20, max: 29 },
  THIRTIES: { min: 30, max: 39 },
  FORTIES: { min: 40, max: 49 },
  FIFTIES_PLUS: { min: 50, max: Infinity },
} as const;

// 텍스트 관련 상수
export const TEXT = {
  PREVIEW_MAX_LENGTH: 30, // 미리보기 최대 길이
} as const;



