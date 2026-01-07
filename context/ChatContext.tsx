import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { ChatRoom, Message, User, Post, Gender, Location, ReportReason, Report, BDSMPreference, Region, NotificationSettings } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { firebaseStorageService } from '../services/FirebaseStorageService';
import { firebaseAuthService } from '../services/FirebaseAuthService';
import { notificationService } from '../services/NotificationService';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getLocationFromRegion, REGION_COORDINATES } from '../utils/regions';
import { POINTS, TIME, USER, TEXT } from '../constants';

interface ChatContextType {
  currentUser: User;
  contacts: User[];
  chatRooms: ChatRoom[];
  messages: Record<string, Message[]>;
  points: number;
  posts: Post[];
  blockedUsers: Record<string, number>; // 차단된 사용자 목록 (userId -> blockedAt timestamp)
  reports: Report[]; // 신고 목록
  createOrOpenChat: (user: User) => Promise<string>;
  sendMessage: (chatRoomId: string, text: string) => void;
  getMessages: (chatRoomId: string) => Message[];
  getChatPartner: (chatRoomId: string) => User | undefined;
  markAsRead: (chatRoomId: string) => void;
  setCurrentChatRoomId: (chatRoomId: string | null) => void;
  createPost: (content: string, images?: string[]) => Promise<{ pointsRewarded: boolean }>;
  startChatFromPost: (postId: string) => Promise<string | null>;
  deductPoints: (amount: number) => Promise<boolean>;
  addPoints: (amount: number) => Promise<void>;
  updateProfile: (name: string, gender?: Gender, avatar?: string, age?: number, bdsmPreference?: BDSMPreference[], bio?: string, profileImages?: string[]) => void;
  updateRegion: (region: Region) => void;
  getDistance: (user1: User, user2: User) => number | null;
  formatDistance: (distance: number | null) => string;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isBlocked: (userId: string) => boolean;
  reportPost: (postId: string, reason: ReportReason, description?: string) => void;
  reportUser: (userId: string, reason: ReportReason, description?: string) => void;
  deletePost: (postId: string) => void; // 관리자용: 게시글 삭제
  deleteUser: (userId: string) => void; // 관리자용: 사용자 삭제
  updateReportStatus: (reportId: string, status: 'pending' | 'resolved' | 'rejected') => void; // 관리자용: 신고 상태 업데이트
  requestAccountDeletion: () => Promise<void>; // 회원탈퇴 요청
  cancelAccountDeletion: () => Promise<void>; // 회원탈퇴 취소
  checkAttendance: () => Promise<boolean>; // 출석체크
  canCheckAttendance: () => boolean; // 출석체크 가능 여부 확인
  likeUser: (userId: string) => Promise<void>; // 사용자 좋아요
  unlikeUser: (userId: string) => Promise<void>; // 사용자 좋아요 취소
  isLiked: (userId: string) => boolean; // 좋아요 상태 확인
  pinChatRoom: (roomId: string) => Promise<void>; // 채팅방 고정
  unpinChatRoom: (roomId: string) => Promise<void>; // 채팅방 고정 해제
  isPinned: (roomId: string) => boolean; // 채팅방 고정 상태 확인
  notificationSettings: NotificationSettings | null; // 알림 설정
  updateNotificationSettings: (settings: NotificationSettings) => void; // 알림 설정 업데이트
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// 기본 지역: 서울
const DEFAULT_REGION: Region = 'seoul';
const DEFAULT_LOCATION: Location = REGION_COORDINATES[DEFAULT_REGION];

// 기본 사용자 (로그아웃 상태일 때만 사용)
const DEFAULT_USER: User = {
  id: '',
  name: '',
  location: DEFAULT_LOCATION,
  region: DEFAULT_REGION,
  isAdmin: false,
};

const createInitialState = () => {
  // 초기에는 빈 메시지와 빈 채팅방으로 시작
  // 실제 대화를 시작할 때만 메시지와 채팅방이 생성됨
  const initialMessages: Record<string, Message[]> = {};
  const initialRooms: ChatRoom[] = [];

  return { initialRooms, initialMessages };
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [contacts, setContacts] = useState<User[]>([]); // Firestore에서 로드
  const [points, setPoints] = useState<number>(POINTS.INITIAL);
  const [blockedUsers, setBlockedUsers] = useState<Record<string, number>>({}); // 차단된 사용자 목록 (userId -> blockedAt timestamp)
  const [reports, setReports] = useState<Report[]>([]); // 신고 목록
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null); // 알림 설정

  const { initialRooms, initialMessages } = useMemo(() => createInitialState(), []);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(initialRooms);
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
  
  // 게시글은 Firestore에서 실시간으로 로드
  const [posts, setPosts] = useState<Post[]>([]);
  
  // 현재 열려있는 채팅방 ID 추적 (알림 표시 방지용)
  const currentChatRoomIdRef = useRef<string | null>(null);
  // 이전 메시지 타임스탬프 추적 (중복 알림 방지)
  const lastMessageTimestampsRef = useRef<Record<string, number>>({});
  // 메시지 구독 해제 함수들을 저장할 Map
  const messageUnsubscribesRef = useRef<Map<string, () => void>>(new Map());

  // 앱 시작 시 기본 지역(서울) 설정 및 알림 권한 요청
  useEffect(() => {
    // 기본 지역이 이미 설정되어 있으면 스킵
    if (currentUser.region) {
      return;
    }

    // 기본 지역(서울)로 설정
    setCurrentUser((prev) => ({
      ...prev,
      region: DEFAULT_REGION,
      location: DEFAULT_LOCATION,
    }));
    
    // 알림 권한 요청 및 푸시 토큰 등록
    (async () => {
      await notificationService.requestPermissions();
      // 로그인 상태일 때만 푸시 토큰 등록
      if (auth.currentUser) {
        await notificationService.registerForPushNotifications();
      }
    })();
  }, []); // 최초 한 번만 실행
  
  // 앱 상태 변경 감지 (포그라운드/백그라운드)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // 앱이 포그라운드로 돌아오면 배지 초기화
        notificationService.clearBadge();
        
