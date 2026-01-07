import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { notificationService } from '../services/NotificationService';
import { useChat } from '../context/ChatContext';
import { auth } from '../config/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationTestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { contacts, chatRooms } = useChat();
  const [testMessage, setTestMessage] = useState('테스트 메시지입니다');
  const [testSenderName, setTestSenderName] = useState('테스트 사용자');

  // 테스트 알림 표시
  const testMessageNotification = async () => {
    try {
      const testChatRoomId = chatRooms.length > 0 ? chatRooms[0].id : 'test-room-id';
      await notificationService.showMessageNotification(
        testSenderName,
        testMessage,
        testChatRoomId
      );
      Alert.alert('성공', '메시지 알림이 전송되었습니다.\n앱을 백그라운드로 보내면 알림을 확인할 수 있습니다.');
    } catch (error: any) {
      Alert.alert('오류', `알림 전송 실패: ${error.message}`);
    }
  };

  const testLikeNotification = async () => {
    try {
      const testLikerId = auth.currentUser?.uid || 'test-liker-id';
      const testLikedUserId = auth.currentUser?.uid || 'test-liked-user-id';
      await notificationService.showLikeNotification(
        testSenderName,
        testLikerId,
        testLikedUserId
      );
      Alert.alert('성공', '좋아요 알림이 전송되었습니다.\n앱을 백그라운드로 보내면 알림을 확인할 수 있습니다.');
    } catch (error: any) {
      Alert.alert('오류', `알림 전송 실패: ${error.message}`);
    }
  };

  const testPushToken = async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        Alert.alert(
          '푸시 토큰',
          `토큰: ${token.substring(0, 50)}...\n\nFirestore에 저장되었습니다.`,
          [{ text: '확인' }]
        );
      } else {
        Alert.alert('오류', '푸시 토큰을 가져올 수 없습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', `푸시 토큰 가져오기 실패: ${error.message}`);
    }
  };

  const checkPermissions = async () => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      Alert.alert(
        '알림 권한',
        hasPermission ? '알림 권한이 허용되었습니다.' : '알림 권한이 거부되었습니다.\n설정에서 권한을 허용해주세요.'
      );
    } catch (error: any) {
      Alert.alert('오류', `권한 확인 실패: ${error.message}`);
    }
  };

  const clearBadge = async () => {
    try {
      await notificationService.clearBadge();
      Alert.alert('성공', '알림 배지가 초기화되었습니다.');
    } catch (error: any) {
      Alert.alert('오류', `배지 초기화 실패: ${error.message}`);
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
        <Text style={styles.headerTitle}>알림 테스트</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 권한</Text>
          <TouchableOpacity style={styles.testButton} onPress={checkPermissions}>
            <Text style={styles.testButtonText}>알림 권한 확인</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>푸시 토큰</Text>
          <TouchableOpacity style={styles.testButton} onPress={testPushToken}>
            <Text style={styles.testButtonText}>푸시 토큰 가져오기</Text>
          </TouchableOpacity>
          <Text style={styles.description}>
            푸시 토큰을 가져와서 Firestore에 저장합니다.{'\n'}
            앱이 완전히 종료된 상태에서도 알림을 받으려면 필요합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메시지 알림 테스트</Text>
          <TextInput
            style={styles.input}
            placeholder="발신자 이름"
            value={testSenderName}
            onChangeText={setTestSenderName}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="메시지 내용"
            value={testMessage}
            onChangeText={setTestMessage}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.testButton} onPress={testMessageNotification}>
            <Text style={styles.testButtonText}>메시지 알림 전송</Text>
          </TouchableOpacity>
          <Text style={styles.description}>
            알림을 전송한 후 앱을 백그라운드로 보내면 알림을 확인할 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>좋아요 알림 테스트</Text>
          <TouchableOpacity style={styles.testButton} onPress={testLikeNotification}>
            <Text style={styles.testButtonText}>좋아요 알림 전송</Text>
          </TouchableOpacity>
          <Text style={styles.description}>
            알림을 전송한 후 앱을 백그라운드로 보내면 알림을 확인할 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기타</Text>
          <TouchableOpacity style={styles.testButton} onPress={clearBadge}>
            <Text style={styles.testButtonText}>알림 배지 초기화</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>테스트 방법</Text>
          <Text style={styles.infoText}>
            1. 알림 권한 확인 버튼을 눌러 권한이 허용되었는지 확인{'\n'}
            2. 메시지/좋아요 알림 전송 버튼을 누름{'\n'}
            3. 앱을 백그라운드로 보냄 (홈 버튼 누르기){'\n'}
            4. 알림이 표시되는지 확인{'\n'}
            5. 알림을 탭하면 해당 화면으로 이동하는지 확인
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    fontWeight: '600',
    color: '#111',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  testButton: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
  },
});







