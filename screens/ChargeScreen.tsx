import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { paymentService } from '../services/PaymentService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CHARGE_AMOUNTS = [1000, 3000, 5000, 10000, 20000, 50000];

export default function ChargeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { points, addPoints } = useChat();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

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
      await addPoints(purchasedPoints);
      setIsLoading(false);
      Alert.alert(
        '충전 완료',
        `${purchasedPoints.toLocaleString()}P가 충전되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => {
              setSelectedAmount(null);
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
    if (!selectedAmount) {
      Alert.alert('알림', '충전할 금액을 선택해주세요.');
      return;
    }

    // 상품 정보 확인 (없어도 구매는 가능)
    const product = paymentService.getProductInfo(selectedAmount);
    const priceText = product?.localizedPrice || '가격 확인 중...';

    Alert.alert(
      '포인트 충전',
      `${selectedAmount.toLocaleString()}P를 충전하시겠습니까?${product ? `\n\n가격: ${priceText}` : '\n\n상품 정보를 불러오는 중입니다. 구매를 진행합니다.'}`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '충전',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await paymentService.purchasePoints(selectedAmount);
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
        <ActivityIndicator size="large" color="#4C6EF5" />
        <Text style={styles.loadingText}>결제 서비스를 준비하는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>포인트 충전</Text>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsLabel}>현재 포인트</Text>
          <Text style={styles.pointsValue}>{points.toLocaleString()}P</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전할 금액을 선택하세요</Text>
          <View style={styles.amountGrid}>
            {CHARGE_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => setSelectedAmount(amount)}
              >
                <Text
                  style={[
                    styles.amountText,
                    selectedAmount === amount && styles.amountTextSelected,
                  ]}
                >
                  {amount.toLocaleString()}P
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedAmount && (
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>충전 금액</Text>
              <Text style={styles.summaryValue}>
                {selectedAmount.toLocaleString()}P
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>충전 후 포인트</Text>
              <Text style={styles.summaryValue}>
                {(points + selectedAmount).toLocaleString()}P
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.chargeButton,
            (!selectedAmount || isLoading) && styles.chargeButtonDisabled,
          ]}
          onPress={handleCharge}
          disabled={!selectedAmount || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.chargeButtonText,
                !selectedAmount && styles.chargeButtonTextDisabled,
              ]}
            >
              충전하기
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 포인트 안내</Text>
          <Text style={styles.infoText}>
            • 포인트는 채팅 시작 시 사용됩니다.{'\n'}
            • 충전한 포인트는 환불되지 않습니다.{'\n'}
            • 포인트는 앱 내에서만 사용 가능합니다.
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#4C6EF5',
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amountButton: {
    width: '30%',
    aspectRatio: 1.2,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  amountButtonSelected: {
    backgroundColor: '#4C6EF5',
    borderColor: '#4C6EF5',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  amountTextSelected: {
    color: '#fff',
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
    color: '#4C6EF5',
  },
  chargeButton: {
    backgroundColor: '#4C6EF5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4C6EF5',
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
    backgroundColor: '#E8EDFF',
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

