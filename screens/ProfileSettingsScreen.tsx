import React, { useState, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../context/ChatContext';
import { RootStackParamList } from '../navigation/types';
import { Gender, BDSMPreference } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#A29BFE', '#FFD93D', '#6C5CE7', '#4C6EF5'];

const BDSM_LABELS: Record<BDSMPreference, string> = {
  dominant: '지배',
  submissive: '복종',
  switch: '스위치',
  none: '없음',
};

export default function ProfileSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser, updateProfile } = useChat();
  const [name, setName] = useState(currentUser.name);
  const [gender, setGender] = useState<Gender | undefined>(currentUser.gender);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentUser.avatar);
  const [age, setAge] = useState<string>(currentUser.age?.toString() || '');
  const [bdsmPreference, setBdsmPreference] = useState<BDSMPreference | undefined>(
    currentUser.bdsmPreference
  );
  const [bio, setBio] = useState<string>(currentUser.bio || '');
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);

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

    try {
      await updateProfile(trimmedName, finalGender, avatarUri, finalAge, bdsmPreference, bio.trim() || undefined);
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
  }, [name, gender, avatarUri, age, bdsmPreference, bio, currentUser.gender, updateProfile, navigation]);

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
  const avatarColor = AVATAR_COLORS[currentUser.id.length % AVATAR_COLORS.length];

  const getGenderLabel = (g?: Gender) => {
    if (!g) return '';
    return g === 'male' ? '남자' : '여자';
  };

  const getBdsmLabel = (p?: BDSMPreference) => {
    if (!p) return '';
    return BDSM_LABELS[p];
  };

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

        <View style={styles.fieldContainer}>
          <View style={styles.inlineInputWrapper}>
            <Text style={styles.inlineLabel}>성향</Text>
            <TouchableOpacity
              style={styles.inlineDropdownButton}
              onPress={() => setShowBdsmDropdown(true)}
            >
              <Text style={[styles.inlineDropdownText, !bdsmPreference && styles.dropdownPlaceholder]}>
                {bdsmPreference ? BDSM_LABELS[bdsmPreference] : '선택하세요'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
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
              {(['dominant', 'submissive', 'switch', 'none'] as BDSMPreference[]).map((pref) => (
                <TouchableOpacity
                  key={pref}
                  style={[
                    styles.dropdownOption,
                    bdsmPreference === pref && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => {
                    setBdsmPreference(pref);
                    setShowBdsmDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      bdsmPreference === pref && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {BDSM_LABELS[pref]}
                  </Text>
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#4C6EF5',
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
    color: '#4C6EF5',
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
    borderColor: '#8A4CEF',
    backgroundColor: '#F3E8FF',
  },
  inlineGenderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  inlineGenderButtonTextSelected: {
    color: '#8A4CEF',
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
    borderColor: '#8A4CEF',
    backgroundColor: '#F3E8FF',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextSelected: {
    color: '#8A4CEF',
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
    backgroundColor: '#F3E8FF',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownOptionTextSelected: {
    color: '#8A4CEF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8A4CEF',
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
});
