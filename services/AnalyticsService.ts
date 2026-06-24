/**
 * Firebase Analytics 서비스
 * 웹 환경에서만 Firebase Analytics를 사용합니다.
 * React Native에서는 no-op (동적 import/chunk 로드 없이 메인 번들에 포함).
 */

import { Platform } from 'react-native';
import { app } from '../config/firebase';

type WebAnalytics = ReturnType<typeof import('firebase/analytics')['getAnalytics']>;

class AnalyticsService {
  private analytics: WebAnalytics | null = null;
  private initialized = false;

  isInitialized(): boolean {
    return this.initialized;
  }

  isAvailable(): boolean {
    return Platform.OS === 'web';
  }

  initialize(): void {
    if (this.initialized || Platform.OS !== 'web') {
      return;
    }

    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }
      const { getAnalytics } = require('firebase/analytics') as typeof import('firebase/analytics');
      this.analytics = getAnalytics(app);
      this.initialized = true;
      if (__DEV__) {
        console.log('Firebase Analytics 초기화 완료 (웹 환경)');
      }
    } catch (error: any) {
      if (__DEV__) {
        console.warn('Analytics 초기화 실패 (무시됨):', error?.message || error);
      }
    }
  }

  setUserId(userId: string | null): void {
    if (!this.initialized || !this.analytics) {
      return;
    }

    try {
      const { setUserId } = require('firebase/analytics') as typeof import('firebase/analytics');
      setUserId(this.analytics, userId);
    } catch (error) {
      console.error('사용자 ID 설정 실패:', error);
    }
  }

  setUserProperty(name: string, value: string | null): void {
    if (!this.initialized || !this.analytics) {
      return;
    }

    try {
      const { setUserProperties } = require('firebase/analytics') as typeof import('firebase/analytics');
      setUserProperties(this.analytics, { [name]: value });
    } catch (error) {
      console.error('사용자 속성 설정 실패:', error);
    }
  }

  logEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.initialized || !this.analytics) {
      if (__DEV__) {
        console.log('[Analytics]', eventName, parameters);
      }
      return;
    }

    try {
      const { logEvent } = require('firebase/analytics') as typeof import('firebase/analytics');
      logEvent(this.analytics, eventName, parameters);
    } catch (error) {
      console.error('이벤트 로깅 실패:', error);
    }
  }

  logSignUp(method: string = 'phone'): void {
    this.logEvent('sign_up', { method });
  }

  logLogin(method: string = 'phone'): void {
    this.logEvent('login', { method });
  }

  logPostCreated(hasImage: boolean = false): void {
    this.logEvent('post_created', { has_image: hasImage });
  }

  logPostViewed(postId: string): void {
    this.logEvent('post_viewed', { post_id: postId });
  }

  logChatStarted(partnerId: string): void {
    this.logEvent('chat_started', { partner_id: partnerId });
  }

  logMessageSent(chatRoomId: string): void {
    this.logEvent('message_sent', { chat_room_id: chatRoomId });
  }

  logPurchase(points: number, amount: number, currency: string = 'KRW'): void {
    this.logEvent('purchase', { points, value: amount, currency });
  }

  logUserReported(userId: string, reason: string): void {
    this.logEvent('user_reported', { reported_user_id: userId, reason });
  }

  logPostReported(postId: string, reason: string): void {
    this.logEvent('post_reported', { post_id: postId, reason });
  }

  logUserBlocked(userId: string): void {
    this.logEvent('user_blocked', { blocked_user_id: userId });
  }

  logProfileUpdated(fields: string[]): void {
    this.logEvent('profile_updated', { updated_fields: fields.join(',') });
  }

  logScreenView(screenName: string, screenClass?: string): void {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  logSearch(searchTerm: string, filters?: Record<string, any>): void {
    this.logEvent('search', { search_term: searchTerm, ...filters });
  }

  logFilterApplied(filterType: string, filterValue: string): void {
    this.logEvent('filter_applied', { filter_type: filterType, filter_value: filterValue });
  }
}

export const analyticsService = new AnalyticsService();

if (Platform.OS === 'web') {
  analyticsService.initialize();
}
