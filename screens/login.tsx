import {
  Text,
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GoogleLoginButton from '../components/googleLoginBtn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, UserProfile, UserRole } from '../contexts/AuthContext';
import {
  saveAccessToken,
  exchangeGoogleIdToken,
  BackendUserPayload,
  fetchBackendUserProfile,
} from '../services/authApi';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// 환경 변수 로드 (ES6 import 방식)
import { WEB_CLIENT_ID as ENV_WEB_CLIENT_ID } from '@env';

const WEB_CLIENT_ID: string | undefined = ENV_WEB_CLIENT_ID;

if (WEB_CLIENT_ID) {
  console.log('[Google Sign-In] ✅ 환경 변수 로드 성공 - WEB_CLIENT_ID:', WEB_CLIENT_ID.substring(0, 30) + '...');
} else {
  console.warn('[Google Sign-In] ⚠️ 환경 변수 WEB_CLIENT_ID가 설정되지 않았습니다.');
  console.warn('[Google Sign-In] .env 파일에 WEB_CLIENT_ID를 추가해주세요.');
}

type RootStackParamList = {
  Login: undefined;
  RoleSelection: undefined;
  Tabs: undefined;
};

type AuthSuccessPayload = {
  accessToken: string;
  user?: BackendUserPayload;
};

// Mock 사용자 프로필 데이터 (mockMembers와 호환)
const MOCK_CORPORATE_USER: UserProfile = {
  name: '홍길동',
  email: 'user1@todaki.com', // mockMembers의 이메일과 일치
  organization: '토닥이 기업', // mockOrganizations의 조직 이름과 일치
  avatarUrl: undefined,
};

const MOCK_ADMIN_USER: UserProfile = {
  name: '김관리',
  email: 'admin@todaki.com', // mockOrganizations의 adminEmail과 일치
  organization: '토닥이 기업', // mockOrganizations의 조직 이름과 일치
  avatarUrl: undefined,
};

const LoginPage = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuth();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const authHandledRef = useRef(false);

  // Google Sign-In 초기화
  useEffect(() => {
    let webClientId: string | undefined = WEB_CLIENT_ID;
    
    // 환경 변수에서 가져오지 못했으면 기본값 사용 (google-services.json에서 추출한 값)
    if (!webClientId) {
      console.warn('[Google Sign-In] ⚠️ 환경 변수에서 WEB_CLIENT_ID를 찾지 못함');
      console.warn('[Google Sign-In] .env 파일에 WEB_CLIENT_ID를 추가해주세요.');
      console.warn('[Google Sign-In] 예: WEB_CLIENT_ID=your_client_id_here');
      console.warn('[Google Sign-In] 임시로 기본값 사용');
      webClientId = '.apps.googleusercontent.com';
    } else {
      console.log('[Google Sign-In] ✅ 환경 변수에서 WEB_CLIENT_ID 사용');
    }
    
    // SDK 초기화
    try {
      GoogleSignin.configure({
        webClientId: webClientId,
        offlineAccess: true, // 서버 사이드 접근을 위해 필요
        scopes: ['profile', 'email'],
      });
      console.log('[Google Sign-In] SDK 초기화 완료, webClientId:', webClientId);
    } catch (error) {
      console.error('[Google Sign-In] SDK 초기화 실패:', error);
      Alert.alert('오류', 'Google 로그인 초기화에 실패했습니다. 앱을 다시 시작해주세요.');
    }
  }, []);

  const resetAuthFlow = useCallback(() => {
    authHandledRef.current = false;
  }, []);

  const determineUserRole = useCallback((backendUser?: BackendUserPayload): UserRole => {
    if (!backendUser?.role) {
      console.log('역할이 없음, 기본값 반환: 일반 사용자');
      return '일반 사용자';
    }
    console.log('백엔드 역할:', backendUser.role, 'organizationUnitId:', backendUser.organizationUnitId);
    const roleUpper = backendUser.role.toUpperCase();
    if (roleUpper === 'MANAGER' || roleUpper === 'ADMIN') {
      console.log('MANAGER/ADMIN 역할 감지, 관리자로 반환');
      return '관리자';
    }
    if (roleUpper === 'USER') {
      const isEmployee = backendUser.organizationUnitId !== undefined && backendUser.organizationUnitId !== null;
      console.log('USER 역할 감지, organizationUnitId:', backendUser.organizationUnitId, '결과:', isEmployee ? '기업 재직자' : '일반 사용자');
      return isEmployee ? '기업 재직자' : '일반 사용자';
    }
    if (backendUser.role === '관리자' || backendUser.role === '기업 재직자' || backendUser.role === '일반 사용자') {
      console.log('한글 역할 감지:', backendUser.role);
      return backendUser.role;
    }
    console.log('알 수 없는 역할, 기본값 반환: 일반 사용자');
    return '일반 사용자';
  }, []);

  const buildUserProfile = useCallback((backendUser?: BackendUserPayload): UserProfile => {
    const profile: UserProfile = {
      name: backendUser?.name || '사용자',
      email: backendUser?.email || '',
      organization: backendUser?.organization || '',
      avatarUrl: backendUser?.avatarUrl || undefined,
    };
    console.log('🔨 buildUserProfile 입력:', JSON.stringify(backendUser, null, 2));
    console.log('🔨 buildUserProfile 출력:', JSON.stringify(profile, null, 2));
    return profile;
  }, []);

  const completeAuth = useCallback(
    async (payload: AuthSuccessPayload) => {
      if (!payload.accessToken) return;
      if (authHandledRef.current) return;

      authHandledRef.current = true;

      try {
        await saveAccessToken(payload.accessToken);

        let backendUser = payload.user || {};
        console.log('백엔드 사용자 정보:', JSON.stringify(backendUser, null, 2));

        try {
          const refreshedProfile = await fetchBackendUserProfile();
          if (refreshedProfile) {
            backendUser = {
              ...backendUser,
              ...refreshedProfile,
              avatarUrl: refreshedProfile.avatarUrl || backendUser.avatarUrl,
            };
            console.log('[Google Login] 서버 프로필 동기화 완료:', JSON.stringify(backendUser, null, 2));
          }
        } catch (error) {
          console.warn('[Google Login] 서버 프로필 동기화 실패:', error);
        }

        const userRole = determineUserRole(backendUser);
        console.log('결정된 사용자 역할:', userRole);
        const profile = buildUserProfile(backendUser);
        console.log('✅ 생성된 프로필:', JSON.stringify(profile, null, 2));

        // 구글 로그인: isGoogleLogin = true
        await login(userRole, profile, payload.accessToken, backendUser?.organizationUnitId ?? undefined, true);
        console.log('✅ login 함수 호출 완료');

        const hasCompleted = await AsyncStorage.getItem('hasCompletedOnboarding');

        setIsSigningIn(false);
        if (hasCompleted === 'true') {
          navigation.replace('Tabs');
        } else {
          navigation.replace('RoleSelection');
        }
      } catch (error) {
        authHandledRef.current = false;
        throw error;
      } finally {
        setIsSigningIn(false);
      }
    },
    [buildUserProfile, determineUserRole, login, navigation],
  );

  const handleAuthPayload = useCallback(
    async (payload: AuthSuccessPayload | null) => {
      if (!payload?.accessToken) {
        console.warn('[Google Login] payload에 accessToken이 없음');
        setIsSigningIn(false);
        return;
      }

      try {
        // completeAuth가 비동기이므로 await로 기다림
        // completeAuth 내부에서 네비게이션 처리하므로 여기서는 추가 작업 불필요
        await completeAuth(payload);
      } catch (error) {
        console.error('[Google Login] 로그인 처리 오류:', error);
        Alert.alert('로그인 실패', error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.');
        setIsSigningIn(false);
      }
    },
    [completeAuth],
  );

  // 기업 재직자 로그인 시뮬레이션
  const handleCorporateUserLogin = async () => {
    if (isSigningIn) return;

    try {
      setIsSigningIn(true);
      
      // 로그인 시뮬레이션 (약간의 딜레이)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock 토큰 생성
      const mockToken = 'mock_token_corporate';

      // 기업 재직자로 로그인 (mock 로그인: isGoogleLogin = false)
      await login('기업 재직자', MOCK_CORPORATE_USER, mockToken, undefined, false);
      
      // 항상 온보딩 플로우를 거치도록 RoleSelection으로 이동
      navigation.replace('RoleSelection');
    } catch (error) {
      console.error('로그인 오류:', error);
      Alert.alert('로그인 실패', '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // 관리자 로그인 시뮬레이션
  const handleAdminLogin = async () => {
    if (isSigningIn) return;

    try {
      setIsSigningIn(true);
      
      // 로그인 시뮬레이션 (약간의 딜레이)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock 토큰 생성
      const mockToken = 'mock_token_admin';

      // 관리자로 로그인 (mock 로그인: isGoogleLogin = false)
      await login('관리자', MOCK_ADMIN_USER, mockToken, undefined, false);
      
      // 항상 RoleSelection으로 이동해 온보딩 단계를 강제 실행
      navigation.replace('RoleSelection');
    } catch (error) {
      console.error('로그인 오류:', error);
      Alert.alert('로그인 실패', '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogin = useCallback(async () => {
    console.log('[Google Login] ========== 버튼 클릭 시작 ==========');
    
    if (isSigningIn) {
      console.log('[Google Login] 이미 로그인 중이므로 리턴');
      return;
    }

    try {
      resetAuthFlow();
      setIsSigningIn(true);

      console.log('[Google Login] Google Sign-In 시작...');
      
      // Google Sign-In 시도
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      console.log('[Google Login] Google Sign-In 성공');
      
      // userInfo 구조 확인 및 idToken 추출
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      const googleUser = userInfo.data?.user || (userInfo as any).user;
      
      if (!idToken) {
        throw new Error('ID 토큰을 받지 못했습니다.');
      }
      
      console.log('[Google Login] ID 토큰 받음, 백엔드에 전달 중...');
      console.log('[Google Login] Google 사용자 이메일:', googleUser?.email);
      
      // 백엔드 API 호출하여 액세스 토큰 받기
      const authData = await exchangeGoogleIdToken(idToken);
      
      console.log('[Google Login] 백엔드 인증 성공, 액세스 토큰 받음');
      console.log('[Google Login] 백엔드에서 받은 사용자 정보:', JSON.stringify(authData.user, null, 2));
      
      // 사용자 정보 구성 (백엔드 응답 우선, 없으면 Google 사용자 정보 사용)
      const backendUser = authData.user || {};
      const authPayload: AuthSuccessPayload = {
        accessToken: authData.accessToken,
        user: {
          id: backendUser.id,
          email: backendUser.email || googleUser?.email || undefined,
          name: backendUser.name || googleUser?.name || undefined,
          avatarUrl: backendUser.avatarUrl || googleUser?.photo || undefined,
          role: backendUser.role,
          organization: backendUser.organization,
          organizationUnitId: backendUser.organizationUnitId,
        },
      };
      
      console.log('[Google Login] 최종 인증 페이로드:', JSON.stringify(authPayload, null, 2));
      
      await handleAuthPayload(authPayload);
      
    } catch (error: any) {
      console.error('[Google Login] 오류:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Google Login] 사용자가 로그인 취소');
        Alert.alert('로그인 취소', '로그인이 취소되었습니다.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('[Google Login] 로그인 진행 중');
        // 이미 로그인 중이므로 아무 작업도 하지 않음
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.error('[Google Login] Google Play Services를 사용할 수 없음');
        Alert.alert('오류', 'Google Play Services를 사용할 수 없습니다. 기기를 확인해주세요.');
      } else {
        const errorMessage = error.message || '로그인 중 오류가 발생했습니다.';
        console.error('[Google Login] 기타 오류:', errorMessage);
        Alert.alert('로그인 실패', errorMessage);
      }
      
      setIsSigningIn(false);
    }
  }, [isSigningIn, resetAuthFlow, handleAuthPayload]);

  return (
    <>
    <View style={styles.container}>
      {/* 앱 로고/아이콘 */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/icons/hug_icon_new.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>토닥</Text>
      
      {isSigningIn ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4D96FF" />
          <Text style={styles.loadingText}>로그인 중...</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            onPress={handleCorporateUserLogin}
            disabled={isSigningIn}
            style={styles.buttonContainer}
          >
            <Image 
              source={require('../assets/icons/btnD_com.png')} 
              style={styles.imageButton} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleAdminLogin}
            disabled={isSigningIn}
            style={styles.buttonContainer}
          >
            <Image 
              source={require('../assets/icons/kakao_login_medium_narrow.png')} 
              style={styles.imageButton} 
            />
          </TouchableOpacity>
          
          <GoogleLoginButton 
            onPress={handleGoogleLogin} 
            style={styles.googleButton} 
          />
        </>
      )}
    </View>

    </>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 100,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  imageButton: {
    width: 200,
    height: 60,
    resizeMode: 'contain',
  },
  buttonLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  htmlButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  htmlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    width: 200,
    height: 50,
    marginVertical: 10,
  },
});