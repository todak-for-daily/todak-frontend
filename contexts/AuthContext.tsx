import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import {
  getAccessToken,
  removeAccessToken,
  getUserProfile,
  saveUserProfile,
  getOnboardingComplete,
  saveOnboardingComplete,
  logout as logoutApi,
  fetchBackendUserProfile,
} from '../services/authApi';

// 사용자 역할 타입
export type UserRole = '일반 사용자' | '관리자' | '기업 재직자';

// 사용자 프로필 타입
export interface UserProfile {
  id?: number; // 관리자 프로필 ID (관리자인 경우에만 사용)
  name: string;
  email: string;
  organization: string;
  avatarUrl?: string;
}

// 인증 컨텍스트 타입
interface AuthContextType {
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  isGoogleLogin: boolean; // 구글 로그인 여부 (true: 구글, false: 카카오/네이버 mock)
  setUserRole: (role: UserRole | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  login: (role: UserRole, profile: UserProfile, token: string, organizationUnitId?: number, isGoogleLogin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  isAdmin: boolean;
  isEmployed: boolean;
  canAccessWorkTab: boolean;
  isLoggedIn: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 컴포넌트
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGoogleLogin, setIsGoogleLogin] = useState<boolean>(false); // 구글 로그인 여부

  const isAdmin = userRole === '관리자';
  const isEmployed = userRole === '기업 재직자';
  const canAccessWorkTab = isAdmin || isEmployed;
  const isLoggedIn = userRole !== null && userProfile !== null;

  // 역할 문자열을 UserRole 타입으로 변환
  // 백엔드 API role: MANAGER, USER
  // USER는 organizationUnitId 유무로 구분 (있으면 기업 재직자, 없으면 일반 사용자)
  const normalizeRole = (role?: string, organizationUnitId?: number | null): UserRole | null => {
    if (!role) return null;
    const roleUpper = role.toUpperCase();
    if (roleUpper === 'MANAGER' || roleUpper === 'ADMIN') return '관리자';
    if (roleUpper === 'USER') {
      // organizationUnitId가 있으면 기업 재직자, 없으면 일반 사용자
      if (organizationUnitId !== undefined && organizationUnitId !== null) {
        return '기업 재직자';
      }
      return '일반 사용자';
    }
    // 한글 role도 지원 (하위 호환성)
    if (role === '관리자') return '관리자';
    if (role === '기업 재직자') return '기업 재직자';
    if (role === '일반 사용자') return '일반 사용자';
    return null;
  };

  // 인증 상태 확인 (앱 시작 시 호출)
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getAccessToken();
      
      if (!token) {
        // 토큰이 없으면 로그인 상태 초기화
        setUserRole(null);
        setUserProfile(null);
        setHasCompletedOnboarding(false);
        setIsGoogleLogin(false);
        setIsLoading(false);
        return;
      }

      // 저장된 프로필 정보 로드
      let savedProfile = await getUserProfile();
      const savedOnboarding = await getOnboardingComplete();

      // 토큰이 mock 토큰인지 확인하여 구글 로그인 여부 판단
      const isMockToken = token.startsWith('mock_token_');
      setIsGoogleLogin(!isMockToken);

      // 프로필이 없거나 빈 프로필인 경우, Google 로그인이면 백엔드에서 프로필 가져오기 시도
      if ((!savedProfile || !savedProfile.email || !savedProfile.name) && !isMockToken) {
        try {
          console.log('[checkAuth] 저장된 프로필이 없어 백엔드에서 프로필 가져오기 시도...');
          const backendProfile = await fetchBackendUserProfile();
          
          if (backendProfile) {
            console.log('[checkAuth] 백엔드 프로필 가져오기 성공:', JSON.stringify(backendProfile, null, 2));
            // 백엔드 프로필로 프로필 생성
            savedProfile = {
              email: backendProfile.email || '',
              name: backendProfile.name || '',
              avatarUrl: backendProfile.avatarUrl,
              role: backendProfile.role,
              organization: backendProfile.organization || '',
              organizationUnitId: backendProfile.organizationUnitId,
            };
            // 프로필 저장
            await saveUserProfile(savedProfile);
            console.log('[checkAuth] 백엔드 프로필 저장 완료');
          }
        } catch (error) {
          console.warn('[checkAuth] 백엔드 프로필 가져오기 실패:', error);
        }
      }

      if (savedProfile && savedProfile.email && savedProfile.name) {
        // 저장된 프로필이 있으면 복원
        const normalizedRole = normalizeRole(savedProfile.role, savedProfile.organizationUnitId);
        setUserRole(normalizedRole);
        setUserProfile({
          name: savedProfile.name || '',
          email: savedProfile.email || '',
          organization: savedProfile.organization || '',
          avatarUrl: savedProfile.avatarUrl,
        });
        setHasCompletedOnboarding(savedOnboarding);
      } else {
        // 프로필이 없으면 토큰만 있는 상태 (백엔드에서 사용자 정보 가져오기 필요)
        // 여기서는 토큰만 있고 프로필이 없는 경우는 로그인 화면으로 이동하도록 처리
        await removeAccessToken();
        setUserRole(null);
        setUserProfile(null);
        setHasCompletedOnboarding(false);
        setIsGoogleLogin(false);
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      // 오류 발생 시 로그인 상태 초기화
      await removeAccessToken();
      setUserRole(null);
      setUserProfile(null);
      setHasCompletedOnboarding(false);
      setIsGoogleLogin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 앱 시작 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (role: UserRole, profile: UserProfile, token: string, organizationUnitId?: number, isGoogleLoginFlag: boolean = false) => {
    try {
      // 프로필 저장 (organizationUnitId 포함)
      const profileToSave = {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        role: role,
        organization: profile.organization,
        organizationUnitId: organizationUnitId,
      };
      console.log('💾 저장할 프로필:', JSON.stringify(profileToSave, null, 2));
      await saveUserProfile(profileToSave);
      console.log('💾 프로필 저장 완료');

      // 상태 업데이트
      console.log('🔄 상태 업데이트 전 - userRole:', role, 'userProfile:', JSON.stringify(profile, null, 2), 'isGoogleLogin:', isGoogleLoginFlag);
      setUserRole(role);
      setUserProfile(profile);
      setIsGoogleLogin(isGoogleLoginFlag); // 구글 로그인 여부 설정
      console.log('🔄 상태 업데이트 완료');
      
      // 온보딩 완료 여부 확인
      const savedOnboarding = await getOnboardingComplete();
      setHasCompletedOnboarding(savedOnboarding);
    } catch (error) {
      console.error('로그인 상태 저장 오류:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // 백엔드 API 호출하여 로그아웃 처리 (리프레시 토큰 쿠키 삭제)
      // API 호출은 내부에서 토큰 삭제도 처리하므로, 상태만 초기화하면 됨
      await logoutApi();
      
      // 상태 초기화
      setUserRole(null);
      setUserProfile(null);
      setHasCompletedOnboarding(false);
      setIsGoogleLogin(false); // 구글 로그인 플래그 초기화
    } catch (error) {
      console.error('로그아웃 오류:', error);
      // 에러가 발생해도 로컬 상태는 초기화
      try {
        await removeAccessToken();
      } catch {
        // 무시
      }
      setUserRole(null);
      setUserProfile(null);
      setHasCompletedOnboarding(false);
      setIsGoogleLogin(false);
      throw error;
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await saveOnboardingComplete(true);
    setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('온보딩 완료 상태 저장 오류:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const updatedProfile = userProfile ? { ...userProfile, ...updates } : null;
      setUserProfile(updatedProfile);
      
      // 프로필 업데이트 시 AsyncStorage에도 저장
      if (updatedProfile && userRole) {
        try {
          const savedProfile = await getUserProfile();
          await saveUserProfile({
            email: updatedProfile.email,
            name: updatedProfile.name,
            avatarUrl: updatedProfile.avatarUrl,
            role: userRole,
            organization: updatedProfile.organization,
            organizationUnitId: savedProfile?.organizationUnitId,
          });
        } catch (error) {
          console.error('프로필 업데이트 저장 오류:', error);
        }
      }
    },
    [userProfile, userRole],
  );

  const value = {
    userRole,
    userProfile,
    hasCompletedOnboarding,
    isLoading,
    isGoogleLogin,
    setUserRole,
    setUserProfile,
    setHasCompletedOnboarding,
    login,
    logout,
    completeOnboarding,
    updateProfile,
    isAdmin,
    isEmployed,
    canAccessWorkTab,
    isLoggedIn,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

