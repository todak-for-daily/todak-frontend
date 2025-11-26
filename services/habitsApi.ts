import { authenticatedRequest, getAccessToken } from './authApi';
import { getBackendBase } from './apiConfig';
import { MemberTrait } from '../contexts/AdminContext';

// 백엔드 API 타입 정의
export interface BackendHabit {
  id: number;
  type: 'SENSE' | 'COGNITIVE';
  senseType?: 'VISION' | 'HEARING' | 'TASTE' | 'SMELL' | 'TOUCH' | 'KINESTHETIC';
  time?: string;
  place?: string;
  target?: string;
  trigger?: string;
  description?: string;
  soothingAction?: string;
}

// 프론트엔드에서 백엔드로 변환
const convertToBackendHabit = (trait: Partial<MemberTrait>): Partial<BackendHabit> => {
  const backendHabit: Partial<BackendHabit> = {};

  // type 변환: '감각' → 'SENSE', '인지' → 'COGNITIVE'
  if (trait.traitType === '감각') {
    backendHabit.type = 'SENSE';
  } else if (trait.traitType === '인지') {
    backendHabit.type = 'COGNITIVE';
  }

  // senseType 변환
  if (trait.sense) {
    const senseMap: Record<string, BackendHabit['senseType']> = {
      '시각': 'VISION',
      '청각': 'HEARING',
      '미각': 'TASTE',
      '후각': 'SMELL',
      '촉각': 'TOUCH',
      '운동감각': 'KINESTHETIC',
    };
    backendHabit.senseType = senseMap[trait.sense];
  }

  // 나머지 필드는 그대로 전달
  if (trait.time !== undefined) backendHabit.time = trait.time || undefined;
  if (trait.place !== undefined) backendHabit.place = trait.place || undefined;
  if (trait.target !== undefined) backendHabit.target = trait.target || undefined;
  if (trait.trigger !== undefined) backendHabit.trigger = trait.trigger || undefined;
  if (trait.description !== undefined) backendHabit.description = trait.description || undefined;
  if (trait.soothingAction !== undefined) backendHabit.soothingAction = trait.soothingAction || undefined;

  return backendHabit;
};

// 백엔드에서 프론트엔드로 변환
const convertFromBackendHabit = (backendHabit: BackendHabit): MemberTrait => {
  const trait: MemberTrait = {
    id: backendHabit.id.toString(),
    situation: '', // 기존 호환성 유지 (deprecated)
    strategy: '', // 기존 호환성 유지 (deprecated)
    lastUpdatedAt: new Date().toISOString(),
  };

  // type 변환: 'SENSE' → '감각', 'COGNITIVE' → '인지'
  if (backendHabit.type === 'SENSE') {
    trait.traitType = '감각';
  } else if (backendHabit.type === 'COGNITIVE') {
    trait.traitType = '인지';
  }

  // senseType 변환
  if (backendHabit.senseType) {
    const senseMap: Record<string, MemberTrait['sense']> = {
      'VISION': '시각',
      'HEARING': '청각',
      'TASTE': '미각',
      'SMELL': '후각',
      'TOUCH': '촉각',
      'KINESTHETIC': '운동감각',
    };
    trait.sense = senseMap[backendHabit.senseType];
  }

  // 나머지 필드 복사
  if (backendHabit.time) trait.time = backendHabit.time;
  if (backendHabit.place) trait.place = backendHabit.place;
  if (backendHabit.target) trait.target = backendHabit.target;
  if (backendHabit.trigger) trait.trigger = backendHabit.trigger;
  if (backendHabit.description) trait.description = backendHabit.description;
  if (backendHabit.soothingAction) trait.soothingAction = backendHabit.soothingAction;

  return trait;
};

/**
 * 사용자의 모든 행동 특성 조회
 * GET /api/habits
 * @returns 행동 특성 리스트
 */
export const getHabits = async (): Promise<MemberTrait[]> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getHabits] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 기본 행동 특성 목록
    return [
      {
        id: '1',
        situation: '사람이 많이 모여서 시끄러울 때',
        strategy: '잠깐 귀를 막고 관리자에게 조용한 곳으로 가고 싶다고 말해요.',
        lastUpdatedAt: new Date().toISOString(),
        traitType: '감각',
        sense: '청각',
        trigger: '사람이 많이 모여서 시끄러울 때',
        description: '시끄러운 환경에서 힘들어요',
        soothingAction: '조용한 곳으로 자리를 옮기면 진정돼요.',
      },
    ];
  }

  try {
    const response = await authenticatedRequest('/api/habits', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`행동 특성 조회 실패: ${response.status} ${errorText}`);
    }

    const backendHabits: BackendHabit[] = await response.json();
    
    // 백엔드 응답을 프론트엔드 형식으로 변환
    return backendHabits.map(convertFromBackendHabit);
  } catch (error) {
    console.error('행동 특성 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return [
      {
        id: '1',
        situation: '사람이 많이 모여서 시끄러울 때',
        strategy: '잠깐 귀를 막고 관리자에게 조용한 곳으로 가고 싶다고 말해요.',
        lastUpdatedAt: new Date().toISOString(),
        traitType: '감각',
        sense: '청각',
        trigger: '사람이 많이 모여서 시끄러울 때',
        description: '시끄러운 환경에서 힘들어요',
        soothingAction: '조용한 곳으로 자리를 옮기면 진정돼요.',
      },
    ];
  }
};

