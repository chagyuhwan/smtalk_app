/**
 * Firebase Analytics 서비스
 * 사용자 행동 분석 및 이벤트 추적
 * 
 * 주의: React Native 환경에서는 웹 SDK가 작동하지 않으므로
 * 웹 플랫폼에서만 초기화됩니다.
 */

import { getAnalytics, logEvent, setUserProperties, setUserId, Analytics } from 'firebase/analytics';
import { app } from '../config/firebase';
import { Platform } from 'react-native';

class AnalyticsService {
  private analytics: Analytics | null = null;
  private initialized = false;

  /**
   * Analytics 초기화 상태 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 현재 플랫폼에서 Analytics 사용 가능 여부
   */
  isAvailable(): boolean {
    return Platform.OS === 'web';
  }

  /**
   * Analytics 초기화
   * 웹 환경에서만 작동합니다 (React Native에서는 비활성화)
   */
  initialize(): void {
    try {
      // 웹 환경에서만 Analytics 초기화
      // React Native에서는 DOM이 없어서 getAnalytics가 에러를 발생시킴
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        this.analytics = getAnalytics(app);
        this.initialized = true;
        if (__DEV__) {
          console.log('Firebase Analytics 초기화 완료 (웹 환경)');
        }
      } else {
        // React Native 환경에서는 Analytics를 사용하지 않음
        if (__DEV__) {
          console.log('Firebase Analytics는 웹 환경에서만 사용 가능합니다.');
        }
      }
    } catch (error: any) {
      // Analytics 초기화 실패해도 앱은 정상 작동
      if (__DEV__) {
        console.warn('Analytics 초기화 실패 (무시됨):', error?.message || error);
      }
    }
  }

  /**
   * 사용자 ID 설정
   */
  setUserId(userId: string | null): void {
    if (!this.initialized || !this.analytics) return;
    
    try {
      setUserId(this.analytics, userId);
    } catch (error) {
      console.error('사용자 ID 설정 실패:', error);
    }
  }

  /**
   * 사용자 속성 설정
   */
  setUserProperty(name: string, value: string | null): void {
    if (!this.initialized || !this.analytics) return;
    
    try {
      setUserProperties(this.analytics, {
        [name]: value,
      });
    } catch (error) {
      console.error('사용자 속성 설정 실패:', error);
    }
  }

  /**
   * 이벤트 로깅
   */
  logEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.initialized || !this.analytics) {
      // 개발 환경에서는 콘솔에 로그 출력
      if (__DEV__) {
        console.log('[Analytics]', eventName, parameters);
      }
      return;
    }
    
    try {
      logEvent(this.analytics, eventName, parameters);
    } catch (error) {
      console.error('이벤트 로깅 실패:', error);
    }
  }

  // ==================== 주요 이벤트 ====================

  /**
   * 회원가입 완료
   */
  logSignUp(method: string = 'phone'): void {
    this.logEvent('sign_up', { method });
  }

  /**
   * 로그인 완료
   */
  logLogin(method: string = 'phone'): void {
    this.logEvent('login', { method });
  }

  /**
   * 게시글 작성
   */
  logPostCreated(hasImage: boolean = false): void {
    this.logEvent('post_created', { has_image: hasImage });
  }

  /**
   * 게시글 조회
   */
  logPostViewed(postId: string): void {
    this.logEvent('post_viewed', { post_id: postId });
  }

  /**
   * 채팅 시작
   */
  logChatStarted(partnerId: string): void {
    this.logEvent('chat_started', { partner_id: partnerId });
  }

  /**
   * 메시지 전송
   */
  logMessageSent(chatRoomId: string): void {
    this.logEvent('message_sent', { chat_room_id: chatRoomId });
  }

  /**
   * 포인트 충전
   */
  logPurchase(points: number, amount: number, currency: string = 'KRW'): void {
    this.logEvent('purchase', {
      points,
      value: amount,
      currency,
    });
  }

  /**
   * 사용자 신고
   */
  logUserReported(userId: string, reason: string): void {
    this.logEvent('user_reported', {
      reported_user_id: userId,
      reason,
    });
  }

  /**
   * 게시글 신고
   */
  logPostReported(postId: string, reason: string): void {
    this.logEvent('post_reported', {
      post_id: postId,
      reason,
    });
  }

  /**
   * 사용자 차단
   */
  logUserBlocked(userId: string): void {
    this.logEvent('user_blocked', {
      blocked_user_id: userId,
    });
  }

  /**
   * 프로필 업데이트
   */
  logProfileUpdated(fields: string[]): void {
    this.logEvent('profile_updated', {
      updated_fields: fields.join(','),
    });
  }

  /**
   * 화면 조회
   */
  logScreenView(screenName: string, screenClass?: string): void {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  /**
   * 검색 수행
   */
  logSearch(searchTerm: string, filters?: Record<string, any>): void {
    this.logEvent('search', {
      search_term: searchTerm,
      ...filters,
    });
  }

  /**
   * 필터 적용
   */
  logFilterApplied(filterType: string, filterValue: string): void {
    this.logEvent('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
    });
  }
}

export const analyticsService = new AnalyticsService();

// 앱 시작 시 Analytics 초기화 (웹 환경에서만)
// React Native에서는 자동으로 건너뜀
if (Platform.OS === 'web') {
  analyticsService.initialize();
}







