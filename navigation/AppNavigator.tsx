import React, { useCallback, useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import StarTalkScreen from '../screens/StarTalkScreen';
import UsersScreen from '../screens/UsersScreen';
import MoreScreen from '../screens/MoreScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import ChargeScreen from '../screens/ChargeScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import { RootStackParamList, MainTabParamList } from './types';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useChat } from '../context/ChatContext';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
  tabBarActiveTintColor: '#4C6EF5',
  tabBarInactiveTintColor: '#8892B0',
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabNavigatorOptions}>
      <Tab.Screen
        name="StarTalk"
        component={StarTalkScreen}
        options={{
          tabBarLabel: '별톡',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⭐</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{
          tabBarLabel: '사용자',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarLabel: '메시지',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: '더보기',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⋯</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ChatScreen 헤더 컴포넌트
function ChatHeader({ partner }: { partner: RootStackParamList['Chat']['partner'] }) {
  const { currentUser, contacts, getDistance, formatDistance } = useChat();
  
  // contacts 배열에서 최신 정보 가져오기 (위치 정보 포함)
  const latestPartner = contacts.find(c => c.id === partner.id) || partner;
  
  const distance = getDistance(currentUser, latestPartner);
  const distanceText = formatDistance(distance);

  return (
    <View style={headerStyles.container}>
      <Text style={headerStyles.name}>{partner.name}</Text>
      {distance !== null && distanceText !== '위치 정보 없음' && (
        <Text style={headerStyles.distance}>{distanceText}</Text>
      )}
    </View>
  );
}

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const prevAuthState = useRef<boolean | null>(null);

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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const chatScreenOptions = useCallback(
    ({ route }: { route: { params: RootStackParamList['Chat'] } }) => ({
      ...commonStackOptions,
      headerTitle: () => <ChatHeader partner={route.params.partner} />,
    }),
    []
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4C6EF5" />
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
            title: '프로필 설정',
          }}
        />
        <Stack.Screen
          name="Charge"
          component={ChargeScreen}
          options={{
            title: '포인트 충전',
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
    marginRight: 8,
  },
  distance: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4C6EF5',
    backgroundColor: '#E8EDFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
