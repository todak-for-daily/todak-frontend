import { authenticatedRequest, getAccessToken } from './authApi';

// Mock 데이터 타입 정의
type RecommendedAction = {
  action: string;
  emojis: string;
};

// Mock 데이터: 행동 추천
const getMockRecommendedActions = (situationCardId: string): RecommendedAction[] => {
  // 상황 카드 ID에 따라 다른 행동 추천
  const mockActions: { [key: string]: RecommendedAction[] } = {
    'ENV-01': [
      { action: '이어폰이나 귀마개를 끼기', emojis: '🎧' },
      { action: '잠깐 조용한 곳으로 이동하기', emojis: '🚶' },
      { action: '입으로 천천히 숨쉬기', emojis: '😮💨' },
    ],
    'COMM-08': [
      { action: '짧은 스트레칭 하기', emojis: '🤸' },
      { action: '물 한 잔 마시기', emojis: '💧' },
      { action: '5분 명상하기', emojis: '🧘' },
    ],
  };
  
  return mockActions[situationCardId] || [
    { action: '잠시 휴식하기', emojis: '🧘' },
    { action: '편안한 자세로 앉기', emojis: '🪑' },
    { action: '심호흡하기', emojis: '🫁' },
  ];
};

// Mock 데이터: 행동 상세 단계
const getMockActionSteps = (action: string): string[] => {
  const mockSteps: { [key: string]: string[] } = {
    '이어폰이나 귀마개를 끼기': [
      '이어폰이나 귀마개를 찾아서 귀에 끼워주세요.',
      '볼륨을 작게 맞추고 조용한 음악을 들어보세요.',
      '소리가 차단되는 것을 느끼며 편안하게 휴식하세요.',
    ],
    '잠깐 조용한 곳으로 이동하기': [
      '하던 일을 잠깐 멈추고 어깨에 힘을 빼주세요.',
      '주변을 둘러보며 조용하고 한적한 곳을 찾아주세요.',
      '그곳으로 천천히 걸어가서 편안한 자세로 1-2분 동안 앉아보세요.',
    ],
    '입으로 천천히 숨쉬기': [
      '편안하게 앉거나 서서 어깨와 목의 힘을 빼주세요.',
      '입을 작게 벌리고 "후-" 하며 천천히 4초 동안 숨을 내쉬어주세요.',
      '코로 천천히 3초 동안 숨을 들이마시기를 5번 반복해보세요.',
    ],
    '짧은 스트레칭 하기': [
      '양팔을 머리 위로 올려 몸을 쭉 뻗어보세요.',
      '목과 어깨를 좌우로 천천히 돌려보세요.',
      '10초간 유지한 후 편안하게 내려놓으세요.',
    ],
    '물 한 잔 마시기': [
      '물이 담긴 컵이나 병을 준비해주세요.',
      '물을 한 모금씩 천천히 마시며 마음을 진정시켜보세요.',
      '물을 마신 후 잠깐 눈을 감고 편안하게 앉아보세요.',
    ],
    '5분 명상하기': [
      '편안한 자세로 앉아 눈을 감아주세요.',
      '코로 숨을 들이마시고(3초), 입으로 내쉬며(4초) 심호흡을 시작하세요.',
      '숨쉬기에만 집중하며 5분 동안 휴식하세요.',
    ],
    '잠시 휴식하기': [
      '하던 일을 잠깐 멈추고 편안하게 앉아주세요.',
      '눈을 감고 어깨와 손에 있는 힘을 모두 빼주세요.',
      '코로 천천히 숨을 들이마시고 입으로 내쉬기를 5번 반복하세요.',
    ],
    '편안한 자세로 앉기': [
      '등을 곧게 펴고 발바닥을 바닥에 완전히 붙여주세요.',
      '손은 무릎 위에 자연스럽게 놓고 어깨를 아래로 내려주세요.',
      '이 자세를 유지하며 10번 정도 깊게 숨을 쉬어보세요.',
    ],
    '심호흡하기': [
      '편안하게 앉거나 서서 어깨와 목의 힘을 빼주세요.',
      '코로 천천히 4초 동안 숨을 깊게 들이마시고 2초 동안 참아보세요.',
      '입을 작게 벌리고 천천히 6초 동안 숨을 내쉬기를 10번 반복하세요.',
    ],
  };
  
  return mockSteps[action] || [
    '편안한 자세를 만들어주세요.',
    '천천히 깊게 숨을 쉬어보세요.',
    '마음을 차분하게 내려놓고 편안하게 휴식하세요.',
  ];
};

// 감정 선택 요청 타입
export interface SelectEmotionRequest {
  emotionCard: string; // situation_cards.json의 text 값
}

// 감정 선택 응답 타입
export interface SelectEmotionResponse {
  nextStep: 'end' | 'situation_select';
  message: string;
}

