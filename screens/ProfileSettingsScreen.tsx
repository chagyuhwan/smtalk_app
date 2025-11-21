import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { Gender, BDSMPreference, Region } from '../types';
import { REGION_NAMES, REGION_LIST } from '../utils/regions';
import { performanceMonitor } from '../utils/PerformanceMonitor';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#1F2937', '#FFD93D', '#1F2937', '#1F2937'];

const getAvatarColor = (gender?: Gender, hasAvatar?: boolean) => {
  // 프로필 사진이 없을 때 성별에 따라 색상 설정
  if (!hasAvatar && gender) {
    return gender === 'female' ? '#F3AAC2' : '#8FB5DF'; // 여자는 핑크, 남자는 연한 파란색
  }
  // 프로필 사진이 있거나 성별 정보가 없을 때는 기본 색상
  return AVATAR_COLORS[0];
};

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

export default function ProfileSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, updateProfile, updateRegion } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('ProfileSettingsScreen');
      return () => {
        performanceMonitor.endScreenLoad('ProfileSettingsScreen');
      };
    }, [])
  );
  
  const [name, setName] = useState(currentUser.name);
  const [gender, setGender] = useState<Gender | undefined>(currentUser.gender);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUser.avatar);
  const [age, setAge] = useState<string>(currentUser.age?.toString() || '');
  // bdsmPreference가 배열이 아닌 경우(기존 데이터) 배열로 변환
  const normalizeBdsmPreference = useCallback((pref: BDSMPreference | BDSMPreference[] | undefined): BDSMPreference[] => {
    if (!pref) return [];
    if (Array.isArray(pref)) return pref;
    return [pref]; // 단일 값인 경우 배열로 변환
  }, []);

  const [bdsmPreference, setBdsmPreference] = useState<BDSMPreference[]>(
    normalizeBdsmPreference(currentUser.bdsmPreference)
  );
  const [bio, setBio] = useState<string>(currentUser.bio || '');
  const [region, setRegion] = useState<Region | undefined>(currentUser.region || 'seoul');
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);

  // 컴포넌트 마운트 시에만 currentUser.region으로 초기화
  useEffect(() => {
    console.log('ProfileSettingsScreen 마운트 - currentUser.region:', currentUser.region);
    if (currentUser.region && !region) {
      // region이 아직 설정되지 않았을 때만 currentUser.region으로 초기화
      setRegion(currentUser.region);
    } else if (!region) {
      // 둘 다 없으면 기본값 설정
      setRegion('seoul');
    }
  }, []); // 마운트 시에만 실행

  // currentUser.bdsmPreference가 변경될 때 상태 업데이트 (기존 데이터 호환성)
  useEffect(() => {
    const normalized = normalizeBdsmPreference(currentUser.bdsmPreference);
    if (normalized.length > 0) {
      setBdsmPreference(normalized);
    }
  }, [currentUser.bdsmPreference, normalizeBdsmPreference]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }

    if (trimmedName.length > 20) {
      Alert.alert('알림', '이름은 20자 이하로 입력해주세요.');
      return;
    }

    // 닉네임 필터링
    const { contentFilterService } = await import('../services/ContentFilterService');
    const nameFilterResult = contentFilterService.filterNickname(trimmedName);
    if (!nameFilterResult.passed) {
      Alert.alert('알림', nameFilterResult.reason || '부적절한 이름입니다.');
      return;
    }

    // 자기소개 필터링
    const trimmedBio = bio.trim();
    if (trimmedBio) {
      const bioFilterResult = contentFilterService.filterBio(trimmedBio);
      if (!bioFilterResult.passed) {
        Alert.alert('알림', bioFilterResult.reason || '부적절한 내용이 포함되어 있습니다.');
        return;
      }
    }

    // 성별이 이미 설정되어 있으면 기존 성별 사용, 없으면 새로 선택한 성별 사용
    const finalGender = currentUser.gender || gender;
    if (!finalGender) {
      Alert.alert('알림', '성별을 선택해주세요.');
      return;
    }

    // 나이 검증
    let finalAge: number | undefined = undefined;
    if (age.trim()) {
      const ageNum = parseInt(age.trim(), 10);
      if (isNaN(ageNum)) {
        Alert.alert('알림', '나이는 숫자로 입력해주세요.');
        return;
      }
      if (ageNum < 20 || ageNum > 80) {
        Alert.alert('알림', '나이는 20세 이상 80세 이하여야 합니다.');
        return;
      }
      finalAge = ageNum;
    }

    // BDSM 성향 검증
    if (!bdsmPreference || bdsmPreference.length === 0) {
      Alert.alert('알림', 'BDSM 성향을 최소 1개 이상 선택해주세요.');
      return;
    }

    if (bdsmPreference.length > 3) {
      Alert.alert('알림', 'BDSM 성향은 최대 3개까지 선택할 수 있습니다.');
      return;
    }

    try {
      await updateProfile(trimmedName, finalGender, avatarUri, finalAge, bdsmPreference, bio.trim() || undefined);
      // 지역이 변경된 경우 또는 지역이 없을 때 업데이트
      const finalRegion = region || 'seoul';
      if (finalRegion !== currentUser.region) {
        console.log('지역 변경 감지:', {
          현재지역: currentUser.region,
          새지역: finalRegion,
        });
        await updateRegion(finalRegion);
      } else {
        console.log('지역 변경 없음:', finalRegion);
      }
      Alert.alert('성공', '프로필이 업데이트되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('프로필 업데이트 오류:', error);
      Alert.alert('오류', `프로필 업데이트에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
    }
  }, [name, gender, avatarUri, age, bdsmPreference, bio, region, currentUser.gender, currentUser.region, updateProfile, updateRegion, navigation]);

  const pickImage = useCallback(async () => {
    // 권한 요청
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('알림', '사진 접근 권한이 필요합니다.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const removeImage = useCallback(() => {
    Alert.alert('프로필 사진 삭제', '프로필 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => setAvatarUri(undefined),
      },
    ]);
  }, []);

  const initial = name.charAt(0).toUpperCase() || '?';
  // 성별은 현재 사용자의 성별 또는 선택한 성별 사용
  const currentGender = currentUser.gender || gender;
  const avatarColor = getAvatarColor(currentGender, !!avatarUri);

  const getGenderLabel = (g?: Gender) => {
    if (!g) return '';
    return g === 'male' ? '남자' : '여자';
  };

  const getBdsmLabel = (prefs?: BDSMPreference | BDSMPreference[]) => {
    if (!prefs) return '';
    const normalized = Array.isArray(prefs) ? prefs : [prefs];
    if (normalized.length === 0) return '';
    return normalized.map(p => BDSM_LABELS[p]).join(', ');
  };

  // 디버깅: 컴포넌트 렌더링 확인
  console.log('ProfileSettingsScreen 렌더링 - region:', region, 'currentUser.region:', currentUser.region);
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
              <View style={styles.cameraIcon}>
                <Text style={styles.cameraIconText}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.avatarActions}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarActionButton}>
              <Text style={styles.avatarActionText}>사진 변경</Text>
            </TouchableOpacity>
            {avatarUri && (
              <TouchableOpacity onPress={removeImage} style={styles.avatarActionButton}>
                <Text style={[styles.avatarActionText, styles.avatarActionTextDanger]}>
                  삭제
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>이름</Text>
            <TextInput
              style={styles.inlineInput}
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>성별</Text>
            {currentUser.gender ? (
              <Text style={styles.inlineReadOnlyInput}>{getGenderLabel(currentUser.gender)}</Text>
            ) : (
              <View style={styles.inlineGenderButtons}>
                <TouchableOpacity
                  style={[
                    styles.inlineGenderButton,
                    gender === 'male' && styles.inlineGenderButtonSelected,
                  ]}
                  onPress={() => setGender('male')}
                >
                  <Text
                    style={[
                      styles.inlineGenderButtonText,
                      gender === 'male' && styles.inlineGenderButtonTextSelected,
                    ]}
                  >
                    남자
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineGenderButton,
                    gender === 'female' && styles.inlineGenderButtonSelected,
                  ]}
                  onPress={() => setGender('female')}
                >
                  <Text
                    style={[
                      styles.inlineGenderButtonText,
                      gender === 'female' && styles.inlineGenderButtonTextSelected,
                    ]}
                  >
                    여자
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {currentUser.gender && (
              <Text style={styles.lockIconRight}>🔒</Text>
            )}
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>나이</Text>
            <TextInput
              style={styles.inlineInput}
              value={age}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, '');
                setAge(numericValue);
              }}
              placeholder="나이를 입력하세요"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        {/* 지역 선택 필드 - 항상 표시 */}
        <View style={styles.fieldContainer} testID="region-field">
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>지역</Text>
            <TouchableOpacity
              style={styles.inlineDropdownButton}
              onPress={() => {
                console.log('지역 선택 버튼 클릭, 현재 region:', region);
                console.log('REGION_NAMES:', REGION_NAMES);
                console.log('region 값:', region, '타입:', typeof region);
                setShowRegionDropdown(true);
              }}
            >
              <Text style={[styles.inlineDropdownText, !region && styles.dropdownPlaceholder]}>
                {region ? (REGION_NAMES[region] || '알 수 없음') : '선택하세요'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={showRegionDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRegionDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRegionDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <ScrollView style={{ maxHeight: 400 }}>
                {REGION_LIST.map((reg) => (
                  <TouchableOpacity
                    key={reg}
                    style={[
                      styles.dropdownOption,
                      region === reg && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRegion(reg);
                      setShowRegionDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        region === reg && styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {REGION_NAMES[reg]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.fieldContainer}>
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>성향</Text>
            <TouchableOpacity
              style={styles.inlineDropdownButton}
              onPress={() => setShowBdsmDropdown(true)}
            >
              <Text style={[styles.inlineDropdownText, bdsmPreference.length === 0 && styles.dropdownPlaceholder]}>
                {bdsmPreference.length > 0 ? getBdsmLabel(bdsmPreference) : '선택하세요'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {bdsmPreference.length > 0 && (
              <Text style={styles.hintText}>
                {bdsmPreference.length}/3 선택됨
              </Text>
            )}
          </View>
        </View>

        <Modal
          visible={showBdsmDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowBdsmDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowBdsmDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderText}>BDSM 성향 선택</Text>
                <Text style={styles.modalHeaderSubtext}>
                  {bdsmPreference.length}/3 선택됨
                </Text>
              </View>
              <ScrollView 
                style={styles.bdsmListScrollView} 
                contentContainerStyle={styles.bdsmListContainer}
                showsVerticalScrollIndicator={true}
              >
                {([
                  'vanilla', 'owner', 'daddy', 'mommy', 'dominant', 'master', 'mistress',
                  'hunter', 'brattamer', 'degrader', 'rigger', 'boss', 'switch',
                  'sadist', 'spanker', 'pet', 'little', 'submissive', 'slave',
                  'prey', 'brat', 'degradee', 'ropebunny', 'servant', 'masochist', 'spankee'
                ] as BDSMPreference[]).map((pref) => {
                  const isSelected = bdsmPreference.includes(pref);
                  const isDisabled = !isSelected && bdsmPreference.length >= 3;
                  return (
                    <TouchableOpacity
                      key={pref}
                      style={[
                        styles.bdsmListItem,
                        isSelected && styles.bdsmListItemSelected,
                        isDisabled && styles.bdsmListItemDisabled,
                      ]}
                      onPress={() => {
                        if (isDisabled) {
                          Alert.alert('알림', '최대 3개까지 선택할 수 있습니다.');
                          return;
                        }
                        if (isSelected) {
                          // 이미 선택된 경우 제거
                          setBdsmPreference(bdsmPreference.filter(p => p !== pref));
                        } else {
                          // 선택되지 않은 경우 추가
                          setBdsmPreference([...bdsmPreference, pref]);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <View style={styles.bdsmListItemContent}>
                        <View style={[
                          styles.bdsmListCheckbox,
                          isSelected && { borderColor: '#1F2937', backgroundColor: '#1F2937' }
                        ]}>
                          {isSelected && <Text style={styles.bdsmListCheckmark}>✓</Text>}
                        </View>
                        <Text
                          style={[
                            styles.bdsmListText,
                            isSelected && styles.bdsmListTextSelected,
                            isDisabled && styles.bdsmListTextDisabled,
                          ]}
                        >
                          {BDSM_LABELS[pref]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  if (bdsmPreference.length === 0) {
                    Alert.alert('알림', '최소 1개 이상 선택해주세요.');
                    return;
                  }
                  setShowBdsmDropdown(false);
                }}
              >
                <Text style={styles.modalConfirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.fieldContainer}>
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>자기소개</Text>
            <TextInput
              style={[styles.inlineInput, styles.inlineBioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="자기소개를 입력하세요"
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!name.trim() || (!currentUser.gender && !gender)) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!name.trim() || (!currentUser.gender && !gender)}
        >
          <Text style={styles.saveButtonText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1F2937',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraIconText: {
    fontSize: 16,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarActionText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  avatarActionTextDanger: {
    color: '#FF6B6B',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockIcon: {
    fontSize: 14,
    marginLeft: 8,
    color: '#999',
  },
  lockIconRight: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  inputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  inlineInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginRight: 12,
    minWidth: 60,
  },
  inlineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
  },
  input: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    minHeight: 40,
  },
  inlineInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    minHeight: 40,
    flex: 1,
  },
  inlineReadOnlyInput: {
    fontSize: 16,
    color: '#999',
    paddingVertical: 8,
    minHeight: 40,
    flex: 1,
  },
  readOnlyInput: {
    fontSize: 16,
    color: '#999',
    paddingVertical: 8,
    minHeight: 40,
  },
  inlineGenderButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  inlineGenderButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  inlineGenderButtonSelected: {
    borderColor: '#1F2937',
    backgroundColor: '#F3F4F6',
  },
  inlineGenderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  inlineGenderButtonTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  inlineDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 40,
    flex: 1,
  },
  inlineDropdownText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  inlineBioInput: {
    minHeight: 100,
    paddingTop: 8,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  genderButtonSelected: {
    borderColor: '#1F2937',
    backgroundColor: '#1F2937',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 40,
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownOptionTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownOptionDisabled: {
    opacity: 0.5,
  },
  dropdownOptionTextDisabled: {
    color: '#999',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  checkboxDisabled: {
    borderColor: '#E0E0E0',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  modalHeaderSubtext: {
    fontSize: 14,
    color: '#667085',
  },
  modalConfirmButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
    marginLeft: 4,
  },
  bdsmListScrollView: {
    maxHeight: 400,
  },
  bdsmListContainer: {
    padding: 12,
  },
  bdsmListItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  bdsmListItemSelected: {
    backgroundColor: 'rgba(31, 41, 55, 0.12)',
  },
  bdsmListItemDisabled: {
    opacity: 0.5,
  },
  bdsmListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bdsmListCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bdsmListCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bdsmListText: {
    fontSize: 15,
    color: '#344054',
    flex: 1,
  },
  bdsmListTextSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  bdsmListTextDisabled: {
    color: '#999',
  },
});
