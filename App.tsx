import { Platform, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { ChatProvider } from './context/ChatContext';
// Firebase 초기화를 위해 config/firebase.ts를 import
import './config/firebase';
// 에러 리포팅 초기화
import './services/ErrorReportingService';
// Analytics는 AnalyticsService에서 자동으로 초기화됨 (웹 환경에서만)

export default function App() {
  // 웹 환경에서는 모바일 전용 앱 안내 표시
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webText}>이 앱은 모바일 전용입니다.</Text>
        <Text style={styles.webSubText}>실제 기기나 에뮬레이터에서 실행해주세요.</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ChatProvider>
        <AppNavigator />
      </ChatProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 20,
  },
  webText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  webSubText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
});
