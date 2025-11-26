import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import situationData from '../services/situation_cards.json';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { useNavigation } from '@react-navigation/native';
import { notifyAdminCriticalEmotion } from '../services/pushNotification';

// 타입 정의
type SituationCard = {
  id: string;
  category: string;
  text: string;
};

type RecommendedAction = {
  action: string;
  emojis: string;
};

// 진행 단계 타입
type Step =
  | 'MOOD_SELECT' // 초기 기분 선택
  | 'CATEGORY_SELECT' // 대분류 선택
  | 'SITUATION_SELECT' // 소분류 선택 (3x2 그리드)
  | 'CONFIRM_MODAL' // 확인 모달
  | 'ACTION_SELECT' // AI 행동 추천 3가지 선택
  | 'ACTION_DETAIL' // 선택한 행동 상세 설명
  | 'FEEDBACK_MODAL'; // 최종 피드백 모달

// 대분류 매핑
const mainCategories: { [key: string]: string } = {
  ENV: '주변 때문에 힘들어요',
  BODY: '내 몸이 힘들어요',
  ACT: '해야 하는 일이 힘들어요',
  COMM: '대화가\n힘들어요',
  MIND: '마음이\n힘들어요',
  MISC: '모르겠어요',
};

// 동일한 4단계 감정 옵션 정의 (처음/끝 동일하게 사용)
const moodSteps = [
  { emoji: '😊', label: '괜찮아요', isPositive: true },
  { emoji: '😟', label: '힘들어요', isPositive: false },
  { emoji: '😢', label: '많이 힘들어요', isPositive: false },
  { emoji: '😭', label: '도움이 필요해요', isPositive: false },
];

const initialMoodEmojis = moodSteps;

// 피드백 이모티콘 (최종 모달용) - isPositive는 필요 없으므로 제거
const feedbackEmojis = moodSteps.map(({ emoji, label }) => ({ emoji, label }));

const POSITIVE_FEEDBACK = new Set(['😊']);
const NEGATIVE_FEEDBACK = new Set(['😟', '😢', '😭']);

const categoryEmojiMap: Record<string, string> = {
  ENV: '🌪️',
  BODY: '🤒',
  ACT: '📚',
  COMM: '💬',
  MIND: '💔',
  MISC: '❓',
};

// 이모지 오버라이드: 단일 이모지 또는 { main: '이모지', small: '작은이모지' } 형태
const situationEmojiOverrides: Record<string, string | { main: string; small: string }> = {
  'ENV-01': '🔊',
  'ENV-02': '⚡',
  'ENV-03': '💡',
  'ENV-04': '🌑',
  'ENV-05': '👃',
  'ENV-06': '💨',
  'ENV-07': '🚆',
  'ENV-08': '📦',
  'ENV-09': '🏟️',
  'ENV-10': '👥',
  'ENV-11': '⏳',
  'ENV-12': '🧭',
  'ENV-13': { main: '👤', small: '😰' },
  'ENV-14': '😲',
  'BODY-01': '🥵',
  'BODY-02': '🥶',
  'BODY-03': '🍽️',
  'BODY-04': '💧',
  'BODY-05': '😴',
  'BODY-06': '😴',
  'BODY-08': '😵',
  'BODY-09': '🤕',
  'BODY-10': '🤢',
  'BODY-11': { main: '👂', small: '😣' },
  'BODY-12': { main: '👁️', small: '😣' },
  'BODY-13': { main: '✋', small: '❄️' },
  'BODY-14': { main: '🦶', small: '❄️' },
  'BODY-15': '😮‍💨',
  'BODY-16': '😣',
  'BODY-17': '🪶',
  'BODY-18': '🔥',
  'ACT-01': { main: '📚', small: '😓' },
  'ACT-02': '😤',
  'ACT-03': '😑',
  'ACT-04': { main: '📚', small: '😰' },
  'ACT-05': '📚',
  'ACT-06': '😓',
  'ACT-07': '⏰',
  'ACT-08': { main: '⏰', small: '😰' },
  'ACT-09': '🛑',
  'ACT-10': '🤔',
  'COMM-01': '🤔',
  'COMM-02': { main: '📝', small: '😴' },
  'COMM-03': { main: '📝', small: '⚡' },
  'COMM-04': '🗣️',
  'COMM-05': { main: '📋', small: '😰' },
  'COMM-06': { main: '💬', small: '❓' },
  'COMM-07': { main: '👤', small: '😰' },
  'COMM-08': { main: '💬', small: '🚫' },
  'MIND-01': '😰',
  'MIND-02': '😨',
  'MIND-03': '😟',
  'MIND-04': '😤',
  'MIND-05': '😡',
  'MIND-06': '😔',
  'MIND-07': '😴',
  'MIND-08': '🚫',
  'MIND-09': { main: '🏃', small: '⏩' },
  'MIND-10': { main: '⏳', small: '😤' },
  'MIND-11': '😰',
  'MISC-01': '🤷',
};

