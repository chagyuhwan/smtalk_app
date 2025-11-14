import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useChat } from '../context/ChatContext';
import { Message, ReportReason } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

// 시간 포맷팅 함수를 컴포넌트 외부로 이동하여 재생성 방지
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 아바타 색상 생성 함수
const getAvatarColor = (id: string) => {
  const colors = ['#4C6EF5', '#FF6B6B', '#4ECDC4', '#A29BFE', '#FFD93D', '#6C5CE7'];
  return colors[id.length % colors.length];
};

// 이니셜 가져오기 함수
const getInitial = (name: string) => {
  return name.charAt(0).toUpperCase() || '?';
};

export default function ChatScreen() {
  const { params } = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const { chatRoomId, partner } = params;
  const { getMessages, sendMessage, markAsRead, currentUser, blockUser, reportUser, isBlocked, contacts } = useChat();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

  // Firestore에서 메시지 실시간 구독
  useEffect(() => {
    console.log('메시지 실시간 구독 시작:', chatRoomId);
    
    const unsubscribe = firebaseFirestoreService.subscribeToMessages(
      chatRoomId,
      (messages) => {
        console.log('메시지 실시간 업데이트:', messages.length, '개');
        setFirestoreMessages(messages);
      },
      100 // 최대 100개 메시지
    );

    // 구독 해제 함수를 ref에 저장
    unsubscribeMessagesRef.current = unsubscribe;

    return () => {
      console.log('메시지 구독 해제:', chatRoomId);
      unsubscribe();
      unsubscribeMessagesRef.current = null;
    };
  }, [chatRoomId]);

  // Firestore 메시지가 있으면 사용, 없으면 로컬 메시지 사용
  const messages = useMemo(() => {
    if (firestoreMessages.length > 0) {
      return firestoreMessages;
    }
    return getMessages(chatRoomId);
  }, [firestoreMessages, getMessages, chatRoomId]);

  useEffect(() => {
    markAsRead(chatRoomId);
  }, [chatRoomId, markAsRead]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(chatRoomId, trimmed);
    setText('');
  }, [text, chatRoomId, sendMessage]);

  // contacts를 Map으로 변환하여 빠른 조회
  const contactsMap = useMemo(() => {
    const map = new Map<string, typeof partner>();
    contacts.forEach((contact) => map.set(contact.id, contact));
    // partner도 추가 (혹시 contacts에 없을 수 있음)
    map.set(partner.id, partner);
    // currentUser도 추가
    map.set(currentUser.id, currentUser);
    return map;
  }, [contacts, partner, currentUser]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser.id;
    const sender = contactsMap.get(item.senderId) || (isMe ? currentUser : partner);
    const senderName = sender?.name || '알 수 없음';
    const senderAvatar = sender?.avatar;
    const avatarColor = getAvatarColor(item.senderId);
    const initial = getInitial(senderName);

    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.partnerRow]}>
        {!isMe && (
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {senderAvatar ? (
                <Image source={{ uri: senderAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
          </View>
        )}
        <View style={styles.messageContent}>
          {!isMe && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.partnerBubble]}>
            <Text style={[styles.messageText, isMe ? styles.myText : styles.partnerText]}>{item.text}</Text>
            <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.partnerTimestamp]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
        {isMe && (
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {senderAvatar ? (
                <Image source={{ uri: senderAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }, [currentUser, contactsMap, partner]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleReportUser = useCallback(() => {
    const reportReasons: { label: string; value: ReportReason }[] = [
      { label: '스팸', value: 'spam' },
      { label: '부적절한 내용', value: 'inappropriate' },
      { label: '괴롭힘', value: 'harassment' },
      { label: '가짜 계정', value: 'fake' },
      { label: '기타', value: 'other' },
    ];

    Alert.alert(
      '사용자 신고',
      `${partner.name}님을 신고하시겠습니까?`,
      [
        ...reportReasons.map((reason) => ({
          text: reason.label,
          onPress: () => {
            reportUser(partner.id, reason.value);
            Alert.alert('신고 완료', '신고가 접수되었습니다.');
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [partner, reportUser]);

  const handleBlockUser = useCallback(() => {
    Alert.alert(
      '사용자 차단',
      `${partner.name}님을 차단하시겠습니까? 차단된 사용자의 메시지는 더 이상 표시되지 않으며, 채팅방에서 나가게 됩니다.`,
      [
        {
          text: '차단',
          style: 'destructive',
          onPress: () => {
            blockUser(partner.id);
            Alert.alert('차단 완료', '사용자가 차단되었습니다.', [
              {
                text: '확인',
                onPress: () => {
                  navigation.goBack();
                },
              },
            ]);
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  }, [partner, blockUser, navigation]);

  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      '채팅 삭제',
      '이 채팅방을 삭제하시겠습니까? 삭제된 채팅은 복구할 수 없습니다.',
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
              // 먼저 메시지 구독 해제 (권한 오류 방지)
              if (unsubscribeMessagesRef.current) {
                console.log('채팅방 삭제 전 메시지 구독 해제');
                unsubscribeMessagesRef.current();
                unsubscribeMessagesRef.current = null;
              }
              
              // Firestore에서 채팅방 삭제
              await firebaseFirestoreService.deleteChatRoom(chatRoomId);
              Alert.alert('삭제 완료', '채팅방이 삭제되었습니다.', [
                {
                  text: '확인',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error) {
              console.error('채팅방 삭제 실패:', error);
              Alert.alert('오류', '채팅방 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, [chatRoomId, navigation]);

  const handleMenuPress = useCallback(() => {
    const menuOptions = [
      { text: '신고하기', onPress: handleReportUser },
      { text: '차단하기', onPress: handleBlockUser, style: 'destructive' as const },
      { text: '채팅 삭제', onPress: handleDeleteChat, style: 'destructive' as const },
      { text: '취소', style: 'cancel' as const },
    ];

    Alert.alert(
      '메뉴',
      `${partner.name}님과의 채팅`,
      menuOptions,
      { cancelable: true }
    );
  }, [partner, handleReportUser, handleBlockUser, handleDeleteChat]);


  // 차단된 사용자인지 확인
  const isUserBlocked = useMemo(() => isBlocked(partner.id), [partner.id, isBlocked]);

  useEffect(() => {
    // 헤더에 메뉴 버튼 추가 - headerTitle은 기본 텍스트로 유지하고 headerRight에 배치
    navigation.setOptions({
      headerTitle: partner.name, // 기본 텍스트로 설정하여 중앙 정렬 유지
      headerTitleAlign: 'center' as const,
      headerRight: () => (
        <View style={{ backgroundColor: 'transparent' }}>
          <Pressable
            onPress={handleMenuPress}
            style={({ pressed }) => [
              {
                padding: 8,
                opacity: pressed ? 0.7 : 1,
              }
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ fontSize: 20, color: '#4C6EF5', fontWeight: '600' }}>⋯</Text>
          </Pressable>
        </View>
      ),
      headerRightContainerStyle: {
        backgroundColor: 'transparent',
        paddingRight: 0,
        marginRight: 0,
      },
    });
  }, [navigation, partner, handleMenuPress]);

  // 차단된 사용자면 채팅방에서 나가기
  useEffect(() => {
    if (isUserBlocked) {
      Alert.alert('차단된 사용자', '이 사용자는 차단되어 있습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    }
  }, [isUserBlocked, navigation]);

  const renderWarningHeader = useCallback(() => {
    return (
      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          성매매는 범죄입니다. 성매매를 하거나 알선, 권유, 유인, 강요하는 사람 또는 성매매 목적의 인신매매를 한 사람 또는 집단은 형사처벌을 받게 되며, 이를 신고하여 기소된 경우 포상금을 받을 수 있습니다.
        </Text>
      </View>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListHeaderComponent={renderWarningHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{partner.name}님과의 첫 대화를 시작해보세요!</Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="메시지 입력..."
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.disabledSendButton]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  partnerRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  messageContent: {
    maxWidth: '70%',
    flexDirection: 'column',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    maxWidth: '100%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: '#4C6EF5',
    borderBottomRightRadius: 6,
  },
  partnerBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 6,
  },
  myText: {
    color: '#fff',
  },
  partnerText: {
    color: '#222',
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  partnerTimestamp: {
    color: '#8892B0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9DCE3',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F4F6FB',
    borderRadius: 20,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#4C6EF5',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  disabledSendButton: {
    backgroundColor: '#A0A6B8',
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: '#667085',
  },
  warningContainer: {
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
});
