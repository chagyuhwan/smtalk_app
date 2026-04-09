import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import StarTalkScreen from '../screens/StarTalkScreen';
import UsersScreen from '../screens/UsersScreen';
import MoreScreen from '../screens/MoreScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ChargeScreen from '../screens/ChargeScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import CustomerServiceScreen from '../screens/CustomerServiceScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import NiceAuthWebViewScreen from '../screens/NiceAuthWebViewScreen';
import { RootStackParamList, MainTabParamList } from './types';
import { Text, View, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '../context/ChatContext';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { notificationService } from '../services/NotificationService';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { performanceMonitor } from '../utils/PerformanceMonitor';

// 네이티브 스플래시 스크린을 즉시 숨기기
SplashScreen.hideAsync().catch(() => {
  // 네이티브 스플래시가 없어도 계속 진행
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 홈 아이콘 컴포넌트 (PNG 이미지 사용)
function HomeIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Image
      source={require('../assets/home.png')}
      style={[
        iconStyles.image,
        // 항상 색상 적용 (비활성일 때는 더 진하게)
        { tintColor: color, opacity: focused ? 1 : 0.9 },
      ]}
      resizeMode="contain"
    />
  );
}

// 사용자 아이콘 컴포넌트 (PNG 이미지 사용)
function UsersIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Image
      source={require('../assets/usersList.png')}
      style={[
        iconStyles.image,
        // 항상 색상 적용 (비활성일 때는 더 진하게)
        { tintColor: color, opacity: focused ? 1 : 0.9 },
      ]}
      resizeMode="contain"
    />
  );
}

