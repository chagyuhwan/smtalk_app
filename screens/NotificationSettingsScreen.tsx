import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useChat } from '../context/ChatContext';
import { firebaseFirestoreService } from '../services/FirebaseFirestoreService';
import { auth } from '../config/firebase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notificationSettings, updateNotificationSettings } = useChat();
  const [enabled, setEnabled] = useState(notificationSettings?.enabled ?? true);
  const [messages, setMessages] = useState(notificationSettings?.messages ?? true);
  const [likes, setLikes] = useState(notificationSettings?.likes ?? true);
  const [reports, setReports] = useState(notificationSettings?.reports ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setEnabled(notificationSettings.enabled);
      setMessages(notificationSettings.messages);
      setLikes(notificationSettings.likes);
      setReports(notificationSettings.reports);
    }
  }, [notificationSettings]);

  const handleSave = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      const newSettings = {
        enabled,
        messages: enabled ? messages : false,
        likes: enabled ? likes : false,
        reports: enabled ? reports : false,
        updatedAt: Date.now(),
      };

      await firebaseFirestoreService.setNotificationSettings(firebaseUser.uid, newSettings);
      updateNotificationSettings(newSettings);
      
      Alert.alert('성공', '알림 설정이 저장되었습니다.');
    } catch (error: any) {
      console.error('알림 설정 저장 실패:', error);
      Alert.alert('오류', '알림 설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = (value: boolean) => {
    setEnabled(value);
    if (!value) {
      // 전체 알림을 끄면 모든 알림도 끔
      setMessages(false);
      setLikes(false);
      setReports(false);
    } else {
      // 전체 알림을 켜면 기본값으로 설정
      setMessages(true);
      setLikes(true);
      setReports(true);
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
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>알림 받기</Text>
              <Text style={styles.settingDescription}>
                모든 알림을 켜거나 끌 수 있습니다
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
              thumbColor={enabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {enabled && (
          <>
            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>알림 종류</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>메시지 알림</Text>
                  <Text style={styles.settingDescription}>
                    새 메시지를 받을 때 알림을 받습니다
                  </Text>
                </View>
                <Switch
                  value={messages}
                  onValueChange={setMessages}
                  trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
                  thumbColor={messages ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>좋아요 알림</Text>
                  <Text style={styles.settingDescription}>
                    누군가 내 프로필에 좋아요를 눌렀을 때 알림을 받습니다
                  </Text>
                </View>
                <Switch
                  value={likes}
                  onValueChange={setLikes}
                  trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
                  thumbColor={likes ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>신고 처리 알림</Text>
                  <Text style={styles.settingDescription}>
                    신고한 내용이 처리되었을 때 알림을 받습니다
                  </Text>
                </View>
                <Switch
                  value={reports}
                  onValueChange={setReports}
                  trackColor={{ false: '#E5E7EB', true: '#1F2937' }}
                  thumbColor={reports ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>저장</Text>
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  saveButton: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});







