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
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { ChatRoom } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { performanceMonitor } from '../utils/PerformanceMonitor';

const SWIPE_THRESHOLD = 80;

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#1F2937', '#FFD93D', '#1F2937'];

const getAvatarColor = (gender?: string, hasAvatar?: boolean) => {
  // 프로필 사진이 없을 때 성별에 따라 색상 설정
  if (!hasAvatar && gender) {
    return gender === 'female' ? '#F3AAC2' : '#8FB5DF'; // 여자는 핑크, 남자는 연한 파란색
  }
  // 프로필 사진이 있거나 성별 정보가 없을 때는 기본 색상
  return AVATAR_COLORS[0];
};

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
  const { currentUser, chatRooms, getChatPartner, pinChatRoom, unpinChatRoom, isPinned } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('ChatListScreen');
      return () => {
        performanceMonitor.endScreenLoad('ChatListScreen');
      };
    }, [])
  );
  
  const [swipedRoomId, setSwipedRoomId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const sortedRooms = useMemo(() => {
    // 중복 제거: 같은 ID를 가진 채팅방이 여러 개 있으면 첫 번째만 유지
    const uniqueRooms = chatRooms.filter((room, index, self) =>
      index === self.findIndex((r) => r.id === room.id)
    );
    
    // 고정된 대화와 일반 대화를 분리
    const pinnedRooms: ChatRoom[] = [];
    const unpinnedRooms: ChatRoom[] = [];
    
    uniqueRooms.forEach((room) => {
      if (isPinned(room.id)) {
        pinnedRooms.push(room);
      } else {
        unpinnedRooms.push(room);
      }
    });
    
    // 고정된 대화는 고정 시간 순으로 정렬 (최신 고정이 위로)
    pinnedRooms.sort((a, b) => {
      const aPinnedAt = a.pinnedBy?.[currentUser.id] || 0;
      const bPinnedAt = b.pinnedBy?.[currentUser.id] || 0;
      return bPinnedAt - aPinnedAt;
    });
    
    // 일반 대화는 최신 메시지 시간 순으로 정렬
    unpinnedRooms.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp ?? 0;
      const bTime = b.lastMessage?.timestamp ?? 0;
      return bTime - aTime;
    });
    
    // 고정된 대화를 먼저, 그 다음 일반 대화
    return [...pinnedRooms, ...unpinnedRooms];
  }, [chatRooms, currentUser.id, isPinned]);

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
            } catch (error: any) {
              console.error('채팅방 삭제 실패:', error);
              // 권한 오류나 이미 삭제된 경우는 성공으로 처리
              if (error.code === 'permission-denied' || error.code === 'not-found') {
                setSwipedRoomId(null);
                return;
              }
              Alert.alert('오류', '채팅방 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, []);

  const handleDeleteAllRooms = useCallback(async () => {
    if (sortedRooms.length === 0) {
      Alert.alert('알림', '삭제할 채팅방이 없습니다.');
      return;
    }

    // 고정되지 않은 채팅방만 필터링
    const unpinnedRooms = sortedRooms.filter((room) => !isPinned(room.id));
    const pinnedCount = sortedRooms.length - unpinnedRooms.length;

    if (unpinnedRooms.length === 0) {
      Alert.alert('알림', '삭제할 채팅방이 없습니다.\n고정된 채팅방은 제외됩니다.');
      return;
    }

    const message = pinnedCount > 0
      ? `고정되지 않은 채팅방 ${unpinnedRooms.length}개를 나가시겠습니까?\n고정된 채팅방 ${pinnedCount}개는 유지됩니다.\n\n삭제된 채팅은 복구할 수 없습니다.`
      : `모든 채팅방(${unpinnedRooms.length}개)을 나가시겠습니까?\n삭제된 채팅은 복구할 수 없습니다.`;

    Alert.alert(
      '전체 나가기',
      message,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              // 고정되지 않은 채팅방만 순차적으로 삭제 (에러가 발생해도 계속 진행)
              let successCount = 0;
              let failCount = 0;
              
              for (const room of unpinnedRooms) {
                try {
                  await firebaseFirestoreService.deleteChatRoom(room.id);
                  successCount++;
                  // 각 삭제 후 짧은 대기 (Firestore 업데이트 시간 확보)
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error: any) {
                  console.warn(`채팅방 ${room.id} 삭제 실패:`, error);
                  failCount++;
                  // 권한 오류나 이미 삭제된 경우는 성공으로 간주
                  if (error.code === 'permission-denied' || error.code === 'not-found') {
                    successCount++;
                    failCount--;
                  }
                }
              }
              
              setSwipedRoomId(null);
              setSwipeDirection(null);
              
              if (failCount === 0) {
                const pinnedMessage = pinnedCount > 0
                  ? `고정되지 않은 채팅방 ${successCount}개를 나갔습니다.\n고정된 채팅방 ${pinnedCount}개는 유지되었습니다.`
                  : `모든 채팅방 ${successCount}개를 나갔습니다.`;
                Alert.alert('완료', pinnedMessage);
              } else {
                const pinnedMessage = pinnedCount > 0
                  ? `고정되지 않은 채팅방 ${successCount}개를 나갔습니다. (${failCount}개 실패)\n고정된 채팅방 ${pinnedCount}개는 유지되었습니다.`
                  : `${successCount}개 채팅방을 나갔습니다. (${failCount}개 실패)`;
                Alert.alert('완료', pinnedMessage);
              }
            } catch (error) {
              console.error('전체 채팅방 삭제 실패:', error);
              Alert.alert('오류', '일부 채팅방 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, [sortedRooms, isPinned]);

  const handlePinToggle = useCallback(async (roomId: string) => {
    if (isPinned(roomId)) {
      await unpinChatRoom(roomId);
    } else {
      await pinChatRoom(roomId);
    }
  }, [isPinned, pinChatRoom, unpinChatRoom]);

  const SwipeableRoom = useCallback(({ item }: { item: ChatRoom }) => {
    const partner = getChatPartner(item.id);
    if (!partner) return null;

    const initial = partner.name.charAt(0).toUpperCase();
    const translateX = useRef(new Animated.Value(0)).current;
    const isPinnedRoom = isPinned(item.id);

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10;
        },
        onPanResponderGrant: () => {
          // 다른 채팅방이 스와이프되어 있으면 닫기
          if (swipedRoomId && swipedRoomId !== item.id) {
            setSwipedRoomId(null);
            setSwipeDirection(null);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            // 왼쪽으로 스와이프 (삭제 버튼 표시)
            const maxSwipe = -80;
            translateX.setValue(Math.max(gestureState.dx, maxSwipe));
          } else if (gestureState.dx > 0) {
            // 오른쪽으로 스와이프 (고정 버튼 표시)
            const maxSwipe = 80;
            translateX.setValue(Math.min(gestureState.dx, maxSwipe));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            // 왼쪽으로 스와이프 (삭제 버튼 표시)
            Animated.spring(translateX, {
              toValue: -80,
              useNativeDriver: true,
            }).start();
            setSwipedRoomId(item.id);
            setSwipeDirection('left');
          } else if (gestureState.dx > SWIPE_THRESHOLD) {
            // 오른쪽으로 스와이프 (고정 버튼 표시)
            Animated.spring(translateX, {
              toValue: 80,
              useNativeDriver: true,
            }).start();
            setSwipedRoomId(item.id);
            setSwipeDirection('right');
          } else {
            // 원래 위치로 복귀
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            if (swipedRoomId === item.id) {
              setSwipedRoomId(null);
              setSwipeDirection(null);
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
      setSwipedRoomId(null);
      setSwipeDirection(null);
    };

    const handlePinPress = () => {
      handlePinToggle(item.id);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setSwipedRoomId(null);
      setSwipeDirection(null);
    };

    const isSwiped = swipedRoomId === item.id;
    const showDeleteButton = isSwiped && swipeDirection === 'left';
    const showPinButton = isSwiped && swipeDirection === 'right';

    return (
      <View style={styles.swipeContainer}>
        {/* 왼쪽 고정 버튼 */}
        {showPinButton && (
          <View style={styles.pinButtonContainer}>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={handlePinPress}
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/pinicon.png')}
                style={styles.pinButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}
        {/* 오른쪽 삭제 버튼 */}
        {showDeleteButton && (
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeletePress}
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/deleteicon.png')}
                style={styles.deleteButtonIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}
        <Animated.View
          style={[
            styles.roomCard,
            isPinnedRoom && styles.pinnedRoomCard,
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
              if (isSwiped) {
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
                setSwipedRoomId(null);
                setSwipeDirection(null);
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
                { backgroundColor: getAvatarColor(partner.gender, !!partner.avatar) },
              ]}
            >
              {partner.avatar ? (
                <Image source={{ uri: partner.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <View style={styles.roomContent}>
              <View style={styles.roomHeader}>
                <View style={styles.nameRow}>
                  {isPinnedRoom && (
                    <Image
                      source={require('../assets/pinicon.png')}
                      style={styles.pinIcon}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.partnerName}>{partner.name}</Text>
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
  }, [getChatPartner, navigation, currentUser, swipedRoomId, swipeDirection, handleDeleteRoom, isPinned, handlePinToggle]);

  const renderRoom = useCallback(({ item }: { item: ChatRoom }) => {
    return <SwipeableRoom item={item} />;
  }, [SwipeableRoom]);

  const keyExtractor = useCallback((item: ChatRoom) => item.id, []);

  return (
    <View style={styles.container}>
      {sortedRooms.length > 0 && (
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={handleDeleteAllRooms}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAllButtonText}>전체 나가기</Text>
        </TouchableOpacity>
      )}
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
            setSwipeDirection(null);
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
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  deleteAllButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  pinButtonContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 0,
  },
  pinButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    width: 80,
    height: '100%',
    paddingHorizontal: 16,
  },
  pinButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
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
    backgroundColor: '#DC2626',
    width: 80,
    height: '100%',
    paddingHorizontal: 16,
  },
  deleteButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
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
  pinnedRoomCard: {
    backgroundColor: '#F8F9FF',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(31, 41, 55, 0.12)',
  },
  pinIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    backgroundColor: '#DC2626',
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