// 행동 추천 요청 타입
export interface RecommendActionRequest {
  situationCardId: string; // situation_cards.json의 id 값 (예: "COMM-08")
}

// 행동 추천 응답 타입
export interface RecommendActionResponse {
  recommendedActions: string[];
}

// 행동 상세 조회 요청 타입
export interface ActionDetailRequest {
  selectedAction: string;
  selectedEmojis: string;
}

// 행동 상세 조회 응답 타입
export interface ActionDetailResponse {
  selectedAction: string;
  selectedEmojis: string;
  actionSteps: string[];
}

// 피드백 저장 요청 타입
export interface SaveFeedbackRequest {
  afterEmotion: string;
}

// 피드백 저장 응답 타입
export interface SaveFeedbackResponse {
  nextStep: 'COMPLETE' | string;
}

// 감정 로그 타입
export interface EmotionLogItem {
  id: number;
  emotionCard: string;
  situationCardId: string;
  selectedAction: string;
  beforeEmotion: string;
  afterEmotion: string;
  emotionChangeScore: number;
  createdAt: string;
}

/**
 * 감정 선택
 * POST /api/emotion/select
 * @param request - 감정 선택 요청 데이터
 * @returns 다음 단계 및 메시지
 */
export const selectEmotion = async (request: SelectEmotionRequest): Promise<SelectEmotionResponse> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[selectEmotion] Mock 모드: 토큰이 없거나 mock 토큰임');
    // "괜찮아요" 이외의 감정은 상황 선택 단계로
    const nextStep = request.emotionCard === '괜찮아요' ? 'end' : 'situation_select';
    return {
      nextStep,
      message: nextStep === 'end' ? '오늘은 괜찮아요. 추천이 필요 없어요.' : '상황을 선택해주세요.',
    };
  }

  try {
    const response = await authenticatedRequest('/api/emotion/select', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`감정 선택 실패: ${response.status} ${errorText}`);
    }

    const data: SelectEmotionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('감정 선택 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    const nextStep = request.emotionCard === '괜찮아요' ? 'end' : 'situation_select';
    return {
      nextStep,
      message: nextStep === 'end' ? '오늘은 괜찮아요. 추천이 필요 없어요.' : '상황을 선택해주세요.',
    };
  }
};

/**
 * 감정 상황 기반 행동 추천
 * POST /api/ai/recommend
 * @param request - 행동 추천 요청 데이터
 * @returns 추천된 행동 목록
 */
export const recommendActions = async (request: RecommendActionRequest): Promise<RecommendActionResponse> => {
  // 토큰 체크
  const token = await getAccessToken();
  
  // mock 토큰인 경우에만 mock 데이터 반환
  if (token && token.startsWith('mock_token')) {
    console.log('[recommendActions] Mock 모드: mock 토큰 사용');
    const mockActions = getMockRecommendedActions(request.situationCardId);
    return {
      recommendedActions: mockActions.map(a => a.action),
    };
  }

  // 실제 토큰이 있으면 API 호출 시도
  if (token) {
    try {
      console.log('[recommendActions] 실제 API 호출 시도:', JSON.stringify(request, null, 2));
      const response = await authenticatedRequest('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('[recommendActions] API 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[recommendActions] API 호출 실패:', response.status, errorText);
        throw new Error(`행동 추천 실패: ${response.status} ${errorText}`);
      }

      const data: RecommendActionResponse = await response.json();
      console.log('[recommendActions] API 응답 성공:', JSON.stringify(data, null, 2));
      
      // 응답 검증
      if (!data || !data.recommendedActions || !Array.isArray(data.recommendedActions)) {
        console.error('[recommendActions] 응답 형식 오류:', data);
        throw new Error('응답 형식이 올바르지 않습니다.');
      }
      
      return data;
    } catch (error) {
      console.error('[recommendActions] API 호출 오류:', error);
      // API 실패 시 mock 데이터로 fallback
      console.warn('[recommendActions] Mock 데이터로 fallback');
      const mockActions = getMockRecommendedActions(request.situationCardId);
      return {
        recommendedActions: mockActions.map(a => a.action),
      };
    }
  }

  // 토큰이 없는 경우 mock 데이터 반환
  console.log('[recommendActions] 토큰 없음 - Mock 모드');
  const mockActions = getMockRecommendedActions(request.situationCardId);
  return {
    recommendedActions: mockActions.map(a => a.action),
  };
};

/**
 * 선택한 행동 세부 단계 조회
 * POST /api/ai/action-detail
 * @param request - 행동 상세 조회 요청 데이터
 * @returns 행동 상세 단계 정보
 */
