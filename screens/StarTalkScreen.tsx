import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Image,
  Alert,
  Modal,
  ScrollView,
  Platform,
  RefreshControl,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import { useChat } from '../context/ChatContext';
import { Post, BDSMPreference, Region } from '../types';
import { RootStackParamList } from '../navigation/types';
import { REGION_NAMES, REGION_LIST } from '../utils/regions';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { formatRelativeTime } from '../utils/time';
import { getAvatarColor } from '../utils/avatar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const CHAT_COST = 50;

type PostFilter = 'region' | 'my';
type GenderFilter = 'all' | 'male' | 'female';
type BDSMFilter = 'all' | BDSMPreference;
type AgeFilter = 'all' | '20s' | '30s' | '40s' | '50s';

export default function StarTalkScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, points, posts, createPost, startChatFromPost, contacts, blockedUsers, isBlocked, reportPost, blockUser } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('StarTalkScreen');
      return () => {
        performanceMonitor.endScreenLoad('StarTalkScreen');
      };
    }, [])
  );
  
  const [isWriting, setIsWriting] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [postFilter, setPostFilter] = useState<PostFilter>('region');
  const [selectedRegion, setSelectedRegion] = useState<Region | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [bdsmFilter, setBdsmFilter] = useState<BDSMFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [isSwiping, setIsSwiping] = useState(false); // 스와이프 중인지 추적
  const [isPosting, setIsPosting] = useState(false); // 게시글 등록 중인지 추적
  const [isPickingImage, setIsPickingImage] = useState(false); // 이미지 선택 중인지 추적
  
  // 모달이 열릴 때 또는 닫힐 때 이미지 선택 상태 초기화
  useEffect(() => {
    setIsPickingImage(false);
  }, [isWriting]);
  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);

  const FILTER_MARGIN_HORIZONTAL = 0;
  const FILTER_PADDING_HORIZONTAL = 20;
  const MIN_DROPDOWN_WIDTH = 140;

  const [dropdownTop, setDropdownTop] = useState(0);
  const [postMetrics, setPostMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [genderMetrics, setGenderMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [bdsmMetrics, setBdsmMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [ageMetrics, setAgeMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // contacts를 Map으로 변환하여 O(1) 조회 최적화
  const contactsMap = useMemo(() => {
    const map = new Map<string, User>();
    contacts.forEach((contact) => map.set(contact.id, contact));
    return map;
  }, [contacts]);

  const sortedPosts = useMemo(() => {
    let filtered = posts.filter((post) => !isBlocked(post.authorId));

    // 성별 필터 적용
    if (genderFilter !== 'all') {
      filtered = filtered.filter((post) => {
        const author = post.authorId === currentUser.id 
          ? currentUser 
          : contactsMap.get(post.authorId);
        return author?.gender === genderFilter;
      });
    }

    // BDSM 필터 적용
    if (bdsmFilter !== 'all') {
      filtered = filtered.filter((post) => {
        const author = post.authorId === currentUser.id 
          ? currentUser 
          : contactsMap.get(post.authorId);
        return author?.bdsmPreference?.includes(bdsmFilter) ?? false;
      });
    }

    // 나이 필터 적용
    if (ageFilter !== 'all' && ageFilter) {
      filtered = filtered.filter((post) => {
        const author = post.authorId === currentUser.id 
          ? currentUser 
          : contactsMap.get(post.authorId);
        const authorAge = author?.age;
        
        if (!authorAge) return false;
        
        switch (ageFilter) {
          case '20s':
            return authorAge >= 20 && authorAge < 30;
          case '30s':
            return authorAge >= 30 && authorAge < 40;
          case '40s':
            return authorAge >= 40 && authorAge < 50;
          case '50s':
            return authorAge >= 50;
          default:
            return true;
        }
      });
    }

    // 게시글 필터 적용
    if (postFilter === 'region') {
      // 지역별 필터링
      if (selectedRegion !== 'all') {
        filtered = filtered.filter((post) => {
          const author = post.authorId === currentUser.id 
            ? currentUser 
            : contactsMap.get(post.authorId);
          return author?.region === selectedRegion;
        });
      }
    } else if (postFilter === 'my') {
      filtered = filtered.filter((post) => post.authorId === currentUser.id);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);
    return filtered;
  }, [posts, postFilter, selectedRegion, genderFilter, bdsmFilter, ageFilter, currentUser, contactsMap, isBlocked]);

  const postFilterLabel = useMemo(() => {
    switch (postFilter) {
      case 'my':
        return '내글';
      case 'region':
        return selectedRegion === 'all' ? '지역' : REGION_NAMES[selectedRegion];
      default:
        return '지역';
    }
  }, [postFilter, selectedRegion]);

  const genderFilterLabel = useMemo(() => {
    switch (genderFilter) {
      case 'male':
        return '남자';
      case 'female':
        return '여자';
      default:
        return '전체성별';
    }
  }, [genderFilter]);

  const bdsmFilterLabel = useMemo(() => {
    if (bdsmFilter === 'all') {
      return 'BDSM';
    }
    return BDSM_LABELS[bdsmFilter] || 'BDSM';
  }, [bdsmFilter]);

  const ageFilterLabel = useMemo(() => {
    switch (ageFilter) {
      case '20s':
        return '20대';
      case '30s':
        return '30대';
      case '40s':
        return '40대';
      case '50s':
        return '50대+';
      default:
        return '나이';
    }
  }, [ageFilter]);

  const isPostFilterActive = showPostDropdown || showRegionDropdown || postFilter !== 'region' || selectedRegion !== 'all';
  const isGenderFilterActive = showGenderDropdown || genderFilter !== 'all';
  const isBdsmFilterActive = showBdsmDropdown || bdsmFilter !== 'all';
  const isAgeFilterActive = showAgeDropdown || ageFilter !== 'all';

  const closeAllDropdowns = useCallback(() => {
    setShowPostDropdown(false);
    setShowRegionDropdown(false);
    setShowGenderDropdown(false);
    setShowBdsmDropdown(false);
    setShowAgeDropdown(false);
  }, []);

  const selectPostFilter = useCallback((value: PostFilter) => {
    setPostFilter(value);
    setShowPostDropdown(false);
    if (value === 'region') {
      setShowRegionDropdown(true);
    }
  }, []);

  const selectRegion = useCallback((value: Region | 'all') => {
    setSelectedRegion(value);
    setShowRegionDropdown(false);
  }, []);

  const selectGenderFilter = useCallback((value: GenderFilter) => {
    setGenderFilter(value);
    setShowGenderDropdown(false);
  }, []);

  const selectBdsmFilter = useCallback((value: BDSMFilter) => {
    setBdsmFilter(value);
    setShowBdsmDropdown(false);
  }, []);

  const selectAgeFilter = useCallback((value: AgeFilter) => {
    setAgeFilter(value);
    setShowAgeDropdown(false);
  }, []);

  const isDropdownOpen = showPostDropdown || showRegionDropdown || showGenderDropdown || showBdsmDropdown || showAgeDropdown;

  const formatTime = useCallback((timestamp: number): string => {
    return formatRelativeTime(timestamp);
  }, []);

  const handlePost = useCallback(async () => {
    // 중복 클릭 방지
    if (isPosting) return;
    
    if (!postContent.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    setIsPosting(true);
    const imagesToPost = selectedImages.length > 0 ? [...selectedImages] : undefined;
    
    try {
      const result = await createPost(postContent.trim(), imagesToPost);
      setPostContent('');
      setSelectedImages([]);
      setIsPickingImage(false);
      setIsWriting(false);
      
      if (result.pointsRewarded) {
        Alert.alert('미션완료', '글쓰기 미션으로 50포인트를 받았습니다!');
      }
    } catch (error: any) {
      const errorMessage = error?.message || '게시글 등록에 실패했습니다.';
      Alert.alert('오류', errorMessage);
    } finally {
      setIsPosting(false);
    }
  }, [postContent, selectedImages, createPost, isPosting]);

  const pickImage = useCallback(async () => {
    if (isPickingImage) return;

    setIsPickingImage(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림', '갤러리 접근 권한이 필요합니다.');
        setIsPickingImage(false);
        return;
      }

      if (Platform.OS === 'ios') {
        try {
          await MediaLibrary.requestPermissionsAsync();
        } catch {
          // 권한 요청 실패는 무시
        }
      }

      let result: ImagePicker.ImagePickerResult | null = null;
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1.0,
          allowsMultipleSelection: false,
          base64: true,
          exif: false,
        });
      } catch (pickerError: any) {
        if (pickerError?.result) {
          result = pickerError.result;
        }
      }

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let imageUri = asset.uri;
        
        if (Platform.OS === 'ios' && imageUri?.startsWith('ph://')) {
          try {
            const assetId = (asset as any).assetId || (asset as any).id || (asset as any).localIdentifier;
            
            if (assetId) {
              const mediaLibraryAsset = await MediaLibrary.getAssetInfoAsync(assetId);
              if (mediaLibraryAsset?.localUri) {
                imageUri = mediaLibraryAsset.localUri;
              } else {
                try {
                  const manipulated = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                  );
                  if (manipulated.uri) imageUri = manipulated.uri;
                } catch {
                  // 변환 실패 시 원본 URI 사용
                }
              }
            } else {
              try {
                const manipulated = await ImageManipulator.manipulateAsync(
                  imageUri,
                  [],
                  { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );
                if (manipulated.uri) imageUri = manipulated.uri;
              } catch {
                // 변환 실패 시 원본 URI 사용
              }
            }
          } catch {
            try {
              const manipulated = await ImageManipulator.manipulateAsync(
                imageUri,
                [],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
              );
              if (manipulated.uri) imageUri = manipulated.uri;
            } catch {
              // 변환 실패 시 원본 URI 사용
            }
          }
        }
        
        if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('http') || imageUri.startsWith('ph://'))) {
          setSelectedImages([imageUri]);
          Alert.alert('성공', '이미지가 선택되었습니다.');
        } else {
          Alert.alert('오류', '이미지 URI를 가져올 수 없습니다.');
        }
      }
    } catch (error: any) {
      if (!error?.message?.includes('Failed to write data')) {
        Alert.alert('오류', '이미지를 선택할 수 없습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsPickingImage(false);
    }
  }, [isPickingImage]);

  const takePhoto = useCallback(async () => {
    if (isPickingImage) return;

    setIsPickingImage(true);

    try {
      // 카메라 권한 요청
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림', '카메라 접근 권한이 필요합니다.');
        setIsPickingImage(false);
        return;
      }

      // 카메라로 사진 촬영
      const result = await ImagePicker.launchCameraAsync({
        quality: 1.0,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (imageUri) {
          setSelectedImages([imageUri]);
          Alert.alert('성공', '사진이 촬영되었습니다.');
        } else {
          Alert.alert('오류', '사진 URI를 가져올 수 없습니다.');
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.';
      Alert.alert('오류', `사진을 촬영할 수 없습니다: ${errorMessage}`);
    } finally {
      // 이미지 선택 완료 (성공/실패/취소 관계없이)
      setIsPickingImage(false);
    }
  }, [isPickingImage]);

  const showImagePickerOptions = useCallback(() => {
    if (isPickingImage) return;

    Alert.alert(
      '사진 추가',
      '사진을 선택하세요',
      [
        { text: '취소', style: 'cancel' },
        { text: '갤러리에서 선택', onPress: pickImage },
        { text: '카메라로 촬영', onPress: takePhoto },
      ],
      { cancelable: true }
    );
  }, [pickImage, takePhoto, isPickingImage]);

  const handleChatFromPost = useCallback((post: Post) => {
    if (post.authorId === currentUser.id) {
      Alert.alert('알림', '본인의 게시글입니다.');
      return;
    }

    if (points < CHAT_COST) {
      Alert.alert(
        '포인트 부족',
        `포인트가 부족합니다. (필요: ${CHAT_COST}포인트)`,
        [
          {
            text: '상점 가기',
            onPress: () => {
              navigation.navigate('Charge');
            },
          },
          { text: '취소', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert(
      '채팅 시작',
      `${CHAT_COST}포인트를 사용하여 채팅을 시작하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            try {
              const roomId = await startChatFromPost(post.id);
              if (roomId) {
                const author = {
                  id: post.authorId,
                  name: post.authorName,
                };
                navigation.navigate('Chat', {
                  chatRoomId: roomId,
                  partner: author,
                });
              } else {
                Alert.alert('오류', '채팅을 시작할 수 없습니다.');
              }
            } catch (error: any) {
              Alert.alert('오류', '채팅을 시작하는 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  }, [points, currentUser.id, startChatFromPost, navigation]);

  const handleReportPost = useCallback((post: Post) => {
    const reportReasons: { label: string; value: ReportReason }[] = [
      { label: '스팸', value: 'spam' },
      { label: '부적절한 내용', value: 'inappropriate' },
      { label: '괴롭힘', value: 'harassment' },
      { label: '가짜 계정', value: 'fake' },
      { label: '기타', value: 'other' },
    ];

    Alert.alert(
      '게시글 신고',
      '신고 사유를 선택해주세요.',
      [
        ...reportReasons.map((reason) => ({
          text: reason.label,
          onPress: () => {
            reportPost(post.id, reason.value);
            Alert.alert('신고 완료', '신고가 접수되었습니다.');
          },
        })),
        { text: '취소', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [reportPost]);

  const handleBlockUser = useCallback((userId: string, userName: string) => {
    Alert.alert(
      '사용자 차단',
      `${userName}님을 차단하시겠습니까? 차단된 사용자의 게시글과 메시지는 더 이상 표시되지 않습니다.`,
      [
        {
          text: '차단',
          style: 'destructive',
          onPress: () => {
            blockUser(userId);
            Alert.alert('차단 완료', '사용자가 차단되었습니다.');
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  }, [blockUser]);

  const handlePostMenu = useCallback((post: Post) => {
    const isMyPost = post.authorId === currentUser.id;
    const author = contactsMap.get(post.authorId);
    
    if (isMyPost) return;

    Alert.alert(
      '옵션',
      '',
      [
        {
          text: '신고하기',
          onPress: () => handleReportPost(post),
        },
        {
          text: '사용자 차단',
          style: 'destructive',
          onPress: () => author && handleBlockUser(post.authorId, post.authorName),
        },
        { text: '취소', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [currentUser.id, contactsMap, handleReportPost, handleBlockUser]);

  const handleDeletePost = useCallback(async (post: Post) => {
    Alert.alert(
      '게시글 삭제',
      '게시글을 삭제하시겠습니까?',
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
              await firebaseFirestoreService.deletePost(post.id);
              // 실시간 구독이 자동으로 업데이트됨
            } catch (error: any) {
              Alert.alert('오류', '게시글 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, []);

  // 스와이프 가능한 게시글 아이템 컴포넌트
  const SwipeablePostItem = React.memo(({ post, isMyPost, author, onDelete, formatTime, navigation, onImagePress, handlePostMenu, onSwipeStart, onSwipeEnd }: {
    post: Post;
    isMyPost: boolean;
    author: any;
    onDelete: (post: Post) => void;
    formatTime: (timestamp: number) => string;
    navigation: NavigationProp;
    onImagePress: (uri: string) => void;
    handlePostMenu: (post: Post) => void;
    onSwipeStart?: () => void;
    onSwipeEnd?: () => void;
  }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeThreshold = 80;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => isMyPost,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return isMyPost && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderGrant: () => {
          // 스와이프 시작 시 스크롤 비활성화
          if (isMyPost && onSwipeStart) {
            onSwipeStart();
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (isMyPost) {
            // 왼쪽으로만 스와이프 가능, 최대 스와이프 거리 제한
            const newValue = Math.min(0, Math.max(gestureState.dx, -swipeThreshold * 1.5));
            translateX.setValue(newValue);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          // 스와이프 종료 시 스크롤 다시 활성화
          if (isMyPost && onSwipeEnd) {
            onSwipeEnd();
          }
          if (isMyPost) {
            if (gestureState.dx < -swipeThreshold / 2) {
              // 절반 이상 스와이프하면 삭제 버튼 표시
              Animated.spring(translateX, {
                toValue: -swipeThreshold,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            } else {
              // 그렇지 않으면 원래 위치로 복귀
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }
          }
        },
      })
    ).current;

    const handleDeletePress = () => {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onDelete(post);
      });
    };

    const postContent = (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => {
              if (author && !isMyPost) {
                navigation.navigate('UserProfile', { user: author });
              }
            }}
            disabled={isMyPost || !author}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(author?.gender, !!author?.avatar) }]}>
              {author?.avatar ? (
                <Image source={{ uri: author.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{post.authorName.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.authorTextContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{post.authorName}</Text>
                {author?.age && author?.gender && (
                  <Text style={styles.age}>
                    {author.age}{author.gender === 'male' ? '남' : '여'}
                  </Text>
                )}
              </View>
              <Text style={styles.postTime}>
                {formatTime(post.timestamp)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.postHeaderRight}>
            {(() => {
              if (post.images && Array.isArray(post.images) && post.images.length > 0) {
                return (
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => onImagePress(post.images[0])}
                    activeOpacity={0.8}
                  >
                    <Image
                      key={`${post.id}-img-0`}
                      source={{ uri: post.images[0] }}
                      style={styles.postImage}
                      resizeMode="cover"
                      onError={() => {
                        // 이미지 로드 실패는 무시
                      }}
                    />
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
            {!isMyPost && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handlePostMenu(post);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.menuButtonText}>⋯</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.contentRow,
            post.images && Array.isArray(post.images) && post.images.length > 0 && styles.contentRowWithImage
          ]}
          onPress={() => {
            if (author && !isMyPost) {
              navigation.navigate('UserProfile', { user: author });
            }
          }}
          activeOpacity={0.8}
          disabled={isMyPost || !author}
        >
          <Text style={styles.postContent}>{post.content}</Text>
        </TouchableOpacity>
      </View>
    );

    if (!isMyPost) {
      return postContent;
    }

    return (
      <View style={styles.swipeableContainer}>
        <Animated.View
          style={[
            styles.swipeableContent,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {postContent}
        </Animated.View>
        <Animated.View
          style={[
            styles.deleteButtonContainer,
            {
              opacity: translateX.interpolate({
                inputRange: [-swipeThreshold, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            activeOpacity={0.8}
          >
            <Image
              source={require('../assets/deleteicon.png')}
              style={styles.deleteButtonIcon}
              resizeMode="contain"
              onError={() => {
                // 아이콘 로드 실패는 무시
              }}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  });

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const isMyPost = item.authorId === currentUser.id;
    const author = isMyPost ? currentUser : contactsMap.get(item.authorId);

    return (
      <SwipeablePostItem
        post={item}
        isMyPost={isMyPost}
        author={author}
        onDelete={handleDeletePost}
        formatTime={formatTime}
        navigation={navigation}
        onImagePress={(uri) => setExpandedImage(uri)}
        handlePostMenu={handlePostMenu}
        onSwipeStart={() => setIsSwiping(true)}
        onSwipeEnd={() => setIsSwiping(false)}
      />
    );
  }, [currentUser, contactsMap, formatTime, handleDeletePost, navigation, handlePostMenu, setExpandedImage]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // 실시간 구독이 자동으로 업데이트되므로 짧은 딜레이 후 새로고침 상태 해제
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>에쎔톡</Text>
          <TouchableOpacity
            style={styles.pointsContainer}
            onPress={() => navigation.navigate('Charge')}
            activeOpacity={0.7}
          >
            <Image
              source={require('../assets/pointicon.png')}
              style={styles.pointIcon}
              resizeMode="contain"
            />
            <Text style={styles.pointsText}>{points}P</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>새로운 이야기를 나눠보세요</Text>
      </View>

      {/* 드롭다운 오버레이 */}
      {isDropdownOpen && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View style={styles.dropdownOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* 필터 탭 */}
      <View
        style={styles.filterWrapper}
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          setDropdownTop(y + height);
        }}
      >
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={styles.filterBarItem}
            activeOpacity={0.7}
            onPress={() => {
              if (postFilter === 'region') {
                setShowRegionDropdown((prev) => !prev);
              } else {
                setShowPostDropdown((prev) => !prev);
              }
              setShowGenderDropdown(false);
              setShowBdsmDropdown(false);
              setShowAgeDropdown(false);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setPostMetrics({ x, width: Math.max(width, MIN_DROPDOWN_WIDTH) });
            }}
          >
            <Text
              style={[
                styles.filterBarLabel,
                (postFilter !== 'region' || selectedRegion !== 'all') && styles.filterBarLabelActive,
              ]}
            >
              {postFilterLabel}
            </Text>
          </TouchableOpacity>
          <View style={styles.filterBarDivider} />
          <TouchableOpacity
            style={styles.filterBarItem}
            activeOpacity={0.7}
            onPress={() => {
              setShowGenderDropdown((prev) => !prev);
              setShowPostDropdown(false);
              setShowRegionDropdown(false);
              setShowBdsmDropdown(false);
              setShowAgeDropdown(false);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setGenderMetrics({ x, width: Math.max(width, MIN_DROPDOWN_WIDTH) });
            }}
          >
            <Text
              style={[
                styles.filterBarLabel,
                genderFilter !== 'all' && styles.filterBarLabelActive,
              ]}
            >
              {genderFilterLabel}
            </Text>
          </TouchableOpacity>
          <View style={styles.filterBarDivider} />
          <TouchableOpacity
            style={styles.filterBarItem}
            activeOpacity={0.7}
            onPress={() => {
              setShowBdsmDropdown((prev) => !prev);
              setShowPostDropdown(false);
              setShowRegionDropdown(false);
              setShowGenderDropdown(false);
              setShowAgeDropdown(false);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setBdsmMetrics({ x, width: Math.max(width, MIN_DROPDOWN_WIDTH) });
            }}
          >
            <Text
              style={[
                styles.filterBarLabel,
                bdsmFilter !== 'all' && styles.filterBarLabelActive,
              ]}
            >
              {bdsmFilterLabel}
            </Text>
          </TouchableOpacity>
          <View style={styles.filterBarDivider} />
          <TouchableOpacity
            style={styles.filterBarItem}
            activeOpacity={0.7}
            onPress={() => {
              setShowAgeDropdown((prev) => !prev);
              setShowPostDropdown(false);
              setShowRegionDropdown(false);
              setShowGenderDropdown(false);
              setShowBdsmDropdown(false);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setAgeMetrics({ x, width: Math.max(width, MIN_DROPDOWN_WIDTH) });
            }}
          >
            <Text
              style={[
                styles.filterBarLabel,
                isAgeFilterActive && styles.filterBarLabelActive,
              ]}
            >
              {ageFilterLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPostDropdown && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View
            style={[
              styles.dropdownPanel,
              {
                top: dropdownTop,
                left: FILTER_MARGIN_HORIZONTAL + FILTER_PADDING_HORIZONTAL + postMetrics.x,
                width: postMetrics.width,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.dropdownRow, postFilter === 'region' && styles.dropdownRowActive]}
              onPress={() => selectPostFilter('region')}
            >
              <Text style={[styles.dropdownRowText, postFilter === 'region' && styles.dropdownRowTextActive]}>
                지역
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, postFilter === 'my' && styles.dropdownRowActive]}
              onPress={() => selectPostFilter('my')}
            >
              <Text style={[styles.dropdownRowText, postFilter === 'my' && styles.dropdownRowTextActive]}>
                내글
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      )}

      {showRegionDropdown && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View
            style={[
              styles.dropdownPanel,
              {
                top: dropdownTop,
                left: FILTER_MARGIN_HORIZONTAL + FILTER_PADDING_HORIZONTAL + postMetrics.x,
                width: Math.max(postMetrics.width, 160),
                maxHeight: 400,
              },
            ]}
          >
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity
                style={[styles.dropdownRow, selectedRegion === 'all' && styles.dropdownRowActive]}
                onPress={() => selectRegion('all')}
              >
                <Text style={[styles.dropdownRowText, selectedRegion === 'all' && styles.dropdownRowTextActive]}>
                  전체 지역
                </Text>
              </TouchableOpacity>
              {REGION_LIST.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[styles.dropdownRow, selectedRegion === region && styles.dropdownRowActive]}
                  onPress={() => selectRegion(region)}
                >
                  <Text style={[styles.dropdownRowText, selectedRegion === region && styles.dropdownRowTextActive]}>
                    {REGION_NAMES[region]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      )}

      {showGenderDropdown && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View
            style={[
              styles.dropdownPanel,
              {
                top: dropdownTop,
                left: FILTER_MARGIN_HORIZONTAL + FILTER_PADDING_HORIZONTAL + genderMetrics.x,
                width: genderMetrics.width,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.dropdownRow, genderFilter === 'all' && styles.dropdownRowActive]}
              onPress={() => selectGenderFilter('all')}
            >
              <Text style={[styles.dropdownRowText, genderFilter === 'all' && styles.dropdownRowTextActive]}>
                전체 성별
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, genderFilter === 'male' && styles.dropdownRowActive]}
              onPress={() => selectGenderFilter('male')}
            >
              <Text style={[styles.dropdownRowText, genderFilter === 'male' && styles.dropdownRowTextActive]}>
                남자
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, genderFilter === 'female' && styles.dropdownRowActive]}
              onPress={() => selectGenderFilter('female')}
            >
              <Text style={[styles.dropdownRowText, genderFilter === 'female' && styles.dropdownRowTextActive]}>
                여자
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      )}

      {showBdsmDropdown && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View
            style={[
              styles.dropdownPanel,
              {
                top: dropdownTop,
                left: FILTER_MARGIN_HORIZONTAL + FILTER_PADDING_HORIZONTAL + bdsmMetrics.x,
                width: bdsmMetrics.width,
              },
            ]}
          >
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity
                style={[styles.dropdownRow, bdsmFilter === 'all' && styles.dropdownRowActive]}
                onPress={() => selectBdsmFilter('all')}
              >
                <Text style={[styles.dropdownRowText, bdsmFilter === 'all' && styles.dropdownRowTextActive]}>
                  전체
                </Text>
              </TouchableOpacity>
              {([
                'vanilla', 'owner', 'daddy', 'mommy', 'dominant', 'master', 'mistress',
                'hunter', 'brattamer', 'degrader', 'rigger', 'boss', 'switch',
                'sadist', 'spanker', 'pet', 'little', 'submissive', 'slave',
                'prey', 'brat', 'degradee', 'ropebunny', 'servant', 'masochist', 'spankee'
              ] as BDSMPreference[]).map((pref) => (
                <TouchableOpacity
                  key={pref}
                  style={[styles.dropdownRow, bdsmFilter === pref && styles.dropdownRowActive]}
                  onPress={() => selectBdsmFilter(pref)}
                >
                  <Text style={[styles.dropdownRowText, bdsmFilter === pref && styles.dropdownRowTextActive]}>
                    {BDSM_LABELS[pref]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      )}

      {showAgeDropdown && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View
            style={[
              styles.dropdownPanel,
              {
                top: dropdownTop,
                left: FILTER_MARGIN_HORIZONTAL + FILTER_PADDING_HORIZONTAL + ageMetrics.x,
                width: ageMetrics.width,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.dropdownRow, ageFilter === 'all' && styles.dropdownRowActive]}
              onPress={() => selectAgeFilter('all')}
            >
              <Text style={[styles.dropdownRowText, ageFilter === 'all' && styles.dropdownRowTextActive]}>
                전체 나이
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, ageFilter === '20s' && styles.dropdownRowActive]}
              onPress={() => selectAgeFilter('20s')}
            >
              <Text style={[styles.dropdownRowText, ageFilter === '20s' && styles.dropdownRowTextActive]}>
                20대
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, ageFilter === '30s' && styles.dropdownRowActive]}
              onPress={() => selectAgeFilter('30s')}
            >
              <Text style={[styles.dropdownRowText, ageFilter === '30s' && styles.dropdownRowTextActive]}>
                30대
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, ageFilter === '40s' && styles.dropdownRowActive]}
              onPress={() => selectAgeFilter('40s')}
            >
              <Text style={[styles.dropdownRowText, ageFilter === '40s' && styles.dropdownRowTextActive]}>
                40대
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, ageFilter === '50s' && styles.dropdownRowActive]}
              onPress={() => selectAgeFilter('50s')}
            >
              <Text style={[styles.dropdownRowText, ageFilter === '50s' && styles.dropdownRowTextActive]}>
                50대+
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      )}

      <FlatList
        data={sortedPosts}
        keyExtractor={keyExtractor}
        renderItem={renderPost}
        contentContainerStyle={styles.postList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1F2937"
            colors={['#1F2937']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {postFilter === 'my'
                ? '작성한 게시글이 없어요'
                : postFilter === 'region' && selectedRegion !== 'all'
                ? `${REGION_NAMES[selectedRegion]} 지역의 게시글이 없어요`
                : genderFilter === 'male'
                ? '남성 사용자의 게시글이 없어요'
                : genderFilter === 'female'
                ? '여성 사용자의 게시글이 없어요'
                : '아직 게시글이 없어요'}
            </Text>
            <Text style={styles.emptySubtext}>
              {postFilter === 'my'
                ? '첫 게시글을 작성해보세요!'
                : postFilter === 'region' && selectedRegion !== 'all'
                ? '다른 지역을 선택해보세요'
                : genderFilter !== 'all'
                ? '다른 성별을 선택해보세요'
                : '첫 게시글을 작성해보세요!'}
            </Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        scrollEnabled={!isSwiping}
      />

      <TouchableOpacity
        style={styles.writeButton}
        onPress={() => {
          setIsPickingImage(false); // 모달 열 때 이미지 선택 상태 초기화
          setIsWriting(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.writeButtonContent}>
          <Image source={require('../assets/posticon.png')} style={styles.writeButtonIcon} />
          <Text style={styles.writeButtonText}>글쓰기</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isWriting}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsWriting(false);
          setIsPickingImage(false); // 모달 닫을 때 이미지 선택 상태 초기화
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setIsWriting(false);
          setIsPickingImage(false); // 모달 닫을 때 이미지 선택 상태 초기화
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                style={styles.modalKeyboardAvoidingView}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>게시글 작성</Text>
                    <TouchableOpacity onPress={() => {
                      setIsWriting(false);
                      setIsPickingImage(false); // 모달 닫을 때 이미지 선택 상태 초기화
                    }}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    style={styles.modalBody}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.modalBodyContent}
                    showsVerticalScrollIndicator={true}
                  >
                    <TextInput
                      style={styles.postInput}
                      placeholder="무엇을 공유하고 싶으신가요?"
                      value={postContent}
                      onChangeText={setPostContent}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                    />
                    {selectedImages.length > 0 && (
                      <View style={styles.imagePreviewContainer}>
                        {selectedImages.map((image, index) => (
                          <View key={index} style={styles.imagePreview}>
                            <Image 
                              source={{ uri: image }} 
                              style={styles.previewImage}
                              resizeMode="cover"
                              onError={() => {
                                Alert.alert('오류', '이미지를 불러올 수 없습니다.');
                              }}
                            />
                            <TouchableOpacity
                              style={styles.removeImageButton}
                              onPress={() => setSelectedImages([])}
                            >
                              <Text style={styles.removeImageText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    {selectedImages.length === 0 && (
                      <TouchableOpacity
                        style={[styles.addImageButton, isPickingImage && styles.addImageButtonDisabled]}
                        onPress={showImagePickerOptions}
                        disabled={isPickingImage}
                      >
                        {isPickingImage ? (
                          <ActivityIndicator size="small" color="#667085" />
                        ) : (
                          <>
                            <Image
                              source={require('../assets/photoicon.png')}
                              style={styles.addImageIcon}
                              resizeMode="contain"
                            />
                            <Text style={styles.addImageText}>사진 추가</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {selectedImages.length > 0 && (
                      <TouchableOpacity
                        style={[styles.changeImageButton, isPickingImage && styles.changeImageButtonDisabled]}
                        onPress={showImagePickerOptions}
                        disabled={isPickingImage}
                      >
                        {isPickingImage ? (
                          <ActivityIndicator size="small" color="#1F2937" />
                        ) : (
                          <>
                            <Image
                              source={require('../assets/photoicon.png')}
                              style={styles.changeImageIcon}
                              resizeMode="contain"
                            />
                            <Text style={styles.changeImageText}>사진 변경</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.submitButton, (!postContent.trim() || isPosting) && styles.submitButtonDisabled]}
                      onPress={handlePost}
                      disabled={!postContent.trim() || isPosting}
                    >
                      {isPosting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>등록</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 이미지 확대 모달 */}
      <Modal
        visible={expandedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setExpandedImage(null)}
      >
        <TouchableWithoutFeedback onPress={() => setExpandedImage(null)}>
          <View style={styles.imageModalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.imageModalContent}>
                {expandedImage && (
                  <Image
                    source={{ uri: expandedImage }}
                    style={styles.expandedImage}
                    resizeMode="contain"
                  />
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setExpandedImage(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
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
    position: 'relative',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  pointsContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  dropdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    zIndex: 6,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  filterBarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5F6B8A',
    letterSpacing: 0.2,
  },
  filterBarLabelActive: {
    color: '#1F2937',
  },
  filterBarDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#D7DBEF',
  },
  dropdownPanel: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    zIndex: 8,
  },
  dropdownRow: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
  },
  dropdownRowActive: {
    backgroundColor: 'rgba(31, 41, 55, 0.12)',
  },
  dropdownRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#344054',
  },
  dropdownRowTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  postList: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 0,
    padding: 20,
    paddingHorizontal: 24,
    marginBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    minHeight: 40, // 최소 높이 설정으로 텍스트 위치 고정
  },
  postHeaderRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginLeft: 12,
    position: 'relative',
  },
  menuButton: {
    padding: 4,
    marginTop: -4,
  },
  menuButtonText: {
    fontSize: 20,
    color: '#888',
    fontWeight: 'bold',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorTextContainer: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginRight: 6,
  },
  age: {
    fontSize: 12,
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
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  contentRow: {
    marginBottom: 12,
  },
  contentRowWithImage: {
    paddingRight: 80, // 이미지 영역(70) + 여백(10)을 고려한 패딩
  },
  postContent: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 24,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
  },
  writeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#1F2937',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  writeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeButtonIcon: {
    width: 22,
    height: 22,
    marginRight: 6,
    tintColor: '#fff',
  },
  writeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  modalClose: {
    fontSize: 24,
    color: '#888',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    flexGrow: 1,
  },
  postInput: {
    minHeight: 150,
    fontSize: 16,
    color: '#222',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addImageButton: {
    borderWidth: 1,
    borderColor: '#D9DCE3',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addImageButtonDisabled: {
    opacity: 0.5,
  },
  addImageIcon: {
    width: 20,
    height: 20,
  },
  addImageText: {
    fontSize: 14,
    color: '#667085',
  },
  changeImageButton: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F0F4FF',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  changeImageButtonDisabled: {
    opacity: 0.5,
  },
  changeImageIcon: {
    width: 20,
    height: 20,
  },
  changeImageText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A0A6B8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  expandedImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  swipeableContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeableContent: {
    backgroundColor: '#fff',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    backgroundColor: '#DC2626',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  deleteButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  deleteButtonInline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteButtonTextInline: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
