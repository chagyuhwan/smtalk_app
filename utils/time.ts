/**
 * 시간 포맷팅 유틸리티 함수
 */

/**
 * 상대 시간 포맷팅 (방금 전, N분 전, N시간 전, M/D)
 */
export const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '방금 전';
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

/**
 * 시간 포맷팅 (HH:MM)
 */
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};


