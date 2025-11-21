/**
 * 알림 서비스
 * 메시지 수신 시 알림 표시
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { firebaseFirestoreService } from './FirebaseFirestoreService';
import { auth } from '../config/firebase';

// 알림 핸들러 설정 (네이티브 모듈이 사용 가능한 경우에만)
try {
  if (Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.warn('알림 핸들러 설정 실패 (네이티브 모듈이 아직 준비되지 않음):', error);
}

class NotificationService {
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;
  private pushTokenListener: Notifications.EventSubscription | null = null;
  private expoPushToken: string | null = null;

  /**
   * 알림 권한 요청
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // 네이티브 모듈이 사용 가능한지 확인
      if (!Notifications.getPermissionsAsync || !Notifications.requestPermissionsAsync) {
        console.warn('알림 네이티브 모듈이 아직 준비되지 않았습니다. 앱을 재빌드해주세요.');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('알림 권한이 거부되었습니다.');
        return false;
      }

      // Android에서 알림 채널 설정
      if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
        try {
          await Notifications.setNotificationChannelAsync('messages', {
            name: '메시지 알림',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
          });
        } catch (error) {
          console.warn('알림 채널 설정 실패:', error);
        }
      }

      return true;
    } catch (error: any) {
      // 네이티브 모듈 오류인 경우 조용히 처리
      if (error.message?.includes('native module') || error.message?.includes('ExpoPushTokenManager')) {
        console.warn('알림 네이티브 모듈이 아직 준비되지 않았습니다. 앱을 재빌드해주세요.');
        return false;
      }
      console.error('알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 좋아요 알림 표시
   */
  async showLikeNotification(
    likerName: string,
    likerId: string,
    likedUserId: string
  ): Promise<void> {
    try {
      // 네이티브 모듈이 사용 가능한지 확인
      if (!Notifications.scheduleNotificationAsync) {
        console.warn('알림 네이티브 모듈이 아직 준비되지 않았습니다.');
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '좋아요',
          body: `${likerName}님이 내 프로필에 좋아요를 눌렀습니다`,
          data: { type: 'like', likerId, likedUserId },
          sound: true,
        },
        trigger: null, // 즉시 표시
      });
    } catch (error: any) {
      // 네이티브 모듈 오류인 경우 조용히 처리
      if (error.message?.includes('native module') || error.message?.includes('ExpoPushTokenManager')) {
        console.warn('알림 네이티브 모듈이 아직 준비되지 않았습니다. 앱을 재빌드해주세요.');
        return;
      }
      console.error('좋아요 알림 표시 실패:', error);
    }
  }

  /**
   * 메시지 알림 표시
   */
  async showMessageNotification(
    senderName: string,
    messageText: string,
    chatRoomId: string
  ): Promise<void> {
    try {
      // 네이티브 모듈이 사용 가능한지 확인
      if (!Notifications.scheduleNotificationAsync) {
        console.warn('알림 네이티브 모듈이 아직 준비되지 않았습니다.');
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      // 메시지 텍스트가 너무 길면 잘라내기
      const truncatedText = messageText.length > 50 
        ? messageText.substring(0, 50) + '...' 
        : messageText;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: senderName,
          body: truncatedText,
          data: { chatRoomId },
          sound: true,
        },
        trigger: null, // 즉시 표시
      });
    } catch (error: any) {
      // 네이티브 모듈 오류인 경우 조용히 처리
      if (error.message?.includes('native module') || error.message?.includes('ExpoPushTokenManager')) {
        console.warn('알림 네이티브 모듈이 아직 준비되지 않았습니다. 앱을 재빌드해주세요.');
        return;
      }
      console.error('알림 표시 실패:', error);
    }
  }

  /**
   * 알림 배지 초기화
   */
  async clearBadge(): Promise<void> {
    try {
      if (!Notifications.setBadgeCountAsync) {
        return;
      }
      await Notifications.setBadgeCountAsync(0);
    } catch (error: any) {
      // 네이티브 모듈 오류인 경우 조용히 처리
      if (error.message?.includes('native module') || error.message?.includes('ExpoPushTokenManager')) {
        return;
      }
      console.error('배지 초기화 실패:', error);
    }
  }

  /**
   * 알림 리스너 설정
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ): void {
    // 기존 리스너 제거
    this.removeNotificationListeners();

    // 알림 수신 리스너 (앱이 포그라운드일 때)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // 알림 탭 리스너 (알림을 탭했을 때)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationTapped
    );
  }

  /**
   * 알림 리스너 해제
   */
  removeNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Expo Push 토큰 가져오기 및 Firestore에 저장
   * 앱이 완전히 종료된 상태에서도 알림을 받기 위해 필요합니다.
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // 권한 확인
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('푸시 알림 권한이 없습니다.');
        return null;
      }

      // Expo Push 토큰 가져오기
      if (!Notifications.getExpoPushTokenAsync) {
        console.warn('Expo Push 토큰을 가져올 수 없습니다. 앱을 재빌드해주세요.');
        return null;
      }

      // Expo SDK 49+ 에서는 projectId를 자동으로 감지합니다
      // 명시적으로 설정하려면 app.json의 extra.eas.projectId를 사용하거나
      // 환경 변수에서 가져올 수 있습니다
      const tokenData = await Notifications.getExpoPushTokenAsync();

      const token = tokenData.data;
      this.expoPushToken = token;

      // Firestore에 푸시 토큰 저장
      const firebaseUser = auth.currentUser;
      if (firebaseUser && token) {
        try {
          await firebaseFirestoreService.updatePushToken(firebaseUser.uid, token);
          console.log('푸시 토큰 저장 완료:', token.substring(0, 20) + '...');
        } catch (error) {
          console.error('푸시 토큰 저장 실패:', error);
        }
      }

      // 토큰 변경 감지 리스너 설정
      this.setupPushTokenListener();

      return token;
    } catch (error: any) {
      // 네이티브 모듈 오류인 경우 조용히 처리
      if (error.message?.includes('native module') || error.message?.includes('ExpoPushTokenManager')) {
        console.warn('푸시 알림 네이티브 모듈이 아직 준비되지 않았습니다. 앱을 재빌드해주세요.');
        return null;
      }
      console.error('푸시 토큰 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 푸시 토큰 변경 감지 리스너 설정
   */
  private setupPushTokenListener(): void {
    // 기존 리스너 제거
    if (this.pushTokenListener) {
      this.pushTokenListener.remove();
      this.pushTokenListener = null;
    }

    // 토큰 변경 감지 (예: 앱 재설치 시)
    // Note: expo-notifications는 토큰 변경 이벤트를 직접 제공하지 않으므로
    // 주기적으로 토큰을 확인하거나, 앱 시작 시마다 확인하는 것이 좋습니다.
  }

  /**
   * 푸시 토큰 제거 (로그아웃 시)
   */
  async unregisterPushToken(): Promise<void> {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        await firebaseFirestoreService.updatePushToken(firebaseUser.uid, null);
        this.expoPushToken = null;
        console.log('푸시 토큰 제거 완료');
      } catch (error) {
        console.error('푸시 토큰 제거 실패:', error);
      }
    }
  }

  /**
   * 현재 Expo Push 토큰 가져오기
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();

