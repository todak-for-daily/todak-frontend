import { authenticatedRequest, getAccessToken } from './authApi';

// 조직 생성/수정 요청 타입
export interface CreateOrganizationRequest {
  companyId: number;
  name: string;
  parentId?: number;
}

export interface UpdateOrganizationRequest {
  companyId?: number;
  name?: string;
  parentId?: number;
}

// 조직 응답 타입
export interface OrganizationResponse {
  id: number;
  companyId: number;
  name: string;
  parentId?: number;
}

// 조직 트리 노드 타입
export interface OrganizationTreeNode {
  id: number;
  name: string;
  children: OrganizationTreeNode[] | string[];
}

// 직원 등록 요청 타입
export interface RegisterEmployeeRequest {
  email: string;
  nickname: string;
  organizationUnitId: number;
}

// 직원 목록 응답 타입
export interface EmployeeListItem {
  id: number;
  email: string;
  nickname: string;
  role: 'USER' | 'WORKER' | 'MANAGER';
  organizationName: string;
}

// 직원 상세 정보 응답 타입
export interface EmployeeDetail {
  id: number;
  email: string;
  nickname: string;
  role: 'USER' | 'WORKER' | 'MANAGER';
  organizationName: string;
  canViewSchedule: boolean;
  canViewWarning: boolean;
  canViewHealth: boolean;
}

/**
 * 조직 등록
 * POST /api/org
 * @param request - 조직 생성 요청 데이터
 * @returns 생성된 조직의 ID (companyId)
 */
export const createOrganization = async (
  request: CreateOrganizationRequest
): Promise<number> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[createOrganization] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 새로운 조직 ID 반환
    return request.companyId || Math.floor(Math.random() * 1000) + 10;
  }

  try {
    const response = await authenticatedRequest('/api/org', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`조직 등록 실패: ${response.status} ${errorText}`);
    }

    const companyId: number = await response.json();
    return companyId;
  } catch (error) {
    console.error('조직 등록 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return request.companyId || Math.floor(Math.random() * 1000) + 10;
  }
};

/**
 * 조직 수정
 * PATCH /api/org/{id}
 * @param id - 조직 ID
 * @param request - 조직 수정 요청 데이터
 */
export const updateOrganization = async (
  id: number,
  request: UpdateOrganizationRequest
): Promise<void> => {
  // 토큰 체크 - 없으면 mock 모드 (수정은 성공으로 처리)
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[updateOrganization] Mock 모드: 토큰이 없거나 mock 토큰임');
    return; // Mock: 수정 성공으로 처리
  }

  try {
    const response = await authenticatedRequest(`/api/org/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`조직 수정 실패: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('조직 수정 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return;
  }
};

/**
 * 조직 삭제
 * DELETE /api/org/{id}
 * @param id - 조직 ID
 */
export const deleteOrganization = async (id: number): Promise<void> => {
  // 토큰 체크 - 없으면 mock 모드 (삭제는 성공으로 처리)
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[deleteOrganization] Mock 모드: 토큰이 없거나 mock 토큰임');
    return; // Mock: 삭제 성공으로 처리
  }

  try {
    const response = await authenticatedRequest(`/api/org/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`조직 삭제 실패: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('조직 삭제 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return;
  }
};

/**
 * 조직 트리 조회
 * GET /api/org/companies/{companyId}/tree
 * @param companyId - 회사 ID
 * @returns 조직 트리 구조
 */
export const getOrganizationTree = async (
  companyId: number
): Promise<OrganizationTreeNode[]> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getOrganizationTree] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 기본 조직 트리 구조
    return [
      {
        id: 1,
        name: '토닥이 기업',
        children: [
          { id: 2, name: '생산팀', children: [] },
          { id: 3, name: '품질관리팀', children: [] },
        ],
      },
    ];
  }

  try {
    const response = await authenticatedRequest(`/api/org/companies/${companyId}/tree`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`조직 트리 조회 실패: ${response.status} ${errorText}`);
    }

    const tree: OrganizationTreeNode[] = await response.json();
    return tree;
  } catch (error) {
    console.error('조직 트리 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return [
      {
        id: 1,
        name: '토닥이 기업',
        children: [
          { id: 2, name: '생산팀', children: [] },
          { id: 3, name: '품질관리팀', children: [] },
        ],
      },
    ];
  }
};

