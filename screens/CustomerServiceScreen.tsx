import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useChat } from '../context/ChatContext';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { auth } from '../config/firebase';
import { performanceMonitor } from '../utils/PerformanceMonitor';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: '포인트는 어떻게 충전하나요?',
    answer: '더보기 탭 > 포인트 충전 메뉴에서 원하는 포인트를 구매하실 수 있습니다. 결제는 앱 내 결제 시스템을 통해 진행됩니다.',
  },
  {
    id: '2',
    question: '출석체크는 언제 할 수 있나요?',
    answer: '매일 오전 00시 이후 출석체크를 하실 수 있으며, 출석체크 시 50포인트를 받으실 수 있습니다. 하루에 한 번만 가능합니다.',
  },
  {
    id: '3',
    question: '채팅을 시작하려면 포인트가 필요한가요?',
    answer: '네, 사용자와 채팅을 시작하거나 게시글에서 채팅을 시작할 때 70포인트가 차감됩니다. 포인트가 부족하면 채팅을 시작할 수 없습니다.',
  },
  {
    id: '4',
    question: '차단한 사용자는 어떻게 해제하나요?',
    answer: '더보기 탭 > 차단한 회원 메뉴에서 차단한 회원 목록을 확인하고, 차단 해제 버튼을 눌러 해제하실 수 있습니다.',
  },
  {
    id: '5',
    question: '부적절한 사용자나 게시글을 신고하려면?',
    answer: '사용자나 게시글 옆의 메뉴(⋯) 버튼을 눌러 신고하기를 선택하시면 됩니다. 신고 사유를 선택하여 신고하실 수 있습니다.',
  },
  {
    id: '6',
    question: '회원탈퇴는 어떻게 하나요?',
    answer: '더보기 탭 > 회원탈퇴 메뉴에서 탈퇴를 요청하실 수 있습니다. 탈퇴 요청 후 30일 동안 계정이 보관되며, 30일 이내에 다시 로그인하시면 탈퇴가 취소됩니다.',
  },
];

export default function CustomerServiceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentUser } = useChat();
  
  // 성능 측정: 화면 포커스 시
  useFocusEffect(
    React.useCallback(() => {
      performanceMonitor.startScreenLoad('CustomerServiceScreen');
      return () => {
        performanceMonitor.endScreenLoad('CustomerServiceScreen');
      };
    }, [])
  );
  
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [inquiryText, setInquiryText] = useState('');
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSubmitInquiry = async () => {
    const trimmed = inquiryText.trim();
    if (!trimmed) {
      Alert.alert('알림', '문의 내용을 입력해주세요.');
      return;
    }

    if (trimmed.length < 10) {
      Alert.alert('알림', '문의 내용을 10자 이상 입력해주세요.');
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    try {
      // Firestore에 문의 내용 저장
      await firebaseFirestoreService.createInquiry({
        userId: firebaseUser.uid,
        userName: currentUser.name,
        content: trimmed,
      });

      Alert.alert(
        '문의 접수',
        '문의가 접수되었습니다.\n빠른 시일 내에 답변드리겠습니다.',
        [
          {
            text: '확인',
            onPress: () => {
              setInquiryText('');
              setShowInquiryForm(false);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('문의 접수 실패:', error);
      const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.';
      Alert.alert('오류', `문의 접수에 실패했습니다.\n${errorMessage}\n\nFirebase Console에서 Firestore 규칙이 배포되었는지 확인해주세요.`);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고객센터</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* FAQ 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
          {FAQ_DATA.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(faq.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Text style={styles.faqToggle}>
                  {expandedFAQ === faq.id ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 1:1 문의 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1:1 문의하기</Text>
          {!showInquiryForm ? (
            <TouchableOpacity
              style={styles.inquiryButton}
              onPress={() => setShowInquiryForm(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.inquiryButtonText}>앱 내 문의하기</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inquiryForm}>
              <Text style={styles.inquiryLabel}>문의 내용</Text>
              <TextInput
                style={styles.inquiryInput}
                value={inquiryText}
                onChangeText={setInquiryText}
                placeholder="문의하실 내용을 입력해주세요 (최소 10자)"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{inquiryText.length}/500</Text>
              <View style={styles.inquiryActions}>
                <TouchableOpacity
                  style={[styles.inquiryActionButton, styles.cancelButton]}
                  onPress={() => {
                    setShowInquiryForm(false);
                    setInquiryText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inquiryActionButton, styles.submitButton]}
                  onPress={handleSubmitInquiry}
                >
                  <Text style={styles.submitButtonText}>문의하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 운영 시간 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 안내</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>운영 시간</Text>
            <Text style={styles.infoValue}>평일 09:00 ~ 18:00</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>답변 소요 시간</Text>
            <Text style={styles.infoValue}>1~2일 이내</Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 16,
    backgroundColor: '#fff',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
    paddingBottom: 12,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginRight: 12,
  },
  faqToggle: {
    fontSize: 12,
    color: '#667085',
  },
  faqAnswer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
  },
  inquiryButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  inquiryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  inquiryForm: {
    marginTop: 8,
  },
  inquiryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  inquiryInput: {
    backgroundColor: '#F4F6FB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  charCount: {
    fontSize: 12,
    color: '#8892B0',
    textAlign: 'right',
    marginTop: 4,
  },
  inquiryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  inquiryActionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F4F6FB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667085',
  },
  submitButton: {
    backgroundColor: '#1F2937',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
    color: '#667085',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
});

