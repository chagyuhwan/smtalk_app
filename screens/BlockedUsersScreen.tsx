import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { User } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { performanceMonitor } from '../utils/PerformanceMonitor';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 아바타 색상 생성 함수
const getAvatarColor = (id: string) => {
  const colors = ['#1F2937', '#FF6B6B', '#4ECDC4', '#1F2937', '#FFD93D', '#1F2937'];
  return colors[id.length % colors.length];
};

// 이니셜 가져오기 함수
const getInitial = (name: string) => {
  return name.charAt(0).toUpperCase() || '?';
};

interface BlockedUserInfo extends User {
  blockedAt: number;
}

export default function BlockedUsersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { blockedUsers, unblockUser, contacts } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('BlockedUsersScreen');
      return () => {
        performanceMonitor.endScreenLoad('BlockedUsersScreen');
      };
    }, [])
  );
  
  const [blockedUsersInfo, setBlockedUsersInfo] = useState<BlockedUserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // 차단된 사용자 정보 가져오기
  useEffect(() => {
    const fetchBlockedUsersInfo = async () => {
      const blockedUserIds = Object.keys(blockedUsers);
      if (blockedUserIds.length === 0) {
        setBlockedUsersInfo([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const usersInfo: BlockedUserInfo[] = [];

        // contacts에서 먼저 찾기
        const foundInContacts: BlockedUserInfo[] = [];
        const notFoundIds: string[] = [];

        blockedUserIds.forEach((userId) => {
          const user = contacts.find((c) => c.id === userId);
          if (user) {
            foundInContacts.push({
              ...user,
              blockedAt: blockedUsers[userId],
            });
          } else {
            notFoundIds.push(userId);
          }
        });

        usersInfo.push(...foundInContacts);

        // contacts에 없는 사용자는 Firestore에서 가져오기
        for (const userId of notFoundIds) {
          try {
            const user = await firebaseFirestoreService.getUser(userId);
            if (user) {
              usersInfo.push({
                ...user,
                blockedAt: blockedUsers[userId],
              });
            }
          } catch (error) {
            console.error(`사용자 정보 가져오기 실패 (${userId}):`, error);
          }
        }

        setBlockedUsersInfo(usersInfo);
      } catch (error) {
        console.error('차단된 사용자 정보 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsersInfo();
  }, [blockedUsers, contacts]);

  // 차단 날짜 포맷팅
  const formatBlockedDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }, []);

  const handleUnblock = useCallback((user: User) => {
    Alert.alert(
      '차단 해제',
      `${user.name}님의 차단을 해제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '차단 해제',
          onPress: () => {
            unblockUser(user.id);
            Alert.alert('완료', '차단이 해제되었습니다.');
          },
        },
      ]
    );
  }, [unblockUser]);

  const renderUser = useCallback(({ item }: { item: BlockedUserInfo }) => {
    const avatarColor = getAvatarColor(item.id);
    const initial = getInitial(item.name);

    return (
      <View style={styles.userItem}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.age && (
              <Text style={styles.userAge}>{item.age}세</Text>
            )}
          </View>
          <Text style={styles.blockedDate}>차단일: {formatBlockedDate(item.blockedAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => handleUnblock(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.unblockButtonText}>차단 해제</Text>
        </TouchableOpacity>
      </View>
    );
  }, [handleUnblock, formatBlockedDate]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>차단한 회원</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단한 회원</Text>
        <View style={styles.backButton} />
      </View>
      {blockedUsersInfo.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>차단한 회원이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsersInfo}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#667085',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#667085',
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 8,
  },
  userAge: {
    fontSize: 14,
    color: '#667085',
  },
  blockedDate: {
    fontSize: 12,
    color: '#8892B0',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

