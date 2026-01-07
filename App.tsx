import AppNavigator from './navigation/AppNavigator';
import { ChatProvider } from './context/ChatContext';
// Firebase 초기화를 위해 config/firebase.ts를 import
import './config/firebase';
// 에러 리포팅 초기화
import './services/ErrorReportingService';
// Analytics는 AnalyticsService에서 자동으로 초기화됨 (웹 환경에서만)

export default function App() {
  return (
    <ChatProvider>
      <AppNavigator />
    </ChatProvider>
  );
}
