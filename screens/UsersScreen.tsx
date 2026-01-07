import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { User, ReportReason, BDSMPreference, Region } from '../types';
import { REGION_NAMES, REGION_LIST } from '../utils/regions';
import { performanceMonitor } from '../utils/PerformanceMonitor';

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

type GenderFilter = 'all' | 'male' | 'female';
type BDSMFilter = 'all' | BDSMPreference;
type AgeFilter = 'all' | '20s' | '30s' | '40s' | '50s';

export default function UsersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { contacts, currentUser, points, createOrOpenChat, deductPoints, isBlocked, blockUser, reportUser } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('UsersScreen');
      return () => {
        performanceMonitor.endScreenLoad('UsersScreen');
      };
    }, [])
  );
  
  const [selectedRegion, setSelectedRegion] = useState<Region | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [bdsmFilter, setBdsmFilter] = useState<BDSMFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);

  const FILTER_MARGIN_HORIZONTAL = 0;
  const FILTER_PADDING_HORIZONTAL = 20;
  const MIN_DROPDOWN_WIDTH = 140;

  const [dropdownTop, setDropdownTop] = useState(0);
  const [regionMetrics, setRegionMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [genderMetrics, setGenderMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [bdsmMetrics, setBdsmMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [ageMetrics, setAgeMetrics] = useState({ x: 0, width: MIN_DROPDOWN_WIDTH });
  const [refreshing, setRefreshing] = useState(false);

  // 현재 사용자 제외한 연락처 목록 (차단된 사용자도 제외)
  const filteredContacts = useMemo(() => {
    let filtered = contacts.filter((contact) => {
      const isNotCurrentUser = !currentUser.id || contact.id !== currentUser.id;
      const isNotBlocked = !isBlocked(contact.id);
      const isNotAdmin = !contact.isAdmin;
      
      return isNotCurrentUser && isNotBlocked && isNotAdmin;
    });

    // 지역 필터 적용
    if (selectedRegion !== 'all') {
      filtered = filtered.filter((contact) => contact.region === selectedRegion);
    }

    // 성별 필터 적용
    if (genderFilter !== 'all') {
      filtered = filtered.filter((contact) => contact.gender === genderFilter);
    }

    // BDSM 필터 적용
    if (bdsmFilter !== 'all') {
      filtered = filtered.filter((contact) => 
        contact.bdsmPreference ? contact.bdsmPreference.includes(bdsmFilter) : false
      );
    }

    // 나이 필터 적용
    if (ageFilter !== 'all' && ageFilter) {
      filtered = filtered.filter((contact) => {
        if (!contact.age) return false;
        const age = contact.age;
        switch (ageFilter) {
          case '20s':
            return age >= 20 && age < 30;
          case '30s':
            return age >= 30 && age < 40;
          case '40s':
            return age >= 40 && age < 50;
          case '50s':
            return age >= 50;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [contacts, currentUser.id, isBlocked, selectedRegion, genderFilter, bdsmFilter, ageFilter]);

  // 최근 접속순으로 정렬 (lastSeen이 있으면 그것을, 없으면 0으로 정렬)
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const aLastSeen = a.lastSeen || 0;
      const bLastSeen = b.lastSeen || 0;
      // 최근 접속한 사용자가 먼저 오도록 내림차순 정렬
      return bLastSeen - aLastSeen;
    });
  }, [filteredContacts]);

  const regionFilterLabel = useMemo(() => {
    return selectedRegion === 'all' ? '지역' : REGION_NAMES[selectedRegion];
  }, [selectedRegion]);

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

  const isRegionFilterActive = showRegionDropdown || selectedRegion !== 'all';
  const isGenderFilterActive = showGenderDropdown || genderFilter !== 'all';
  const isBdsmFilterActive = showBdsmDropdown || bdsmFilter !== 'all';
  const isAgeFilterActive = showAgeDropdown || ageFilter !== 'all';

  const closeAllDropdowns = useCallback(() => {
    setShowRegionDropdown(false);
    setShowGenderDropdown(false);
    setShowBdsmDropdown(false);
    setShowAgeDropdown(false);
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

  const isDropdownOpen = showRegionDropdown || showGenderDropdown || showBdsmDropdown || showAgeDropdown;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // 실시간 구독이 자동으로 업데이트되므로 짧은 딜레이 후 새로고침 상태 해제
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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
    // 프로필 화면으로 이동
    navigation.navigate('UserProfile', { user });
  };

  const renderUser = ({ item }: { item: User }) => {

    const getInitial = (name: string) => {
      return name.charAt(0).toUpperCase() || '?';
    };

    const getAvatarColor = (gender?: string, hasAvatar?: boolean) => {
      // 프로필 사진이 없을 때 성별에 따라 색상 설정
      if (!hasAvatar && gender) {
        return gender === 'female' ? '#F3AAC2' : '#8FB5DF'; // 여자는 핑크, 남자는 연한 파란색
      }
      // 프로필 사진이 있거나 성별 정보가 없을 때는 기본 색상
      const colors = ['#1F2937', '#1F2937', '#1F2937', '#1F2937', '#FFD93D', '#1F2937'];
      return colors[item.id.length % colors.length];
    };

    const initial = getInitial(item.name);
    const avatarColor = getAvatarColor(item.gender, !!item.avatar);

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
            {item.age && item.gender && (
              <Text style={styles.age}>
                {item.age}{item.gender === 'male' ? '남' : '여'}
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>사용자</Text>
        <Text style={styles.subtitle}>새로운 인연을 만나보세요</Text>
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
              setShowRegionDropdown((prev) => !prev);
              setShowGenderDropdown(false);
              setShowBdsmDropdown(false);
              setShowAgeDropdown(false);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setRegionMetrics({ x, width: Math.max(width, MIN_DROPDOWN_WIDTH) });
            }}
          >
            <Text
              style={[
                styles.filterBarLabel,
                isRegionFilterActive && styles.filterBarLabelActive,
              ]}
            >
              {regionFilterLabel}
            </Text>
          </TouchableOpacity>
          <View style={styles.filterBarDivider} />
          <TouchableOpacity
            style={styles.filterBarItem}
            activeOpacity={0.7}
            onPress={() => {
              setShowGenderDropdown((prev) => !prev);
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
                isGenderFilterActive && styles.filterBarLabelActive,
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
                isBdsmFilterActive && styles.filterBarLabelActive,
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

      {showRegionDropdown && (
        <TouchableWithoutFeedback onPress={closeAllDropdowns}>
          <View
            style={[
              styles.dropdownPanel,
              {
                top: dropdownTop,
                left: FILTER_MARGIN_HORIZONTAL + FILTER_PADDING_HORIZONTAL + regionMetrics.x,
                width: Math.max(regionMetrics.width, 160),
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
        data={sortedContacts}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1F2937"
            colors={['#1F2937']}
          />
        }
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
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
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

