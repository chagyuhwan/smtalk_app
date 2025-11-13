import AppNavigator from './navigation/AppNavigator';
import { ChatProvider } from './context/ChatContext';
// Firebase 초기화를 위해 config/firebase.ts를 import
import './config/firebase';

export default function App() {
  return (
    <ChatProvider>
      <AppNavigator />
    </ChatProvider>
  );
}
