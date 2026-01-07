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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useChat } from '../context/ChatContext';
import { Message, ReportReason } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { firebaseStorageService } from '../services/FirebaseStorageService';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { formatTime } from '../utils/time';
import { getAvatarColor, getInitial } from '../utils/avatar';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const { params } = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const { chatRoomId, partner } = params;
  const { getMessages, sendMessage, markAsRead, currentUser, blockUser, reportUser, isBlocked, contacts, setCurrentChatRoomId } = useChat();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);
  const [firestoreMessages, setFirestoreMessages] = useState<Message[]>([]);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('ChatScreen');
      return () => {
        performanceMonitor.endScreenLoad('ChatScreen');
      };
    }, [])
  );

  // 현재 채팅방 ID 설정 (알림 방지용)
  useEffect(() => {
    setCurrentChatRoomId(chatRoomId);
    return () => {
      setCurrentChatRoomId(null);
    };
  }, [chatRoomId, setCurrentChatRoomId]);

  // Firestore에서 메시지 실시간 구독
  useEffect(() => {
    lastMessageIdRef.current = null;
    
    const unsubscribe = firebaseFirestoreService.subscribeToMessages(
      chatRoomId,
      (messages) => {
        setFirestoreMessages(messages);
      },
      100
    );

    unsubscribeMessagesRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeMessagesRef.current = null;
      lastMessageIdRef.current = null;
    };
  }, [chatRoomId]);

  // Firestore 메시지가 있으면 사용, 없으면 로컬 메시지 사용
  const messages = useMemo(() => {
    let msgs = firestoreMessages.length > 0 ? firestoreMessages : getMessages(chatRoomId);
    // 중복 제거: 같은 ID를 가진 메시지가 여러 개 있으면 첫 번째만 유지
    const uniqueMessages = msgs.filter((msg, index, self) =>
      index === self.findIndex((m) => m.id === msg.id)
    );
    return uniqueMessages;
  }, [firestoreMessages, getMessages, chatRoomId]);

  useEffect(() => {
    markAsRead(chatRoomId);
  }, [chatRoomId, markAsRead]);

  // 메시지가 업데이트될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id;
    
    // 새 메시지가 추가되었는지 확인
    if (lastMessageId && lastMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMessageId;
      
      // 약간의 지연 후 스크롤 (렌더링 완료 대기)
      const timeout = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      return () => clearTimeout(timeout);
    }
    
    // 첫 로드 시에도 스크롤
    if (!lastMessageIdRef.current && lastMessageId) {
      lastMessageIdRef.current = lastMessageId;
      // 첫 로드 시에는 여러 번 시도하여 확실히 스크롤
      const timeouts: NodeJS.Timeout[] = [];
      timeouts.push(setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100));
      timeouts.push(setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300));
      timeouts.push(setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 500));
      return () => timeouts.forEach(clearTimeout);
    }
  }, [messages]);

  // FlatList의 내용 크기가 변경될 때마다 맨 아래로 스크롤
  const handleContentSizeChange = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // FlatList가 레이아웃될 때 맨 아래로 스크롤
  const handleLayout = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    const hasImage = selectedImage !== null;
    
    if (!trimmed && !hasImage) return;
    
    setIsUploadingImage(true);
    
    try {
      let imageUrls: string[] = [];
      
      // 이미지가 있으면 업로드
      if (hasImage && selectedImage) {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const imageUrl = await firebaseStorageService.uploadMessageImage(
          chatRoomId,
          messageId,
          selectedImage,
          0
        );
        imageUrls = [imageUrl];
      }
      
      // 텍스트와 이미지를 함께 전송
      if (imageUrls.length > 0) {
        await sendMessageWithImage(chatRoomId, trimmed, imageUrls);
      } else {
        sendMessage(chatRoomId, trimmed);
      }
      
      // 상태 초기화
      setText('');
      setSelectedImage(null);
      
      // 메시지 전송 후 즉시 맨 아래로 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      Alert.alert('오류', '메시지 전송에 실패했습니다.');
    } finally {
      setIsUploadingImage(false);
    }
  }, [text, selectedImage, chatRoomId, sendMessage, sendMessageWithImage]);

  const sendMessageWithImage = useCallback(async (roomId: string, text: string, images: string[]) => {
    try {
      await firebaseFirestoreService.sendMessage({
        chatRoomId: roomId,
        senderId: currentUser.id,
        receiverId: partner.id,
        text: text || '',
        images: images.length > 0 ? images : undefined,
      });
    } catch (error: any) {
      console.error('메시지 전송 실패:', error);
      throw error;
    }
  }, [currentUser.id, partner.id]);

  const handlePickImage = useCallback(async () => {
    try {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 선택하려면 사진 라이브러리 접근 권한이 필요합니다.');
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      // 이미지를 state에 저장 (자동 전송하지 않음)
      setSelectedImage(imageUri);
    } catch (error: any) {
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  }, []);

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
    const senderGender = sender?.gender;
    const avatarColor = getAvatarColor(senderGender, !!senderAvatar);
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
            {item.images && item.images.length > 0 && (
              <View style={styles.messageImages}>
                {item.images.map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}
            {item.text && (
              <Text style={[styles.messageText, isMe ? styles.myText : styles.partnerText]}>{item.text}</Text>
            )}
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
            } catch (error: any) {
              // 권한 오류나 이미 삭제된 경우는 성공으로 처리
              if (error.code === 'permission-denied' || error.code === 'not-found') {
                Alert.alert('삭제 완료', '채팅방이 삭제되었습니다.', [
                  {
                    text: '확인',
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ]);
                return;
              }
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{partner.name}</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>
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
        extraData={messages.length}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        inverted={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} resizeMode="cover" />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={handlePickImage}
          disabled={isUploadingImage}
          activeOpacity={0.7}
        >
          <Image
            source={require('../assets/photoicon.png')}
            style={styles.imageButtonIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="메시지 입력..."
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() && !selectedImage && !isUploadingImage) && styles.disabledSendButton]}
          onPress={handleSend}
          disabled={(!text.trim() && !selectedImage) || isUploadingImage}
          activeOpacity={0.8}
        >
          {isUploadingImage ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>전송</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#111',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: '#1F2937',
    fontWeight: '600',
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
    backgroundColor: '#1F2937',
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
  messageImages: {
    marginBottom: 8,
    marginHorizontal: -16,
    marginTop: -10,
  },
  messageImage: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9DCE3',
  },
  imageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  imageButtonIcon: {
    width: 24,
    height: 24,
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
    backgroundColor: '#1F2937',
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
  imagePreviewContainer: {
    position: 'relative',
    marginHorizontal: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  warningContainer: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
});