const keywordEmojiRules: { keywords: string[]; emoji: string }[] = [
  { keywords: ['소리', '시끄럽', '크게'], emoji: '🔊' },
  { keywords: ['빛', '밝', '어두'], emoji: '💡' },
  { keywords: ['냄새', '향'], emoji: '👃' },
  { keywords: ['바람', '추', '춥'], emoji: '💨' },
  { keywords: ['버스', '전철', '기차'], emoji: '🚆' },
  { keywords: ['좁', '답답', '공간'], emoji: '📦' },
  { keywords: ['넓', '큰 공간'], emoji: '🏟️' },
  { keywords: ['더워', '열'], emoji: '🥵' },
  { keywords: ['배고', '밥', '먹'], emoji: '🍽️' },
  { keywords: ['기다리', '줄'], emoji: '⏳' },
  { keywords: ['사람', '모여', '붐비'], emoji: '👥' },
  { keywords: ['숙제', '과제', '일', '해야'], emoji: '📚' },
  { keywords: ['하기 싫', '싫어'], emoji: '😤' },
  { keywords: ['재미없', '지루'], emoji: '😑' },
  { keywords: ['어려워', '어려운'], emoji: '😰' },
  { keywords: ['많아', '많은'], emoji: '😓' },
  { keywords: ['대화', '말', '설명'], emoji: '💬' },
  { keywords: ['무서', '긴장', '불안'], emoji: '😰' },
  { keywords: ['모르는 곳', '길 몰라'], emoji: '🧭' },
  { keywords: ['모르겠'], emoji: '🤷' },
  { keywords: ['깜짝', '놀랐'], emoji: '😲' },
  { keywords: ['화가', '짜증'], emoji: '😡' },
  { keywords: ['목말라', '갈증'], emoji: '💧' },
  { keywords: ['어지러', '현기증'], emoji: '😵' },
  { keywords: ['머리 아파', '두통'], emoji: '🤕' },
  { keywords: ['귀 아파'], emoji: '👂' },
  { keywords: ['눈 아파'], emoji: '👁️' },
  { keywords: ['손 시려', '손시려'], emoji: '✋' },
  { keywords: ['발 시려', '발시려'], emoji: '🦶' },
  { keywords: ['숨 쉬기', '호흡'], emoji: '😮‍💨' },
  { keywords: ['간지러'], emoji: '🪶' },
  { keywords: ['따가'], emoji: '🔥' },
  { keywords: ['외로', '외롭'], emoji: '😔' },
  { keywords: ['이해가 안', '이해 안'], emoji: '🤔' },
  { keywords: ['시간', '부족'], emoji: '⏰' },
  { keywords: ['빨리 하고 싶'], emoji: '🏃' },
  { keywords: ['멈추', '그만'], emoji: '🛑' },
];

const { width, height } = Dimensions.get('window');

