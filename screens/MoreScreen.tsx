import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, AppState } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { firebaseAuthService } from '../services/FirebaseAuthService';
import { performanceMonitor } from '../utils/PerformanceMonitor';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, points, requestAccountDeletion, cancelAccountDeletion, checkAttendance, canCheckAttendance, blockedUsers } = useChat();
  const [, setRefreshKey] = useState(0);

  // 화면에 포커스가 올 때마다 날짜 확인 (00시 지났는지 체크)
  useFocusEffect(
    React.useCallback(() => {
      // 성능 측정 시작
      performanceMonitor.startScreenLoad('MoreScreen');
      // 화면이 포커스될 때마다 날짜 확인을 위해 리렌더링 트리거
      setRefreshKey(prev => prev + 1);
      return () => {
        performanceMonitor.endScreenLoad('MoreScreen');
      };
    }, [])
  );

  // 앱이 포그라운드로 돌아올 때 날짜 확인
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // 앱이 활성화될 때 날짜 확인을 위해 리렌더링 트리거
        setRefreshKey(prev => prev + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('로그아웃 버튼 클릭');
              await firebaseAuthService.signOut();
              console.log('로그아웃 완료 - PhoneAuth 화면으로 이동 예정');
              // AppNavigator의 onAuthStateChanged가 자동으로 감지하여 PhoneAuth 화면으로 이동
            } catch (error: any) {
              console.error('로그아웃 실패:', error);
              Alert.alert('오류', error.message || '로그아웃에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    const isDeletionRequested = currentUser.deletionRequestedAt !== undefined;
    
    if (isDeletionRequested) {
      // 탈퇴 취소
      const deletionScheduledAt = currentUser.deletionScheduledAt || (currentUser.deletionRequestedAt + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil((deletionScheduledAt - Date.now()) / (24 * 60 * 60 * 1000));
      
      Alert.alert(
        '회원탈퇴 취소',
        `회원탈퇴가 예정되어 있습니다. (${daysRemaining}일 후 삭제 예정)\n\n탈퇴를 취소하시겠습니까?`,
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '탈퇴 취소',
            onPress: async () => {
              try {
                await cancelAccountDeletion();
              } catch (error: any) {
                console.error('탈퇴 취소 실패:', error);
              }
            },
          },
        ]
      );
    } else {
      // 탈퇴 요청
      Alert.alert(
        '회원탈퇴',
        '정말 회원탈퇴를 하시겠습니까?\n\n탈퇴 후 30일 동안 계정이 보관되며, 30일 이내에 다시 로그인하시면 탈퇴가 취소됩니다.\n30일 후 계정이 완전히 삭제됩니다.',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '탈퇴하기',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                '최종 확인',
                '회원탈퇴를 진행하시겠습니까?',
                [
                  {
                    text: '취소',
                    style: 'cancel',
                  },
                  {
                    text: '확인',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await requestAccountDeletion();
                      } catch (error: any) {
                        console.error('탈퇴 요청 실패:', error);
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>더보기</Text>
        <Text style={styles.subtitle}>안녕하세요, {currentUser.name}님</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={[styles.section, styles.firstSection]}>
          {canCheckAttendance() && (
            <TouchableOpacity
              style={[styles.menuItem, styles.attendanceItem]}
              onPress={async () => {
                await checkAttendance();
              }}
            >
              <View style={styles.attendanceContent}>
                <Text style={[styles.menuText, styles.attendanceText]}>출석체크</Text>
                <Text style={styles.attendanceSubtext}>50포인트 받기</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <Text style={styles.menuText}>프로필 설정</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Charge')}
          >
            <Text style={styles.menuText}>포인트 충전</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('BlockedUsers')}
          >
            <Text style={styles.menuText}>차단한 회원</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <Text style={styles.menuText}>알림 설정</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationTest')}
          >
            <Text style={styles.menuText}>알림 테스트</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.menuText}>개인정보 처리방침</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <Text style={styles.menuText}>이용약관</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
        {/* 관리자 페이지는 Spring 웹 애플리케이션으로 분리됨 */}
        {/* 웹 브라우저에서 접속: http://your-server:8080/admin */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('CustomerService')}
          >
            <Text style={styles.menuText}>고객센터</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>버전 정보</Text>
            <Text style={styles.menuTextSecondary}>1.0.0</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.menuText, styles.deleteText]}>
              {currentUser.deletionRequestedAt ? '회원탈퇴 취소' : '회원탈퇴'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
          </TouchableOpacity>
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
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  firstSection: {
    marginTop: 0,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  menuText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  menuTextSecondary: {
    fontSize: 16,
    color: '#888',
  },
  menuArrow: {
    fontSize: 20,
    color: '#888',
  },
  logoutText: {
    color: '#F04438',
    fontWeight: '600',
  },
  deleteText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  attendanceItem: {
    backgroundColor: '#F0F4FF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  attendanceContent: {
    flex: 1,
  },
  attendanceText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  attendanceSubtext: {
    fontSize: 13,
    color: '#1F2937',
  },
  attendanceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  attendanceButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  attendanceButtonTextDisabled: {
    color: '#9CA3AF',
  },
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

