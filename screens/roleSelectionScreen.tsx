import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, UserRole } from '../contexts/AuthContext';
import ProfilePhotoPicker, { MediaSelection } from '../components/ProfilePhotoPicker';
import { createAdminProfile } from '../services/adminApi';

type RootStackParamList = {
  RoleSelection: undefined;
  HabitInput: undefined;
  Tabs: undefined;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROLE_PROFILE_PRESETS: Record<UserRole, { name: string; email: string; organization: string }> = {
  '일반 사용자': {
    name: '토닥 친구',
    email: 'general.user@todaki.app',
    organization: '나의 하루',
  },
  '기업 재직자': {
    name: '회사 친구',
    email: 'employee@todaki.app',
    organization: '토닥이 기업업',
  },
  '관리자': {
    name: '관리 담당자',
    email: 'admin.manager@todaki.app',
    organization: '토닥이 기업',
  },
};

const RoleSelectionScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUserRole, userProfile, updateProfile, completeOnboarding, isGoogleLogin } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(userProfile?.avatarUrl || '');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const roles: { role: UserRole; label: string; description: string }[] = [
    {
      role: '일반 사용자',
      label: '나',
      description: '일정만 관리해요',
    },
    {
      role: '기업 재직자',
      label: '회사에서 일하는 나',
      description: '회사 안전 수칙도 함께 봐요',
    },
    {
      role: '관리자',
      label: '관리자',
      description: '조직과 멤버를 관리할 수 있습니다',
    },
  ];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    // Google 로그인인 경우, Google에서 받아온 프로필 정보를 유지하고 preset은 사용하지 않음
    if (!isGoogleLogin) {
      const preset = ROLE_PROFILE_PRESETS[role];
      if (preset) {
        updateProfile(preset);
      }
    }
    // Google 로그인인 경우는 userProfile을 그대로 유지 (이름, 이메일 등은 이미 Google에서 받아온 값)
  };

  const handleNext = async () => {
    if (!selectedRole) return;

    try {
      // 관리자인 경우
      if (selectedRole === '관리자') {
        // 구글 로그인인 경우에만 서버 API 호출, 아니면 mock 데이터 사용
        if (isGoogleLogin) {
          // 구글 로그인: 서버 API 호출
          setIsCreatingAdmin(true);
          
          // 현재 프로필 정보 가져오기
          const email = userProfile?.email || '';
          const name = userProfile?.name || '';
          const avatarUrl = selectedAvatarUrl || userProfile?.avatarUrl || '';
          
          if (!email || !name) {
            Alert.alert('오류', '이메일과 이름이 필요합니다.');
            setIsCreatingAdmin(false);
            return;
          }

          console.log('[RoleSelection] 관리자 프로필 생성 API 호출...');
          console.log('[RoleSelection] 요청 데이터:', { email, name, avatarUrl, role: 'MANAGER' });

          // 관리자 프로필 생성 API 호출
          const adminProfile = await createAdminProfile({
            email,
            name,
            avatarUrl: avatarUrl || undefined,
            role: 'MANAGER',
          });

          console.log('[RoleSelection] 관리자 프로필 생성 성공:', JSON.stringify(adminProfile, null, 2));

          // 응답 데이터로 프로필 업데이트 (avartarUrl 오타 처리 포함)
          const responseAvatarUrl = adminProfile?.avatarUrl || adminProfile?.avartarUrl || avatarUrl || undefined;
          const updatedProfile = {
            id: adminProfile?.id, // 관리자 프로필 ID 저장
            name: adminProfile?.name || name,
            email: adminProfile?.email || email,
            organization: userProfile?.organization || '',
            avatarUrl: responseAvatarUrl,
          };

          console.log('[RoleSelection] 업데이트할 프로필:', JSON.stringify(updatedProfile, null, 2));
          
          // 관리자 역할도 확인 (응답에서 ADMIN으로 올 수 있음)
          if (adminProfile?.role) {
            console.log('[RoleSelection] 백엔드 응답 role:', adminProfile.role);
          }

          updateProfile(updatedProfile);
          setUserRole('관리자');

          await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
          completeOnboarding();
          navigation.replace('Tabs');
        } else {
          // 카카오/네이버 로그인 (mock): 서버 통신 없이 mock 데이터만 사용
          console.log('[RoleSelection] Mock 로그인 - 관리자 역할 설정 (서버 통신 없음)');
          
          const updatedProfile = {
            name: userProfile?.name || '김관리',
            email: userProfile?.email || 'admin@todaki.com',
            organization: userProfile?.organization || '토닥이 기업',
            avatarUrl: selectedAvatarUrl || userProfile?.avatarUrl || undefined,
          };

          updateProfile(updatedProfile);
          setUserRole('관리자');

          await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
          completeOnboarding();
          navigation.replace('Tabs');
        }
      } else {
        // 일반 사용자 또는 기업 재직자의 경우 기존 로직
        setUserRole(selectedRole);
        if (selectedAvatarUrl) {
          updateProfile({ avatarUrl: selectedAvatarUrl });
        }
        navigation.navigate('HabitInput');
      }
    } catch (error) {
      console.error('[RoleSelection] 오류:', error);
      Alert.alert('오류', error instanceof Error ? error.message : '역할 설정 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handlePhotoSave = (media: MediaSelection) => {
    setSelectedAvatarUrl(media.uri);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>나는 누구예요?</Text>
        <Text style={styles.subtitle}>
          {`나에게 맞는 것을 골라주세요.\n나중에 바꿀 수 있어요.`}
        </Text>
      </View>

      <View style={styles.roleContainer}>
        {roles.map((item) => {
          const isSelected = selectedRole === item.role;
          return (
            <TouchableOpacity
              key={item.role}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => handleRoleSelect(item.role)}
              activeOpacity={0.7}
            >
              <View style={styles.roleContent}>
                <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={[styles.roleDescription, isSelected && styles.roleDescriptionSelected]}>
                  {item.description}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.photoSection}>
        <Text style={styles.photoTitle}>내 얼굴이나 그림을 골라주세요</Text>
        <TouchableOpacity style={styles.photoSelectButton} onPress={() => setPhotoModalVisible(true)}>
          <Text style={styles.photoSelectText}>사진 고르기</Text>
        </TouchableOpacity>
        {selectedAvatarUrl ? (
          <Image source={{ uri: selectedAvatarUrl }} style={styles.photoPreview} />
        ) : (
          <Text style={styles.photoHint}>선택된 사진이 없어요.</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.nextButton,
          (!selectedRole || ((!selectedAvatarUrl) && selectedRole !== '관리자')) && styles.nextButtonDisabled,
        ]}
        onPress={handleNext}
        disabled={!selectedRole || ((!selectedAvatarUrl) && selectedRole !== '관리자') || isCreatingAdmin}
      >
        {isCreatingAdmin ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text
            style={[
              styles.nextButtonText,
              (!selectedRole || ((!selectedAvatarUrl) && selectedRole !== '관리자')) && styles.nextButtonTextDisabled,
            ]}
          >
            다음
          </Text>
        )}
      </TouchableOpacity>

      <ProfilePhotoPicker
        visible={photoModalVisible}
        initialUrl={selectedAvatarUrl}
        onClose={() => setPhotoModalVisible(false)}
        onSave={handlePhotoSave}
      />
    </ScrollView>
  );
};

export default RoleSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: SCREEN_HEIGHT * 0.05,
    paddingBottom: SCREEN_HEIGHT * 0.1,
  },
  header: {
    marginBottom: SCREEN_HEIGHT * 0.04,
    alignItems: 'center',
  },
  title: {
    fontSize: SCREEN_WIDTH * 0.07,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SCREEN_HEIGHT * 0.015,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#666',
    textAlign: 'center',
    lineHeight: SCREEN_HEIGHT * 0.025,
  },
  roleContainer: {
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SCREEN_WIDTH * 0.05,
    marginBottom: SCREEN_HEIGHT * 0.02,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  roleCardSelected: {
    borderColor: '#4D96FF',
    backgroundColor: '#F0F7FF',
  },
  roleContent: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'column',
    width: '100%',
  },
  roleLabel: {
    fontSize: SCREEN_WIDTH * 0.05,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SCREEN_HEIGHT * 0.01,
    width: '100%',
    flexShrink: 1,
  },
  roleLabelSelected: {
    color: '#4D96FF',
  },
  roleDescription: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: '#666',
    lineHeight: SCREEN_HEIGHT * 0.022,
    width: '100%',
    flexShrink: 1,
  },
  roleDescriptionSelected: {
    color: '#555',
  },
  checkmark: {
    width: SCREEN_WIDTH * 0.08,
    height: SCREEN_WIDTH * 0.08,
    borderRadius: SCREEN_WIDTH * 0.04,
    backgroundColor: '#4D96FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SCREEN_WIDTH * 0.03,
    flexShrink: 0,
    flexGrow: 0,
  },
  checkmarkText: {
    fontSize: SCREEN_WIDTH * 0.05,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  photoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: SCREEN_HEIGHT * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  photoTitle: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  photoSelectButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    alignSelf: 'center',
  },
  photoSelectText: {
    fontWeight: '700',
    color: '#000',
    fontSize: SCREEN_WIDTH * 0.04,
  },
  photoPreview: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    backgroundColor: '#F4F4F4',
  },
  photoHint: {
    color: '#666',
    fontSize: SCREEN_WIDTH * 0.035,
  },
  nextButton: {
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  nextButtonText: {
    color: '#000',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nextButtonTextDisabled: {
    color: '#777',
  },
});

