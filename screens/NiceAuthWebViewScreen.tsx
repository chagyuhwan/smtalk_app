import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { authProvider } from '../services/AuthProviderFactory';
import { auth } from '../config/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import * as Linking from 'expo-linking';

type NiceAuthWebViewScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NiceAuthWebView'
>;

type NiceAuthWebViewScreenRouteProp = RouteProp<
  RootStackParamList,
  'NiceAuthWebView'
>;

interface Props {
  navigation: NiceAuthWebViewScreenNavigationProp;
}

export default function NiceAuthWebViewScreen({ navigation }: Props) {
  const route = useRoute<NiceAuthWebViewScreenRouteProp>();
  const { authUrl } = route.params;
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 딥링크 리스너 설정
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // 앱이 이미 열려있을 때 딥링크 처리
    // Expo 개발 서버 URL은 무시
    Linking.getInitialURL().then((url) => {
      if (url && !url.startsWith('exp://') && !url.startsWith('exps://')) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 딥링크 처리
  const handleDeepLink = async (event: { url: string }) => {
    const { url } = event;
    console.log('[NICE] 딥링크 수신:', url);

    // Expo 개발 서버 URL은 무시
    if (url.startsWith('exp://') || url.startsWith('exps://')) {
      console.log('[NICE] Expo 개발 서버 URL 무시:', url);
      return;
    }

    // NICE 인증 완료 콜백 처리
    if (url.startsWith('smtalk://nice-auth-callback') || url.includes('nice-auth-callback')) {
      try {
        // URL 파라미터 파싱
        let webTransactionId: string | null = null;
        
        try {
          // URL 객체로 파싱 시도
          const urlObj = new URL(url);
          webTransactionId = urlObj.searchParams.get('web_transaction_id');
        } catch (e) {
          // URL 객체 파싱 실패 시 수동으로 파싱
          const match = url.match(/web_transaction_id=([^&]+)/);
          if (match) {
            webTransactionId = decodeURIComponent(match[1]);
          }
        }
        
        console.log('[NICE] 파싱된 web_transaction_id:', webTransactionId);
        
        if (!webTransactionId) {
          console.error('[NICE] web_transaction_id를 찾을 수 없음. URL:', url);
          Alert.alert('오류', '인증 정보를 받을 수 없습니다. 다시 시도해주세요.');
          navigation.goBack();
          return;
        }

        // 인증 결과 확인
        const result = await authProvider.verifyCode('', webTransactionId);
        
        if (result.success && result.verified && result.user) {
          // Firebase Auth 세션 생성 (Custom Token으로 로그인)
          if (result.customToken) {
            try {
              await signInWithCustomToken(auth, result.customToken);
              console.log('[NICE] Firebase signInWithCustomToken 성공');
            } catch (tokenError: any) {
              console.error('[NICE] Firebase signInWithCustomToken 실패:', tokenError.message);
              Alert.alert('오류', 'Firebase 인증 세션 생성에 실패했습니다. 다시 시도해주세요.');
              navigation.goBack();
              return;
            }
          } else {
            console.warn('[NICE] customToken 없음 - Firebase Auth 세션 미생성');
          }

          // 인증 성공 - PhoneAuthScreen으로 돌아가서 회원가입 화면으로 이동
          navigation.navigate('PhoneAuth', {
            verified: true,
            userId: result.user.uid,
            phoneNumber: result.user.phoneNumber || '',
          });
        } else {
          Alert.alert('인증 실패', result.message || '본인인증에 실패했습니다.');
          navigation.goBack();
        }
      } catch (error: any) {
        console.error('[NICE] 딥링크 처리 오류:', error);
        Alert.alert('오류', error.message || '인증 처리 중 오류가 발생했습니다.');
        navigation.goBack();
      }
    } 
    // NICE 인증 취소 처리
    else if (url.startsWith('smtalk://nice-auth-close') || url.includes('nice-auth-close')) {
      Alert.alert('알림', '본인인증이 취소되었습니다.');
      navigation.goBack();
    }
  };

  // WebView 네비게이션 상태 변경
  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    
    // return_url로 리다이렉트되는 경우 감지
    const url = navState.url;
    console.log('[NICE] WebView URL 변경:', url);
    
    // Expo 개발 서버 URL은 무시
    if (url && (url.startsWith('exp://') || url.startsWith('exps://'))) {
      return;
    }
    
    if (url && (url.includes('nice-auth-callback') || url.includes('nice-auth-close'))) {
      console.log('[NICE] 인증 콜백 URL 감지:', url);
      // 딥링크로 처리
      handleDeepLink({ url });
    }
  };

  // WebView에서 shouldStartLoadWithRequest로 URL 가로채기 (iOS)
  const handleShouldStartLoadWithRequest = (request: any) => {
    const url = request.url;
    console.log('[NICE] WebView 요청 URL:', url);
    
    // Expo 개발 서버 URL은 무시
    if (url && (url.startsWith('exp://') || url.startsWith('exps://'))) {
      return true;
    }
    
    // return_url로 리다이렉트되는 경우 감지
    if (url && (url.includes('nice-auth-callback') || url.includes('nice-auth-close'))) {
      console.log('[NICE] 인증 콜백 URL 감지 (shouldStartLoadWithRequest):', url);
      // 딥링크로 처리
      handleDeepLink({ url });
      return false; // WebView에서 로드하지 않음
    }
    
    return true;
  };

  // WebView 로드 완료
  const handleLoadEnd = () => {
    setLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // WebView 로드 시작
  const handleLoadStart = () => {
    setLoading(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '연결 오류',
        '인증 서버에 연결할 수 없습니다. 네트워크 상태를 확인 후 다시 시도해주세요.',
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    }, 15000);
  };

  // 뒤로가기 처리
  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      Alert.alert('알림', '본인인증을 취소하시겠습니까?', [
        { text: '계속', style: 'cancel' },
        {
          text: '취소',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>본인인증</Text>
        <View style={styles.placeholder} />
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: authUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[NICE] WebView 오류:', nativeEvent);
          setLoading(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          Alert.alert(
            '오류',
            '인증 서버에 연결할 수 없습니다.',
            [{ text: '확인', onPress: () => navigation.goBack() }]
          );
        }}
        // JavaScript 활성화
        javaScriptEnabled={true}
        // 쿠키 활성화 (중요: NICE 인증에 필수)
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        // 캐시 활성화
        cacheEnabled={true}
        // 인라인 미디어 재생 허용
        mediaPlaybackRequiresUserAction={false}
        // iOS에서 파일 업로드 허용
        allowsInlineMediaPlayback={true}
        // iOS에서 백그라운드 오디오 재생 허용
        allowsAirPlayForMediaPlayback={true}
        // 디버깅 활성화 (개발 환경)
        originWhitelist={['*']}
        mixedContentMode="always"
        // Android에서 쿠키 허용
        androidLayerType="hardware"
        // User Agent 설정 (일부 사이트에서 필요)
        userAgent={Platform.select({
          ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          android: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        })}
      />

      {/* 로딩 인디케이터 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1F2937" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#1F2937',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
