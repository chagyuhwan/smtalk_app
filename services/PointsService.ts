/**
 * 포인트 보상 클라이언트 서비스
 *
 * 보안 원칙:
 * - 포인트 "증가"는 클라이언트가 직접 Firestore에 쓰지 않고, 백엔드 서버에서만 적립한다.
 * - 백엔드는 Firebase ID 토큰으로 사용자를 검증하고, 중복 적립을 서버에서 차단한다.
 * - 잔액은 Firestore 실시간 구독을 통해 자동으로 클라이언트에 반영된다.
 */

import { auth } from '../config/firebase';
import { logger } from '../utils/logger';

export type RewardType = 'attendance' | 'post-reward' | 'signup-bonus' | 'reviewer-demo';

export interface ClaimResult {
  success: boolean;
  granted: boolean;
  creditedPoints: number;
  newBalance?: number;
  error?: string;
}

class PointsService {
  private get backendUrl(): string {
    return process.env.EXPO_PUBLIC_NICE_BACKEND_URL || '';
  }

  /**
   * 서버에 포인트 보상 적립을 요청한다.
   */
  async claimReward(type: RewardType): Promise<ClaimResult> {
    const backendUrl = this.backendUrl;
    if (!backendUrl) {
      logger.warn('[POINTS] 백엔드 URL 미설정 - 적립 불가');
      return { success: false, granted: false, creditedPoints: 0, error: '서버가 설정되지 않았습니다.' };
    }

    const user = auth.currentUser;
    if (!user) {
      return { success: false, granted: false, creditedPoints: 0, error: '로그인이 필요합니다.' };
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${backendUrl}/api/points/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      if (!data.success) {
        logger.warn('[POINTS] 적립 실패:', data.error);
        return { success: false, granted: false, creditedPoints: 0, error: data.error };
      }

      return {
        success: true,
        granted: data.granted === true,
        creditedPoints: data.creditedPoints || 0,
        newBalance: data.newBalance,
      };
    } catch (error: any) {
      logger.error('[POINTS] 적립 요청 오류:', error);
      return { success: false, granted: false, creditedPoints: 0, error: error.message };
    }
  }
}

export const pointsService = new PointsService();