        // 포그라운드로 돌아올 때 푸시 토큰 재등록 (토큰이 변경되었을 수 있음)
        if (auth.currentUser) {
          console.log('[앱 상태] 포그라운드로 돌아옴 - 푸시 토큰 재등록');
          notificationService.registerForPushNotifications().catch((error) => {
            console.error('[앱 상태] 푸시 토큰 재등록 실패:', error);
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Firebase에서 게시글 실시간 로드
  useEffect(() => {
    let unsubscribePosts: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // 기존 구독 해제
      if (unsubscribePosts) {
        unsubscribePosts();
        unsubscribePosts = null;
      }

      if (!firebaseUser) {
        setPosts([]);
        return;
      }

      // Firestore에서 게시글 실시간 구독
      unsubscribePosts = firebaseFirestoreService.subscribeToPosts((firestorePosts) => {
        setPosts(firestorePosts);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribePosts) {
        unsubscribePosts();
      }
    };
  }, []);

  // Firestore에서 모든 사용자(연락처) 실시간 로드
  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // 기존 구독 해제
      if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
      }

      if (!firebaseUser) {
        setContacts([]);
        return;
      }

      // 현재 사용자를 제외한 모든 사용자 실시간 구독
      console.log('=== 연락처 실시간 구독 시작 ===');
      console.log('현재 사용자 UID:', firebaseUser.uid);
      
      unsubscribeUsers = firebaseFirestoreService.subscribeToUsers(
        (users) => {
          console.log('연락처 실시간 업데이트:', users.length, '명');
          console.log('연락처 상세:', users.map(u => ({ 
            id: u.id, 
            name: u.name, 
            age: u.age, 
            gender: u.gender,
            location: u.location,
            region: u.region
          })));
          setContacts(users);
        },
        firebaseUser.uid
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUsers) {
        unsubscribeUsers();
      }
    };
  }, []);

  // 문의 상태 추적용 ref
  const previousInquiryStatusesRef = useRef<Record<string, 'pending' | 'answered'>>({});

  // 현재 사용자 정보를 Firestore에서 실시간으로 가져오기
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeChatRooms: (() => void) | null = null;
    let unsubscribeInquiries: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // 기존 구독 해제
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }
      if (unsubscribeChatRooms) {
        unsubscribeChatRooms();
        unsubscribeChatRooms = null;
      }
      if (unsubscribeInquiries) {
        unsubscribeInquiries();
        unsubscribeInquiries = null;
      }

      if (!firebaseUser) {
        // 로그아웃 상태면 기본 사용자로 설정하고 모든 상태 초기화
        console.log('로그아웃 감지 - 상태 초기화');
        setCurrentUser(DEFAULT_USER);
        setContacts([]);
        setPosts([]);
        setPoints(POINTS.INITIAL * 10); // 로그아웃 시 초기값의 10배로 설정
        setChatRooms([]);
        setMessages({});
        setBlockedUsers({});
        setReports([]);
        // 푸시 토큰 제거
        notificationService.unregisterPushToken().catch((error) => {
          console.error('푸시 토큰 제거 실패:', error);
        });
        // Error Reporting: 사용자 ID 제거
        import('../services/ErrorReportingService').then(({ errorReportingService }) => {
          errorReportingService.setUserId(null);
        }).catch((error) => {
          console.error('Error Reporting 사용자 ID 제거 실패:', error);
        });
        return;
      }

      // 로그인 시 푸시 토큰 등록 (약간의 지연 후 실행하여 네이티브 모듈이 준비될 시간 제공)
      setTimeout(() => {
        console.log('[로그인] 푸시 토큰 등록 시작');
        notificationService.registerForPushNotifications()
          .then((token) => {
            if (token) {
              console.log('[로그인] 푸시 토큰 등록 성공:', token.substring(0, 30) + '...');
            } else {
              console.warn('[로그인] 푸시 토큰 등록 실패 - 토큰 없음');
            }
          })
          .catch((error) => {
            console.error('[로그인] 푸시 토큰 등록 실패:', error);
          });
      }, 1000); // 1초 후 실행

      // Firestore에서 사용자 정보 실시간 구독
      console.log('=== 현재 사용자 실시간 구독 시작 ===');
      console.log('사용자 UID:', firebaseUser.uid);
      
      unsubscribeUser = firebaseFirestoreService.subscribeToUser(
        firebaseUser.uid,
        async (userData, userPoints, blockedUsersData) => {
            if (userData) {
            // Analytics: 로그인 및 사용자 설정
            const { analyticsService } = await import('../services/AnalyticsService');
            analyticsService.setUserId(firebaseUser.uid);
            analyticsService.setUserProperty('gender', userData.gender || null);
            analyticsService.setUserProperty('region', userData.region || null);
            if (userData.age) {
              const ageGroup = userData.age < 30 ? '20s' : userData.age < 40 ? '30s' : userData.age < 50 ? '40s' : '50s+';
              analyticsService.setUserProperty('age_group', ageGroup);
            }
            
            // Error Reporting: 사용자 ID 설정
            const { errorReportingService } = await import('../services/ErrorReportingService');
            errorReportingService.setUserId(firebaseUser.uid);
            
            // Firestore에서 가져온 사용자 정보로 업데이트
            console.log('사용자 정보 실시간 업데이트:', userData.name);
            console.log('사용자 위치 정보:', userData.location);
            console.log('사용자 지역 정보:', userData.region);
            console.log('사용자 포인트:', userPoints);
            console.log('차단된 사용자:', blockedUsersData ? Object.keys(blockedUsersData).length : 0, '명');
            
            // 차단된 사용자 목록 업데이트
            if (blockedUsersData) {
              setBlockedUsers(blockedUsersData);
            }

            // 알림 설정 불러오기
            (async () => {
              try {
                const settings = await firebaseFirestoreService.getNotificationSettings(firebaseUser.uid);
                if (settings) {
                  setNotificationSettings({
                    enabled: settings.enabled,
                    messages: settings.messages,
                    likes: settings.likes,
                    reports: settings.reports,
                    updatedAt: settings.updatedAt,
                  });
                }
              } catch (error) {
                console.error('알림 설정 불러오기 실패:', error);
              }
            })();
            
            // region이 없으면 기본값으로 설정하고 Firestore에 저장
            const finalRegion = userData.region || DEFAULT_REGION;
            const finalLocation = userData.location || DEFAULT_LOCATION;
            
            // region이 없으면 Firestore에 기본값 저장
            if (!userData.region) {
              (async () => {
                try {
                  const normalizedPhone = firebaseUser.phoneNumber?.replace(/[-\s]/g, '') || '';
                  await firebaseFirestoreService.createOrUpdateUser({
                    id: firebaseUser.uid,
                    phoneNumber: normalizedPhone,
                    name: userData.name,
                    avatar: userData.avatar,
                    gender: userData.gender,
                    age: userData.age,
                    latitude: finalLocation.latitude,
                    longitude: finalLocation.longitude,
                    region: finalRegion,
                    isAdmin: userData.isAdmin || false,
                    points: userPoints !== undefined ? userPoints : POINTS.DEFAULT,
                  });
                  console.log('기본 지역 정보 Firestore 저장 성공:', finalRegion);
                } catch (error) {
                  console.error('기본 지역 정보 Firestore 저장 실패:', error);
                }
              })();
            }
            
            // 운영자(고객센터) 사용자를 contacts에 추가
            (async () => {
              try {
                const adminUser = await firebaseFirestoreService.getUser('customer_service');
                if (adminUser) {
                  setContacts((prev) => {
                    // 이미 존재하는지 확인
                    if (prev.find(c => c.id === 'customer_service')) {
                      return prev;
                    }
                    return [...prev, adminUser];
                  });
                } else {
                  // 운영자 사용자가 없으면 기본 정보로 추가
                  const defaultAdminUser: User = {
                    id: 'customer_service',
                    name: '운영자',
                    phoneNumber: '',
                    location: DEFAULT_LOCATION,
                    region: DEFAULT_REGION,
                    isAdmin: true,
                  };
                  setContacts((prev) => {
                    if (prev.find(c => c.id === 'customer_service')) {
                      return prev;
                    }
                    return [...prev, defaultAdminUser];
                  });
                }
              } catch (error) {
                console.error('운영자 사용자 추가 실패:', error);
              }
            })();

            // 정지 상태 체크
            if (userData.suspendedUntil) {
              const now = Date.now();
              const suspendedUntil = userData.suspendedUntil;
              
              if (suspendedUntil > now) {
                // 아직 정지 기간이 남아있음
                const daysRemaining = Math.ceil((suspendedUntil - now) / (24 * 60 * 60 * 1000));
                const suspensionTypeName = userData.suspensionType === '1day' ? '1일' : 
                                          userData.suspensionType === '7days' ? '7일' : '영구';
                
                console.log('정지된 사용자:', suspensionTypeName, '정지, 남은 기간:', daysRemaining, '일');
                
                // 정지 메시지 표시
                if (userData.suspensionType === 'permanent') {
                  Alert.alert(
                    '계정 정지',
                    '귀하의 계정이 영구 정지되었습니다.\n서비스 이용이 제한됩니다.',
                    [
                      {
                        text: '확인',
                        onPress: () => {
                          firebaseAuthService.signOut();
                        },
                      },
                    ]
                  );
                  firebaseAuthService.signOut();
                  return;
                } else {
                  Alert.alert(
                    '계정 정지',
                    `귀하의 계정이 ${suspensionTypeName} 정지되었습니다.\n정지 해제까지 약 ${daysRemaining}일 남았습니다.\n\n서비스 이용이 제한됩니다.`,
                    [
                      {
                        text: '확인',
                        onPress: () => {
                          firebaseAuthService.signOut();
                        },
                      },
                    ]
                  );
                  firebaseAuthService.signOut();
                  return;
                }
              } else {
                // 정지 기간이 지났으면 정지 해제 (자동으로 필드가 null이 되도록)
                console.log('정지 기간이 지나서 정지 해제');
                // 정지 해제는 백엔드에서 처리하거나, 여기서 처리할 수 있음
              }
            }
            
            // 탈퇴 예정 사용자 체크
            if (userData.deletionRequestedAt) {
              const deletionScheduledAt = userData.deletionScheduledAt || userData.deletionRequestedAt + TIME.ACCOUNT_DELETION_GRACE_PERIOD_MS;
              const daysRemaining = Math.ceil((deletionScheduledAt - Date.now()) / (24 * 60 * 60 * 1000));
              
              if (daysRemaining <= 0) {
                // 탈퇴 예정일이 지났으면 자동 로그아웃
                console.log('탈퇴 예정일이 지나서 자동 로그아웃');
                firebaseAuthService.signOut();
                Alert.alert('알림', '회원탈퇴가 완료되었습니다.');
                return;
              } else {
                // 탈퇴 예정일이 지나지 않았으면 자동으로 탈퇴 취소 (재로그인 시)
                console.log('탈퇴 예정 사용자 재로그인 - 탈퇴 자동 취소');
                firebaseFirestoreService.cancelAccountDeletion(userData.id).catch((error) => {
                  console.error('탈퇴 취소 실패:', error);
                });
              }
            }
            
            // 사용자 정보 업데이트
            setCurrentUser({
              id: userData.id,
              name: userData.name,
              avatar: userData.avatar,
              gender: userData.gender,
              age: userData.age,
              location: finalLocation,
              region: finalRegion,
              isAdmin: userData.isAdmin || false,
              bdsmPreference: userData.bdsmPreference,
              bio: userData.bio,
              deletionRequestedAt: userData.deletionRequestedAt,
              deletionScheduledAt: userData.deletionScheduledAt,
              lastAttendanceDate: userData.lastAttendanceDate,
              lastPostRewardDate: userData.lastPostRewardDate,
              suspendedUntil: userData.suspendedUntil,
              suspensionType: userData.suspensionType,
              likeCount: userData.likeCount,
              likedBy: userData.likedBy,
            });
            
            // 포인트 정보도 Firestore에서 가져온 값으로 업데이트
            if (userPoints !== undefined) {
              setPoints(userPoints);
            }
          } else {
            // Firestore에 사용자 정보가 없으면 기본값 사용
            console.warn('Firestore에 사용자 정보가 없습니다. UID:', firebaseUser.uid);
          }
        }
      );

      // Firestore에서 채팅방 실시간 구독
      console.log('=== 채팅방 실시간 구독 시작 ===');
      unsubscribeChatRooms = firebaseFirestoreService.subscribeToChatRooms(
        firebaseUser.uid,
        (rooms) => {
          console.log('채팅방 실시간 업데이트:', rooms.length, '개');
          // 중복 제거: Set을 사용하여 O(n) 시간복잡도로 최적화
          const seen = new Set<string>();
          const uniqueRooms = rooms.filter((room) => {
            if (seen.has(room.id)) return false;
            seen.add(room.id);
            return true;
          });
          
          // 각 채팅방의 메시지 실시간 구독 설정
          const currentRoomIds = new Set(uniqueRooms.map(room => room.id));
          
          // 기존 구독 중 제거된 채팅방의 구독 해제
          messageUnsubscribesRef.current.forEach((unsubscribe, roomId) => {
            if (!currentRoomIds.has(roomId)) {
              unsubscribe();
              messageUnsubscribesRef.current.delete(roomId);
            }
          });
          
          // 새 채팅방의 메시지 구독 시작
          uniqueRooms.forEach((room) => {
            if (!messageUnsubscribesRef.current.has(room.id)) {
              // 각 채팅방의 메시지 실시간 구독 (최신 1개만)
              const unsubscribeMessages = firebaseFirestoreService.subscribeToMessages(
                room.id,
                (messages) => {
                  // 메시지가 업데이트되면 채팅방 목록도 업데이트
                  if (messages.length > 0) {
                    const lastMessage = messages[messages.length - 1];
                    console.log('[메시지 구독] 채팅방 업데이트:', {
                      roomId: room.id,
                      lastMessageText: lastMessage.text.substring(0, 30),
                      timestamp: lastMessage.timestamp,
                    });
                    
                    setChatRooms((prevRooms) => {
                      const updatedRooms = prevRooms.map((r) => {
                        if (r.id === room.id) {
                          // lastMessage가 변경되었는지 확인
                          const currentLastMessage = r.lastMessage;
                          const isNewMessage = !currentLastMessage || 
                            currentLastMessage.timestamp !== lastMessage.timestamp;
                          
                          if (isNewMessage) {
                            return {
                              ...r,
                              lastMessage: {
                                text: lastMessage.text,
                                senderId: lastMessage.senderId,
                                receiverId: lastMessage.receiverId,
                                timestamp: lastMessage.timestamp,
                              },
                              unreadCount: lastMessage.receiverId === auth.currentUser?.uid && 
                                          !lastMessage.read && 
                                          room.id !== currentChatRoomIdRef.current
                                ? (r.unreadCount || 0) + 1
                                : r.unreadCount || 0,
                            };
                          }
                        }
                        return r;
                      });
                      
                      // 변경사항이 있으면 정렬 (최신 메시지가 있는 방을 위로)
                      const hasChanges = updatedRooms.some((r, idx) => {
                        const originalRoom = prevRooms[idx];
                        return !originalRoom || r.lastMessage?.timestamp !== originalRoom.lastMessage?.timestamp;
                      });
                      
                      if (hasChanges) {
                        // 최신 메시지 시간 기준으로 정렬
                        return updatedRooms.sort((a, b) => {
                          const aTime = a.lastMessage?.timestamp || 0;
                          const bTime = b.lastMessage?.timestamp || 0;
                          return bTime - aTime;
                        });
                      }
                      
                      return updatedRooms;
                    });
                    
                    // 메시지 상태도 업데이트
                    setMessages((prev) => ({
                      ...prev,
                      [room.id]: messages,
                    }));
                  }
                },
                1 // 마지막 메시지 1개만 필요
              );
              messageUnsubscribesRef.current.set(room.id, unsubscribeMessages);
            }
          });
          
          // 새 메시지 알림 처리 (포그라운드일 때만 로컬 알림 표시)
          // 백그라운드/종료 상태에서는 sendMessage에서 보낸 푸시 알림만 사용
          uniqueRooms.forEach((room) => {
            if (room.lastMessage && room.lastMessage.receiverId === firebaseUser.uid) {
              const lastTimestamp = lastMessageTimestampsRef.current[room.id];
              const messageTimestamp = room.lastMessage.timestamp;
              
              // lastMessageTimestampsRef가 초기화되지 않았으면 (앱 재시작 시)
              // 현재 메시지 타임스탬프로 초기화하여 기존 메시지에 대한 알림 방지
              if (lastTimestamp === undefined) {
                lastMessageTimestampsRef.current[room.id] = messageTimestamp;
                console.log('[알림] 타임스탬프 초기화:', {
                  roomId: room.id,
                  timestamp: messageTimestamp,
                  messageText: room.lastMessage.text.substring(0, 30),
                });
                return; // 초기화만 하고 알림은 표시하지 않음
              }
              
              // 새 메시지이고, 읽지 않았고, 현재 열려있는 채팅방이 아닐 때만 알림 표시
              // 포그라운드일 때만 로컬 알림 표시 (백그라운드는 서버 푸시 사용)
              if (
                messageTimestamp > lastTimestamp &&
                !room.lastMessage.read && // 읽지 않은 메시지만
                room.id !== currentChatRoomIdRef.current &&
                AppState.currentState === 'active' // 포그라운드일 때만
              ) {
                // 발신자 정보 찾기
                const senderId = room.lastMessage.senderId;
                const sender = contacts.find((c) => c.id === senderId) || 
                              room.participantsInfo?.find((p) => p.id === senderId);
                
                if (sender && !isBlocked(senderId)) {
                  // 알림 설정 확인
                  const settings = notificationSettings || {
                    enabled: true,
                    messages: true,
                    likes: true,
                    reports: true,
                    updatedAt: Date.now(),
                  };

                  // 알림이 켜져있고 메시지 알림이 활성화되어 있을 때만 로컬 알림 표시
                  if (settings.enabled && settings.messages) {
                    console.log('[알림] 로컬 알림 표시:', {
                      roomId: room.id,
                      senderName: sender.name,
                      messageText: room.lastMessage.text.substring(0, 30),
                      timestamp: messageTimestamp,
                    });
                    notificationService.showMessageNotification(
                      sender.name,
                      room.lastMessage.text,
                      room.id
                    );
                  }
                }
              }
              
              // 타임스탬프 업데이트 (읽음 여부와 관계없이 항상 업데이트)
              lastMessageTimestampsRef.current[room.id] = messageTimestamp;
            }
          });
          
          setChatRooms(uniqueRooms);
          
          // iOS 홈 화면 아이콘 배지 업데이트
          const totalUnreadCount = uniqueRooms.reduce((total, room) => {
            return total + (room.unreadCount || 0);
          }, 0);
          notificationService.setBadgeCount(totalUnreadCount);
        }
      );

      // 문의 답변 실시간 감시
      unsubscribeInquiries = firebaseFirestoreService.subscribeToInquiries(
        firebaseUser.uid,
        (inquiries) => {
          // 각 문의의 상태를 확인하여 새로 답변된 문의가 있는지 체크
          inquiries.forEach((inquiry) => {
            const previousStatus = previousInquiryStatusesRef.current[inquiry.id];
            
            // 이전 상태가 'pending'이고 현재 상태가 'answered'이면 새로 답변된 것
            if (previousStatus === 'pending' && inquiry.status === 'answered' && inquiry.answer) {
              // 답변을 채팅방에 메시지로 추가
              (async () => {
                try {
                  await firebaseFirestoreService.addInquiryAnswerToChat(
                    inquiry.id,
                    firebaseUser.uid,
                    inquiry.answer
                  );
                  
                  // 알림 설정 확인
                  const settings = await firebaseFirestoreService.getNotificationSettings(firebaseUser.uid);
                  // 알림이 켜져있을 때만 알림 표시
                  if (!settings || settings.enabled) {
                    await notificationService.showInquiryAnswerNotification(inquiry.answer);
                  }
                } catch (error) {
                  console.error('문의 답변 처리 실패:', error);
                }
              })();
            }
            
            // 현재 상태 저장
            previousInquiryStatusesRef.current[inquiry.id] = inquiry.status;
          });
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      if (unsubscribeChatRooms) {
        unsubscribeChatRooms();
      }
      if (unsubscribeInquiries) {
        unsubscribeInquiries();
      }
      // 모든 메시지 구독 해제
      messageUnsubscribesRef.current.forEach((unsubscribe) => {
        unsubscribe();
      });
      messageUnsubscribesRef.current.clear();
    };
  }, []);

  // Set을 사용하여 O(1) 조회로 최적화
  const contactsSet = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);

  const ensureContact = useCallback((user: User) => {
    setContacts((prev) => {
      if (contactsSet.has(user.id)) return prev;
      return [...prev, user];
    });
  }, [contactsSet]);

  const createOrOpenChat = useCallback(async (user: User): Promise<string> => {
    ensureContact(user);

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      throw new Error('로그인이 필요합니다.');
    }

    // 운영자 계정과는 채팅할 수 없음 (단, 고객센터는 예외)
    if (user.isAdmin && user.id !== 'customer_service') {
      Alert.alert('알림', '운영자 계정과는 채팅할 수 없습니다.');
      throw new Error('운영자 계정과는 채팅할 수 없습니다.');
    }

    // 한 번의 순회로 기존 방 찾기 (O(n))
    const existingRoomIndex = chatRooms.findIndex((room) => {
      const [p1, p2] = room.participants;
      return (
        (p1 === currentUser.id && p2 === user.id) ||
        (p1 === user.id && p2 === currentUser.id)
      );
    });

    if (existingRoomIndex !== -1) {
      const existingRoom = chatRooms[existingRoomIndex];
      // 배열 재정렬 최적화: 해당 방만 맨 앞으로 이동
      setChatRooms((prev) => {
        if (existingRoomIndex === 0) return prev;
        const updated = [...prev];
        updated.splice(existingRoomIndex, 1);
        updated.unshift(existingRoom);
        return updated;
      });
      return existingRoom.id;
    }

    // 새 채팅방을 Firestore에 생성
    try {
      const roomId = await firebaseFirestoreService.getOrCreateChatRoom(
        firebaseUser.uid,
        user.id
      );

      const newRoom: ChatRoom = {
        id: roomId,
        participants: [currentUser.id, user.id],
        participantsInfo: [currentUser, user], // 사용자 정보 포함
        unreadCount: 0,
      };

      setChatRooms((prev) => [newRoom, ...prev]);
      setMessages((prev) => ({ ...prev, [newRoom.id]: [] }));

      // Analytics: 채팅 시작
      const { analyticsService } = await import('../services/AnalyticsService');
      analyticsService.logChatStarted(user.id);

      return roomId;
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      // Firestore 생성 실패 시에도 로컬 상태로 생성 (오프라인 지원)
      const fallbackRoomId = `room_${user.id}_${Date.now()}`;
      const newRoom: ChatRoom = {
        id: fallbackRoomId,
        participants: [currentUser.id, user.id],
        participantsInfo: [currentUser, user], // 사용자 정보 포함
        unreadCount: 0,
      };
      setChatRooms((prev) => [newRoom, ...prev]);
      setMessages((prev) => ({ ...prev, [newRoom.id]: [] }));
      return fallbackRoomId;
    }
  }, [chatRooms, currentUser, ensureContact]);

  const sendMessage = useCallback(async (chatRoomId: string, text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // 콘텐츠 필터링
    const { contentFilterService } = await import('../services/ContentFilterService');
    const filterResult = contentFilterService.filterMessage(trimmedText);
    
    if (!filterResult.passed) {
      Alert.alert('메시지 전송 불가', filterResult.reason || '부적절한 내용이 포함되어 있습니다.');
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    // 정지 상태 확인
    if (currentUser.suspendedUntil) {
      const now = Date.now();
      if (currentUser.suspendedUntil > now) {
        const daysRemaining = Math.ceil((currentUser.suspendedUntil - now) / (24 * 60 * 60 * 1000));
        const suspensionTypeName = currentUser.suspensionType === '1day' ? '1일' : 
                                  currentUser.suspensionType === '7days' ? '7일' : '영구';
        
        if (currentUser.suspensionType === 'permanent') {
          Alert.alert('계정 정지', '귀하의 계정이 영구 정지되었습니다.\n메시지 전송이 불가능합니다.');
        } else {
          Alert.alert('계정 정지', `귀하의 계정이 ${suspensionTypeName} 정지되었습니다.\n정지 해제까지 약 ${daysRemaining}일 남았습니다.\n\n메시지 전송이 불가능합니다.`);
        }
        return;
      }
    }

    const targetRoomIndex = chatRooms.findIndex((room) => room.id === chatRoomId);
    if (targetRoomIndex === -1) {
      console.error('채팅방을 찾을 수 없습니다:', chatRoomId);
      Alert.alert('오류', '채팅방을 찾을 수 없습니다.');
      return;
    }

    const targetRoom = chatRooms[targetRoomIndex];
    const partnerId = targetRoom.participants[0] === currentUser.id 
      ? targetRoom.participants[1] 
      : targetRoom.participants[0];
    if (!partnerId) {
      console.error('상대방 정보를 찾을 수 없습니다.');
      Alert.alert('오류', '상대방 정보를 찾을 수 없습니다.');
      return;
    }

    // 상대방이 운영자인지 확인 (단, 고객센터는 예외)
    try {
      const partner = await firebaseFirestoreService.getUser(partnerId);
      if (partner?.isAdmin && partnerId !== 'customer_service') {
        Alert.alert('알림', '운영자 계정에게는 메시지를 보낼 수 없습니다.');
        return;
      }
    } catch (error) {
      console.error('상대방 정보 조회 실패:', error);
      // 조회 실패 시에도 안전을 위해 차단하지 않음 (기존 로직 유지)
      const partner = targetRoom.participantsInfo?.find(p => p.id === partnerId) || 
                      contacts.find(c => c.id === partnerId);
      if (partner?.isAdmin && partnerId !== 'customer_service') {
        Alert.alert('알림', '운영자 계정에게는 메시지를 보낼 수 없습니다.');
        return;
      }
    }

    // 채팅방이 Firestore에 존재하는지 확인하고 없으면 생성
    // room_로 시작하는 ID는 로컬에서만 생성된 것일 수 있음
    if (chatRoomId.startsWith('room_')) {
      try {
        // Firestore에 채팅방이 없으면 생성
        const actualRoomId = await firebaseFirestoreService.getOrCreateChatRoom(
          firebaseUser.uid,
          partnerId
        );
        
        // 채팅방 ID가 다르면 업데이트
        if (actualRoomId !== chatRoomId) {
          console.log('채팅방 ID 업데이트:', chatRoomId, '->', actualRoomId);
          // 메시지는 실제 채팅방 ID로 저장
          chatRoomId = actualRoomId;
          
          // 로컬 상태도 업데이트
          setChatRooms((prev) => {
            const updated = [...prev];
            const roomIndex = updated.findIndex(r => r.id === targetRoom.id);
            if (roomIndex !== -1) {
              updated[roomIndex] = { ...updated[roomIndex], id: actualRoomId };
            }
            return updated;
          });
        }
      } catch (error: any) {
        console.error('채팅방 확인/생성 실패:', error);
        // 에러 리포팅
        const { errorReportingService } = await import('../services/ErrorReportingService');
        errorReportingService.logError(error, { 
          context: 'sendMessage - chatRoom creation',
          chatRoomId,
          userId: firebaseUser.uid,
        }, firebaseUser.uid);
        Alert.alert('오류', '채팅방을 생성할 수 없습니다. 다시 시도해주세요.');
        return;
      }
    } else {
      // Firestore 채팅방 ID인 경우에도 존재하는지 확인
      try {
        await firebaseFirestoreService.getOrCreateChatRoom(
          firebaseUser.uid,
          partnerId
        );
      } catch (error) {
        console.error('채팅방 확인 실패:', error);
        // 계속 진행 (이미 존재할 수 있음)
      }
    }

    try {
      // Firestore에 메시지 저장 (DB에 영구 저장)
      // Analytics: 메시지 전송
      const { analyticsService } = await import('../services/AnalyticsService');
      analyticsService.logMessageSent(chatRoomId);

      const messageId = await firebaseFirestoreService.sendMessage({
        chatRoomId,
        senderId: firebaseUser.uid,
        receiverId: partnerId,
        text: trimmedText,
      });

      console.log('메시지 DB 저장 완료:', {
        messageId,
        chatRoomId,
        text: trimmedText.substring(0, TEXT.PREVIEW_MAX_LENGTH) + (trimmedText.length > TEXT.PREVIEW_MAX_LENGTH ? '...' : ''),
      });

      // 로컬 상태도 업데이트 (즉시 UI 반영, 실시간 구독이 있지만 즉시 반영을 위해)
      // 실시간 구독이 있으므로 이 부분은 선택적이지만, 즉시 UI 업데이트를 위해 유지
      const now = Date.now();
      const newMessage: Message = {
        id: messageId, // Firestore에서 반환된 실제 메시지 ID 사용
        text: trimmedText,
        senderId: currentUser.id,
        receiverId: partnerId,
        timestamp: now,
        read: false,
      };

      setMessages((prev) => ({
        ...prev,
        [chatRoomId]: [...(prev[chatRoomId] || []), newMessage],
      }));

      // 정렬 최적화: 해당 방만 맨 앞으로 이동
      setChatRooms((prev) => {
        const updatedRoom = {
          ...targetRoom,
          lastMessage: newMessage,
          unreadCount: 0,
        };
        // 맨 앞이 아니면 맨 앞으로 이동
        if (targetRoomIndex === 0) {
          const updated = [...prev];
          updated[0] = updatedRoom;
          return updated;
        }
        const updated = [...prev];
        updated.splice(targetRoomIndex, 1);
        updated.unshift(updatedRoom);
        return updated;
      });
    } catch (error: any) {
      console.error('메시지 전송 실패:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        chatRoomId: chatRoomId,
      });
      
      // 에러 리포팅
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const { errorReportingService } = await import('../services/ErrorReportingService');
        errorReportingService.logError(error, { 
          context: 'sendMessage - final catch',
          chatRoomId,
          userId: firebaseUser.uid,
        }, firebaseUser.uid);
      }
      
      // 사용자에게 에러 알림
      Alert.alert(
        '메시지 전송 실패',
        `메시지를 전송할 수 없습니다: ${error.message || '알 수 없는 오류'}\n\n네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.`
      );
    }
  }, [chatRooms, currentUser.id]);

  const getMessages = useCallback((chatRoomId: string) => messages[chatRoomId] || [], [messages]);

  // contacts를 Map으로 변환하여 O(1) 조회 최적화
  const contactsMap = useMemo(() => {
    const map = new Map<string, User>();
    contacts.forEach((contact) => map.set(contact.id, contact));
    return map;
  }, [contacts]);

  const getChatPartner = useCallback((chatRoomId: string) => {
    const room = chatRooms.find((chatRoom) => chatRoom.id === chatRoomId);
    if (!room) return undefined;

    // participantsInfo가 있으면 우선 사용
    if (room.participantsInfo) {
      const [user1, user2] = room.participantsInfo;
      // 현재 사용자가 아닌 상대방 반환
      return user1.id === currentUser.id ? user2 : user1;
    }

    // participantsInfo가 없으면 기존 방식 사용 (하위 호환성)
    const partnerId = room.participants[0] === currentUser.id 
      ? room.participants[1] 
      : room.participants[0];
    if (!partnerId) return undefined;

    return contactsMap.get(partnerId);
  }, [chatRooms, currentUser.id, contactsMap]);

  const markAsRead = useCallback(async (chatRoomId: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    // Firestore에 읽음 상태 저장 (비동기, 실패해도 로컬 상태는 업데이트)
    firebaseFirestoreService.markMessagesAsRead(chatRoomId, firebaseUser.uid).catch((error) => {
      console.error('메시지 읽음 상태 저장 실패:', error);
    });

    setChatRooms((prev) => {
      const updatedRooms = prev.map((room) =>
        room.id === chatRoomId && room.unreadCount > 0
          ? {
              ...room,
              unreadCount: 0,
              lastMessage: room.lastMessage ? { ...room.lastMessage, read: true } : room.lastMessage,
            }
          : room
      );
      
      // iOS 홈 화면 아이콘 배지 업데이트
      const totalUnreadCount = updatedRooms.reduce((total, room) => {
        return total + (room.unreadCount || 0);
      }, 0);
      notificationService.setBadgeCount(totalUnreadCount);
      
      return updatedRooms;
    });

    // 읽지 않은 메시지만 업데이트하여 최적화
    setMessages((prev) => {
      const roomMessages = prev[chatRoomId];
      if (!roomMessages) return prev;
      
      const hasUnread = roomMessages.some(
        (msg) => msg.receiverId === currentUser.id && !msg.read
      );
      if (!hasUnread) return prev;

      return {
        ...prev,
        [chatRoomId]: roomMessages.map((message) =>
          message.receiverId === currentUser.id && !message.read
            ? { ...message, read: true }
            : message
        ),
      };
    });
  }, [currentUser.id]);

  const deductPoints = useCallback(async (amount: number): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return false;

    const currentPoints = points;
    if (currentPoints < amount) {
      return false;
    }

    const newPoints = currentPoints - amount;
    setPoints(newPoints);

    // Firestore에도 포인트 업데이트
    try {
      await firebaseFirestoreService.createOrUpdateUser({
        id: firebaseUser.uid,
        phoneNumber: '', // 업데이트만 하므로 불필요
        name: currentUser.name,
        points: newPoints,
      });
      return true;
    } catch (error) {
      console.error('포인트 차감 실패:', error);
      // 롤백
      setPoints(currentPoints);
      return false;
    }
  }, [points, currentUser.name]);

  const addPoints = useCallback(async (amount: number): Promise<void> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    const newPoints = points + amount;
    setPoints(newPoints);

    // Firestore에도 포인트 업데이트
    try {
      await firebaseFirestoreService.createOrUpdateUser({
        id: firebaseUser.uid,
        phoneNumber: '', // 업데이트만 하므로 불필요
        name: currentUser.name,
        points: newPoints,
      });
    } catch (error) {
      console.error('포인트 추가 실패:', error);
      // 롤백
      setPoints(points);
    }
  }, [points, currentUser.name]);

  const createPost = useCallback(async (content: string, images?: string[]): Promise<{ pointsRewarded: boolean }> => {
    // 콘텐츠 필터링
    const { contentFilterService } = await import('../services/ContentFilterService');
    const filterResult = contentFilterService.filterPost(content.trim());
    
    if (!filterResult.passed) {
      throw new Error(filterResult.reason || '부적절한 내용이 포함되어 있습니다.');
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      throw new Error('로그인이 필요합니다.');
    }

    if (!currentUser.name || currentUser.name.trim().length === 0) {
      console.error('사용자 이름이 없습니다.');
      throw new Error('사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }

    // 정지 상태 확인
    if (currentUser.suspendedUntil) {
      const now = Date.now();
      if (currentUser.suspendedUntil > now) {
        const daysRemaining = Math.ceil((currentUser.suspendedUntil - now) / (24 * 60 * 60 * 1000));
        const suspensionTypeName = currentUser.suspensionType === '1day' ? '1일' : 
                                  currentUser.suspensionType === '7days' ? '7일' : '영구';
        
        if (currentUser.suspensionType === 'permanent') {
          Alert.alert('계정 정지', '귀하의 계정이 영구 정지되었습니다.\n게시글 작성이 불가능합니다.');
        } else {
          Alert.alert('계정 정지', `귀하의 계정이 ${suspensionTypeName} 정지되었습니다.\n정지 해제까지 약 ${daysRemaining}일 남았습니다.\n\n게시글 작성이 불가능합니다.`);
        }
        throw new Error('정지된 계정은 게시글을 작성할 수 없습니다.');
      }
    }

    try {
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let imageUrls: string[] = [];

      // 이미지가 있으면 Firebase Storage에 업로드
      if (images && images.length > 0) {
        console.log('이미지 업로드 시작:', images.length, '개');
        try {
          imageUrls = await firebaseStorageService.uploadMultipleImages(postId, images);
          console.log('이미지 업로드 완료:', imageUrls);
        } catch (imageError) {
          console.error('이미지 업로드 실패:', imageError);
          throw new Error('이미지 업로드에 실패했습니다.');
        }
      }

      // Firestore에 게시글 저장
      console.log('게시글 저장 시작:', {
        id: postId,
        authorId: firebaseUser.uid,
        authorName: currentUser.name,
        contentLength: content.length,
        imageCount: imageUrls.length,
      });

      await firebaseFirestoreService.createPost({
        id: postId,
        authorId: firebaseUser.uid,
        authorName: currentUser.name,
        content,
        images: imageUrls.length > 0 ? imageUrls : [], // undefined 대신 빈 배열 사용
      });

      console.log('게시글 생성 완료:', postId);
      
      // 게시글 작성 시 포인트 지급 (50포인트) - 하루에 한 번만
      // 한국 시간대(KST, UTC+9) 기준으로 오늘 날짜 계산 (자정 00:00 이후 새 날짜)
      const now = new Date();
      const kstOffset = 9 * 60; // UTC+9 (분 단위)
      const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
      const today = kstTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const lastPostRewardDate = currentUser.lastPostRewardDate;
      let pointsRewarded = false;
      
      console.log('📅 포인트 지급 확인:', {
        today,
        lastPostRewardDate,
        willReward: lastPostRewardDate !== today,
        currentUserLastPostRewardDate: currentUser.lastPostRewardDate,
        kstHour: kstTime.getHours(),
        kstMinute: kstTime.getMinutes(),
      });
      
      // 자정(00:00) 이후 날짜가 바뀌면 포인트 지급 가능
      if (lastPostRewardDate !== today) {
        // 오늘 첫 게시글이면 포인트 지급
        console.log('✅ 포인트 지급: 오늘 첫 게시글 (자정 이후)');
        await addPoints(POINTS.ATTENDANCE_REWARD);
        pointsRewarded = true;
        
        // 마지막 포인트 지급 날짜 업데이트
        try {
          await firebaseFirestoreService.updateUserField(
            firebaseUser.uid,
            'lastPostRewardDate',
            today
          );
          
          // 로컬 상태도 업데이트
          setCurrentUser((prev) => ({
            ...prev,
            lastPostRewardDate: today,
          }));
          console.log('✅ 마지막 포인트 지급 날짜 업데이트 완료:', today);
        } catch (error) {
          console.error('❌ 마지막 포인트 지급 날짜 업데이트 실패:', error);
        }
      } else {
        console.log('⏭️ 포인트 지급 스킵: 오늘 이미 게시글 포인트를 받았습니다.');
      }
      
      // Analytics: 게시글 작성
      const { analyticsService } = await import('../services/AnalyticsService');
      analyticsService.logPostCreated(imageUrls.length > 0);
      
      // 게시글 작성 시 작성자를 연락처에 추가 (위치 정보 포함)
      if (currentUser.location) {
        ensureContact({
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          gender: currentUser.gender,
          location: currentUser.location,
        });
      }
      
      // 포인트 지급 여부 반환
      return { pointsRewarded };
    } catch (error: any) {
      console.error('게시글 생성 실패:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      
      // 에러 리포팅
      const { errorReportingService } = await import('../services/ErrorReportingService');
      errorReportingService.logError(error, { 
        context: 'createPost',
        userId: firebaseUser.uid,
        hasImages: images && images.length > 0,
      }, firebaseUser.uid);
      
      // 에러 메시지 개선
      let errorMessage = '게시글 등록에 실패했습니다.';
      if (error.code === 'permission-denied') {
        errorMessage = '게시글 작성 권한이 없습니다. Firebase 보안 규칙을 확인해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }, [currentUser, ensureContact, addPoints]);

  const startChatFromPost = useCallback(async (postId: string): Promise<string | null> => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return null;

    // 본인 게시글은 채팅 불가
    if (post.authorId === currentUser.id) return null;

    // 포인트 차감 (70포인트)
    if (points < 70) return null;
    
    const success = await deductPoints(70);
    if (!success) return null;

    // 작성자와 채팅 시작 (연락처에서 찾거나 새로 생성)
    let author = contacts.find((c) => c.id === post.authorId);
    if (!author) {
      author = {
        id: post.authorId,
        name: post.authorName,
      };
    }

    // 운영자 계정과는 채팅할 수 없음 (단, 고객센터는 예외)
    if (author.isAdmin && author.id !== 'customer_service') {
      Alert.alert('알림', '운영자 계정과는 채팅할 수 없습니다.');
      return null;
    }

    try {
      return await createOrOpenChat(author);
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      return null;
    }
  }, [posts, points, currentUser.id, contacts, createOrOpenChat, deductPoints]);

  const updateProfile = useCallback(async (name: string, gender?: Gender, avatar?: string, age?: number, bdsmPreference?: BDSMPreference[], bio?: string, profileImages?: string[]) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      throw new Error('로그인이 필요합니다.');
    }

    let avatarUrl = avatar;
    let profileImagesUrls: string[] | undefined = undefined;
    
    // 아바타 이미지가 새로 업로드된 경우 Firebase Storage에 업로드
    if (avatar && !avatar.startsWith('http')) {
      try {
        avatarUrl = await firebaseStorageService.uploadAvatar(firebaseUser.uid, avatar);
      } catch (error) {
        console.error('아바타 업로드 실패:', error);
        // 아바타 업로드 실패해도 프로필 업데이트는 계속 진행
      }
    }

    // profileImages가 전달된 경우 업로드
    if (profileImages && profileImages.length > 0) {
      try {
        // 새로 업로드할 이미지들만 필터링 (이미 URL인 것은 제외)
        const newImages = profileImages.filter(uri => !uri.startsWith('http'));
        const existingUrls = profileImages.filter(uri => uri.startsWith('http'));
        
        if (newImages.length > 0) {
          const uploadedUrls = await firebaseStorageService.uploadMultipleProfileImages(firebaseUser.uid, newImages);
          profileImagesUrls = [...existingUrls, ...uploadedUrls];
        } else {
          profileImagesUrls = existingUrls;
        }
        
        // 첫 번째 이미지를 avatar로도 설정 (호환성 유지)
        if (profileImagesUrls.length > 0 && !avatarUrl) {
          avatarUrl = profileImagesUrls[0];
        }
      } catch (error) {
        console.error('프로필 이미지 업로드 실패:', error);
        throw error;
      }
    }

    // 먼저 Firestore에 저장
    try {
      const normalizedPhone = firebaseUser.phoneNumber?.replace(/[-\s]/g, '') || '';
      const userData: {
        id: string;
        phoneNumber: string;
        name: string;
        avatar?: string;
        profileImages?: string[];
        gender?: Gender;
        age?: number;
        latitude?: number;
        longitude?: number;
        isAdmin?: boolean;
        points?: number;
        bdsmPreference?: BDSMPreference[];
        bio?: string;
      } = {
        id: firebaseUser.uid,
        phoneNumber: normalizedPhone,
        name: name.trim(),
        avatar: avatarUrl,
        gender,
        latitude: currentUser.location?.latitude,
        longitude: currentUser.location?.longitude,
        isAdmin: currentUser.isAdmin,
        points: points,
      };
      
      // age가 전달되었거나 기존에 age가 있으면 포함
      const finalAge = age !== undefined ? age : currentUser.age;
      if (finalAge !== undefined) {
        userData.age = finalAge;
      }
      
      // bdsmPreference가 전달되었거나 기존에 bdsmPreference가 있으면 포함
      const finalBdsmPreference = bdsmPreference !== undefined ? bdsmPreference : currentUser.bdsmPreference;
      if (finalBdsmPreference !== undefined) {
        userData.bdsmPreference = finalBdsmPreference;
      }
      
      // bio가 전달되었거나 기존에 bio가 있으면 포함
      const finalBio = bio !== undefined ? bio : currentUser.bio;
      if (finalBio !== undefined) {
        userData.bio = finalBio;
      }

      // profileImages가 전달된 경우 포함
      if (profileImagesUrls !== undefined) {
        userData.profileImages = profileImagesUrls;
        // profileImages가 있으면 첫 번째를 avatar로도 설정
        if (profileImagesUrls.length > 0) {
          userData.avatar = profileImagesUrls[0];
        }
      } else if (profileImages === undefined && currentUser.profileImages) {
        // profileImages가 전달되지 않았지만 기존에 있으면 유지
        userData.profileImages = currentUser.profileImages;
      }
      
      await firebaseFirestoreService.createOrUpdateUser(userData);
      console.log('사용자 정보 동기화 성공');
    } catch (error: any) {
      console.error('사용자 정보 동기화 실패:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        age: age,
        currentUserAge: currentUser.age,
        bdsmPreference: bdsmPreference,
        currentUserBdsmPreference: currentUser.bdsmPreference,
      });
      throw error; // 에러를 다시 throw하여 호출한 곳에서 처리할 수 있도록
    }

    // Firestore 저장 성공 후 로컬 상태 업데이트
    setCurrentUser((prev) => ({
      ...prev,
      name: name.trim(),
      gender,
      avatar: avatarUrl || (profileImagesUrls && profileImagesUrls.length > 0 ? profileImagesUrls[0] : prev.avatar),
      profileImages: profileImagesUrls !== undefined ? profileImagesUrls : prev.profileImages,
      age: age !== undefined ? age : prev.age,
      bdsmPreference: bdsmPreference !== undefined ? bdsmPreference : prev.bdsmPreference,
      bio: bio !== undefined ? bio : prev.bio,
    }));
  }, [points, currentUser]);

  const updateRegion = useCallback(async (region: Region) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      throw new Error('로그인이 필요합니다.');
    }

    console.log('updateRegion 호출:', region);

    // 지역에 해당하는 좌표 가져오기
    const location = getLocationFromRegion(region);

    try {
      // Firestore에 지역 정보 저장
      const normalizedPhone = firebaseUser.phoneNumber?.replace(/[-\s]/g, '') || '';
      await firebaseFirestoreService.createOrUpdateUser({
        id: firebaseUser.uid,
        phoneNumber: normalizedPhone,
        name: currentUser.name,
        avatar: currentUser.avatar,
        gender: currentUser.gender,
        age: currentUser.age,
        latitude: location.latitude,
        longitude: location.longitude,
        region: region,
        isAdmin: currentUser.isAdmin,
        points: points,
      });
      console.log('지역 정보 Firestore 저장 성공:', region);

      // Firestore 저장 성공 후 로컬 상태 업데이트
      setCurrentUser((prev) => ({
        ...prev,
        region,
        location,
      }));
    } catch (error) {
      console.error('지역 정보 Firestore 저장 실패:', error);
      throw error;
    }
  }, [points, currentUser]);

  // 두 사용자 간의 거리 계산 (Haversine formula)
  const getDistance = useCallback((user1: User, user2: User): number | null => {
    if (!user1.location || !user2.location) {
      console.log('거리 계산 불가 - 위치 정보 없음:', {
        user1: user1.name,
        user1Location: user1.location,
        user2: user2.name,
        user2Location: user2.location,
      });
      return null;
    }

    const R = 6371; // 지구 반지름 (km)
    const dLat = ((user2.location.latitude - user1.location.latitude) * Math.PI) / 180;
    const dLon = ((user2.location.longitude - user1.location.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((user1.location.latitude * Math.PI) / 180) *
        Math.cos((user2.location.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const rounded = Math.round(distance * 10) / 10; // 소수점 첫째자리까지
    console.log('거리 계산:', {
      user1: user1.name,
      user2: user2.name,
      distance: rounded,
      km: rounded >= 1 ? `${rounded}km` : `${Math.round(rounded * 1000)}m`,
    });
    return rounded;
  }, []);

  // 거리 포맷팅
  const formatDistance = useCallback((distance: number | null): string => {
    if (distance === null) return '위치 정보 없음';
    if (distance === 0) return '0m';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    // 소수점 첫째자리까지 표시 (0.1km 이상인 경우)
    const rounded = Math.round(distance * 10) / 10;
    return `${rounded}km`;
  }, []);

  // 사용자 차단
  const blockUser = useCallback(async (userId: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      return;
    }

    // 이미 차단된 사용자면 그대로 반환
    if (blockedUsers[userId]) {
      return;
    }

    const newBlockedUsers = { ...blockedUsers, [userId]: Date.now() };
    
    // 로컬 상태 업데이트
    setBlockedUsers(newBlockedUsers);
    
    // Firestore에 저장
    try {
      await firebaseFirestoreService.updateBlockedUsers(firebaseUser.uid, newBlockedUsers);
    } catch (error) {
      console.error('차단 정보 저장 실패:', error);
      // 실패해도 로컬 상태는 유지
    }
    
    // 차단된 사용자와의 채팅방 제거
    setChatRooms((prev) => 
      prev.filter((room) => {
        const [p1, p2] = room.participants;
        return !(p1 === userId || p2 === userId);
      })
    );
    
    // 차단된 사용자의 메시지 제거
    setMessages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((roomId) => {
        const room = chatRooms.find((r) => r.id === roomId);
        if (room) {
          const [p1, p2] = room.participants;
          if (p1 === userId || p2 === userId) {
            delete updated[roomId];
          }
        }
      });
      return updated;
    });
  }, [chatRooms, blockedUsers]);

  // 사용자 차단 해제
  const unblockUser = useCallback(async (userId: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      return;
    }

    // 이미 차단되지 않은 사용자면 그대로 반환
    if (!blockedUsers[userId]) {
      return;
    }

    const updatedBlockedUsers = { ...blockedUsers };
    delete updatedBlockedUsers[userId];
    
    // 로컬 상태 업데이트
    setBlockedUsers(updatedBlockedUsers);
    
    // Firestore에 저장
    try {
      await firebaseFirestoreService.updateBlockedUsers(firebaseUser.uid, updatedBlockedUsers);
    } catch (error) {
      console.error('차단 해제 정보 저장 실패:', error);
      // 실패해도 로컬 상태는 유지
    }
  }, [blockedUsers]);

  // 사용자 차단 여부 확인
  const isBlocked = useCallback((userId: string): boolean => {
    return !!blockedUsers[userId];
  }, [blockedUsers]);

  // 게시글 신고
  const reportPost = useCallback(async (postId: string, reason: ReportReason, description?: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      return;
    }

    try {
      // Firestore에 신고 저장
      const reportId = await firebaseFirestoreService.createReport({
        postId,
        reportedBy: firebaseUser.uid,
        reason: reason,
        description,
      });

      // 로컬 상태 업데이트
      const newReport: Report = {
        id: reportId,
        postId,
        reportedBy: currentUser.id,
        reason,
        description,
        timestamp: Date.now(),
        status: 'pending',
      };
      setReports((prev) => [...prev, newReport]);
      
      console.log('게시글 신고 완료:', reportId);
      
      // Analytics: 게시글 신고
      const { analyticsService } = await import('../services/AnalyticsService');
      analyticsService.logPostReported(postId, reason);
    } catch (error) {
      console.error('신고 전송 실패:', error);
    }
  }, [currentUser.id]);

  // 사용자 신고
  const reportUser = useCallback(async (userId: string, reason: ReportReason, description?: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      console.error('로그인이 필요합니다.');
      return;
    }

    try {
      // Firestore에 신고 저장
      const reportId = await firebaseFirestoreService.createReport({
        userId,
        reportedBy: firebaseUser.uid,
        reason: reason,
        description,
      });

      // 로컬 상태 업데이트
      const newReport: Report = {
        id: reportId,
        userId,
        reportedBy: currentUser.id,
        reason,
        description,
        timestamp: Date.now(),
        status: 'pending',
      };
      setReports((prev) => [...prev, newReport]);
      
      console.log('사용자 신고 완료:', reportId);
    } catch (error) {
      console.error('신고 전송 실패:', error);
    }
  }, [currentUser.id]);

  // 관리자용: 게시글 삭제
  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    // 해당 게시글 관련 신고도 처리됨으로 표시
    setReports((prev) =>
      prev.map((report) =>
        report.postId === postId && report.status === 'pending'
          ? { ...report, status: 'resolved' as const }
          : report
      )
    );
  }, []);

  // 관리자용: 사용자 삭제 (차단)
  const deleteUser = useCallback((userId: string) => {
    blockUser(userId);
    // 해당 사용자 관련 신고도 처리됨으로 표시
    setReports((prev) =>
      prev.map((report) =>
        report.userId === userId && report.status === 'pending'
          ? { ...report, status: 'resolved' as const }
          : report
      )
    );
  }, [blockUser]);

  // 관리자용: 신고 상태 업데이트
  const updateReportStatus = useCallback((reportId: string, status: 'pending' | 'resolved' | 'rejected') => {
    setReports((prev) =>
      prev.map((report) => (report.id === reportId ? { ...report, status } : report))
    );
  }, []);

  // 회원탈퇴 요청 (30일 후 삭제 예정)
  const requestAccountDeletion = useCallback(async () => {
    try {
      await firebaseFirestoreService.requestAccountDeletion(currentUser.id);
      Alert.alert(
        '회원탈퇴 요청 완료',
        '회원탈퇴가 요청되었습니다. 30일 후 계정이 완전히 삭제됩니다.\n\n탈퇴를 취소하려면 30일 이내에 앱에 다시 로그인하시면 됩니다.',
        [
          {
            text: '확인',
            onPress: async () => {
              // 탈퇴 요청 후 로그아웃
              await firebaseAuthService.signOut();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('회원탈퇴 요청 실패:', error);
      Alert.alert('오류', error.message || '회원탈퇴 요청에 실패했습니다.');
    }
  }, [currentUser.id]);

  // 회원탈퇴 취소
  const cancelAccountDeletion = useCallback(async () => {
    try {
      await firebaseFirestoreService.cancelAccountDeletion(currentUser.id);
      Alert.alert('회원탈퇴 취소', '회원탈퇴가 취소되었습니다.');
    } catch (error: any) {
      console.error('회원탈퇴 취소 실패:', error);
      Alert.alert('오류', error.message || '회원탈퇴 취소에 실패했습니다.');
    }
  }, [currentUser.id]);

  // 한국 시간 기준 오늘 날짜 가져오기 (안전한 방법)
  const getKoreaDateString = useCallback((): string => {
    try {
      const now = new Date();
      // UTC 시간에 9시간(한국 시간대)을 더하기
      const koreaTimeMs = now.getTime() + (9 * 60 * 60 * 1000);
      const koreaTime = new Date(koreaTimeMs);
      
      // UTC 메서드를 사용하여 날짜 추출 (UTC+9 시간대의 날짜)
      const year = koreaTime.getUTCFullYear();
      const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(koreaTime.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('날짜 가져오기 오류:', error);
      // 폴백: 로컬 시간 사용
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }, []);

  // 출석체크 가능 여부 확인 (매일 오전 00시 기준)
  const canCheckAttendance = useCallback((): boolean => {
    try {
      const today = getKoreaDateString();
      const lastAttendanceDate = currentUser.lastAttendanceDate;
      
      // 마지막 출석체크 날짜가 없거나 오늘과 다르면 출석체크 가능
      return !lastAttendanceDate || lastAttendanceDate !== today;
    } catch (error) {
      console.error('출석체크 가능 여부 확인 오류:', error);
      return false;
    }
  }, [currentUser.lastAttendanceDate, getKoreaDateString]);

  // 출석체크 실행
  const checkAttendance = useCallback(async (): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return false;
    }

    // 출석체크 가능 여부 확인
    if (!canCheckAttendance()) {
      Alert.alert('알림', '오늘은 이미 출석체크를 완료했습니다.\n내일 다시 시도해주세요.');
      return false;
    }

    try {
      // 한국 시간 기준으로 오늘 날짜 가져오기
      const today = getKoreaDateString();

      // 포인트 추가 (50포인트)
      await addPoints(50);

      // 마지막 출석체크 날짜 업데이트
      await firebaseFirestoreService.createOrUpdateUser({
        id: firebaseUser.uid,
        phoneNumber: '', // 업데이트만 하므로 불필요
        name: currentUser.name,
        lastAttendanceDate: today,
      });

      // 로컬 상태 업데이트
      setCurrentUser((prev) => ({
        ...prev,
        lastAttendanceDate: today,
      }));

      Alert.alert('출석체크 완료', '50포인트가 지급되었습니다!');
      return true;
    } catch (error: any) {
      console.error('출석체크 실패:', error);
      Alert.alert('오류', error.message || '출석체크에 실패했습니다.');
      return false;
    }
  }, [currentUser.name, addPoints, canCheckAttendance, getKoreaDateString]);

  // 현재 채팅방 ID 설정 함수
  const setCurrentChatRoomId = useCallback((chatRoomId: string | null) => {
    currentChatRoomIdRef.current = chatRoomId;
  }, []);

  // 좋아요 추가
  const likeUser = useCallback(async (userId: string) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      if (userId === currentUser.id) {
        Alert.alert('오류', '자기 자신에게 좋아요를 누를 수 없습니다.');
        return;
      }

      await firebaseFirestoreService.likeUser(auth.currentUser.uid, userId);
      
      // 좋아요 받은 사용자에게 알림 (백그라운드일 때만)
      if (AppState.currentState !== 'active') {
        const settings = await firebaseFirestoreService.getNotificationSettings(userId);
        if (settings && settings.enabled && settings.likes) {
          notificationService.showLikeNotification(currentUser.name, auth.currentUser.uid, userId);
        }
      }
    } catch (error: any) {
      console.error('좋아요 추가 오류:', error);
      Alert.alert('오류', error.message || '좋아요 추가에 실패했습니다.');
    }
  }, [currentUser.id, currentUser.name]);

  // 좋아요 제거
  const unlikeUser = useCallback(async (userId: string) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      if (userId === currentUser.id) {
        return;
      }

      await firebaseFirestoreService.unlikeUser(auth.currentUser.uid, userId);
    } catch (error: any) {
      console.error('좋아요 제거 오류:', error);
      Alert.alert('오류', error.message || '좋아요 제거에 실패했습니다.');
    }
  }, [currentUser.id]);

  // 좋아요 상태 확인
  const isLiked = useCallback((userId: string): boolean => {
    if (!auth.currentUser || userId === currentUser.id) {
      return false;
    }

    // contacts에서 해당 사용자를 찾아서 likedBy 필드 확인
    const user = contacts.find((u) => u.id === userId);
    if (!user || !user.likedBy) {
      return false;
    }

    return !!user.likedBy[auth.currentUser.uid];
  }, [contacts, currentUser.id]);

  // 채팅방 고정
  const pinChatRoom = useCallback(async (roomId: string) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await firebaseFirestoreService.pinChatRoom(roomId, auth.currentUser.uid);
    } catch (error: any) {
      console.error('채팅방 고정 오류:', error);
      Alert.alert('오류', error.message || '채팅방 고정에 실패했습니다.');
    }
  }, []);

  // 채팅방 고정 해제
  const unpinChatRoom = useCallback(async (roomId: string) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      await firebaseFirestoreService.unpinChatRoom(roomId, auth.currentUser.uid);
    } catch (error: any) {
      console.error('채팅방 고정 해제 오류:', error);
      Alert.alert('오류', error.message || '채팅방 고정 해제에 실패했습니다.');
    }
  }, []);

  // 채팅방 고정 상태 확인
  const isPinned = useCallback((roomId: string): boolean => {
    if (!auth.currentUser) {
      return false;
    }

    const room = chatRooms.find((r) => r.id === roomId);
    if (!room || !room.pinnedBy) {
      return false;
    }

    return !!room.pinnedBy[auth.currentUser.uid];
  }, [chatRooms]);

  // 알림 설정 업데이트
  const updateNotificationSettings = useCallback((settings: NotificationSettings) => {
    setNotificationSettings(settings);
  }, []);

  // 좋아요 알림 감지 (현재 사용자의 좋아요 수 변화 감지)
  const previousLikeCountRef = useRef<number>(currentUser.likeCount || 0);
  const previousLikedByRef = useRef<Record<string, number>>(currentUser.likedBy || {});

  useEffect(() => {
    if (!currentUser.id || !auth.currentUser) return;

    const currentLikeCount = currentUser.likeCount || 0;
    const currentLikedBy = currentUser.likedBy || {};

    // 새로 좋아요가 추가되었는지 확인
    if (currentLikeCount > previousLikeCountRef.current) {
      // 새로 추가된 좋아요 찾기
      const newLikers = Object.keys(currentLikedBy).filter(
        (likerId) => !previousLikedByRef.current[likerId]
      );

      if (newLikers.length > 0) {
        // 알림 설정 확인
        const settings = notificationSettings || {
          enabled: true,
          messages: true,
          likes: true,
          reports: true,
          updatedAt: Date.now(),
        };

        if (settings.enabled && settings.likes && AppState.currentState !== 'active') {
          // 새로 좋아요를 누른 사용자 정보 찾기
          for (const likerId of newLikers) {
            const liker = contacts.find((c) => c.id === likerId);
            if (liker) {
              notificationService.showLikeNotification(liker.name, likerId, currentUser.id);
            }
          }
        }
      }
    }

    previousLikeCountRef.current = currentLikeCount;
    previousLikedByRef.current = currentLikedBy;
  }, [currentUser.likeCount, currentUser.likedBy, contacts, notificationSettings, currentUser.id]);

  const value: ChatContextType = useMemo(
    () => ({
      currentUser,
      contacts,
      chatRooms,
      messages,
      points,
      posts,
      blockedUsers,
      reports,
      createOrOpenChat,
      sendMessage,
      getMessages,
      getChatPartner,
      markAsRead,
      setCurrentChatRoomId,
      createPost,
      startChatFromPost,
      deductPoints,
      addPoints,
      updateProfile,
      updateRegion,
      getDistance,
      formatDistance,
      blockUser,
      unblockUser,
      isBlocked,
      reportPost,
      reportUser,
      deletePost,
      deleteUser,
      updateReportStatus,
      requestAccountDeletion,
      cancelAccountDeletion,
      checkAttendance,
      canCheckAttendance,
      likeUser,
      unlikeUser,
      isLiked,
      pinChatRoom,
      unpinChatRoom,
      isPinned,
      notificationSettings,
      updateNotificationSettings,
    }),
    [currentUser, contacts, chatRooms, messages, points, posts, blockedUsers, reports, notificationSettings, createOrOpenChat, sendMessage, getMessages, getChatPartner, markAsRead, setCurrentChatRoomId, createPost, startChatFromPost, deductPoints, addPoints, updateProfile, updateRegion, getDistance, formatDistance, blockUser, unblockUser, isBlocked, reportPost, reportUser, deletePost, deleteUser, updateReportStatus, requestAccountDeletion, cancelAccountDeletion, checkAttendance, canCheckAttendance, likeUser, unlikeUser, isLiked, pinChatRoom, unpinChatRoom, isPinned, updateNotificationSettings]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat 훅은 ChatProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};
