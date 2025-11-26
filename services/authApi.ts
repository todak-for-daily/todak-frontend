import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBase } from './apiConfig';

// 인증 토큰 관련 상수
const TOKEN_STORAGE_KEY = 'userToken';
const USER_PROFILE_STORAGE_KEY = 'userProfile';
const USER_ROLE_STORAGE_KEY = 'userRole';
const ONBOARDING_COMPLETE_KEY = 'hasCompletedOnboarding';

/**
 * Google 로그인 API 호출
 * GET /api/auth/login/google (파라미터 없음)
 */
// 백엔드에서 받은 사용자 정보 타입
export type BackendUserPayload = {
  id?: number;
  email?: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  organization?: string;
  organizationUnitId?: number | null;
};

const PROFILE_ENDPOINTS = ['/api/auth/profile', '/api/user/profile', '/api/admin/profile'];

const normalizeBackendUser = (data: any): BackendUserPayload | null => {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const entry of data) {
      const normalized = normalizeBackendUser(entry);
      if (normalized) return normalized;
    }
    return null;
  }

  if (data.user) {
    const nested = normalizeBackendUser(data.user);
    if (nested) return nested;
  }

  const candidate: BackendUserPayload = {
    id: data.id ?? data.userId ?? data.memberId,
    email: data.email ?? data.userEmail ?? data.username,
    name: data.name ?? data.userName ?? data.nickname,
    avatarUrl: data.avatarUrl ?? data.avatar ?? data.picture ?? data.photoUrl,
    role: data.role ?? data.userRole ?? data.type,
    organization: data.organization ?? data.organizationName ?? data.company ?? data.companyName,
    organizationUnitId:
      data.organizationUnitId ??
      data.orgUnitId ??
      data.organizationUnit ??
      data.departmentId ??
      data.unitId ??
      null,
  };

  const hasRealData = candidate.email || candidate.name || candidate.role || candidate.organization;
  return hasRealData ? candidate : null;
};

