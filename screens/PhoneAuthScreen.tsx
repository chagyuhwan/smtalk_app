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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { authProvider } from '../services/AuthProviderFactory';
import { AUTH_PROVIDER_TYPE } from '../constants/auth';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { firebaseStorageService } from '../services/FirebaseStorageService';
import { auth } from '../config/firebase';
import { BDSMPreference, Region } from '../types';
import { REGION_NAMES, REGION_LIST, getLocationFromRegion } from '../utils/regions';
import { performanceMonitor } from '../utils/PerformanceMonitor';

type PhoneAuthScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PhoneAuth'
>;

interface Props {
  navigation: PhoneAuthScreenNavigationProp;
}

type AuthStep = 'phone' | 'code' | 'signup';

export default function PhoneAuthScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, 'PhoneAuth'>>();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('PhoneAuthScreen');
      return () => {
        performanceMonitor.endScreenLoad('PhoneAuthScreen');
      };
    }, [])
  );

  // NICE 인증 완료 후 돌아온 경우 처리
  useEffect(() => {
    const params = route.params;
    if (params?.verified && params?.userId) {
      console.log('[PhoneAuth] NICE 인증 완료, 회원가입 화면으로 이동');
      setUserId(params.userId);
      if (params.phoneNumber) {
        setPhoneNumber(params.phoneNumber);
      }
      setStep('signup');
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [route.params]);
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
  const [age, setAge] = useState('');
  const [bdsmPreference, setBdsmPreference] = useState<BDSMPreference[]>([]);
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [userId, setUserId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [showBdsmDropdown, setShowBdsmDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const codeInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

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

  const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#1F2937', '#FFD93D', '#1F2937', '#1F2937'];

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

    setLoading(true);
    try {
      console.log('인증 코드 발송 시도:', phoneNumber);
      const response = await authProvider.sendVerificationCode(phoneNumber);
      console.log('인증 코드 발송 응답:', response);
      
      if (response.success) {
        // NICE 인증인 경우 WebView로 이동
        if (AUTH_PROVIDER_TYPE === 'nice' && response.verificationId) {
          navigation.navigate('NiceAuthWebView', {
            authUrl: response.verificationId,
          });
          setLoading(false);
          return;
        }
        
        // Firebase 인증인 경우 기존 플로우
        // sessionId 저장
        if (response.sessionId) {
          setSessionId(response.sessionId);
        }
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
  }, [phoneNumber, navigation]);

  // 인증 코드 검증
  const handleVerifyCode = useCallback(async () => {
    if (!code || code.length !== 6) {
      Alert.alert('알림', '인증 코드 6자리를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('인증 코드 검증 시작, 코드:', code);
      const verifyResponse = await authProvider.verifyCode(code, sessionId);
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
  }, [code, sessionId]);

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

    // 성인인증: 만 19세 이상만 가입 가능
    if (ageNum < 19) {
      Alert.alert('가입 불가', '만 19세 이상만 가입할 수 있습니다.');
      return;
    }

    // 약관 동의 확인
    if (!agreedToTerms || !agreedToPrivacy) {
      Alert.alert('알림', '이용약관 및 개인정보 처리방침에 동의해주세요.');
      return;
    }

    // BDSM 성향은 선택사항이지만, 선택한 경우 최대 3개까지 가능
    if (bdsmPreference && bdsmPreference.length > 3) {
      Alert.alert('알림', 'BDSM 성향은 최대 3개까지 선택할 수 있습니다.');
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

    // authProvider를 통해 현재 사용자 정보 가져오기
    const currentAuthUser = authProvider.getCurrentUser();
    if (!currentAuthUser && !userId) {
      Alert.alert('오류', '인증이 만료되었습니다. 다시 시도해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 인증된 사용자의 전화번호를 우선 사용, 없으면 state의 phoneNumber 사용
      let phoneToUse = currentAuthUser?.phoneNumber || phoneNumber;
      
      // 둘 다 없거나 비어있는 경우 에러
      if (!phoneToUse || phoneToUse.trim() === '') {
        Alert.alert('오류', '전화번호 정보를 찾을 수 없습니다. 다시 인증해주세요.');
        setLoading(false);
        return;
      }
      
      // 전화번호 정규화: 하이픈, 공백 제거
      let normalizedPhone = phoneToUse.replace(/[-\s]/g, '');
      
      // 국가 코드가 포함된 경우 제거 (+82 또는 82로 시작)
      if (normalizedPhone.startsWith('+82')) {
        normalizedPhone = '0' + normalizedPhone.substring(3);
      } else if (normalizedPhone.startsWith('82') && normalizedPhone.length > 10) {
        normalizedPhone = '0' + normalizedPhone.substring(2);
      }
      
      // 정규화된 전화번호가 유효한지 확인 (11자리 숫자, 010으로 시작)
      if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('010')) {
        console.error('전화번호 검증 실패:', {
          original: phoneToUse,
          normalized: normalizedPhone,
          length: normalizedPhone.length,
          startsWith010: normalizedPhone.startsWith('010')
        });
        Alert.alert('오류', '유효하지 않은 전화번호입니다. 다시 인증해주세요.');
        setLoading(false);
        return;
      }
      
      console.log('회원가입 - 전화번호 확인:', {
        currentAuthUserPhone: currentAuthUser?.phoneNumber,
        statePhone: phoneNumber,
        phoneToUse: phoneToUse,
        normalizedPhone: normalizedPhone
      });
      
      // userId는 인증 단계에서 이미 설정됨
      const finalUserId = userId || currentAuthUser?.uid;
      if (!finalUserId) {
        Alert.alert('오류', '사용자 ID를 찾을 수 없습니다. 다시 인증해주세요.');
        setLoading(false);
        return;
      }

      // 지역에 해당하는 좌표 가져오기
      const location = getLocationFromRegion(region);

      // 이미지 업로드 (선택사항)
      let avatarUrl: string | undefined = undefined;
      if (avatarUri) {
        try {
          avatarUrl = await firebaseStorageService.uploadAvatar(finalUserId, avatarUri);
          console.log('프로필 이미지 업로드 성공:', avatarUrl);
        } catch (error) {
          console.error('프로필 이미지 업로드 실패:', error);
          Alert.alert('알림', '프로필 이미지 업로드에 실패했습니다. 계속 진행합니다.');
        }
      }

      // 기존 사용자인지 확인 (포인트 유지를 위해)
      let existingUser = null;
      try {
        existingUser = await firebaseFirestoreService.getUser(finalUserId);
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
        bdsmPreference?: BDSMPreference[];
        bio?: string;
      } = {
        id: finalUserId,
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
        userData.points = 100; // 가입 시 기본 포인트
      }
      // 기존 사용자인 경우 points를 전달하지 않아서 기존 포인트가 유지됨
      
      await firebaseFirestoreService.createOrUpdateUser(userData);

      // 약관 동의 내역 저장
      try {
        await firebaseFirestoreService.setUserAgreement(finalUserId, {
          termsAgreed: true,
          privacyAgreed: true,
          termsAgreedAt: Date.now(),
          privacyAgreedAt: Date.now(),
        });
      } catch (error) {
        console.error('약관 동의 내역 저장 실패:', error);
        // 약관 동의 저장 실패해도 회원가입은 진행
      }

      // Analytics: 회원가입 완료
      const { analyticsService } = await import('../services/AnalyticsService');
      analyticsService.logSignUp('phone');
      analyticsService.setUserId(finalUserId);

      Alert.alert('성공', '회원가입이 완료되었습니다.');
      // 메인 화면으로 이동
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('오류', error.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, name, gender, age, bdsmPreference, bio, avatarUri, region, navigation, agreedToTerms, agreedToPrivacy]);

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

            <Text style={styles.label}>닉네임 <Text style={styles.requiredMark}>*</Text></Text>
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              placeholder="닉네임을 입력하세요"
              value={name}
              onChangeText={setName}
              maxLength={20}
              autoFocus
            />

            <Text style={styles.label}>성별 <Text style={styles.requiredMark}>*</Text></Text>
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

            <Text style={styles.label}>나이 <Text style={styles.requiredMark}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="나이를 입력하세요"
              value={age}
              onChangeText={(text) => setAge(text.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
            />

            <Text style={styles.label}>지역 <Text style={styles.requiredMark}>*</Text></Text>
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
              <Text style={[styles.dropdownText, bdsmPreference.length === 0 && styles.dropdownPlaceholder]}>
                {bdsmPreference.length > 0 
                  ? bdsmPreference.map(pref => BDSM_LABELS[pref]).join(', ')
                  : '선택하세요'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {bdsmPreference.length > 0 && (
              <Text style={styles.hintText}>
                {bdsmPreference.length}/3 선택됨
              </Text>
            )}

            <Text style={styles.label}>자기소개 <Text style={styles.requiredMark}>*</Text></Text>
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

            {/* 약관 동의 */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxSelected]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>
                    <Text style={styles.checkboxLabelRequired}>[필수]</Text> 이용약관에 동의합니다
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('TermsOfService')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.termsLink}>약관 보기</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxSelected]}>
                  {agreedToPrivacy && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>
                    <Text style={styles.checkboxLabelRequired}>[필수]</Text> 개인정보 처리방침에 동의합니다
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.termsLink}>약관 보기</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>

            {/* 필수 입력 안내 문구 */}
            <Text style={styles.requiredInfoText}>
              <Text style={styles.requiredMark}>*</Text>로 표시된 항목은 필수이며, 표시가 없는 항목은 선택 입력입니다.
            </Text>

            <TouchableOpacity
              style={[styles.button, (loading || !agreedToTerms || !agreedToPrivacy) && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading || !agreedToTerms || !agreedToPrivacy}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>완료</Text>
              )}
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
                  // BDSM 성향은 선택사항이므로 바로 닫기
                  setShowBdsmDropdown(false);
                }}
              >
                <Text style={styles.modalConfirmButtonText}>확인</Text>
              </TouchableOpacity>
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
    backgroundColor: '#1F2937',
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
    color: '#1F2937',
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
    borderColor: '#1F2937',
    backgroundColor: '#F3F4F6',
  },
  genderText: {
    fontSize: 16,
    color: '#667085',
    fontWeight: '500',
  },
  genderTextActive: {
    color: '#1F2937',
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
    marginTop: -16,
    marginBottom: 20,
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
    backgroundColor: '#F3F4F6',
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
  termsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkboxChecked: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  checkboxLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#344054',
    lineHeight: 20,
  },
  checkboxLabelRequired: {
    color: '#F04438',
    fontWeight: '600',
  },
  termsLink: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  requiredMark: {
    color: '#F04438',
    fontWeight: '600',
  },
  requiredInfoText: {
    fontSize: 12,
    color: '#667085',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
});

