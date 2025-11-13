import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { User, ReportReason } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CHAT_COST = 50;

export default function UsersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { contacts, currentUser, points, createOrOpenChat, deductPoints, isBlocked, blockUser, reportUser } = useChat();

  // 디버깅: contacts와 currentUser 확인
  console.log('=== UsersScreen 디버깅 ===');
  console.log('contacts 배열:', contacts);
  console.log('contacts 개수:', contacts.length, '명');
  console.log('currentUser:', currentUser);
  console.log('currentUser.id:', currentUser.id);
  console.log('currentUser.name:', currentUser.name);

  // 현재 사용자 제외한 연락처 목록 (차단된 사용자도 제외)
  const filteredContacts = useMemo(() => {
    console.log('=== 필터링 시작 ===');
    console.log('필터링 전 contacts:', contacts.length, '명');
    
    const filtered = contacts.filter((contact) => {
      const isNotCurrentUser = !currentUser.id || contact.id !== currentUser.id;
      const isNotBlocked = !isBlocked(contact.id);
      
      if (!isNotCurrentUser) {
        console.log('현재 사용자로 필터링됨:', contact.id, contact.name);
      }
      if (!isNotBlocked) {
        console.log('차단된 사용자로 필터링됨:', contact.id, contact.name);
      }
      
      return isNotCurrentUser && isNotBlocked;
    });
    
    console.log('필터링 후 contacts:', filtered.length, '명');
    console.log('필터링된 사용자 목록:', filtered.map(u => ({ id: u.id, name: u.name })));
    console.log('=== 필터링 완료 ===');
    
    return filtered;
  }, [contacts, currentUser.id, isBlocked]);

  // 이름순으로 정렬
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [filteredContacts]);

  const handleReportUser = useCallback((user: User) => {
    const reportReasons: { label: string; value: ReportReason }[] = [
      { label: '스팸', value: 'spam' },
      { label: '부적절한 내용', value: 'inappropriate' },
      { label: '괴롭힘', value: 'harassment' },
      { label: '가짜 계정', value: 'fake' },
      { label: '기타', value: 'other' },
    ];

    Alert.alert(
      '사용자 신고',
      '신고 사유를 선택해주세요.',
      [
        ...reportReasons.map((reason) => ({
          text: reason.label,
          onPress: () => {
            reportUser(user.id, reason.value);
            Alert.alert('신고 완료', '신고가 접수되었습니다.');
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [reportUser]);

  const handleBlockUser = useCallback((user: User) => {
    Alert.alert(
      '사용자 차단',
      `${user.name}님을 차단하시겠습니까? 차단된 사용자의 게시글과 메시지는 더 이상 표시되지 않습니다.`,
      [
        {
          text: '차단',
          style: 'destructive',
          onPress: () => {
            blockUser(user.id);
            Alert.alert('차단 완료', '사용자가 차단되었습니다.');
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  }, [blockUser]);

  const handleUserMenu = useCallback((user: User) => {
    Alert.alert(
      '옵션',
      '',
      [
        {
          text: '신고하기',
          onPress: () => handleReportUser(user),
        },
        {
          text: '사용자 차단',
          style: 'destructive',
          onPress: () => handleBlockUser(user),
        },
        { text: '취소', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [handleReportUser, handleBlockUser]);

  const handleUserPress = (user: User) => {
    // 포인트 확인
    if (points < CHAT_COST) {
      Alert.alert('포인트 부족', `채팅을 시작하려면 ${CHAT_COST}포인트가 필요합니다.`);
      return;
    }

    // 채팅 시작 확인
    Alert.alert(
      '채팅 시작',
      `${user.name}님과의 채팅을 시작하시겠습니까?\n\n${CHAT_COST}포인트가 차감됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            // 포인트 차감
            const success = await deductPoints(CHAT_COST);
            if (!success) {
              Alert.alert('오류', '포인트가 부족하거나 차감에 실패했습니다.');
              return;
            }

            // 채팅방 생성 및 이동
            try {
              const roomId = await createOrOpenChat(user);
              if (roomId) {
                navigation.navigate('Chat', {
                  chatRoomId: roomId,
                  partner: user,
                });
              }
            } catch (error: any) {
              console.error('채팅방 생성 오류:', error);
              Alert.alert('오류', '채팅방을 생성하는 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }: { item: User }) => {

    const getInitial = (name: string) => {
      return name.charAt(0).toUpperCase() || '?';
    };

    const getAvatarColor = (id: string) => {
      const colors = ['#4C6EF5', '#FF6B6B', '#4ECDC4', '#A29BFE', '#FFD93D', '#6C5CE7'];
      return colors[id.length % colors.length];
    };

    const initial = getInitial(item.name);
    const avatarColor = getAvatarColor(item.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
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
              <Text style={styles.age}>{item.age}세</Text>
            )}
            {item.gender && (
              <Text style={styles.gender}>
                {item.gender === 'male' ? '남' : '여'}
              </Text>
            )}
          </View>
          {item.bio && (
            <View style={styles.infoRow}>
              <Text style={styles.bio} numberOfLines={2}>
                {item.bio}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userItemRight}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation();
              handleUserMenu(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.menuButtonText}>⋯</Text>
          </TouchableOpacity>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>사용자</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={sortedContacts}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>사용자가 없습니다</Text>
          </View>
        }
      />
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
    backgroundColor: '#4C6EF5',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    height: 20,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 16,
    paddingHorizontal: 20,
    marginBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
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
    marginRight: 6,
  },
  age: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginRight: 6,
  },
  gender: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginRight: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bio: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  userItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 4,
  },
  menuButtonText: {
    fontSize: 20,
    color: '#888',
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 20,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});

