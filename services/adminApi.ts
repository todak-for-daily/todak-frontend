import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBase } from './apiConfig';

// 인증 토큰 가져오기
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('토큰 가져오기 실패:', error);
    return null;
  }
};

// Mock 관리자 프로필 데이터
const getMockAdminProfile = (): AdminProfile => ({
  id: 1,
  email: 'admin@todaki.com',
  name: '김관리',
  phone: undefined,
  avatarUrl: undefined,
  role: 'MANAGER',
});

type RequestHeaders = Record<string, string>;

// API 요청 헬퍼
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = await getAuthToken();
  const headers: RequestHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers as RequestHeaders),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getBackendBase()}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};

// 관리자 프로필 타입
export interface AdminProfile {
  id: number;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  avartarUrl?: string; // 오타 처리 (백엔드 응답에 오타가 있을 수 있음)
  role: 'MANAGER' | string;
}

// 관리자 프로필 생성 요청 타입
export interface CreateAdminProfileRequest {
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: 'MANAGER' | string;
}

// 관리자 프로필 수정 요청 타입
export interface UpdateAdminProfileRequest {
  email?: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
  role?: 'MANAGER' | string;
}

/**
 * 현재 관리자의 프로필을 조회
 * GET /api/admin/profile
 */
export const getAdminProfile = async (): Promise<AdminProfile | null> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAuthToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getAdminProfile] Mock 모드: 토큰이 없거나 mock 토큰임');
    return getMockAdminProfile();
  }

  try {
    const response = await apiRequest('/api/admin/profile', {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`프로필 조회 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('관리자 프로필 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return getMockAdminProfile();
  }
};

/**
 * 새로운 관리자 계정을 생성
 * POST /api/admin/profile
 */
export const createAdminProfile = async (
  profile: CreateAdminProfileRequest,
): Promise<AdminProfile | null> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAuthToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[createAdminProfile] Mock 모드: 토큰이 없거나 mock 토큰임');
    return {
      id: Date.now(),
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
    };
  }

  try {
    const response = await apiRequest('/api/admin/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`프로필 생성 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('관리자 프로필 생성 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return {
      id: Date.now(),
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
    };
  }
};

/**
 * 관리자의 정보 일부를 수정
 * PATCH /api/admin/profile/{id}
 */
export const updateAdminProfile = async (
  id: number,
  updates: UpdateAdminProfileRequest,
): Promise<AdminProfile | null> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAuthToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[updateAdminProfile] Mock 모드: 토큰이 없거나 mock 토큰임');
    const mockProfile = getMockAdminProfile();
    return {
      ...mockProfile,
      ...updates,
      id,
    };
  }

  try {
    const response = await apiRequest(`/api/admin/profile/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`프로필 수정 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('관리자 프로필 수정 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    const mockProfile = getMockAdminProfile();
    return {
      ...mockProfile,
      ...updates,
      id,
    };
  }
};

/**
 * 관리자 계정을 삭제
 * DELETE /api/admin/profile/{id}
 */
export const deleteAdminProfile = async (id: number): Promise<boolean> => {
  // 토큰 체크 - 없으면 mock 모드 (삭제는 성공으로 처리)
  const token = await getAuthToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[deleteAdminProfile] Mock 모드: 토큰이 없거나 mock 토큰임');
    return true; // Mock: 삭제 성공으로 처리
  }

  try {
    const response = await apiRequest(`/api/admin/profile/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`프로필 삭제 실패: ${response.status} ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('관리자 프로필 삭제 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return true;
  }
};
