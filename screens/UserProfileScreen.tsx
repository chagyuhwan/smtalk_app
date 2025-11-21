import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useChat } from '../context/ChatContext';
import { User, BDSMPreference } from '../types';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { auth } from '../config/firebase';
import { performanceMonitor } from '../utils/PerformanceMonitor';

const BDSM_LABELS: Record<BDSMPreference, string> = {
  vanilla: '바닐라',
  owner: '오너',
  daddy: '대디',
  mommy: '마미',
  dominant: '도미넌트',
  master: '마스터',
  mistress: '미스트리스',
  hunter: '헌터',
  brattamer: '브랫테이머',
  degrader: '디그레이더',
  rigger: '리거',
  boss: '보스',
  switch: '스위치',
  sadist: '사디스트',
  spanker: '스팽커',
  pet: '펫',
  little: '리틀',
  submissive: '서브미시브',
  slave: '슬레이브',
  prey: '프레이',
  brat: '브랫',
  degradee: '디그레이디',
  ropebunny: '로프버니',
  servant: '서번트',
  masochist: '마조히스트',
  spankee: '스팽키이거',
};

type RouteProp = {
  key: string;
  name: 'UserProfile';
  params: {
    user: User;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CHAT_COST = 50;

export default function UserProfileScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user: initialUser } = route.params;
  const { currentUser, points, createOrOpenChat, deductPoints, blockUser, reportUser, isBlocked, likeUser, unlikeUser } = useChat();

  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('UserProfileScreen');
      return () => {
        performanceMonitor.endScreenLoad('UserProfileScreen');
      };
    }, [])
  );

  const [user, setUser] = useState<User>(initialUser);
  const [isLikedState, setIsLikedState] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(initialUser.likeCount || 0);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const isMe = user.id === currentUser.id;
  const isBlockedUser = isBlocked(user.id);

  // 사용자 정보 실시간 구독
  useEffect(() => {
    const unsubscribe = firebaseFirestoreService.subscribeToUser(
      user.id,
      (userData) => {
        if (userData) {
          setUser(userData);
          setLikeCount(userData.likeCount || 0);
          
          // 좋아요 상태 확인
          if (auth.currentUser && userData.likedBy) {
            setIsLikedState(!!userData.likedBy[auth.currentUser.uid]);
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user.id]);

  // 초기 좋아요 상태 설정
  useEffect(() => {
    if (auth.currentUser && user.likedBy) {
      setIsLikedState(!!user.likedBy[auth.currentUser.uid]);
    }
  }, [user.likedBy]);

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase() || '?';
  };

  const getAvatarColor = (id: string, gender?: string, hasAvatar?: boolean) => {
    // 프로필 사진이 없을 때 성별에 따라 색상 설정
    if (!hasAvatar && gender) {
      return gender === 'female' ? '#F3AAC2' : '#8FB5DF'; // 여자는 핑크, 남자는 연한 파란색
    }
    // 프로필 사진이 있거나 성별 정보가 없을 때는 기존 로직 사용
    const colors = ['#1F2937', '#FF6B6B', '#4ECDC4', '#1F2937', '#FFD93D', '#1F2937'];
    return colors[id.length % colors.length];
  };

  const handleChat = async () => {
    if (points < CHAT_COST) {
      Alert.alert('포인트 부족', `채팅을 시작하려면 ${CHAT_COST}포인트가 필요합니다.`);
      return;
    }

    Alert.alert(
      '채팅 시작',
      `${user.name}님과의 채팅을 시작하시겠습니까?\n\n${CHAT_COST}포인트가 차감됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            const success = await deductPoints(CHAT_COST);
            if (!success) {
              Alert.alert('오류', '포인트가 부족하거나 차감에 실패했습니다.');
              return;
            }

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

  const handleBlock = () => {
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
            navigation.goBack();
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  };

  const handleReport = () => {
    const reportReasons = [
      { label: '스팸', value: 'spam' as const },
      { label: '부적절한 내용', value: 'inappropriate' as const },
      { label: '괴롭힘', value: 'harassment' as const },
      { label: '가짜 계정', value: 'fake' as const },
      { label: '기타', value: 'other' as const },
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
  };

  const handleLike = async () => {
    if (isLikedState) {
      await unlikeUser(user.id);
      // 로컬 상태 업데이트 제거 - 실시간 구독이 자동으로 업데이트함
    } else {
      await likeUser(user.id);
      // 로컬 상태 업데이트 제거 - 실시간 구독이 자동으로 업데이트함
    }
  };

  const avatarColor = getAvatarColor(user.id, user.gender, !!user.avatar);
  const initial = getInitial(user.name);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        {!isMe && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuButtonText}>⋯</Text>
          </TouchableOpacity>
        )}
        {isMe && <View style={styles.backButton} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileImageSection}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
        </View>
        <View style={styles.profileInfoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Text style={styles.name}>{user.name}</Text>
              {user.age && (
                <Text style={styles.infoText}>{user.age}세</Text>
              )}
              {user.gender && (
                <Text style={styles.infoText}>
                  {user.gender === 'male' ? '남' : '여'}
                </Text>
              )}
            </View>
            {!isMe && (
              <TouchableOpacity
                style={styles.likeButtonInline}
                onPress={handleLike}
                activeOpacity={0.8}
              >
                <Image
                  source={isLikedState ? require('../assets/likeicon.png') : require('../assets/nolikeicon.png')}
                  style={[styles.likeIconInline, isLikedState && styles.likeIconActiveInline]}
                  resizeMode="contain"
                />
                {likeCount > 0 && (
                  <Text style={[styles.likeCountText, isLikedState && styles.likeCountTextActive]}>
                    {likeCount}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {user.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>자기소개</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        )}

        {user.bdsmPreference && user.bdsmPreference.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BDSM 성향</Text>
            <View style={styles.bdsmContainer}>
              {user.bdsmPreference.map((pref) => (
                <View key={pref} style={styles.bdsmTag}>
                  <Text style={styles.bdsmTagText}>{BDSM_LABELS[pref]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isMe && !isBlockedUser && (
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleChat}
              activeOpacity={0.8}
            >
              <Text style={styles.chatButtonText}>채팅 시작</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 메뉴 모달 */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>메뉴</Text>
                  <Text style={styles.menuSubtitle}>{user.name}님</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuItemButton}
                  onPress={() => {
                    setShowMenu(false);
                    handleReport();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemButtonText}>신고하기</Text>
                </TouchableOpacity>
                {!isBlockedUser && (
                  <TouchableOpacity
                    style={styles.menuItemButton}
                    onPress={() => {
                      setShowMenu(false);
                      handleBlock();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuItemButtonText, styles.menuItemButtonTextDanger]}>차단하기</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.menuItemButton}
                  onPress={() => setShowMenu(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemButtonText}>취소</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingBottom: 20,
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
    fontWeight: '700',
    color: '#111',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667085',
  },
  headerActionTextDanger: {
    color: '#DC2626',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    color: '#111',
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#667085',
  },
  menuItemButton: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
  },
  menuItemButtonText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  menuItemButtonTextDanger: {
    color: '#DC2626',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 0,
  },
  profileImageSection: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  profileInfoSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    color: '#fff',
    fontSize: 120,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  infoText: {
    fontSize: 16,
    color: '#667085',
  },
  likeButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeIconInline: {
    width: 18,
    height: 18,
    tintColor: '#667085',
  },
  likeIconActiveInline: {
    tintColor: '#DC2626',
  },
  likeCountText: {
    fontSize: 14,
    color: '#667085',
    fontWeight: '600',
  },
  likeCountTextActive: {
    color: '#DC2626',
  },
  likeSection: {
    marginTop: 16,
    width: '100%',
  },
  likeButton: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: '#DC2626',
  },
  likeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeIcon: {
    width: 20,
    height: 20,
    tintColor: '#667085',
  },
  likeIconActive: {
    tintColor: '#DC2626',
  },
  likeButtonText: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '600',
  },
  likeButtonTextActive: {
    color: '#DC2626',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  bdsmContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bdsmTag: {
    backgroundColor: 'rgba(31, 41, 55, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bdsmTagText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  buttonSection: {
    gap: 10,
    marginTop: -8,
    paddingHorizontal: 20,
  },
  chatButton: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 56,
    justifyContent: 'center',
  },
  reportButtonText: {
    color: '#667085',
    fontSize: 16,
    fontWeight: '600',
  },
  blockButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
    minHeight: 56,
    justifyContent: 'center',
  },
  blockButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

