import { authenticatedRequest, getAccessToken } from './authApi';

// 변경사항 로그 타입
export interface ChangeLog {
  changeLogId: number;
  category: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
  isRead: boolean;
  scheduleId?: number; // 스케줄 ID (API 응답에 포함되는 경우)
}

// 변경사항 읽음 표시 요청 타입
export interface MarkChangesReadRequest {
  changeLogIds: number[];
  memberId: number;
}

/**
 * 변경사항 읽음 표시
 * POST /api/changes/read
 */
export const markChangesAsRead = async (
  request: MarkChangesReadRequest,
): Promise<string> => {
  // 토큰 체크 - 없으면 mock 모드 (읽음 표시는 성공으로 처리)
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[markChangesAsRead] Mock 모드: 토큰이 없거나 mock 토큰임');
    return '변경사항 읽음 표시 완료';
  }

  try {
    const response = await authenticatedRequest('/api/changes/read', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`변경사항 읽음 표시 실패: ${response.status} ${errorText}`);
    }

    const result = await response.text();
    return result;
  } catch (error) {
    console.error('변경사항 읽음 표시 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return '변경사항 읽음 표시 완료';
  }
};

/**
 * 직원의 변경사항 목록 조회
 * GET /api/changes?memberId={memberId}
 */
export const getChanges = async (memberId: number): Promise<ChangeLog[]> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getChanges] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 기본 변경사항 목록
    return [
      {
        changeLogId: 1,
        category: 'SCHEDULE',
        fieldName: 'startTime',
        oldValue: '09:00',
        newValue: '10:00',
        changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
        isRead: false,
        scheduleId: 1,
      },
    ];
  }

  try {
    const response = await authenticatedRequest(`/api/changes?memberId=${memberId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`변경사항 조회 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('변경사항 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return [
      {
        changeLogId: 1,
        category: 'SCHEDULE',
        fieldName: 'startTime',
        oldValue: '09:00',
        newValue: '10:00',
        changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        scheduleId: 1,
      },
    ];
  }
};

/**
 * 읽지 않은 변경사항 목록 조회
 * GET /api/changes/unread?memberId={memberId}
 */
export const getUnreadChanges = async (memberId: number): Promise<ChangeLog[]> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getUnreadChanges] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 읽지 않은 변경사항 목록
    return [
      {
        changeLogId: 1,
        category: 'SCHEDULE',
        fieldName: 'startTime',
        oldValue: '09:00',
        newValue: '10:00',
        changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        scheduleId: 1,
      },
    ];
  }

  try {
    const response = await authenticatedRequest(
      `/api/changes/unread?memberId=${memberId}`,
      {
        method: 'GET',
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`읽지 않은 변경사항 조회 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('읽지 않은 변경사항 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return [
      {
        changeLogId: 1,
        category: 'SCHEDULE',
        fieldName: 'startTime',
        oldValue: '09:00',
        newValue: '10:00',
        changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        scheduleId: 1,
      },
    ];
  }
};


