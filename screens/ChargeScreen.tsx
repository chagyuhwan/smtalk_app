import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { paymentService } from '../services/PaymentService';
import { performanceMonitor } from '../utils/PerformanceMonitor';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ChargeOption {
  baseCoins: number;
  price: number;
  originalPrice: number;
  discountAmount: number;
  discountPercent: number;
}

const CHARGE_OPTIONS: ChargeOption[] = [
  { baseCoins: 1000, price: 2000, originalPrice: 2000, discountAmount: 0, discountPercent: 0 },
  { baseCoins: 3000, price: 5400, originalPrice: 6000, discountAmount: 600, discountPercent: 10 },
  { baseCoins: 5000, price: 8500, originalPrice: 10000, discountAmount: 1500, discountPercent: 15 },
  { baseCoins: 10000, price: 16000, originalPrice: 20000, discountAmount: 4000, discountPercent: 20 },
  { baseCoins: 30000, price: 45000, originalPrice: 60000, discountAmount: 15000, discountPercent: 25 },
  { baseCoins: 50000, price: 70000, originalPrice: 100000, discountAmount: 30000, discountPercent: 30 },
];

export default function ChargeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { points, addPoints } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('ChargeScreen');
      return () => {
        performanceMonitor.endScreenLoad('ChargeScreen');
      };
    }, [])
  );
  
  const [selectedOption, setSelectedOption] = useState<ChargeOption | null>(null);
  const selectedOptionRef = useRef<ChargeOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // selectedOption이 변경될 때마다 ref 업데이트
  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  // 결제 서비스 초기화
  useEffect(() => {
    const initPayment = async () => {
      try {
        setIsInitializing(true);
        
        // Expo Go 환경 확인
        if (paymentService.isExpoGo()) {
          console.warn('Expo Go 환경에서는 결제 기능을 사용할 수 없습니다.');
          setIsInitializing(false);
          return;
        }

        const success = await paymentService.initialize();
        if (!success) {
          console.warn('결제 서비스 초기화 실패 (네이티브 빌드 필요)');
        }
      } catch (error: any) {
        console.error('결제 서비스 초기화 오류:', error);
        // Expo Go에서는 에러를 표시하지 않음
        if (!paymentService.isExpoGo()) {
          Alert.alert('오류', '결제 서비스를 초기화하는 중 오류가 발생했습니다.');
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initPayment();

    // 구매 성공 콜백 설정
    paymentService.onPurchaseSuccess = async (purchasedPoints, purchase) => {
      console.log('구매 성공:', purchasedPoints, purchase);
      
      // 선택된 옵션에서 포인트 계산
      const currentOption = selectedOptionRef.current;
      const pointsToAdd = currentOption?.baseCoins || purchasedPoints;
      await addPoints(pointsToAdd);
      setIsLoading(false);
      
      Alert.alert(
        '충전 완료',
        `${pointsToAdd.toLocaleString()}포인트가 충전되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => {
              setSelectedOption(null);
              navigation.goBack();
            },
          },
        ]
      );
    };

    // 컴포넌트 언마운트 시 정리
    return () => {
      paymentService.cleanup();
    };
  }, [navigation, addPoints]);

  const handleCharge = async () => {
    if (!selectedOption) {
      Alert.alert('알림', '충전할 금액을 선택해주세요.');
      return;
    }

    // 상품 정보 확인 (없어도 구매는 가능)
    const product = paymentService.getProductInfo(selectedOption.baseCoins);
    const priceText = product?.localizedPrice || `${selectedOption.price.toLocaleString()}원`;

    Alert.alert(
      '포인트 충전',
      `${selectedOption.baseCoins.toLocaleString()}포인트를 충전하시겠습니까?${selectedOption.discountPercent > 0 ? `\n\n정가: ${selectedOption.originalPrice.toLocaleString()}원\n할인: ${selectedOption.discountAmount.toLocaleString()}원 (${selectedOption.discountPercent}%)` : ''}\n\n가격: ${priceText}`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '충전',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await paymentService.purchasePoints(selectedOption.baseCoins);
              if (!success) {
                setIsLoading(false);
              }
              // 성공/실패는 paymentService의 리스너에서 처리됨
            } catch (error: any) {
              console.error('구매 오류:', error);
              setIsLoading(false);
              Alert.alert('오류', `구매 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
            }
          },
        },
      ]
    );
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#1F2937" />
        <Text style={styles.loadingText}>결제 서비스를 준비하는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트 충전</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.pointsSection}>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsLabel}>현재 포인트</Text>
          <Text style={styles.pointsValue}>{points.toLocaleString()}P</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전할 금액을 선택하세요</Text>
          <View style={styles.amountGrid}>
            {CHARGE_OPTIONS.map((option, index) => (
              <View key={index} style={styles.amountItem}>
                <TouchableOpacity
                  style={[
                    styles.amountButton,
                    selectedOption === option && styles.amountButtonSelected,
                  ]}
                  onPress={() => setSelectedOption(option)}
                >
                  {option.discountPercent > 0 && (
                    <View style={styles.saleBadge}>
                      <Text style={styles.saleBadgeText}>{option.discountPercent}%</Text>
                    </View>
                  )}
                  <View style={styles.amountRow}>
                    <Text
                      style={[
                        styles.amountText,
                        selectedOption === option && styles.amountTextSelected,
                      ]}
                    >
                      {option.baseCoins.toLocaleString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pointLabel,
                      selectedOption === option && styles.pointLabelSelected,
                    ]}
                  >
                    포인트
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.priceText,
                    selectedOption === option && styles.priceTextSelected,
                  ]}
                >
                  {option.price.toLocaleString()}원
                </Text>
              </View>
            ))}
          </View>
        </View>

        {selectedOption && (
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>충전</Text>
              <Text style={styles.summaryValue}>
                {selectedOption.baseCoins.toLocaleString()}포인트
              </Text>
            </View>
            {selectedOption.discountPercent > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>정가</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOption.originalPrice.toLocaleString()}원
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>할인</Text>
                  <Text style={styles.summaryBonusValue}>
                    {selectedOption.discountAmount.toLocaleString()}원 ({selectedOption.discountPercent}%)
                  </Text>
                </View>
              </>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>충전 후 포인트</Text>
              <Text style={styles.summaryValue}>
                {(points + selectedOption.baseCoins).toLocaleString()}포인트
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.chargeButton,
            (!selectedOption || isLoading) && styles.chargeButtonDisabled,
          ]}
          onPress={handleCharge}
          disabled={!selectedOption || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.chargeButtonText,
                !selectedOption && styles.chargeButtonTextDisabled,
              ]}
            >
              충전하기
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>[이용·환불 안내]</Text>
          <Text style={styles.infoText}>
            · 포인트는 에쎔톡 앱 내에서 채팅 등 유료 기능을 이용할 때만 사용됩니다.{'\n'}
            · 포인트는 현금 및 기타 재화로 환전·양도·판매할 수 없으며,{'\n'}
            다른 이용자에게 송금하거나 선물할 수 없습니다.{'\n'}
            · 이미 사용한 포인트(채팅 발송 등)에 대해서는{'\n'}
            서비스 특성상 환불이 제한될 수 있습니다.{'\n'}
            · 결제 오류, 중복 결제 등 과오금이 발생한 경우,{'\n'}
            회사는 과오금 전액을 확인 후 환불합니다.{'\n'}
            · 미사용 포인트 환불 가능 여부 및 환불 수수료 등은{'\n'}
            이용약관에서 확인하실 수 있습니다.{'\n'}
            · 인앱 결제는 각 오픈마켓(App Store / Google Play)의 정책과{'\n'}
            관련 법령에 따라 처리됩니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#111',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  pointsSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  pointsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginTop: 16,
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amountItem: {
    width: '30%',
    alignItems: 'center',
    overflow: 'visible',
  },
  amountButton: {
    width: '100%',
    minHeight: 70,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 8,
    position: 'relative',
    overflow: 'visible',
  },
  moneyIcon: {
    width: 24,
    height: 24,
    marginBottom: 6,
  },
  amountButtonSelected: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 0,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  amountTextSelected: {
    color: '#fff',
  },
  saleBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  saleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  bonusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  bonusTextSelected: {
    color: '#34D399',
  },
  pointLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginTop: 6,
  },
  pointLabelSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  priceTextSelected: {
    color: '#1F2937',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryBonusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  chargeButton: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1F2937',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chargeButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  chargeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  chargeButtonTextDisabled: {
    color: '#999',
  },
  infoSection: {
    backgroundColor: 'rgba(31, 41, 55, 0.12)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

