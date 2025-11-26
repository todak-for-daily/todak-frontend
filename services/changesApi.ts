import { authenticatedRequest } from './authApi';

// 변경사항 로그 타입
export interface ChangeLog {
  changeLogId: number;
  category: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
  isRead: boolean;
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
    throw error;
  }
};

/**
 * 직원의 변경사항 목록 조회
 * GET /api/changes?memberId={memberId}
 */
export const getChanges = async (memberId: number): Promise<ChangeLog[]> => {
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
    throw error;
  }
};

/**
 * 읽지 않은 변경사항 목록 조회
 * GET /api/changes/unread?memberId={memberId}
 */
export const getUnreadChanges = async (memberId: number): Promise<ChangeLog[]> => {
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
    throw error;
  }
};