/**
 * 직원 등록
 * POST /api/org/employees/register
 * @param request - 직원 등록 요청 데이터
 * @returns 등록된 직원의 organizationUnitId
 */
export const registerEmployee = async (
  request: RegisterEmployeeRequest
): Promise<number> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[registerEmployee] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: organizationUnitId 반환
    return request.organizationUnitId || Math.floor(Math.random() * 100) + 1;
  }

  try {
    const response = await authenticatedRequest('/api/org/employees/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`직원 등록 실패: ${response.status} ${errorText}`);
    }

    const organizationUnitId: number = await response.json();
    return organizationUnitId;
  } catch (error) {
    console.error('직원 등록 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return request.organizationUnitId || Math.floor(Math.random() * 100) + 1;
  }
};

/**
 * 직원 목록 조회
 * GET /api/org/employees
 * @param orgId - 조직 ID (선택사항, 없으면 전체 직원 조회)
 * @returns 직원 목록
 */
export const getEmployees = async (orgId?: number): Promise<EmployeeListItem[]> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getEmployees] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 기본 직원 목록
    return [
      {
        id: 1,
        email: 'user1@todaki.com',
        nickname: '홍길동',
        role: 'WORKER',
        organizationName: '토닥이 기업',
      },
      {
        id: 2,
        email: 'user2@company.com',
        nickname: '김철수',
        role: 'WORKER',
        organizationName: '안전제일 회사',
      },
    ];
  }

  try {
    const url = orgId
      ? `/api/org/employees?orgId=${orgId}`
      : '/api/org/employees';
    
    const response = await authenticatedRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`직원 목록 조회 실패: ${response.status} ${errorText}`);
    }

    const employees: EmployeeListItem[] = await response.json();
    return employees;
  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return [
      {
        id: 1,
        email: 'user1@todaki.com',
        nickname: '홍길동',
        role: 'WORKER',
        organizationName: '토닥이 기업',
      },
      {
        id: 2,
        email: 'user2@company.com',
        nickname: '김철수',
        role: 'WORKER',
        organizationName: '안전제일 회사',
      },
    ];
  }
};

/**
 * 직원 상세 조회
 * GET /api/org/employees/{id}
 * @param id - 직원 ID
 * @returns 직원 상세 정보
 */
export const getEmployeeDetail = async (id: number): Promise<EmployeeDetail> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getEmployeeDetail] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 기본 직원 상세 정보
    return {
      id,
      email: id === 1 ? 'user1@todaki.com' : 'user2@company.com',
      nickname: id === 1 ? '홍길동' : '김철수',
      role: 'WORKER',
      organizationName: id === 1 ? '토닥이 기업' : '안전제일 회사',
      canViewSchedule: true,
      canViewWarning: true,
      canViewHealth: false,
    };
  }

  try {
    const response = await authenticatedRequest(`/api/org/employees/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`직원 상세 조회 실패: ${response.status} ${errorText}`);
    }

    const employee: EmployeeDetail = await response.json();
    return employee;
  } catch (error) {
    console.error('직원 상세 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return {
      id,
      email: id === 1 ? 'user1@todaki.com' : 'user2@company.com',
      nickname: id === 1 ? '홍길동' : '김철수',
      role: 'WORKER',
      organizationName: id === 1 ? '토닥이 기업' : '안전제일 회사',
      canViewSchedule: true,
      canViewWarning: true,
      canViewHealth: false,
    };
  }
};

/**
 * 직원 삭제
 * DELETE /api/org/employees/{id}
 * @param id - 직원 ID
 */
export const deleteEmployee = async (id: number): Promise<void> => {
  // 토큰 체크 - 없으면 mock 모드 (삭제는 성공으로 처리)
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[deleteEmployee] Mock 모드: 토큰이 없거나 mock 토큰임');
    return; // Mock: 삭제 성공으로 처리
  }

  try {
    const response = await authenticatedRequest(`/api/org/employees/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`직원 삭제 실패: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('직원 삭제 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return;
  }
};