const AnxietyInputScreen: React.FC = () => {
  const [step, setStep] = useState<Step>('MOOD_SELECT');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);
  const { userProfile, userRole } = useAuth();
  const { updateMemberStatus, logMemberEmotion, getOrganizationByMemberEmail } = useAdmin();
  const navigation = useNavigation<any>();

  // 백엔드에 전송할 상태들
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSituationText, setSelectedSituationText] = useState<
    string | null
  >(null);
  const [selectedAction, setSelectedAction] = useState<RecommendedAction | null>(null);
  const [initialMoodEmoji, setInitialMoodEmoji] = useState<string | null>(null); // 초기 기분 저장

  // UI 렌더링용 상태
  const [subSituations, setSubSituations] = useState<SituationCard[]>([]);
  const [recommendedActions, setRecommendedActions] = useState<RecommendedAction[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPositiveModal, setShowPositiveModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);

  // TTS 완료 이벤트 리스너
  useEffect(() => {
    TTS.addEventListener('tts-finish', () => {
      setIsSpeaking(false);
      setSpeakingSection(null);
    });
    TTS.addEventListener('tts-cancel', () => {
      setIsSpeaking(false);
      setSpeakingSection(null);
    });
  }, []);

  const organization = useMemo(() => {
    if (!userProfile?.email) return null;
    try {
      return getOrganizationByMemberEmail(userProfile.email);
    } catch {
      return null;
    }
  }, [getOrganizationByMemberEmail, userProfile?.email]);

  const resetFlow = () => {
    setStep('MOOD_SELECT');
    setSelectedCategory(null);
    setSelectedSituationText(null);
    setSelectedAction(null);
    setInitialMoodEmoji(null);
    setSubSituations([]);
    setRecommendedActions([]);
    setShowFeedbackModal(false);
    setShowPositiveModal(false);
  };

  // 기분 level 매핑 (높을수록 좋음)
  const getMoodLevel = (emoji: string): number => {
    const moodLevelMap: { [key: string]: number } = {
      '😊': 4, // 괜찮아요
      '😟': 3, // 힘들어요
      '😢': 2, // 많이 힘들어요
      '😭': 1, // 도움이 필요해요
    };
    return moodLevelMap[emoji] || 0;
  };

  // 초기 기분 선택 핸들러
  const handleMoodSelect = (mood: { emoji: string; label: string; isPositive: boolean }) => {
    // 초기 기분 저장
    setInitialMoodEmoji(mood.emoji);
    
    if (mood.isPositive) {
      // 괜찮은 기분 선택 시 모달 표시
      setShowPositiveModal(true);
    } else {
      // 안 괜찮은 기분 선택 시 불안감정 입력으로 진행
      setStep('CATEGORY_SELECT');
    }
  };

  // 긍정 모달 확인 핸들러
  const handlePositiveModalConfirm = () => {
    setShowPositiveModal(false);
    navigation.goBack();
  };

  const handleBackToCategory = () => {
    setSubSituations([]);
    setSelectedSituationText(null);
    setStep('CATEGORY_SELECT');
  };

  const handleBackToSituation = () => {
    setSelectedAction(null);
    setRecommendedActions([]);
    setStep('SITUATION_SELECT');
  };

  const handleBackToActionList = () => {
    setSelectedAction(null);
    setStep('ACTION_SELECT');
  };

  // AI 행동 추천 가져오기 (시뮬레이션)
  const fetchRecommendedActions = async () => {
    setIsLoading(true);

    // API 호출 시뮬레이션
    setTimeout(async () => {
      try {
        // --- 임시 데이터 ---
        const mockActions: RecommendedAction[] = [
          {
            action: '이어폰이나 귀마개를 끼기',
            emojis: '🎧',
          },
          {
            action: '잠깐 조용한 곳으로 이동하기',
            emojis: '🚶',
          },
          {
            action: '입으로 천천히 숨쉬기',
            emojis: '😮💨',
          },
        ];
        setRecommendedActions(mockActions);
        // --- 임시 데이터 끝 ---
      } catch (error) {
        console.error('AI Recommendation API error:', error);
        // 에러 시 기본 행동 추천
        setRecommendedActions([
          { action: '잠시 휴식하기', emojis: '🧘' },
          { action: '편안한 자세로 앉기', emojis: '🪑' },
          { action: '심호흡하기', emojis: '🫁' },
        ]);
      } finally {
        setIsLoading(false);
        setStep('ACTION_SELECT');
      }
    }, 1500); // 딜레이 시뮬레이션
  };

  // 대분류 선택 핸들러
  const handleCategorySelect = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    
    // "모르겠어요" (MISC) 카테고리는 소분류 선택을 건너뛰고 바로 행동 추천으로 이동
    if (categoryKey === 'MISC') {
      setSelectedSituationText('모르겠어요');
      setSubSituations([]);
      fetchRecommendedActions();
      return;
    }
    
    // JSON 데이터에서 해당 카테고리의 하위 항목 필터링
    const filteredSituations = situationData.filter(
      (item) => item.category === categoryKey,
    );
    setSubSituations(filteredSituations);
    setStep('SITUATION_SELECT');
  };

  // 소분류(상황) 선택 핸들러
  const handleSituationSelect = (situation: SituationCard) => {
    setSelectedSituationText(situation.text);
    setShowConfirmModal(true);
  };

  // 확인 모달에서 다음 버튼 클릭
  const handleConfirmNext = () => {
    setShowConfirmModal(false);
    fetchRecommendedActions();
  };

  // 행동 선택 핸들러
  const handleActionSelect = (action: RecommendedAction) => {
    setSelectedAction(action);
    setStep('ACTION_DETAIL');
  };

  // 행동 완료 핸들러
  const handleActionDone = () => {
    setShowFeedbackModal(true);
  };

  // 피드백 선택 핸들러
  const handleFeedbackSelect = (feedbackEmoji: string) => {
    setShowFeedbackModal(false);

    if (userRole === '기업 재직자' && userProfile?.email) {
      const timestamp = new Date().toISOString();
      logMemberEmotion(userProfile.email, {
        id: `${timestamp}-${Math.random()}`,
        feeling: feedbackEmoji,
        initialMood: initialMoodEmoji || null,
        situationText: selectedSituationText,
        feedback: feedbackEmoji,
        category: selectedCategory || null,
        categoryLabel: selectedCategory ? mainCategories[selectedCategory] || null : null,
        action: selectedAction?.action || null,
        actionEmojis: selectedAction?.emojis || null,
        createdAt: timestamp,
      });
      updateMemberStatus(userProfile.email, {
        lastEmotion: feedbackEmoji,
        lastEmotionAt: timestamp,
      });
    }

    // 초기 기분과 최종 피드백 비교
    if (initialMoodEmoji) {
      const initialLevel = getMoodLevel(initialMoodEmoji);
      const feedbackLevel = getMoodLevel(feedbackEmoji);
      const isImproved = feedbackLevel > initialLevel;
      
      // 기분이 개선되었고 최종 피드백이 긍정적이면 스티커 차트로 이동
      if (isImproved && POSITIVE_FEEDBACK.has(feedbackEmoji)) {
        resetFlow();
        navigation.navigate('StickerChart', { 
          rewardId: `mood-improvement-${Date.now()}`,
          navigateHomeOnClose: true,
        });
        return;
      }
      
      // 기분이 개선되었지만 여전히 부정적이면 다시 행동 추천
      if (isImproved && NEGATIVE_FEEDBACK.has(feedbackEmoji)) {
        setSelectedAction(null);
        setRecommendedActions([]);
        fetchRecommendedActions(); // 다시 행동 추천
        return;
      }
    }

    // 기분이 개선되지 않았거나 초기 기분이 없는 경우
    if (NEGATIVE_FEEDBACK.has(feedbackEmoji)) {
      notifyAdminCriticalEmotion({
        memberName: userProfile?.name,
        organizationName: organization?.name,
        feeling: feedbackEmoji,
        situationText: selectedSituationText,
      });
      setShowRetryModal(true);
      return;
    }

    if (POSITIVE_FEEDBACK.has(feedbackEmoji)) {
      setShowPositiveModal(true);
      return;
    }

    resetFlow();
  };

  // 피드백 모달 닫기 및 초기화
  const handleCloseFeedbackModal = () => {
    resetFlow();
  };


