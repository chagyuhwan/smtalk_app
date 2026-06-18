import { Platform, Alert } from 'react-native';
import { auth } from '../config/firebase';

// Expo Go에서는 react-native-iap를 사용할 수 없으므로 조건부 import
let RNIap: any = null;
let isExpoGo = false;

try {
  // Constants를 사용하여 Expo Go인지 확인
  const Constants = require('expo-constants');
  isExpoGo = Constants.executionEnvironment === 'storeClient';
  
  if (!isExpoGo) {
    RNIap = require('react-native-iap');
  }
} catch (error) {
  console.warn('react-native-iap를 로드할 수 없습니다. 네이티브 빌드가 필요합니다.');
}

// 상품 ID 매핑 (실제 App Store Connect와 Google Play Console에서 설정한 상품 ID로 변경 필요)
const PRODUCT_IDS = {
  // iOS App Store Connect에서 생성한 상품 ID
  ios: [
    'com.randomchat.points.1000',
    'com.randomchat.points.3000',
    'com.randomchat.points.5000',
    'com.randomchat.points.10000',
    'com.randomchat.points.30000',
    'com.randomchat.points.50000',
  ],
  // Google Play Console에서 생성한 상품 ID
  android: [
    'com.randomchat.points.1000',
    'com.randomchat.points.3000',
    'com.randomchat.points.5000',
    'com.randomchat.points.10000',
    'com.randomchat.points.30000',
    'com.randomchat.points.50000',
  ],
};

// 앱 패키지명/번들 ID (app.json과 일치해야 함)
const PACKAGE_NAME = 'com.kanc.randomchat';

// 포인트 금액과 상품 ID 매핑
export const POINT_PRODUCT_MAP: Record<number, string> = {
  1000: Platform.OS === 'ios' ? PRODUCT_IDS.ios[0] : PRODUCT_IDS.android[0],
  3000: Platform.OS === 'ios' ? PRODUCT_IDS.ios[1] : PRODUCT_IDS.android[1],
  5000: Platform.OS === 'ios' ? PRODUCT_IDS.ios[2] : PRODUCT_IDS.android[2],
  10000: Platform.OS === 'ios' ? PRODUCT_IDS.ios[3] : PRODUCT_IDS.android[3],
  30000: Platform.OS === 'ios' ? PRODUCT_IDS.ios[4] : PRODUCT_IDS.android[4],
  50000: Platform.OS === 'ios' ? PRODUCT_IDS.ios[5] : PRODUCT_IDS.android[5],
};