export const exchangeGoogleIdToken = async (idToken: string): Promise<{
  accessToken: string;
  user?: BackendUserPayload;
}> => {
  try {
    console.log('[exchangeGoogleIdToken] 백엔드 API 호출 중...');
    console.log('[exchangeGoogleIdToken] ID Token:', idToken.substring(0, 20) + '...');
    
    // 백엔드 API 엔드포인트: POST /api/auth/google
    const url = `${getBackendBase()}/api/auth/google`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        idToken: idToken,
      }),
    });

    const contentType = response.headers.get('Content-Type') || '';
    console.log('[exchangeGoogleIdToken] 응답 상태:', response.status, response.statusText);
    console.log('[exchangeGoogleIdToken] Content-Type:', contentType);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Google 로그인 실패: ${response.status} ${errorText.substring(0, 200)}`);
    }

    let data: any;

    // Content-Type에 따라 처리
    if (contentType.includes('application/json')) {
      // JSON 응답인 경우
      console.log('[exchangeGoogleIdToken] JSON 응답 받음');
      data = await response.json();
    } else if (contentType.includes('text/html')) {
      // HTML 응답인 경우, 텍스트에서 JSON 추출 시도
      const htmlText = await response.text();
      console.log('[exchangeGoogleIdToken] HTML 응답 받음, JSON 추출 시도...');
      console.log('[exchangeGoogleIdToken] HTML 내용 (처음 500자):', htmlText.substring(0, 500));
      
      // HTML에서 JSON 객체 찾기
      let jsonData: any = null;
      
      // 방법 1: 순수 JSON 파싱 시도 (HTML이 실제로는 JSON일 수 있음)
      try {
        const trimmedText = htmlText.trim();
        if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
          jsonData = JSON.parse(trimmedText);
          console.log('[exchangeGoogleIdToken] 직접 JSON 파싱 성공');
        }
      } catch {
        // 방법 2: 정규식으로 JSON 객체 찾기
        const jsonPatterns = [
          /\{[\s\S]*?"accessToken"[\s\S]*?\}/,
          /\{[\s\S]*?"token"[\s\S]*?\}/,
          /\{"accessToken":\s*"[^"]+"[^}]*\}/,
          /\{"token":\s*"[^"]+"[^}]*\}/,
        ];
        
        for (const pattern of jsonPatterns) {
          const match = htmlText.match(pattern);
          if (match) {
            try {
              jsonData = JSON.parse(match[0]);
              console.log('[exchangeGoogleIdToken] 정규식으로 JSON 추출 성공');
              break;
            } catch {
              continue;
            }
          }
        }
      }
      
      if (!jsonData) {
        console.error('[exchangeGoogleIdToken] HTML에서 JSON을 추출할 수 없음');
        console.error('[exchangeGoogleIdToken] HTML 전체 내용:', htmlText);
        throw new Error('HTML 응답에서 JSON을 추출할 수 없습니다.');
      }
      
      data = jsonData;
    } else {
      // 기타 Content-Type
      console.warn('[exchangeGoogleIdToken] 알 수 없는 Content-Type:', contentType);
      // 일단 JSON으로 파싱 시도
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(`지원하지 않는 Content-Type: ${contentType}. 응답: ${text.substring(0, 200)}`);
      }
    }
    
    // 백엔드 응답 전체 로깅
    console.log('[exchangeGoogleIdToken] 백엔드 응답 전체:', JSON.stringify(data, null, 2));
    
    if (!data.accessToken && !data.token) {
      console.error('[exchangeGoogleIdToken] 응답 데이터:', data);
      throw new Error('액세스 토큰을 받지 못했습니다.');
    }

    const accessToken = data.accessToken || data.token;
    
    // 사용자 정보 추출 (여러 가능한 구조 지원)
    let userData = data.user;
    
    // user 객체가 없으면 최상위 레벨의 필드들을 user 객체로 구성
    if (!userData && (data.id || data.email || data.name || data.role)) {
      userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl || data.avatar || data.picture,
        role: data.role,
        organization: data.organization,
        organizationUnitId: data.organizationUnitId,
      };
      console.log('[exchangeGoogleIdToken] 최상위 레벨에서 사용자 정보 구성:', userData);
    }
    
    // userData가 여전히 없으면 빈 객체
    if (!userData) {
      console.warn('[exchangeGoogleIdToken] 사용자 정보가 없음, 빈 객체 사용');
      userData = {};
    }
    
    console.log('[exchangeGoogleIdToken] 최종 사용자 정보:', JSON.stringify(userData, null, 2));

    return {
      accessToken,
      user: userData,
    };
  } catch (error) {
    console.error('[exchangeGoogleIdToken] API 오류:', error);
    throw error;
  }
};

/**
 * 액세스 토큰 저장
 */
export const saveAccessToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error('토큰 저장 실패:', error);
    throw error;
  }
};

/**
 * 액세스 토큰 조회
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('토큰 조회 실패:', error);
    return null;
  }
};

/**
 * 액세스 토큰 삭제
 */
export const removeAccessToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_ROLE_STORAGE_KEY);
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch (error) {
    console.error('토큰 삭제 실패:', error);
    throw error;
  }
};

/**
 * 사용자 프로필 저장
 */
export const saveUserProfile = async (profile: {
  email?: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  organization?: string;
  organizationUnitId?: number;
}): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (profile.role) {
      await AsyncStorage.setItem(USER_ROLE_STORAGE_KEY, profile.role);
    }
  } catch (error) {
    console.error('사용자 프로필 저장 실패:', error);
    throw error;
  }
};

/**
 * 사용자 프로필 조회
 */
export const getUserProfile = async (): Promise<{
  email?: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  organization?: string;
  organizationUnitId?: number;
} | null> => {
  try {
    const profileString = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!profileString) return null;
    return JSON.parse(profileString);
  } catch (error) {
    console.error('사용자 프로필 조회 실패:', error);
    return null;
  }
};

/**
 * 온보딩 완료 상태 저장
 */
export const saveOnboardingComplete = async (completed: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, completed ? 'true' : 'false');
  } catch (error) {
    console.error('온보딩 상태 저장 실패:', error);
    throw error;
  }
};

/**
 * 온보딩 완료 상태 조회
 */
export const getOnboardingComplete = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('온보딩 상태 조회 실패:', error);
    return false;
  }
};

/**
 * 인증된 API 요청 헬퍼
 */
type RequestHeaders = Record<string, string>;

export const authenticatedRequest = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
  }

  const headers: RequestHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (options.headers) {
    if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers as RequestHeaders);
    }
  }

  const response = await fetch(`${getBackendBase()}${endpoint}`, {
    ...options,
    headers,
  });

  // 토큰이 만료되었거나 유효하지 않은 경우
  if (response.status === 401) {
    await removeAccessToken();
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  return response;
};

export const fetchBackendUserProfile = async (): Promise<BackendUserPayload | null> => {
  let lastError: Error | null = null;

  for (const endpoint of PROFILE_ENDPOINTS) {
    try {
      const response = await authenticatedRequest(endpoint, { method: 'GET' });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const error = new Error(`프로필 조회 실패 (${endpoint}): ${response.status} ${errorText}`);
        if (response.status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }

      const bodyText = await response.text();
      let parsed: any = null;
      try {
        parsed = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        console.warn('[fetchBackendUserProfile] JSON 파싱 실패, 원본 텍스트:', bodyText);
      }

      const normalized = normalizeBackendUser(parsed ?? bodyText);
      if (normalized) {
        console.log('[fetchBackendUserProfile] ✅ 프로필 동기화 성공:', JSON.stringify(normalized, null, 2));
        return normalized;
      }
    } catch (error: any) {
      console.warn(`[fetchBackendUserProfile] ${endpoint} 호출 실패:`, error?.message || error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
};