const getEmojiForSituation = (situation?: SituationCard | null): string | { main: string; small: string } => {
  if (!situation) return '🙂';
  if (situationEmojiOverrides[situation.id]) {
    return situationEmojiOverrides[situation.id];
  }
  const text = situation.text;
  for (const rule of keywordEmojiRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.emoji;
    }
  }
  return categoryEmojiMap[situation.category] || '🙂';
  };

  // --- 렌더링 함수들 ---

  // 각 기분 버튼별 TTS 읽기
  const handleReadMoodOption = async (mood: { emoji: string; label: string; isPositive: boolean }, index: number) => {
    const speakingKey = `mood-${index}`;
    if (isSpeaking && speakingKey === speakingSection) {
      await stopSpeaking();
      setIsSpeaking(false);
      setSpeakingSection(null);
      return;
    }

    const moodText = mood.label.replace(/\n/g, ' ');
    setIsSpeaking(true);
    setSpeakingSection(speakingKey);
    await speakText(moodText);
  };

  // 카테고리별 TTS 읽기
  const handleReadCategory = async (categoryKey: string) => {
    const speakingKey = `category-${categoryKey}`;
    if (isSpeaking && speakingKey === speakingSection) {
      await stopSpeaking();
      setIsSpeaking(false);
      setSpeakingSection(null);
      return;
    }

    const categoryText = mainCategories[categoryKey].replace(/\n/g, ' ');
    setIsSpeaking(true);
    setSpeakingSection(speakingKey);
    await speakText(categoryText);
  };

  // 상황별 TTS 읽기
  const handleReadSituation = async (situation: SituationCard) => {
    const speakingKey = `situation-${situation.id}`;
    if (isSpeaking && speakingKey === speakingSection) {
      await stopSpeaking();
      setIsSpeaking(false);
      setSpeakingSection(null);
      return;
    }

    setIsSpeaking(true);
    setSpeakingSection(speakingKey);
    await speakText(situation.text);
  };

  // 행동별 TTS 읽기
  const handleReadAction = async (action: RecommendedAction, index: number) => {
    const speakingKey = `action-${index}`;
    if (isSpeaking && speakingKey === speakingSection) {
      await stopSpeaking();
      setIsSpeaking(false);
      setSpeakingSection(null);
      return;
    }

    setIsSpeaking(true);
    setSpeakingSection(speakingKey);
    await speakText(action.action);
  };

  // 행동 상세 설명 TTS 읽기
  const handleReadActionDetail = async () => {
    if (!selectedAction) return;
    
    const speakingKey = 'action-detail';
    if (isSpeaking && speakingKey === speakingSection) {
      await stopSpeaking();
      setIsSpeaking(false);
      setSpeakingSection(null);
      return;
    }

    const actionDetails: { [key: string]: { title: string; instructions: string[] } } = {
      '이어폰이나 귀마개를 끼기': {
        title: '이어폰이나 귀마개를 끼기',
        instructions: [
          '주변 소리를 차단할 수 있는 이어폰이나 귀마개를 준비하세요.',
          '편안하게 착용하세요.',
          '조용한 음악을 들으면 더 편안해질 수 있어요.',
        ],
      },
      '잠깐 조용한 곳으로 이동하기': {
        title: '잠깐 조용한 곳으로 이동하기',
        instructions: [
          '하던 일을 잠깐 멈추고, 어깨에 힘을 빼기',
          '조용한 곳으로 천천히 이동하기',
          '편안한 자세로 1-2분 휴식하기',
        ],
      },
      '입으로 천천히 숨쉬기': {
        title: '입으로 천천히 숨쉬기',
        instructions: [
          '하던 일을 잠깐 멈추고, 어깨에 힘을 빼기',
          '입을 작게 벌리고 "후-"하며 천천히 4초 동안 숨을 내쉬기',
          '코로 천천히 3초 동안 숨을 들이마시기',
        ],
      },
    };

    const detail = actionDetails[selectedAction.action] || {
      title: selectedAction.action,
      instructions: ['선택한 행동을 천천히 따라해 보세요.'],
    };

    const fullText = `${detail.title}. ${detail.instructions.map((inst, idx) => `${idx + 1}번째. ${inst}`).join('. ')}`;
    setIsSpeaking(true);
    setSpeakingSection(speakingKey);
    await speakText(fullText);
  };

  // 초기 기분 선택 화면
  const renderMoodSelect = () => (
    <View style={styles.container}>
        <Text style={styles.title}>지금 마음이 어때요?</Text>
      <Text style={styles.subtitle}>현재 기분을 선택해주세요</Text>
      <ScrollView contentContainerStyle={styles.moodContainer}>
        {initialMoodEmojis.map((mood, index) => {
          const speakingKey = `mood-${index}`;
          const isCurrentlySpeaking = isSpeaking && speakingSection === speakingKey;
          return (
            <View key={index} style={styles.moodButtonContainer}>
          <TouchableOpacity
            style={styles.moodButton}
            onPress={() => handleMoodSelect(mood)}>
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel} numberOfLines={3} adjustsFontSizeToFit={false}>
              {mood.label}
            </Text>
          </TouchableOpacity>
              <TouchableOpacity
                style={styles.moodTtsButton}
                onPress={() => handleReadMoodOption(mood, index)}
                activeOpacity={0.7}
              >
                <FeatherIcon
                  name={isCurrentlySpeaking ? 'volume-2' : 'volume-1'}
                  size={14}
                  color={isCurrentlySpeaking ? '#FFA000' : '#666'}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // 대분류 선택 화면
  const renderCategorySelect = () => (
    <View style={styles.container}>
      <Text style={styles.title}>지금 어떤가요?</Text>
      <ScrollView contentContainerStyle={styles.categoryContent}>
        {Object.keys(mainCategories).map((key) => {
          const speakingKey = `category-${key}`;
          const isCurrentlySpeaking = isSpeaking && speakingSection === speakingKey;
          return (
            <View key={key} style={styles.categoryCardContainer}>
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(key)}>
            <View style={styles.categoryEmojiBubble}>
              <Text style={styles.categoryEmoji}>
                {categoryEmojiMap[key] || '🙂'}
              </Text>
            </View>
            <Text style={styles.categoryLabel}>
              {mainCategories[key]}
            </Text>
          </TouchableOpacity>
              <TouchableOpacity
                style={styles.categoryTtsButton}
                onPress={() => handleReadCategory(key)}
                activeOpacity={0.7}
              >
                <FeatherIcon
                  name={isCurrentlySpeaking ? 'volume-2' : 'volume-1'}
                  size={14}
                  color={isCurrentlySpeaking ? '#FFA000' : '#666'}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // 소분류 선택 화면 (3x2 그리드)
  const renderSituationSelect = () => (
    <View style={styles.container}>
      <View style={styles.stepHeaderRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToCategory}>
          <FeatherIcon name="chevron-left" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.stepHeaderSpacer} />
      </View>
      <Text style={styles.title}>현재 느끼는 기분과 가장 비슷한 기분을 선택해 주세요</Text>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {subSituations.map((item) => {
          const speakingKey = `situation-${item.id}`;
          const isCurrentlySpeaking = isSpeaking && speakingSection === speakingKey;
          return (
            <View key={item.id} style={styles.gridCardContainer}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleSituationSelect(item)}>
            <View style={styles.gridEmojiBubble}>
              {(() => {
                const emoji = getEmojiForSituation(item);
                if (typeof emoji === 'string') {
                  return <Text style={styles.gridEmojiText}>{emoji}</Text>;
                } else {
                  return (
                    <View style={styles.gridEmojiContainer}>
                      <Text style={styles.gridEmojiText}>{emoji.main}</Text>
                      <Text style={styles.gridEmojiSmall}>{emoji.small}</Text>
                    </View>
                  );
                }
              })()}
            </View>
            <Text style={styles.gridCardText}>{item.text}</Text>
          </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridTtsButton}
                onPress={() => handleReadSituation(item)}
                activeOpacity={0.7}
              >
                <FeatherIcon
                  name={isCurrentlySpeaking ? 'volume-2' : 'volume-1'}
                  size={12}
                  color={isCurrentlySpeaking ? '#FFA000' : '#666'}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // 확인 모달
  const renderConfirmModal = () => (
    <Modal
      transparent={true}
      animationType="fade"
      visible={showConfirmModal}
      onRequestClose={() => setShowConfirmModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>상황 입력을 완료하셨습니다</Text>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => setShowConfirmModal(false)}>
              <Text style={styles.modalButtonSecondaryText}>이전</Text>
            </TouchableOpacity>
          <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={handleConfirmNext}>
              <Text style={styles.modalButtonPrimaryText}>다음</Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // AI 행동 추천 3가지 선택 화면
  const renderActionSelect = () => {
    if (isLoading) {
      return (
    <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFC107" style={styles.spinner} />
      <Text style={styles.loadingText}>
        어떻게 하면 좋을지{'\n'}AI가 생각하고 있어요
      </Text>
    </View>
  );
    }

    return (
    <View style={styles.container}>
        <View style={styles.stepHeaderRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToSituation}>
            <FeatherIcon name="chevron-left" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.stepHeaderSpacer} />
        </View>
        <Text style={styles.title}>무엇을 하면 편해질까요?</Text>
        <Text style={styles.subtitle}>원하는 행동을 선택하세요!</Text>
        <ScrollView contentContainerStyle={styles.actionListContainer}>
          {recommendedActions.map((action, index) => {
            const speakingKey = `action-${index}`;
            const isCurrentlySpeaking = isSpeaking && speakingSection === speakingKey;
            return (
              <View key={index} style={styles.actionCardContainer}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleActionSelect(action)}>
              <View style={styles.actionCardContent}>
                <View style={styles.actionEmojiContainer}>
                  <Text style={styles.actionEmoji}>{action.emojis}</Text>
                </View>
                <View style={styles.actionCardTextContainer}>
                  <Text style={styles.actionCardText}>{action.action}</Text>
                </View>
              </View>
            </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionTtsButton}
                  onPress={() => handleReadAction(action, index)}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={isCurrentlySpeaking ? 'volume-2' : 'volume-1'}
                    size={14}
                    color={isCurrentlySpeaking ? '#FFA000' : '#666'}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 선택한 행동 상세 설명 화면
  const renderActionDetail = () => {
    if (!selectedAction) return null;

    // 행동별 상세 설명 (임시 데이터)
    const actionDetails: { [key: string]: { title: string; instructions: string[] } } = {
      '이어폰이나 귀마개를 끼기': {
        title: '이어폰이나 귀마개를 끼기',
        instructions: [
          '주변 소리를 차단할 수 있는 이어폰이나 귀마개를 준비하세요.',
          '편안하게 착용하세요.',
          '조용한 음악을 들으면 더 편안해질 수 있어요.',
        ],
      },
      '잠깐 조용한 곳으로 이동하기': {
        title: '잠깐 조용한 곳으로 이동하기',
        instructions: [
          '하던 일을 잠깐 멈추고, 어깨에 힘을 빼기',
          '조용한 곳으로 천천히 이동하기',
          '편안한 자세로 1-2분 휴식하기',
        ],
      },
      '입으로 천천히 숨쉬기': {
        title: '입으로 천천히 숨쉬기',
        instructions: [
          '하던 일을 잠깐 멈추고, 어깨에 힘을 빼기',
          '입을 작게 벌리고 "후-"하며 천천히 4초 동안 숨을 내쉬기',
          '코로 천천히 3초 동안 숨을 들이마시기',
        ],
      },
    };

    const detail = actionDetails[selectedAction.action] || {
      title: selectedAction.action,
      instructions: ['선택한 행동을 천천히 따라해 보세요.'],
    };

    return (
      <View style={styles.container}>
        <View style={styles.stepHeaderRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToActionList}>
            <FeatherIcon name="chevron-left" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.stepHeaderSpacer} />
        </View>
        <View style={styles.actionDetailCard}>
          <View style={styles.actionDetailHeader}>
          <View style={styles.actionDetailEmojiContainer}>
            <Text style={styles.actionDetailEmoji}>{selectedAction.emojis}</Text>
            </View>
            <TouchableOpacity
              style={styles.actionDetailTtsButton}
              onPress={handleReadActionDetail}
              activeOpacity={0.7}
            >
              <FeatherIcon
                name={isSpeaking && speakingSection === 'action-detail' ? 'volume-2' : 'volume-1'}
                size={16}
                color={isSpeaking && speakingSection === 'action-detail' ? '#FFA000' : '#666'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.actionDetailTitle}>{detail.title}</Text>
          <Text style={styles.actionDetailSubtitle}>
            밑의 설명을 보고 따라 해 보세요
          </Text>
          <View style={styles.instructionsContainer}>
            {detail.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}.</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
          <View style={styles.actionDetailButtonRow}>
            <TouchableOpacity
              style={styles.actionDetailButtonSecondary}
              onPress={() => setStep('ACTION_SELECT')}>
              <Text style={styles.actionDetailButtonSecondaryText}>
                다른 행동 선택하기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionDetailButtonPrimary}
              onPress={handleActionDone}>
              <Text style={styles.actionDetailButtonPrimaryText}>
                이 행동을 했어요
              </Text>
      </TouchableOpacity>
          </View>
        </View>
    </View>
  );
  };

  // 최종 피드백 모달
  const renderFeedbackModal = () => (
    <Modal
      transparent={true}
      animationType="fade"
      visible={showFeedbackModal}
      onRequestClose={handleCloseFeedbackModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.feedbackModalContent}>
          <Text style={styles.feedbackModalTitle}>현재 마음이 어때요?</Text>
          <View style={styles.feedbackEmojiContainer}>
            {feedbackEmojis.map((item, index) => (
          <TouchableOpacity
                key={index}
                style={styles.feedbackEmojiButton}
                onPress={() => handleFeedbackSelect(item.emoji)}>
                <Text style={styles.feedbackEmoji}>{item.emoji}</Text>
                <Text style={styles.feedbackEmojiLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
      </View>
    </Modal>
  );

  const renderPositiveModal = () => (
    <Modal
      transparent
      animationType="fade"
      visible={showPositiveModal}
      onRequestClose={handlePositiveModalConfirm}>
      <View style={styles.modalOverlay}>
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>😊</Text>
          <Text style={styles.successTitle}>좋아요!</Text>
          <Text style={styles.successText}>지금 기분이 괜찮으시네요.{'\n'}계속 좋은 하루 보내세요!</Text>
          <TouchableOpacity 
            style={[styles.modalButtonPrimary, styles.modalButtonFullWidth]} 
            onPress={handlePositiveModalConfirm}>
            <Text style={styles.modalButtonPrimaryText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRetryModal = () => (
    <Modal
      transparent
      animationType="fade"
      visible={showRetryModal}
      onRequestClose={() => setShowRetryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>괜찮아요</Text>
          <Text style={styles.modalMessage}>도움을 주는 행동을 다시 골라볼까요?</Text>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={() => {
                setShowRetryModal(false);
                setStep('ACTION_SELECT');
              }}>
              <Text style={styles.modalButtonPrimaryText}>다시 해볼래요</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 현재 단계(step)에 따라 적절한 화면 렌더링
  const renderCurrentStep = () => {
    switch (step) {
      case 'MOOD_SELECT':
        return renderMoodSelect();
      case 'CATEGORY_SELECT':
        return renderCategorySelect();
      case 'SITUATION_SELECT':
        return renderSituationSelect();
      case 'ACTION_SELECT':
        return renderActionSelect();
      case 'ACTION_DETAIL':
        return renderActionDetail();
      default:
        return renderMoodSelect();
    }
  };

  return (
    <View style={styles.safeArea}>
      {renderCurrentStep()}
      {renderConfirmModal()}
      {renderFeedbackModal()}
      {renderPositiveModal()}
      {renderRetryModal()}
    </View>
  );
};

// StyleSheet.create 사용
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: height * 0.05,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  // 대분류 카드
  categoryContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingBottom: 60,
  },
  categoryCardContainer: {
    width: '45%',
    marginBottom: 24,
    position: 'relative',
  },
  categoryCard: {
    width: '100%',
    minHeight: 160,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  categoryTtsButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  categoryEmojiBubble: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFF2C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  categoryEmoji: {
    fontSize: 35,
  },
  categoryLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  // 소분류 그리드
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingBottom: 80,
  },
  gridCardContainer: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    marginBottom: 15,
    position: 'relative',
  },
  gridCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridTtsButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  gridEmojiBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF8E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  gridEmojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridEmojiText: {
    fontSize: 36,
  },
  gridEmojiSmall: {
    fontSize: 18,
    position: 'absolute',
    bottom: -2,
    right: -8,
  },
  gridCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // 확인 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  modalButtonFullWidth: {
    width: '100%',
    paddingVertical: 14,
  },
  modalButtonPrimaryText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1C1C',
    textAlign: 'center',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepHeaderSpacer: {
    width: 40,
    height: 1,
  },
  // 행동 추천 리스트
  actionListContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  actionCardContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  actionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionTtsButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionEmojiContainer: {
    width: 80,
    height: 80,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  actionEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  actionCardTextContainer: {
    flex: 1,
  },
  actionCardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  // 행동 상세 설명
  actionDetailCard: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 25,
    marginTop: 20,
  },
  actionDetailHeader: {
    alignItems: 'center',
    position: 'relative',
  },
  actionDetailEmojiContainer: {
    width: 150,
    height: 150,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  actionDetailTtsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  actionDetailEmoji: {
    fontSize: 80,
    textAlign: 'center',
  },
  actionDetailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  actionDetailSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  instructionsContainer: {
    marginBottom: 25,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginRight: 10,
    minWidth: 25,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionDetailButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  actionDetailButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionDetailButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionDetailButtonPrimary: {
    flex: 1,
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionDetailButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  // 최종 피드백 모달
  feedbackModalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  feedbackModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  feedbackEmojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  feedbackEmojiButton: {
    alignItems: 'center',
    margin: 10,
    padding: 15,
    minWidth: 80,
  },
  feedbackEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  feedbackEmojiLabel: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  // 공통
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  spinner: {
    marginTop: 20,
  },
  successContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
    paddingBottom: 40,
    alignItems: 'center',
    marginHorizontal: 16,
    elevation: 10,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  successText: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 25,
  },
  moodButtonContainer: {
    width: '45%',
    marginBottom: 15,
    position: 'relative',
  },
  moodButton: {
    width: '100%',
    minHeight: 150,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    padding: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  moodTtsButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  moodEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  moodLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    lineHeight: 17,
    width: '100%',
  },
});

export default AnxietyInputScreen;
