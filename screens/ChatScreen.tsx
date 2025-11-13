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

export default function ChatScreen() {
  const { params } = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const { chatRoomId, partner } = params;
  const { getMessages, sendMessage, markAsRead, currentUser, blockUser, reportUser, isBlocked } = useChat();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);

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

    return () => {
      console.log('메시지 구독 해제:', chatRoomId);
      unsubscribe();
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

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.partnerRow]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.partnerBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.partnerText]}>{item.text}</Text>
          <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.partnerTimestamp]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, [currentUser.id]);

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

  const handleMenuPress = useCallback(() => {
    const menuOptions = [
      { text: '신고하기', onPress: handleReportUser },
      { text: '차단하기', onPress: handleBlockUser, style: 'destructive' as const },
      { text: '취소', style: 'cancel' as const },
    ];

    Alert.alert(
      '메뉴',
      `${partner.name}님과의 채팅`,
      menuOptions,
      { cancelable: true }
    );
  }, [partner, handleReportUser, handleBlockUser]);

  // 차단된 사용자인지 확인
  const isUserBlocked = useMemo(() => isBlocked(partner.id), [partner.id, isBlocked]);

  useEffect(() => {
    // 헤더에 메뉴 버튼 추가
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMenuPress}
          style={{ marginRight: 12, padding: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18, color: '#4C6EF5' }}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleMenuPress]);

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
          placeholder="메시지를 입력하세요"
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
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  partnerRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
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
});
