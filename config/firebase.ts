/**
 * Firebase 설정 및 초기화
 * 
 * Firebase Console에서 프로젝트 설정 정보를 가져와서 입력하세요.
 * Firebase Console → 프로젝트 설정 → 일반 → 앱
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 플랫폼별 appId 설정
// Expo에서는 웹 SDK를 사용하므로 iOS appId를 기본으로 사용
const getAppId = (): string => {
  const envAppId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (envAppId) {
    return envAppId;
  }
  
  // Expo 웹 SDK에서는 iOS appId를 사용 (플랫폼 무관)
  return "1:820172370623:ios:84a9ee2d5c68cee39e4c0a";
};

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBY-PulPDTxpdDg28GfUzpz2N5IKsVcJNU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "kc-chat-3e4be.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "kc-chat-3e4be",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "kc-chat-3e4be.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "820172370623",
  appId: getAppId(),
};

// Firebase 앱 초기화 (중복 초기화 방지)
let app: FirebaseApp;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase 앱 초기화 성공');
  } else {
    app = getApps()[0];
    console.log('기존 Firebase 앱 사용');
  }
} catch (error: any) {
  console.error('Firebase 앱 초기화 오류:', error);
  console.error('에러 코드:', error.code);
  console.error('에러 메시지:', error.message);
  throw new Error(`Firebase 초기화 실패: ${error.message || '알 수 없는 오류'}`);
}

// Firebase Auth 초기화 (AsyncStorage 사용)
// React Native에서는 initializeAuth를 사용하여 AsyncStorage를 명시적으로 설정해야 합니다
let authInstance: Auth;
try {
  // initializeAuth를 사용하여 AsyncStorage와 함께 초기화
  // 이미 초기화된 경우 에러가 발생하므로 getAuth 사용
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  console.log('Firebase Auth 초기화 성공');
} catch (error: any) {
  console.warn('Firebase Auth 초기화 경고:', error.message);
  // 이미 초기화된 경우 getAuth 사용
  if (error.code === 'auth/already-initialized' || error.message?.includes('already been initialized')) {
    const { getAuth } = require('firebase/auth');
    authInstance = getAuth(app);
    console.log('기존 Firebase Auth 인스턴스 사용');
  } else {
    console.error('Firebase Auth 초기화 오류:', error);
    throw new Error(`Firebase Auth 초기화 실패: ${error.message || '알 수 없는 오류'}`);
  }
}

// Firebase 서비스 초기화
export const auth: Auth = authInstance;
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;