// 메시지 아이콘 컴포넌트 (PNG 이미지 사용)
function MessageIcon({ color, focused, unreadCount }: { color: string; focused: boolean; unreadCount: number }) {
  return (
    <View style={iconStyles.iconContainer}>
      <Image
        source={require('../assets/messages.png')}
        style={[
          iconStyles.image,
          // 항상 색상 적용 (비활성일 때는 더 진하게)
          { tintColor: color, opacity: focused ? 1 : 0.9 },
        ]}
        resizeMode="contain"
      />
      {unreadCount > 0 && (
        <View style={iconStyles.badge}>
          <Text style={iconStyles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// 프로필 아이콘 컴포넌트 (PNG 이미지 사용)
function ProfileIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Image
      source={require('../assets/profile.png')}
      style={[
        iconStyles.image,
        // 항상 색상 적용 (비활성일 때는 더 진하게)
        { tintColor: color, opacity: focused ? 1 : 0.9 },
      ]}
      resizeMode="contain"
    />
  );
}

const iconStyles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  image: {
    width: 32,
    height: 32,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});

// 공통 네비게이션 스타일
const commonStackOptions = {
  headerBackTitleVisible: false, // iOS에서 뒤로가기 버튼에 이전 화면 제목 숨김
  headerBackTitle: '', // iOS에서 빈 문자열로 설정하여 텍스트 숨김
  headerBackButtonDisplayMode: 'minimal', // iOS 14+ 에서 뒤로가기 버튼을 최소화
  headerStyle: {
    backgroundColor: '#fff',
  },
  headerTintColor: '#111',
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 18,
  },
};

// 탭 네비게이터 공통 옵션
const tabNavigatorOptions = {
  headerShown: false,
  tabBarActiveTintColor: '#1F2937',
  tabBarInactiveTintColor: '#8892B0',
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8, // 하단 패딩 조정
    height: Platform.OS === 'ios' ? 65 : 60, // 높이 조정하여 위로 올림
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
};

function MainTabs() {
  const { chatRooms } = useChat();
  const insets = useSafeAreaInsets();
  
  // 전체 읽지 않은 메시지 수 계산
  const totalUnreadCount = useMemo(() => {
    return chatRooms.reduce((total, room) => {
      return total + (room.unreadCount || 0);
    }, 0);
  }, [chatRooms]);
  
  // Safe area를 고려한 탭 바 스타일
  const tabBarStyleWithInsets = {
    ...tabNavigatorOptions.tabBarStyle,
    paddingBottom: Platform.OS === 'ios'
      ? Math.max(insets.bottom - 10, 4)
      : insets.bottom + 4,
    height: Platform.OS === 'ios'
      ? 50 + Math.max(insets.bottom - 10, 0)
      : 55 + insets.bottom,
  };
  
  return (
    <Tab.Navigator screenOptions={{
      ...tabNavigatorOptions,
      tabBarStyle: tabBarStyleWithInsets,
    }}>
      <Tab.Screen
        name="StarTalk"
        component={StarTalkScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => <HomeIcon color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => <UsersIcon color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => <MessageIcon color={color} focused={focused} unreadCount={totalUnreadCount} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => <ProfileIcon color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ChatScreen 헤더 컴포넌트
function ChatHeader({ partner }: { partner: RootStackParamList['Chat']['partner'] }) {
  return (
    <View style={headerStyles.container}>
      <Text style={headerStyles.name}>{partner.name}</Text>
    </View>
  );
}

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const prevAuthState = useRef<boolean | null>(null);
  const splashStartTime = useRef<number>(Date.now());
  const authReady = useRef<boolean>(false);
  const { contacts, chatRooms, getChatPartner } = useChat();

  // 앱 시작 시 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      const authenticated = !!user;
      const wasAuthenticated = prevAuthState.current;
      console.log('인증 상태 변경:', authenticated ? '로그인' : '로그아웃');
      console.log('이전 인증 상태:', wasAuthenticated);
      
      // 로그아웃 시 네비게이션 리셋
      if (wasAuthenticated === true && authenticated === false) {
        console.log('로그아웃 감지 - 네비게이션 리셋');
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'PhoneAuth' }],
        });
      }
      
      prevAuthState.current = authenticated;
      setIsAuthenticated(authenticated);
      authReady.current = true;
      
      // 스플래시 화면 최소 표시 시간 보장 (2초)
      const elapsedTime = Date.now() - splashStartTime.current;
      const minSplashTime = 2000; // 2초
      
      if (elapsedTime < minSplashTime) {
        setTimeout(() => {
          setIsLoading(false);
        }, minSplashTime - elapsedTime);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 알림 리스너 설정
  useEffect(() => {
    if (!isAuthenticated) return;

    notificationService.setupNotificationListeners(
      // 알림 수신 시 (앱이 포그라운드일 때)
      (notification: Notifications.Notification) => {
        console.log('알림 수신:', notification);
      },
      // 알림 탭 시
      (response: Notifications.NotificationResponse) => {
        console.log('알림 탭:', response);
        const data = response.notification.request.content.data;

        // 메시지 알림인 경우 채팅방으로 이동
        if (data?.chatRoomId && navigationRef.current) {
          const chatRoomId = data.chatRoomId;
          
          // 채팅방이 존재하는지 확인
          const chatRoom = chatRooms.find((room) => room.id === chatRoomId);
          if (chatRoom) {
            // 상대방 정보 가져오기
            const partner = getChatPartner(chatRoomId);
            if (partner) {
              // 채팅방으로 직접 이동
              navigationRef.current.navigate('Chat', {
                chatRoomId,
                partner,
              });
            } else {
              // 상대방 정보를 찾을 수 없으면 메시지 목록으로 이동
              navigationRef.current.navigate('MainTabs', {
                screen: 'Messages',
              });
            }
          } else {
            // 채팅방이 아직 로드되지 않았으면 메시지 목록으로 이동
            navigationRef.current.navigate('MainTabs', {
              screen: 'Messages',
            });
          }
        }

        // 좋아요 알림인 경우 프로필로 이동
        if (data?.type === 'like' && data?.likerId && navigationRef.current) {
          // 좋아요를 누른 사용자 프로필로 이동
          const liker = contacts.find((c) => c.id === data.likerId);
          if (liker) {
            navigationRef.current.navigate('UserProfile', {
              user: liker,
            });
          } else {
            // 사용자 정보를 찾을 수 없으면 사용자 목록으로 이동
            navigationRef.current.navigate('MainTabs', {
              screen: 'Users',
            });
          }
        }
      }
    );

    return () => {
      notificationService.removeNotificationListeners();
    };
  }, [isAuthenticated, contacts, chatRooms, getChatPartner]);

  const chatScreenOptions = useCallback(
    ({ route }: { route: { params: RootStackParamList['Chat'] } }) => ({
      ...commonStackOptions,
      headerShown: false,
    }),
    []
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1f2937' }}>
        {/* GIF 스플래시 스크린 - 화면 전체 */}
        <Image
          source={require('../assets/sflash_ico.gif')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          ...commonStackOptions,
          // 모든 화면에 기본적으로 적용
          headerBackTitleVisible: false,
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
        initialRouteName={isAuthenticated ? 'MainTabs' : 'PhoneAuth'}
      >
        <Stack.Screen
          name="PhoneAuth"
          component={PhoneAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NiceAuthWebView"
          component={NiceAuthWebViewScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={chatScreenOptions}
        />
        <Stack.Screen
          name="ProfileSettings"
          component={ProfileSettingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Charge"
          component={ChargeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="BlockedUsers"
          component={BlockedUsersScreen}
          options={{
            title: '차단한 회원',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="CustomerService"
          component={CustomerServiceScreen}
          options={{
            title: '고객센터',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsOfServiceScreen}
          options={{
            title: '이용약관',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{
            title: '개인정보 처리방침',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{
            title: '알림 설정',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
});