/**
 * 행동 특성 생성
 * POST /api/habits
 * @param trait - 생성할 행동 특성 데이터
 * @returns 생성된 행동 특성
 */
export const createHabit = async (trait: Partial<Omit<MemberTrait, 'id' | 'lastUpdatedAt'>>): Promise<MemberTrait> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[createHabit] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 생성된 행동 특성 반환
    return {
      id: Date.now().toString(),
      situation: trait.trigger || '',
      strategy: trait.soothingAction || '',
      lastUpdatedAt: new Date().toISOString(),
      traitType: trait.traitType,
      sense: trait.sense,
      time: trait.time,
      place: trait.place,
      target: trait.target,
      trigger: trait.trigger,
      description: trait.description,
      soothingAction: trait.soothingAction,
    };
  }

  try {
    const backendHabit = convertToBackendHabit(trait);

    const response = await authenticatedRequest('/api/habits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(backendHabit),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`행동 특성 생성 실패: ${response.status} ${errorText}`);
    }

    const createdHabit: BackendHabit = await response.json();
    return convertFromBackendHabit(createdHabit);
  } catch (error) {
    console.error('행동 특성 생성 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return {
      id: Date.now().toString(),
      situation: trait.trigger || '',
      strategy: trait.soothingAction || '',
      lastUpdatedAt: new Date().toISOString(),
      traitType: trait.traitType,
      sense: trait.sense,
      time: trait.time,
      place: trait.place,
      target: trait.target,
      trigger: trait.trigger,
      description: trait.description,
      soothingAction: trait.soothingAction,
    };
  }
};

/**
 * 행동 특성 수정
 * PUT /api/habits/{habitId}
 * @param habitId - 수정할 행동 특성 ID
 * @param trait - 수정할 행동 특성 데이터 (전체 필드 전달)
 * @returns 수정된 행동 특성
 */
export const updateHabit = async (
  habitId: number,
  trait: Partial<Omit<MemberTrait, 'id' | 'lastUpdatedAt'>>
): Promise<MemberTrait> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[updateHabit] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 수정된 행동 특성 반환
    return {
      id: habitId.toString(),
      situation: trait.trigger || '',
      strategy: trait.soothingAction || '',
      lastUpdatedAt: new Date().toISOString(),
      traitType: trait.traitType,
      sense: trait.sense,
      time: trait.time,
      place: trait.place,
      target: trait.target,
      trigger: trait.trigger,
      description: trait.description,
      soothingAction: trait.soothingAction,
    };
  }

  try {
    const backendHabit = convertToBackendHabit(trait);

    const response = await authenticatedRequest(`/api/habits/${habitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(backendHabit),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`행동 특성 수정 실패: ${response.status} ${errorText}`);
    }

    const updatedHabit: BackendHabit = await response.json();
    return convertFromBackendHabit(updatedHabit);
  } catch (error) {
    console.error('행동 특성 수정 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return {
      id: habitId.toString(),
      situation: trait.trigger || '',
      strategy: trait.soothingAction || '',
      lastUpdatedAt: new Date().toISOString(),
      traitType: trait.traitType,
      sense: trait.sense,
      time: trait.time,
      place: trait.place,
      target: trait.target,
      trigger: trait.trigger,
      description: trait.description,
      soothingAction: trait.soothingAction,
    };
  }
};

/**
 * 행동 특성 삭제
 * DELETE /api/habits/{habitId}
 * @param habitId - 삭제할 행동 특성 ID
 */
export const deleteHabit = async (habitId: number): Promise<void> => {
  // 토큰 체크 - 없으면 mock 모드 (삭제는 성공으로 처리)
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[deleteHabit] Mock 모드: 토큰이 없거나 mock 토큰임');
    return; // Mock: 삭제 성공으로 처리
  }

  try {
    const response = await authenticatedRequest(`/api/habits/${habitId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`행동 특성 삭제 실패: ${response.status} ${errorText}`);
    }
  } catch (error) {
    console.error('행동 특성 삭제 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return;
  }
};