class PaymentService {
  private initialized = false;
  private products: any[] = [];
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * 결제 서비스 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.initialized) {
        return true;
      }

      // Expo Go에서는 결제 기능을 사용할 수 없음
      if (isExpoGo || !RNIap) {
        console.warn('Expo Go에서는 결제 기능을 사용할 수 없습니다. 네이티브 빌드가 필요합니다.');
        return false;
      }

      // react-native-iap 연결 초기화
      try {
        await RNIap.initConnection();
        console.log('react-native-iap 연결 초기화 완료');
      } catch (error: any) {
        console.error('react-native-iap 연결 초기화 실패:', error);
        // 연결 초기화 실패해도 계속 진행
      }

      // 결제 구독 리스너 설정
      this.setupPurchaseListeners();

      // 상품 정보 가져오기
      const productIds = Platform.OS === 'ios' ? PRODUCT_IDS.ios : PRODUCT_IDS.android;
      try {
        // react-native-iap v14에서는 getProducts에 배열을 직접 전달하거나 객체로 전달
        // 두 가지 방법 모두 시도
        try {
          this.products = await RNIap.getProducts({ skus: productIds });
        } catch (e) {
          // 배열을 직접 전달하는 방식 시도
          this.products = await RNIap.getProducts(productIds);
        }
        console.log('결제 서비스 초기화 완료:', this.products);
        console.log('로드된 상품 수:', this.products.length);
        
        if (this.products.length === 0) {
          console.warn('⚠️ 상품 정보를 가져오지 못했습니다. App Store Connect 또는 Google Play Console에서 상품이 생성되었는지 확인하세요.');
          console.warn('상품 ID:', productIds);
        }
      } catch (error: any) {
        console.error('상품 정보 가져오기 실패:', error);
        // 상품 정보를 가져오지 못해도 초기화는 성공으로 처리 (상품 ID만 있으면 구매 가능)
        this.products = [];
        console.warn('상품 정보 없이 초기화합니다. 구매 시도는 가능하지만 상품 정보가 표시되지 않을 수 있습니다.');
      }
      
      this.initialized = true;
      return true;
    } catch (error: any) {
      console.error('결제 서비스 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 소비성 상품(포인트) 거래 종료
   * Android는 반드시 소비(consume) 처리해야 같은 상품을 다시 구매할 수 있다.
   * react-native-iap 버전별 시그니처 차이를 흡수하기 위해 폴백을 둔다.
   */
  private async finishConsumable(purchase: any): Promise<void> {
    if (!RNIap) return;
    try {
      // v14 객체 시그니처
      await RNIap.finishTransaction({ purchase, isConsumable: true });
    } catch (e) {
      try {
        // 구버전 폴백 (positional)
        await RNIap.finishTransaction(purchase, true);
      } catch {
        try {
          await RNIap.finishTransaction(purchase);
        } catch { /* 무시 */ }
      }
    }
  }

  /**
   * 구매 업데이트 및 에러 리스너 설정
   */
  private setupPurchaseListeners() {
    if (!RNIap) return;

    // 구매 업데이트 리스너
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: any) => {
        console.log('구매 업데이트 수신');

        try {
          const firebaseUser = auth.currentUser;
          if (!firebaseUser) {
            Alert.alert('오류', '로그인이 필요합니다.');
            await this.finishConsumable(purchase);
            return;
          }

          // 서버 영수증 검증 + 포인트 적립 (서버가 권위, 멱등 처리)
          const result = await this.verifyAndCredit(purchase, firebaseUser.uid);

          // 검증 성공 여부와 무관하게 거래는 종료/소비 처리 (소비형 상품)
          await this.finishConsumable(purchase);

          if (!result.verified) {
            Alert.alert('오류', result.error || '결제 검증에 실패했습니다. 결제가 정상 처리되지 않았다면 고객센터로 문의해주세요.');
            return;
          }

          // Analytics: 포인트 충전 (실패해도 무시)
          try {
            const { analyticsService } = await import('./AnalyticsService');
            const credited = result.creditedPoints || 0;
            analyticsService.logPurchase(credited, credited * 10, 'KRW');
          } catch (error) {
            console.error('Analytics 로깅 실패:', error);
          }

          // 포인트 잔액은 Firestore 실시간 구독으로 자동 반영됨
          if (this.onPurchaseSuccess) {
            this.onPurchaseSuccess(result.creditedPoints || 0, purchase);
          }
        } catch (error: any) {
          console.error('구매 처리 오류:', error);
          await this.finishConsumable(purchase);
          Alert.alert('오류', `구매 처리 중 오류가 발생했습니다: ${error.message}`);
        }
      }
    );

    // 구매 에러 리스너
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error: any) => {
        console.error('구매 에러:', error);
        
        if (error.code === 'E_USER_CANCELLED') {
          // 사용자가 취소한 경우는 알림 표시 안 함
          return;
        }
        
        Alert.alert('구매 실패', this.getErrorMessage(error));
      }
    );
  }

  /**
   * 서버 영수증 검증 + 포인트 적립
   *
   * 보안 원칙:
   * - 영수증 검증과 포인트 적립은 전적으로 백엔드 서버에서 수행한다.
   * - 백엔드 URL이 없거나 검증 실패 시 절대 통과(적립)시키지 않는다(fail-closed).
   */
  private async verifyAndCredit(
    purchase: any,
    userId: string
  ): Promise<{ verified: boolean; creditedPoints?: number; newBalance?: number; error?: string }> {
    const backendUrl = process.env.EXPO_PUBLIC_NICE_BACKEND_URL;
    if (!backendUrl) {
      console.error('[IAP] 백엔드 URL 미설정 - 결제 검증 불가');
      return { verified: false, error: '결제 검증 서버가 설정되지 않았습니다.' };
    }

    try {
      let endpoint = '';
      let body: Record<string, any> = {};

      if (Platform.OS === 'android') {
        if (!purchase.purchaseToken) {
          return { verified: false, error: 'Android 구매 토큰이 없습니다.' };
        }
        endpoint = `${backendUrl}/api/iap/verify-android`;
        body = {
          packageName: PACKAGE_NAME,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          userId,
        };
      } else if (Platform.OS === 'ios') {
        const receipt = purchase.transactionReceipt;
        if (!receipt) {
          return { verified: false, error: 'iOS 영수증 정보가 없습니다.' };
        }
        endpoint = `${backendUrl}/api/iap/verify-ios`;
        body = {
          productId: purchase.productId,
          transactionId: purchase.transactionId || purchase.transactionIdentifier,
          receipt,
          userId,
        };
      } else {
        return { verified: false, error: '지원하지 않는 플랫폼입니다.' };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('[IAP] 서버 검증 결과:', { verified: data.verified, alreadyProcessed: data.alreadyProcessed });

      if (!data.success || data.verified !== true) {
        return { verified: false, error: data.error || '서버 검증에 실패했습니다.' };
      }

      return {
        verified: true,
        creditedPoints: data.creditedPoints,
        newBalance: data.newBalance,
      };
    } catch (error: any) {
      console.error('[IAP] 서버 검증 오류:', error);
      return { verified: false, error: error.message || '결제 검증 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 에러 메시지 변환
   */
  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'E_USER_CANCELLED':
        return '구매가 취소되었습니다.';
      case 'E_NETWORK_ERROR':
        return '네트워크 오류가 발생했습니다.';
      case 'E_SERVICE_ERROR':
        return '서비스 오류가 발생했습니다.';
      case 'E_ITEM_UNAVAILABLE':
        return '구매할 수 없는 상품입니다.';
      default:
        return `구매 중 오류가 발생했습니다: ${error.message}`;
    }
  }

  /**
   * 구매 성공 콜백
   */
  onPurchaseSuccess?: (points: number, purchase: any) => void;

  /**
   * 포인트 구매
   */
  async purchasePoints(points: number): Promise<boolean> {
    try {
      if (isExpoGo || !RNIap) {
        Alert.alert(
          '알림',
          'Expo Go에서는 결제 기능을 사용할 수 없습니다.\n\n실제 결제를 테스트하려면 네이티브 빌드가 필요합니다:\n\n1. `npx expo prebuild` 실행\n2. `npx expo run:ios` 또는 `npx expo run:android` 실행'
        );
        return false;
      }

      if (!this.initialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          Alert.alert('오류', '결제 서비스를 초기화할 수 없습니다.');
          return false;
        }
      }

      const productId = POINT_PRODUCT_MAP[points];
      if (!productId) {
        Alert.alert('오류', '유효하지 않은 상품입니다.');
        return false;
      }

      // 상품 정보 확인 (없어도 구매는 가능)
      const product = this.getProductInfo(points);
      if (!product) {
        console.warn('상품 정보를 찾을 수 없지만 구매를 시도합니다:', productId);
        // 상품 정보가 없어도 구매는 시도 가능 (상품 ID만 있으면 됨)
      }

      // 구매 시작
      try {
        // react-native-iap v14.4.39 API 사용
        // v14에서는 requestPurchase가 Promise를 반환하지 않고 리스너를 통해 처리됨
        // 하지만 일부 버전에서는 Promise를 반환할 수도 있음
        
        // 먼저 연결이 초기화되었는지 확인
        if (!this.initialized) {
          const initialized = await this.initialize();
          if (!initialized) {
            Alert.alert('오류', '결제 서비스를 초기화할 수 없습니다.');
            return false;
          }
        }

        // react-native-iap v14.4.39의 올바른 사용법
        // requestPurchase는 Promise를 반환하지 않고 void를 반환
        // 구매는 purchaseUpdatedListener를 통해 처리됨
        
        // v14에서는 requestPurchase에 sku만 전달하면 됨
        // 추가 설정은 필요 없음 (리스너에서 처리)
        try {
          // v14 스타일: 객체 형태로 sku만 전달
          RNIap.requestPurchase({ sku: productId });
          console.log('구매 요청 전송 완료:', productId);
          // 구매는 리스너(purchaseUpdatedListener)를 통해 처리됨
          return true;
        } catch (e: any) {
          // 구버전 API 시도 (배열 형태)
          console.log('v14 API 실패, 구버전 API 시도:', e.message);
          try {
            RNIap.requestPurchase(productId, false);
            console.log('구매 요청 전송 완료 (구버전 API):', productId);
            return true;
          } catch (e2: any) {
            // 최종 fallback: sku만 전달
            try {
              RNIap.requestPurchase(productId);
              console.log('구매 요청 전송 완료 (fallback):', productId);
              return true;
            } catch (e3: any) {
              console.error('모든 구매 API 시도 실패:', e3);
              throw e3;
            }
          }
        }
      } catch (error: any) {
        console.error('구매 요청 오류:', error);
        console.error('에러 상세:', {
          code: error.code,
          message: error.message,
          productId: productId,
        });
        
        // 에러 코드별 처리
        if (error.code === 'E_ITEM_UNAVAILABLE') {
          Alert.alert('오류', '구매할 수 없는 상품입니다. App Store Connect 또는 Google Play Console에서 상품이 활성화되었는지 확인하세요.');
        } else if (error.code === 'E_NETWORK_ERROR') {
          Alert.alert('오류', '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하세요.');
        } else {
          Alert.alert('오류', `구매 요청 중 오류가 발생했습니다: ${error.message || error.code || '알 수 없는 오류'}`);
        }
        return false;
      }
    } catch (error: any) {
      console.error('구매 요청 오류:', error);
      Alert.alert('오류', `구매 요청 중 오류가 발생했습니다: ${error.message}`);
      return false;
    }
  }

  /**
   * 상품 정보 가져오기
   */
  getProductInfo(points: number): any | null {
    const productId = POINT_PRODUCT_MAP[points];
    if (!productId) {
      return null;
    }
    return this.products.find((p: any) => p.productId === productId) || null;
  }

  /**
   * 모든 상품 정보 가져오기
   */
  getAllProducts(): any[] {
    return this.products;
  }

  /**
   * Expo Go 환경인지 확인
   */
  isExpoGo(): boolean {
    return isExpoGo;
  }

  /**
   * 정리 (컴포넌트 언마운트 시 호출)
   */
  async cleanup() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    
    // react-native-iap 연결 종료
    if (RNIap && this.initialized) {
      try {
        await RNIap.endConnection();
        console.log('react-native-iap 연결 종료');
      } catch (error) {
        console.error('연결 종료 오류:', error);
      }
    }
    
    this.initialized = false;
  }
}

export const paymentService = new PaymentService();

