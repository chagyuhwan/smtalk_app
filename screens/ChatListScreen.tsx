import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { ChatRoom } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';

const SWIPE_THRESHOLD = 80;

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#A29BFE', '#FFD93D', '#6C5CE7'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 시간 포맷팅 함수를 컴포넌트 외부로 이동하여 재생성 방지
const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '방금 전';
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export default function ChatListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, chatRooms, getChatPartner, getDistance, formatDistance } = useChat();
  const [swipedRoomId, setSwipedRoomId] = useState<string | null>(null);

  const sortedRooms = useMemo(() => {
    return [...chatRooms].sort((a, b) => {
      const aTime = a.lastMessage?.timestamp ?? 0;
      const bTime = b.lastMessage?.timestamp ?? 0;
      return bTime - aTime;
    });
  }, [chatRooms]);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    Alert.alert(
      '채팅방 삭제',
      '이 채팅방을 삭제하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // Firestore에서 채팅방 삭제
              await firebaseFirestoreService.deleteChatRoom(roomId);
              setSwipedRoomId(null);
            } catch (error) {
              console.error('채팅방 삭제 실패:', error);
              Alert.alert('오류', '채팅방 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, []);

  const SwipeableRoom = useCallback(({ item }: { item: ChatRoom }) => {
    const partner = getChatPartner(item.id);
    if (!partner) return null;

    const initial = partner.name.charAt(0).toUpperCase();
    const distance = getDistance(currentUser, partner);
    const distanceText = formatDistance(distance);
    const translateX = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10;
        },
        onPanResponderGrant: () => {
          // 다른 채팅방이 스와이프되어 있으면 닫기
          if (swipedRoomId && swipedRoomId !== item.id) {
            setSwipedRoomId(null);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            // 왼쪽으로 스와이프 (삭제 버튼 표시)
            const maxSwipe = -80;
            translateX.setValue(Math.max(gestureState.dx, maxSwipe));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            // 삭제 임계값을 넘으면 삭제 버튼 표시
            Animated.spring(translateX, {
              toValue: -80,
              useNativeDriver: true,
            }).start();
            setSwipedRoomId(item.id);
          } else {
            // 원래 위치로 복귀
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            if (swipedRoomId === item.id) {
              setSwipedRoomId(null);
            }
          }
        },
      })
    ).current;

    // 다른 채팅방이 스와이프되면 이 채팅방은 닫기
    React.useEffect(() => {
      if (swipedRoomId && swipedRoomId !== item.id) {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }, [swipedRoomId, item.id, translateX]);

    const handleDeletePress = () => {
      handleDeleteRoom(item.id);
    };

    return (
      <View style={styles.swipeContainer}>
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
        <Animated.View
          style={[
            styles.roomCard,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              // 스와이프된 상태면 닫기
              if (swipedRoomId === item.id) {
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
                setSwipedRoomId(null);
                return;
              }
              navigation.navigate('Chat', {
                chatRoomId: item.id,
                partner,
              });
            }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: AVATAR_COLORS[partner.id.length % AVATAR_COLORS.length] },
              ]}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.roomContent}>
              <View style={styles.roomHeader}>
                <View style={styles.nameRow}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  {distance !== null && distanceText !== '위치 정보 없음' && (
                    <Text style={styles.distanceBadge}>{distanceText}</Text>
                  )}
                </View>
                <Text style={styles.timestamp}>{formatTime(item.lastMessage?.timestamp)}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage?.text ?? '새로운 대화를 시작해보세요!'}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }, [getChatPartner, navigation, currentUser, getDistance, formatDistance, swipedRoomId, handleDeleteRoom]);

  const renderRoom = useCallback(({ item }: { item: ChatRoom }) => {
    return <SwipeableRoom item={item} />;
  }, [SwipeableRoom]);

  const keyExtractor = useCallback((item: ChatRoom) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요, {currentUser.name}님</Text>
        <Text style={styles.subtitle}>메시지를 확인해보세요.</Text>
      </View>

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          // 빈 공간 클릭 시 스와이프된 채팅방 닫기
          if (swipedRoomId) {
            setSwipedRoomId(null);
          }
        }}
        style={{ flex: 1 }}
      >
        <FlatList
          data={sortedRooms}
          keyExtractor={keyExtractor}
          renderItem={renderRoom}
          contentContainerStyle={sortedRooms.length === 0 ? styles.emptyContent : undefined}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>아직 대화가 없어요</Text>
              <Text style={styles.emptyDesc}>별톡에서 게시글을 보고 채팅을 시작해보세요.</Text>
            </View>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </TouchableOpacity>
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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 0,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    width: 80,
    height: '100%',
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 0,
    borderRadius: 0,
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    zIndex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  roomContent: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 6,
  },
  distanceBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4C6EF5',
    backgroundColor: '#E8EDFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  preview: {
    fontSize: 14,
    color: '#555',
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
});
