import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AdminNav = NativeStackNavigationProp<Record<string, never>>;

const AdminInputScreen = () => {
  const navigation = useNavigation<AdminNav>();
  const { addOrganization, assignMemberToOrganization, loading, error } = useAdmin();
  const { setUserRole } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const handleSubmit = async () => {
    // 입력 검증
    if (!email.trim() || !name.trim() || !organizationName.trim()) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }

    // 이메일 형식 검증 (간단한 검증)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }

    // 조직이 존재하는지 확인하고, 없으면 생성
    // 멤버를 조직에 할당
    const org = await addOrganization(organizationName, name, email);
    if (org) {
      const success = await assignMemberToOrganization(email, organizationName, name);
      if (success) {
        Alert.alert('성공', '조직에 성공적으로 할당되었습니다.', [
          {
            text: '확인',
            onPress: () => {
              // 기업 재직자로 역할 변경
              setUserRole('기업 재직자');
              // 입력 필드 초기화
              setEmail('');
              setName('');
              setOrganizationName('');
            },
          },
        ]);
      } else {
        Alert.alert('오류', error || '멤버 할당에 실패했습니다.');
      }
    } else {
      // 조직이 이미 존재하는 경우, 기존 조직에 할당 시도
      const success = await assignMemberToOrganization(email, organizationName, name);
      if (success) {
        Alert.alert('성공', '기존 조직에 성공적으로 할당되었습니다.', [
          {
            text: '확인',
            onPress: () => {
              setUserRole('기업 재직자');
              setEmail('');
              setName('');
              setOrganizationName('');
            },
          },
        ]);
      } else {
        Alert.alert('오류', error || '멤버 할당에 실패했습니다.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <FeatherIcon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>조직 등록</Text>
          <Text style={styles.subtitle}>
            이메일, 이름, 조직 이름을 입력해주세요
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="예: user@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 홍길동"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>조직 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 토닥이 기업"
              value={organizationName}
              onChangeText={setOrganizationName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.submitButtonText}>등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AdminInputScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: SCREEN_HEIGHT * 0.05,
    paddingBottom: SCREEN_HEIGHT * 0.05,
  },
  topActions: {
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    marginBottom: SCREEN_HEIGHT * 0.04,
    alignItems: 'center',
  },
  title: {
    fontSize: SCREEN_WIDTH * 0.08,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  subtitle: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: SCREEN_HEIGHT * 0.025,
  },
  label: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '600',
    color: '#333',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    fontSize: SCREEN_WIDTH * 0.04,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: SCREEN_WIDTH * 0.035,
    marginBottom: SCREEN_HEIGHT * 0.02,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SCREEN_HEIGHT * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#FFD54F',
  },
  submitButtonText: {
    color: '#000000',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
  },
});

