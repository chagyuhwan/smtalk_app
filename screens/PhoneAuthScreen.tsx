import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { firebaseAuthService } from '../services/FirebaseAuthService';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { firebaseStorageService } from '../services/FirebaseStorageService';
import { auth } from '../config/firebase';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import app from '../config/firebase';
import { BDSMPreference, Region } from '../types';
import { REGION_NAMES, REGION_LIST, getLocationFromRegion } from '../utils/regions';

type PhoneAuthScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PhoneAuth'
>;

interface Props {
  navigation: PhoneAuthScreenNavigationProp;
}

type AuthStep = 'phone' | 'code' | 'signup';

export default function PhoneAuthScreen({ navigation }: Props) {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
  const [age, setAge] = useState('');
  const [bdsmPreference, setBdsmPreference] = useState<BDSMPreference | undefined>(undefined);
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [userId, setUserId] = useState<string>('');
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const codeInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const recaptchaVerifierRef = useRef<FirebaseRecaptchaVerifierModal>(null);

  const BDSM_LABELS: Record<BDSMPreference, string> = {
    dominant: '지배',
    submissive: '복종',
    switch: '스위치',
    none: '없음',
  };

  const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#A29BFE', '#FFD93D', '#6C5CE7', '#4C6EF5'];

  // 이미지 선택
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

  // 이미지 제거
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

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 전화번호 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (text: string): string => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  // 인증 코드 발송
  const handleSendCode = useCallback(async () => {
    if (!phoneNumber || phoneNumber.replace(/[^0-9]/g, '').length !== 11) {
      Alert.alert('알림', '올바른 전화번호를 입력해주세요. (010-1234-5678)');
      return;
    }

    if (!recaptchaVerifierRef.current) {
      Alert.alert('오류', 'reCAPTCHA가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('인증 코드 발송 시도:', phoneNumber);
      const response = await firebaseAuthService.sendVerificationCode(phoneNumber, recaptchaVerifierRef.current);
      console.log('인증 코드 발송 응답:', response);
      
      if (response.success) {
        setStep('code');
        setCountdown(180); // 3분
        codeInputRef.current?.focus();
        Alert.alert('성공', response.message);
      } else {
        console.error('인증 코드 발송 실패:', response.message);
        Alert.alert('오류', response.message);
      }
    } catch (error: any) {
      console.error('인증 코드 발송 예외:', error);
      Alert.alert('오류', error.message || '인증 코드 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  // 인증 코드 검증
  const handleVerifyCode = useCallback(async () => {
    if (!code || code.length !== 6) {
      Alert.alert('알림', '인증 코드 6자리를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('인증 코드 검증 시작, 코드:', code);
      const verifyResponse = await firebaseAuthService.verifyCode(code);
      console.log('인증 코드 검증 응답:', {
        success: verifyResponse.success,
        verified: verifyResponse.verified,
        hasUser: !!verifyResponse.user,
        message: verifyResponse.message,
      });

      if (verifyResponse.success && verifyResponse.verified && verifyResponse.user) {
        // 인증 성공 후 무조건 회원가입 화면으로 이동
        console.log('인증 성공, 회원가입 화면으로 이동');
        console.log('사용자 UID:', verifyResponse.user.uid);
        setUserId(verifyResponse.user.uid);
        setStep('signup');
        // 키보드 포커스는 약간의 지연 후 설정
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      } else {
        console.error('인증 실패:', verifyResponse);
        Alert.alert('오류', verifyResponse.message || '인증에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('인증 코드 검증 예외:', error);
      console.error('에러 상세:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      Alert.alert('오류', error?.message || '인증 코드 검증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // 회원가입 완료 (또는 정보 업데이트)
  const handleSignup = useCallback(async () => {
    if (!name || name.trim().length < 2) {
      Alert.alert('알림', '닉네임은 2자 이상 입력해주세요.');
      return;
    }

    if (!gender) {
      Alert.alert('알림', '성별을 선택해주세요.');
      return;
    }

    if (!age || age.trim().length === 0) {
      Alert.alert('알림', '나이를 입력해주세요.');
      return;
    }

    const ageNum = parseInt(age.trim(), 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      Alert.alert('알림', '올바른 나이를 입력해주세요.');
      return;
    }

    if (!bdsmPreference) {
      Alert.alert('알림', 'BDSM 성향을 선택해주세요.');
      return;
    }

    if (!region) {
      Alert.alert('알림', '지역을 선택해주세요.');
      return;
    }

    if (!bio || bio.trim().length < 2) {
      Alert.alert('알림', '자기소개는 2자 이상 입력해주세요.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('오류', '인증이 만료되었습니다. 다시 시도해주세요.');
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = phoneNumber.replace(/[-\s]/g, '');
      const userId = currentUser.uid;

      // 지역에 해당하는 좌표 가져오기
      const location = getLocationFromRegion(region);

      // 이미지 업로드 (선택사항)
      let avatarUrl: string | undefined = undefined;
      if (avatarUri) {
        try {
          avatarUrl = await firebaseStorageService.uploadUserAvatar(userId, avatarUri);
          console.log('프로필 이미지 업로드 성공:', avatarUrl);
        } catch (error) {
          console.error('프로필 이미지 업로드 실패:', error);
          Alert.alert('알림', '프로필 이미지 업로드에 실패했습니다. 계속 진행합니다.');
        }
      }

      // 기존 사용자인지 확인 (포인트 유지를 위해)
      let existingUser = null;
      try {
        existingUser = await firebaseFirestoreService.getUser(userId);
      } catch (error) {
        // 사용자 조회 실패 시 신규 사용자로 간주
        console.log('기존 사용자 조회 실패, 신규 사용자로 처리:', error);
      }
      
      // Firestore에 사용자 정보 저장 (기존 사용자면 업데이트, 신규면 생성)
      const userData: {
        id: string;
        phoneNumber: string;
        name: string;
        avatar?: string;
        gender?: 'male' | 'female';
        age?: number;
        latitude: number;
        longitude: number;
        region?: Region;
        isAdmin: boolean;
        points?: number;
        bdsmPreference?: BDSMPreference;
        bio?: string;
      } = {
        id: userId,
        phoneNumber: normalizedPhone,
        name: name.trim(),
        avatar: avatarUrl,
        gender,
        age: parseInt(age.trim(), 10),
        latitude: location.latitude,
        longitude: location.longitude,
        region: region,
        isAdmin: false,
        bdsmPreference,
        bio: bio.trim(),
      };
      
      // 신규 사용자인 경우에만 포인트 설정 (기존 사용자는 포인트 유지)
      if (!existingUser) {
        userData.points = 1000; // 가입 시 기본 포인트
      }
      // 기존 사용자인 경우 points를 전달하지 않아서 기존 포인트가 유지됨
      
      await firebaseFirestoreService.createOrUpdateUser(userData);

      Alert.alert('성공', '회원가입이 완료되었습니다.');
      // 메인 화면으로 이동
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('오류', error.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, name, gender, age, bdsmPreference, bio, avatarUri, region, navigation]);

  // 인증 코드 재발송
  const handleResendCode = useCallback(async () => {
    if (countdown > 0) {
      Alert.alert('알림', `${countdown}초 후에 다시 시도할 수 있습니다.`);
      return;
    }

    await handleSendCode();
  }, [countdown, handleSendCode]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifierRef}
        firebaseConfig={app.options}
        attemptInvisibleVerification={true}
      />
      
      <View style={step === 'signup' ? styles.contentSignup : styles.content}>
        <Text style={styles.title}>
          {step === 'phone' && '전화번호 인증'}
          {step === 'code' && '인증 코드 입력'}
          {step === 'signup' && '회원가입'}
        </Text>

        {step === 'phone' && (
          <View style={styles.form}>
            <Text style={styles.label}>휴대폰 번호</Text>
            <TextInput
              style={styles.input}
              placeholder="010-1234-5678"
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              maxLength={13}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>인증 코드 받기</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <Text style={styles.label}>인증 코드</Text>
            <TextInput
              ref={codeInputRef}
              style={styles.input}
              placeholder="6자리 숫자"
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {countdown > 0 && (
              <Text style={styles.countdown}>
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>인증하기</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={countdown > 0}
            >
              <Text
                style={[
                  styles.resendText,
                  countdown > 0 && styles.resendTextDisabled,
                ]}
              >
                인증 코드 다시 받기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('phone');
                setCode('');
                setCountdown(0);
              }}
            >
              <Text style={styles.backText}>전화번호 다시 입력</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'signup' && (
          <ScrollView 
            style={styles.form} 
            contentContainerStyle={styles.signupFormContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 프로필 이미지 */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[(userId || name).length % AVATAR_COLORS.length] }]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
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

            <Text style={styles.label}>닉네임</Text>
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              placeholder="닉네임을 입력하세요"
              value={name}
              onChangeText={setName}
              maxLength={20}
              autoFocus
            />

            <Text style={styles.label}>성별</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'male' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('male')}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === 'male' && styles.genderTextActive,
                  ]}
                >
                  남성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'female' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('female')}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === 'female' && styles.genderTextActive,
                  ]}
                >
                  여성
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>나이</Text>
            <TextInput
              style={styles.input}
              placeholder="나이를 입력하세요"
              value={age}
              onChangeText={(text) => setAge(text.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
            />

            <Text style={styles.label}>지역</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowRegionDropdown(true)}
            >
              <Text style={[styles.dropdownText, !region && styles.dropdownPlaceholder]}>
                {region ? REGION_NAMES[region] : '선택하세요'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>BDSM 성향</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowBdsmDropdown(true)}
            >
              <Text style={[styles.dropdownText, !bdsmPreference && styles.dropdownPlaceholder]}>
                {bdsmPreference ? BDSM_LABELS[bdsmPreference] : '선택하세요'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>자기소개</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="자기소개를 입력하세요"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>완료</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('code');
                setName('');
                setGender(undefined);
                setAge('');
                setBdsmPreference(undefined);
                setBio('');
                setAvatarUri(undefined);
                setRegion(undefined);
              }}
            >
              <Text style={styles.backText}>인증 코드 다시 입력</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* 지역 선택 모달 */}
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

        {/* BDSM 성향 선택 모달 */}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  contentSignup: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  signupFormContent: {
    paddingTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#4C6EF5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  countdown: {
    fontSize: 14,
    color: '#F04438',
    textAlign: 'center',
    marginBottom: 12,
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#4C6EF5',
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: '#98A2B3',
  },
  backButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    color: '#667085',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderButtonActive: {
    borderColor: '#4C6EF5',
    backgroundColor: '#EEF2FF',
  },
  genderText: {
    fontSize: 16,
    color: '#667085',
    fontWeight: '500',
  },
  genderTextActive: {
    color: '#4C6EF5',
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111',
  },
  dropdownPlaceholder: {
    color: '#98A2B3',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#667085',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
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
});

