/**
 * 아바타 관련 유틸리티 함수
 */

/**
 * 아바타 색상 가져오기
 * 프로필 사진이 없을 때 성별에 따라 색상 설정
 */
export const getAvatarColor = (gender?: string, hasAvatar?: boolean): string => {
  if (!hasAvatar && gender) {
    return gender === 'female' ? '#F3AAC2' : '#8FB5DF';
  }
  return '#1F2937';
};

/**
 * 이니셜 가져오기
 */
export const getInitial = (name: string): string => {
  return name.charAt(0).toUpperCase() || '?';
};


