import AppNavigator from './navigation/AppNavigator';
import { ChatProvider } from './context/ChatContext';
// Firebase 초기화를 위해 config/firebase.ts를 import
import './config/firebase';
// Analytics 초기화
import { analyticsService } from './services/AnalyticsService';
// 에러 리포팅 초기화
import './services/ErrorReportingService';

// Analytics 초기화
analyticsService.initialize();

export default function App() {
  return (
    <ChatProvider>
      <AppNavigator />
    </ChatProvider>
  );
}
