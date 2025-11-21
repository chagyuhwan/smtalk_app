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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { errorReportingService } from '../services/ErrorReportingService';
import { auth } from '../config/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PerformanceTestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [report, setReport] = useState(performanceMonitor.generateReport());
  const [isLoading, setIsLoading] = useState(false);

  // 화면 포커스 시 리포트 업데이트
  useFocusEffect(
    React.useCallback(() => {
      setReport(performanceMonitor.generateReport());
    }, [])
  );

  // 성능 리포트 새로고침
  const refreshReport = () => {
    setReport(performanceMonitor.generateReport());
  };

  // 테스트 크래시 발생
  const testCrash = async () => {
    setIsLoading(true);
    try {
      await errorReportingService.testCrash();
      Alert.alert('성공', '테스트 크래시가 발생했습니다.\nFirebase Console에서 errorLogs 컬렉션을 확인하세요.');
    } catch (error: any) {
      Alert.alert('오류', `크래시 테스트 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 성능 리포트 출력
  const printReport = () => {
    performanceMonitor.printReport();
    Alert.alert('성공', '콘솔에 성능 리포트가 출력되었습니다.\n개발자 도구를 확인하세요.');
  };

  // 메트릭 초기화
  const clearMetrics = () => {
    Alert.alert(
      '메트릭 초기화',
      '모든 성능 메트릭을 초기화하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            performanceMonitor.clearMetrics();
            refreshReport();
            Alert.alert('완료', '메트릭이 초기화되었습니다.');
          },
        },
      ]
    );
  };

  // 화면 로딩 시간 측정 테스트
  const testScreenLoad = () => {
    performanceMonitor.startScreenLoad('TestScreen');
    setTimeout(() => {
      const loadTime = performanceMonitor.endScreenLoad('TestScreen');
      Alert.alert('테스트 완료', `화면 로딩 시간: ${loadTime}ms`);
      refreshReport();
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>성능 테스트</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>성능 리포트</Text>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>총 화면 로딩</Text>
            <Text style={styles.metricValue}>{report.totalScreens}회</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>평균 로딩 시간</Text>
            <Text style={styles.metricValue}>
              {report.averageLoadTime > 0 ? `${report.averageLoadTime.toFixed(2)}ms` : 'N/A'}
            </Text>
          </View>

          {report.slowestScreen && (
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>가장 느린 화면</Text>
              <Text style={styles.metricValue}>
                {report.slowestScreen.name}
              </Text>
              <Text style={styles.metricSubValue}>
                {report.slowestScreen.time.toFixed(2)}ms
              </Text>
            </View>
          )}

          {report.fastestScreen && (
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>가장 빠른 화면</Text>
              <Text style={styles.metricValue}>
                {report.fastestScreen.name}
              </Text>
              <Text style={styles.metricSubValue}>
                {report.fastestScreen.time.toFixed(2)}ms
              </Text>
            </View>
          )}

          {report.screenBreakdown.length > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>화면별 상세</Text>
              {report.screenBreakdown.map((screen, index) => (
                <View key={index} style={styles.breakdownItem}>
                  <Text style={styles.breakdownName}>{screen.name}</Text>
                  <View style={styles.breakdownStats}>
                    <Text style={styles.breakdownCount}>{screen.count}회</Text>
                    <Text style={styles.breakdownTime}>
                      평균 {screen.averageTime.toFixed(2)}ms
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {report.totalScreens === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                아직 성능 데이터가 없습니다.{'\n'}
                앱을 사용하면 자동으로 수집됩니다.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>테스트 도구</Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={testScreenLoad}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>화면 로딩 시간 테스트</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testCrash}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.testButtonText}>테스트 크래시 발생</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={printReport}
          >
            <Text style={styles.testButtonText}>콘솔에 리포트 출력</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearMetrics}
          >
            <Text style={[styles.testButtonText, styles.clearButtonText]}>
              메트릭 초기화
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>성능 목표</Text>
          <Text style={styles.infoText}>
            • 앱 시작 시간: 3초 이내{'\n'}
            • 화면 로딩 시간: 1초 이내{'\n'}
            • 메모리 사용량: 100MB 이하{'\n'}
            • 스크롤 성능: 60fps 유지
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>테스트 방법</Text>
          <Text style={styles.infoText}>
            1. 앱을 사용하면서 자동으로 성능 데이터가 수집됩니다.{'\n'}
            2. "화면 로딩 시간 테스트" 버튼으로 수동 테스트 가능{'\n'}
            3. "테스트 크래시 발생" 버튼으로 크래시 리포팅 테스트{'\n'}
            4. Firebase Console에서 errorLogs 컬렉션 확인
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
  },
  metricSubValue: {
    fontSize: 14,
    color: '#667085',
    marginTop: 4,
  },
  breakdownSection: {
    marginTop: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownName: {
    fontSize: 14,
    color: '#111',
    flex: 1,
  },
  breakdownStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownCount: {
    fontSize: 14,
    color: '#667085',
  },
  breakdownTime: {
    fontSize: 14,
    color: '#667085',
    fontWeight: '500',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#F3F4F6',
  },
  clearButtonText: {
    color: '#DC2626',
  },
  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
  },
});