export const getActionDetail = async (request: ActionDetailRequest): Promise<ActionDetailResponse> => {
  // 토큰 체크
  const token = await getAccessToken();
  
  // mock 토큰인 경우에만 mock 데이터 반환
  if (token && token.startsWith('mock_token')) {
    console.log('[getActionDetail] Mock 모드: mock 토큰 사용');
    const mockSteps = getMockActionSteps(request.selectedAction);
    return {
      selectedAction: request.selectedAction,
      selectedEmojis: request.selectedEmojis,
      actionSteps: mockSteps,
    };
  }

  // 실제 토큰이 있으면 API 호출 시도
  if (token) {
    try {
      console.log('[getActionDetail] 실제 API 호출 시도:', JSON.stringify(request, null, 2));
      const response = await authenticatedRequest('/api/ai/action-detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('[getActionDetail] API 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[getActionDetail] API 호출 실패:', response.status, errorText);
        throw new Error(`행동 상세 조회 실패: ${response.status} ${errorText}`);
      }

      const data: ActionDetailResponse = await response.json();
      console.log('[getActionDetail] API 응답 성공:', JSON.stringify(data, null, 2));
      
      // 응답 검증
      if (!data || !data.actionSteps || !Array.isArray(data.actionSteps)) {
        console.error('[getActionDetail] 응답 형식 오류:', data);
        throw new Error('응답 형식이 올바르지 않습니다.');
      }
      
      return data;
    } catch (error) {
      console.error('[getActionDetail] API 호출 오류:', error);
      // API 실패 시 mock 데이터로 fallback
      console.warn('[getActionDetail] Mock 데이터로 fallback');
      const mockSteps = getMockActionSteps(request.selectedAction);
      return {
        selectedAction: request.selectedAction,
        selectedEmojis: request.selectedEmojis,
        actionSteps: mockSteps,
      };
    }
  }

  // 토큰이 없는 경우 mock 데이터 반환
  console.log('[getActionDetail] 토큰 없음 - Mock 모드');
  const mockSteps = getMockActionSteps(request.selectedAction);
  return {
    selectedAction: request.selectedAction,
    selectedEmojis: request.selectedEmojis,
    actionSteps: mockSteps,
  };
};

/**
 * 피드백 저장
 * POST /api/ai/feedback
 * @param request - 피드백 저장 요청 데이터
 * @returns 다음 단계
 */
export const saveFeedback = async (request: SaveFeedbackRequest): Promise<SaveFeedbackResponse> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[saveFeedback] Mock 모드: 토큰이 없거나 mock 토큰임');
    return {
      nextStep: 'COMPLETE',
    };
  }

  try {
    const response = await authenticatedRequest('/api/ai/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`피드백 저장 실패: ${response.status} ${errorText}`);
    }

    const data: SaveFeedbackResponse = await response.json();
    return data;
  } catch (error) {
    console.error('피드백 저장 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return {
      nextStep: 'COMPLETE',
    };
  }
};

/**
 * 회원 감정 로그 조회
 * GET /api/admin/members/{memberId}/logs
 * @param memberId - 회원 ID
 * @returns 감정 로그 목록
 */
export const getMemberEmotionLogs = async (memberId: number): Promise<EmotionLogItem[]> => {
  // 토큰 체크 - 없으면 mock 데이터 반환
  const token = await getAccessToken();
  if (!token || token.startsWith('mock_token')) {
    console.log('[getMemberEmotionLogs] Mock 모드: 토큰이 없거나 mock 토큰임');
    // Mock: 기본 감정 로그 목록
    return [
      {
        id: 1,
        emotionCard: '힘들어요',
        situationCardId: 'ENV-01',
        selectedAction: '이어폰이나 귀마개를 끼기',
        beforeEmotion: '힘들어요',
        afterEmotion: '괜찮아요',
        emotionChangeScore: 1,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        emotionCard: '많이 힘들어요',
        situationCardId: 'ACT-01',
        selectedAction: '잠깐 조용한 곳으로 이동하기',
        beforeEmotion: '많이 힘들어요',
        afterEmotion: '힘들어요',
        emotionChangeScore: 1,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  try {
    const response = await authenticatedRequest(`/api/admin/members/${memberId}/logs`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`감정 로그 조회 실패: ${response.status} ${errorText}`);
    }

    const logs: EmotionLogItem[] = await response.json();
    return logs;
  } catch (error) {
    console.error('감정 로그 조회 오류:', error);
    // API 실패 시에도 mock 데이터 반환
    return [
      {
        id: 1,
        emotionCard: '힘들어요',
        situationCardId: 'ENV-01',
        selectedAction: '이어폰이나 귀마개를 끼기',
        beforeEmotion: '힘들어요',
        afterEmotion: '괜찮아요',
        emotionChangeScore: 1,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        emotionCard: '많이 힘들어요',
        situationCardId: 'ACT-01',
        selectedAction: '잠깐 조용한 곳으로 이동하기',
        beforeEmotion: '많이 힘들어요',
        afterEmotion: '힘들어요',
        emotionChangeScore: 1,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
};

