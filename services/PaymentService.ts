import { Platform, Alert } from 'react-native';
import { auth } from '../config/firebase';
import { firebaseFirestoreService } from './FirebaseFirestoreService';

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
  private products: RNIap.Product[] = [];
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
   * 구매 업데이트 및 에러 리스너 설정
   */
  private setupPurchaseListeners() {
    if (!RNIap) return;

    // 구매 업데이트 리스너
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: any) => {
        console.log('구매 업데이트:', purchase);
        
        try {
          const firebaseUser = auth.currentUser;
          if (!firebaseUser) {
            Alert.alert('오류', '로그인이 필요합니다.');
            await RNIap.finishTransaction(purchase);
            return;
          }

          // 거래 ID 추출 (플랫폼별로 다름)
          let transactionId: string | null = null;
          if (Platform.OS === 'ios') {
            // iOS: transactionIdentifier 또는 transactionReceipt 사용
            transactionId = purchase.transactionIdentifier || purchase.transactionReceipt || purchase.transactionId;
          } else if (Platform.OS === 'android') {
            // Android: purchaseToken 사용
            transactionId = purchase.purchaseToken || purchase.transactionId;
          }
          
          if (!transactionId) {
            console.error('거래 ID를 찾을 수 없습니다:', purchase);
            Alert.alert('오류', '거래 정보를 찾을 수 없습니다.');
            await RNIap.finishTransaction(purchase);
            return;
          }

          // 중복 구매 확인
          const existingPurchase = await firebaseFirestoreService.getPurchaseByTransactionId(transactionId);
          if (existingPurchase) {
            console.log('이미 처리된 구매입니다:', transactionId);
            // 이미 처리된 구매이므로 완료 처리만 하고 포인트는 추가하지 않음
            await RNIap.finishTransaction(purchase);
            Alert.alert('알림', '이미 처리된 구매입니다.');
            return;
          }

          // 영수증 검증 (실제로는 서버에서 검증해야 함)
          const valid = await this.verifyReceipt(purchase);
          
          if (valid) {
            // 포인트 금액 계산
            const points = this.getPointsFromProductId(purchase.productId);
            if (!points) {
              Alert.alert('오류', '유효하지 않은 상품입니다.');
              await RNIap.finishTransaction(purchase);
              return;
            }

            // 구매 이력 저장
            const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            try {
              await firebaseFirestoreService.createPurchase({
                id: purchaseId,
                userId: firebaseUser.uid,
                productId: purchase.productId,
                points: points,
                transactionId: transactionId,
                transactionReceipt: purchase.transactionReceipt,
                purchaseToken: purchase.purchaseToken,
                platform: Platform.OS as 'ios' | 'android',
                timestamp: Date.now(),
                verified: valid,
              });
              console.log('구매 이력 저장 완료:', purchaseId);
            } catch (error: any) {
              console.error('구매 이력 저장 실패:', error);
              // 구매 이력 저장 실패해도 포인트는 추가 (나중에 수동으로 확인 가능)
            }

            // 구매 완료 처리
            await RNIap.finishTransaction(purchase);
            
            // Analytics: 포인트 충전
            try {
              const { analyticsService } = await import('./AnalyticsService');
              // 상품 ID에서 포인트 금액 추정 (실제로는 상품 정보에서 가져와야 함)
              const estimatedAmount = points * 10; // 예시: 1포인트 = 10원 가정
              analyticsService.logPurchase(points, estimatedAmount, 'KRW');
            } catch (error) {
              console.error('Analytics 로깅 실패:', error);
            }
            
            // 콜백으로 포인트 추가 알림
            if (this.onPurchaseSuccess) {
              this.onPurchaseSuccess(points, purchase);
            }
          } else {
            Alert.alert('오류', '영수증 검증에 실패했습니다.');
            await RNIap.finishTransaction(purchase);
          }
        } catch (error: any) {
          console.error('구매 처리 오류:', error);
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
   * 영수증 검증 (클라이언트 사이드 - 실제로는 서버에서 검증해야 함)
   */
  private async verifyReceipt(purchase: any): Promise<boolean> {
    try {
      if (!RNIap) return false;

      // 실제로는 서버로 영수증을 전송하여 검증해야 합니다.
      // 여기서는 기본적인 검증만 수행합니다.
      
      // iOS의 경우 영수증 검증
      if (Platform.OS === 'ios') {
        // iOS에서는 transactionReceipt 또는 transactionIdentifier가 있어야 함
        if (!purchase.transactionReceipt && !purchase.transactionIdentifier) {
          console.warn('iOS: 영수증 정보가 없습니다.');
          return false;
        }
        // 실제로는 Apple 서버에 영수증을 전송하여 검증해야 합니다.
        // 여기서는 간단히 receipt가 있는지만 확인합니다.
        return true;
      }

      // Android의 경우
      if (Platform.OS === 'android') {
        // Android에서는 purchaseToken이 있어야 함
        if (!purchase.purchaseToken) {
          console.warn('Android: 구매 토큰이 없습니다.');
          return false;
        }
        // 실제로는 Google Play 서버에 영수증을 전송하여 검증해야 합니다.
        return true;
      }

      return false;
    } catch (error) {
      console.error('영수증 검증 오류:', error);
      return false;
    }
  }

  /**
   * 상품 ID로부터 포인트 금액 가져오기
   */
  private getPointsFromProductId(productId: string): number | null {
    for (const [points, id] of Object.entries(POINT_PRODUCT_MAP)) {
      if (id === productId) {
        return parseInt(points, 10);
      }
    }
    return null;
  }

  /**
   * 에러 메시지 변환
   */
  private getErrorMessage(error: RNIap.PurchaseError): string {
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

