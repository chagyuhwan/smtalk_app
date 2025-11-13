import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useChat } from '../context/ChatContext';
import { Post, BDSMPreference } from '../types';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CHAT_COST = 50;

type PostFilter = 'all' | 'nearby' | 'my';
type GenderFilter = 'all' | 'male' | 'female';
type BDSMFilter = 'all' | BDSMPreference;

export default function StarTalkScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, points, posts, createPost, startChatFromPost, contacts, getDistance, formatDistance, blockedUsers, isBlocked, reportPost, blockUser } = useChat();
  const [isWriting, setIsWriting] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [bdsmFilter, setBdsmFilter] = useState<BDSMFilter>('all');
  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);

  const FILTER_MARGIN_HORIZONTAL = 0;
  const FILTER_PADDING_HORIZONTAL = 20;
  const MIN_DROPDOWN_WIDTH = 140;

  const [dropdownTop, setDropdownTop] = useState(0);
  const [postMetrics, setPostMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [genderMetrics, setGenderMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [bdsmMetrics, setBdsmMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const sortedPosts = useMemo(() => {
    let filtered = [...posts];

    // 차단된 사용자의 게시글 제거
    filtered = filtered.filter((post) => !isBlocked(post.authorId));

    // 성별 필터 적용
    if (genderFilter !== 'all') {
      filtered = filtered.filter((post) => {
        if (post.authorId === currentUser.id) {
          return currentUser.gender ? currentUser.gender === genderFilter : false;
        }
        const author = contacts.find((c) => c.id === post.authorId);
        return author?.gender ? author.gender === genderFilter : false;
      });
    }

    // BDSM 필터 적용
    if (bdsmFilter !== 'all') {
      filtered = filtered.filter((post) => {
        if (post.authorId === currentUser.id) {
          return currentUser.bdsmPreference ? currentUser.bdsmPreference === bdsmFilter : false;
        }
        const author = contacts.find((c) => c.id === post.authorId);
        return author?.bdsmPreference ? author.bdsmPreference === bdsmFilter : false;
      });
    }

    // 게시글 필터 적용
    if (postFilter === 'nearby') {
      // 근처 게시글 필터링 (10km 이내)
      const distanceCache = new Map<string, number>();
      filtered = filtered
        .map((post) => {
          if (post.authorId === currentUser.id) return null;
          const author = contacts.find((c) => c.id === post.authorId);
          if (!author) return null;
          const distance =
            distanceCache.get(post.authorId) ??
            getDistance(currentUser, author);
          if (distance === null || distance === undefined || distance > 10) return null;
          distanceCache.set(post.authorId, distance ?? Infinity);
          return { post, distance: distance ?? Infinity };
        })
        .filter((item): item is { post: Post; distance: number } => item !== null)
        .sort((a, b) => {
          if (a.distance === b.distance) {
            return b.post.timestamp - a.post.timestamp;
          }
          return a.distance - b.distance;
        })
        .map((item) => item.post);
      return filtered;
    }

    if (postFilter === 'my') {
      filtered = filtered.filter((post) => post.authorId === currentUser.id);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);
    return filtered;
  }, [posts, postFilter, genderFilter, bdsmFilter, currentUser, contacts, getDistance, isBlocked]);

  const postFilterLabel = useMemo(() => {
    switch (postFilter) {
      case 'nearby':
        return '근처';
      case 'my':
        return '내글';
      default:
        return '전체글';
    }
  }, [postFilter]);

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
    switch (bdsmFilter) {
      case 'dominant':
        return '지배';
      case 'submissive':
        return '복종';
      case 'switch':
        return '스위치';
      case 'none':
        return '없음';
      default:
        return 'BDSM';
    }
  }, [bdsmFilter]);

  const isPostFilterActive = showPostDropdown || postFilter !== 'all';
  const isGenderFilterActive = showGenderDropdown || genderFilter !== 'all';
  const isBdsmFilterActive = showBdsmDropdown || bdsmFilter !== 'all';

  const closeAllDropdowns = useCallback(() => {
    setShowPostDropdown(false);
    setShowGenderDropdown(false);
    setShowBdsmDropdown(false);
  }, []);

  const selectPostFilter = useCallback((value: PostFilter) => {
    setPostFilter(value);
    setShowPostDropdown(false);
  }, []);

  const selectGenderFilter = useCallback((value: GenderFilter) => {
    setGenderFilter(value);
    setShowGenderDropdown(false);
  }, []);

  const selectBdsmFilter = useCallback((value: BDSMFilter) => {
    setBdsmFilter(value);
    setShowBdsmDropdown(false);
  }, []);

  const isDropdownOpen = showPostDropdown || showGenderDropdown || showBdsmDropdown;

  const formatTime = useCallback((timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '방금 전';
    if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
    if (diff < day) return `${Math.floor(diff / hour)}시간 전`;

    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }, []);

  const handlePost = useCallback(async () => {
    console.log('🔵 handlePost 호출됨');
    console.log('postContent:', postContent);
    console.log('postContent.trim():', postContent.trim());
    console.log('selectedImages:', selectedImages);
    
    if (!postContent.trim()) {
      console.log('❌ 내용이 비어있음');
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    // 이미지가 있으면 배열로, 없으면 undefined로 전달
    const imagesToPost = selectedImages.length > 0 ? [...selectedImages] : undefined;
    
    // 디버깅: 이미지 URI 확인
    console.log('=== 게시글 작성 시작 ===');
    console.log('선택된 이미지 개수:', selectedImages.length);
    console.log('selectedImages 상태:', selectedImages);
    console.log('전달할 imagesToPost:', imagesToPost);
    console.log('createPost 함수:', typeof createPost);
    
    try {
      console.log('🟢 createPost 호출 전');
      await createPost(postContent.trim(), imagesToPost);
      console.log('🟢 createPost 호출 완료');
      setPostContent('');
      setSelectedImages([]);
      setIsWriting(false);
      Alert.alert('성공', '게시글이 등록되었습니다.');
    } catch (error: any) {
      console.error('❌ Post creation error:', error);
      const errorMessage = error?.message || '게시글 등록에 실패했습니다.';
      Alert.alert('오류', errorMessage);
    }
  }, [postContent, selectedImages, createPost]);

  const pickImage = useCallback(async () => {
    try {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      // iOS에서 MediaLibrary 권한도 요청
      if (Platform.OS === 'ios') {
        try {
          const mediaStatus = await MediaLibrary.requestPermissionsAsync();
          if (mediaStatus.status !== 'granted') {
            console.warn('MediaLibrary 권한이 거부되었습니다.');
          }
        } catch (mediaPermError) {
          console.warn('MediaLibrary 권한 요청 오류:', mediaPermError);
        }
      }

      // 이미지 선택 (에러가 발생해도 결과 처리)
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
        // 파일 시스템 오류는 내부적으로 발생하지만, 사용자가 이미지를 선택했다면
        // 에러 객체에 결과가 포함되어 있을 수 있음
        console.warn('ImagePicker 내부 오류 (계속 진행):', pickerError?.message);
        
        // 에러가 발생했지만, 실제로는 이미지 선택이 완료되었을 수 있음
        // 에러를 무시하고 나중에 result를 확인
        if (pickerError?.result) {
          result = pickerError.result;
        }
        // 에러가 발생해도 계속 진행 (결과가 없으면 나중에 처리)
      }

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let imageUri = asset.uri;
        
        console.log('=== 이미지 선택 ===');
        console.log('원본 URI:', imageUri);
        console.log('Asset:', asset);
        
        // iOS에서 ph:// URI인 경우 로컬 URI로 변환
        if (Platform.OS === 'ios' && imageUri && imageUri.startsWith('ph://')) {
          try {
            // assetId 찾기
            const assetId = (asset as any).assetId || (asset as any).id || (asset as any).localIdentifier;
            console.log('Asset ID:', assetId);
            
            if (assetId) {
              const mediaLibraryAsset = await MediaLibrary.getAssetInfoAsync(assetId);
              console.log('MediaLibrary 결과:', mediaLibraryAsset);
              
              if (mediaLibraryAsset?.localUri) {
                imageUri = mediaLibraryAsset.localUri;
                console.log('변환된 로컬 URI:', imageUri);
              } else {
                // ImageManipulator로 변환 시도
                try {
                  const manipulated = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                  );
                  if (manipulated.uri) {
                    imageUri = manipulated.uri;
                    console.log('ImageManipulator 변환 URI:', imageUri);
                  }
                } catch (manipError) {
                  console.warn('ImageManipulator 변환 실패:', manipError);
                  // 원본 URI 사용
                  console.log('원본 ph:// URI 사용');
                }
              }
            } else {
              // assetId가 없으면 ImageManipulator로 변환 시도
              try {
                const manipulated = await ImageManipulator.manipulateAsync(
                  imageUri,
                  [],
                  { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );
                if (manipulated.uri) {
                  imageUri = manipulated.uri;
                  console.log('ImageManipulator 변환 URI (assetId 없음):', imageUri);
                }
              } catch (manipError) {
                console.warn('ImageManipulator 변환 실패:', manipError);
              }
            }
          } catch (mediaError) {
            console.warn('MediaLibrary error:', mediaError);
            // ImageManipulator로 대체 시도
            try {
              const manipulated = await ImageManipulator.manipulateAsync(
                imageUri,
                [],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
              );
              if (manipulated.uri) {
                imageUri = manipulated.uri;
                console.log('ImageManipulator 대체 변환 URI:', imageUri);
              }
            } catch (manipError) {
              console.warn('ImageManipulator 대체 변환 실패:', manipError);
            }
          }
        }
        
        // 최종 URI 확인 및 저장
        if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('http') || imageUri.startsWith('ph://'))) {
          console.log('✅ 최종 이미지 URI:', imageUri);
          setSelectedImages([imageUri]);
          Alert.alert('성공', '이미지가 선택되었습니다.');
        } else {
          console.error('❌ 유효하지 않은 URI:', imageUri);
          Alert.alert('오류', '이미지 URI를 가져올 수 없습니다.');
        }
      } else {
        console.log('이미지 선택 취소');
      }
    } catch (error: any) {
      // 최종 에러 처리 - 사용자에게는 간단한 메시지만 표시
      console.error('Image picker error:', error);
      // 파일 시스템 오류는 내부적으로 처리하고, URI가 있으면 사용
      if (error?.message?.includes('Failed to write data')) {
        // 파일 쓰기 오류는 무시하고 계속 진행
        console.warn('파일 쓰기 오류 무시');
      } else {
        Alert.alert('오류', '이미지를 선택할 수 없습니다. 다시 시도해주세요.');
      }
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      // 카메라 권한 요청
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림', '카메라 접근 권한이 필요합니다.');
        return;
      }

      // 카메라로 사진 촬영
      const result = await ImagePicker.launchCameraAsync({
        quality: 1.0,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let imageUri = asset.uri;
        
        console.log('=== 카메라 촬영 ===');
        console.log('원본 URI:', imageUri);
        
        // 카메라로 촬영한 이미지는 보통 file:// URI
        if (imageUri) {
          console.log('✅ 카메라 이미지 URI:', imageUri);
          setSelectedImages([imageUri]);
          Alert.alert('성공', '사진이 촬영되었습니다.');
        } else {
          console.error('❌ 카메라 URI 없음');
          Alert.alert('오류', '사진 URI를 가져올 수 없습니다.');
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.';
      Alert.alert('오류', `사진을 촬영할 수 없습니다: ${errorMessage}`);
      console.error('Camera error:', error);
    }
  }, []);

  const showImagePickerOptions = useCallback(() => {
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
  }, [pickImage, takePhoto]);

  const handleChatFromPost = useCallback((post: Post) => {
    if (post.authorId === currentUser.id) {
      Alert.alert('알림', '본인의 게시글입니다.');
      return;
    }

    if (points < CHAT_COST) {
      Alert.alert('알림', `포인트가 부족합니다. (필요: ${CHAT_COST}포인트)`);
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
              console.error('채팅 시작 오류:', error);
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
    const author = contacts.find((c) => c.id === post.authorId);
    
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
  }, [currentUser.id, contacts, handleReportPost, handleBlockUser]);

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const isMyPost = item.authorId === currentUser.id;
    // 내 게시글인 경우 currentUser를 사용, 아니면 contacts에서 찾기
    const author = isMyPost ? currentUser : contacts.find((c) => c.id === item.authorId);
    const distance = author && !isMyPost ? getDistance(currentUser, author) : null;
    const distanceText = formatDistance(distance);

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => !isMyPost && handleChatFromPost(item)}
        activeOpacity={0.8}
        disabled={isMyPost}
      >
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <View style={[styles.avatar, { backgroundColor: '#4C6EF5' }]}>
              <Text style={styles.avatarText}>{item.authorName.charAt(0)}</Text>
            </View>
            <View style={styles.authorTextContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{item.authorName}</Text>
                {author?.age && (
                  <Text style={styles.age}>{author.age}세</Text>
                )}
                {author?.gender && (
                  <Text style={styles.gender}>
                    {author.gender === 'male' ? '남' : '여'}
                  </Text>
                )}
                {!isMyPost && distance !== null && (
                  <Text style={styles.distanceBadge}>{distanceText}</Text>
                )}
              </View>
              <Text style={styles.postTime}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
          </View>
          <View style={styles.postHeaderRight}>
            {(() => {
              if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                return (
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setExpandedImage(item.images[0])}
                    activeOpacity={0.8}
                  >
                    <Image
                      key={`${item.id}-img-0`}
                      source={{ uri: item.images[0] }}
                      style={styles.postImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.error('Post image load error:', error);
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
                  handlePostMenu(item);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.menuButtonText}>⋯</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.contentRow}>
          <Text style={styles.postContent}>{item.content}</Text>
        </View>
        <View style={styles.postFooter}>
          <Text style={styles.viewCount}>조회 {item.viewCount}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [currentUser, contacts, formatTime, handleChatFromPost, getDistance, formatDistance]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>별톡</Text>
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>💰 {points}P</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>안녕하세요, {currentUser.name}님</Text>
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
              setShowPostDropdown((prev) => !prev);
              setShowGenderDropdown(false);
              setShowBdsmDropdown(false);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setPostMetrics({ x, width: Math.max(width, MIN_DROPDOWN_WIDTH) });
            }}
          >
            <Text
              style={[
                styles.filterBarLabel,
                postFilter !== 'all' && styles.filterBarLabelActive,
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
              setShowBdsmDropdown(false);
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
              setShowGenderDropdown(false);
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
              style={[styles.dropdownRow, postFilter === 'all' && styles.dropdownRowActive]}
              onPress={() => selectPostFilter('all')}
            >
              <Text style={[styles.dropdownRowText, postFilter === 'all' && styles.dropdownRowTextActive]}>
                전체글
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, postFilter === 'nearby' && styles.dropdownRowActive]}
              onPress={() => selectPostFilter('nearby')}
            >
              <Text style={[styles.dropdownRowText, postFilter === 'nearby' && styles.dropdownRowTextActive]}>
                근처
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
            <TouchableOpacity
              style={[styles.dropdownRow, bdsmFilter === 'all' && styles.dropdownRowActive]}
              onPress={() => selectBdsmFilter('all')}
            >
              <Text style={[styles.dropdownRowText, bdsmFilter === 'all' && styles.dropdownRowTextActive]}>
                전체
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, bdsmFilter === 'dominant' && styles.dropdownRowActive]}
              onPress={() => selectBdsmFilter('dominant')}
            >
              <Text style={[styles.dropdownRowText, bdsmFilter === 'dominant' && styles.dropdownRowTextActive]}>
                지배
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, bdsmFilter === 'submissive' && styles.dropdownRowActive]}
              onPress={() => selectBdsmFilter('submissive')}
            >
              <Text style={[styles.dropdownRowText, bdsmFilter === 'submissive' && styles.dropdownRowTextActive]}>
                복종
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, bdsmFilter === 'switch' && styles.dropdownRowActive]}
              onPress={() => selectBdsmFilter('switch')}
            >
              <Text style={[styles.dropdownRowText, bdsmFilter === 'switch' && styles.dropdownRowTextActive]}>
                스위치
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownRow, bdsmFilter === 'none' && styles.dropdownRowActive]}
              onPress={() => selectBdsmFilter('none')}
            >
              <Text style={[styles.dropdownRowText, bdsmFilter === 'none' && styles.dropdownRowTextActive]}>
                없음
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {postFilter === 'my'
                ? '작성한 게시글이 없어요'
                : postFilter === 'nearby'
                ? '근처에 게시글이 없어요'
                : genderFilter === 'male'
                ? '남성 사용자의 게시글이 없어요'
                : genderFilter === 'female'
                ? '여성 사용자의 게시글이 없어요'
                : '아직 게시글이 없어요'}
            </Text>
            <Text style={styles.emptySubtext}>
              {postFilter === 'my'
                ? '첫 게시글을 작성해보세요!'
                : postFilter === 'nearby'
                ? '다른 지역의 게시글을 확인해보세요'
                : genderFilter !== 'all'
                ? '다른 성별을 선택해보세요'
                : '첫 게시글을 작성해보세요!'}
            </Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <TouchableOpacity
        style={styles.writeButton}
        onPress={() => setIsWriting(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.writeButtonText}>✏️ 글쓰기</Text>
      </TouchableOpacity>

      <Modal
        visible={isWriting}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsWriting(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>게시글 작성</Text>
              <TouchableOpacity onPress={() => setIsWriting(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
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
                        onError={(error) => {
                          console.error('Image load error:', error);
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
                  style={styles.addImageButton}
                  onPress={showImagePickerOptions}
                >
                  <Text style={styles.addImageText}>📷 사진 추가</Text>
                </TouchableOpacity>
              )}
              {selectedImages.length > 0 && (
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={showImagePickerOptions}
                >
                  <Text style={styles.changeImageText}>🔄 사진 변경</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitButton, !postContent.trim() && styles.submitButtonDisabled]}
                onPress={handlePost}
                disabled={!postContent.trim()}
              >
                <Text style={styles.submitButtonText}>등록</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: '#4C6EF5',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#2F54EB',
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
    backgroundColor: '#EEF2FF',
  },
  dropdownRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#344054',
  },
  dropdownRowTextActive: {
    color: '#4C6EF5',
    fontWeight: '600',
  },
  postList: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  postCard: {
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
    fontSize: 13,
    fontWeight: '500',
    color: '#667085',
    marginRight: 6,
  },
  gender: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667085',
    marginRight: 6,
  },
  distanceBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4C6EF5',
    backgroundColor: '#E8EDFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  postTime: {
    fontSize: 12,
    color: '#888',
  },
  contentRow: {
    marginBottom: 12,
  },
  postContent: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewCount: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#4C6EF5',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
    padding: 20,
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
  },
  addImageText: {
    fontSize: 14,
    color: '#667085',
  },
  changeImageButton: {
    borderWidth: 1,
    borderColor: '#4C6EF5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F0F4FF',
  },
  changeImageText: {
    fontSize: 14,
    color: '#4C6EF5',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#4C6EF5',
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
});
