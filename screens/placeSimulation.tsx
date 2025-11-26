import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import scenarioData from '../services/scenario-data.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Category = {
  id: string;
  name: string;
};

type Place = {
  id: string;
  name: string;
  categoryId: string;
};

type Scenario = {
  id: string;
  placeId: string;
  situation: string;
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  feedback: {
    correct: string;
    incorrect: string;
  };
};

type Step = 'CATEGORY_SELECT' | 'PLACE_SELECT' | 'SCENARIO_QUIZ' | 'FEEDBACK';

// 이미지 매핑
const placeImageMap: { [key: string]: { icon?: any; background?: any } } = {
  mart: {
    icon: require('../assets/images/grocery_o.png'),
    background: require('../assets/images/grocery_i.jpg'),
  },
  cvs: {
    icon: require('../assets/images/convini_o.png'),
    background: require('../assets/images/convini_i.png'),
  },
  bakery: {
    icon: require('../assets/images/bread_o.png'),
    background: require('../assets/images/bread_i.png'),
  },
  daiso: {
    icon: require('../assets/images/dollarStore_o.png'),
    background: require('../assets/images/dollarStore_i.png'),
  },
  book: {
    icon: require('../assets/images/bookstore_o.png'),
    background: require('../assets/images/bookstore_i.png'),
  },
  hospital: {
    icon: require('../assets/images/hospital_o.png'),
    background: require('../assets/images/hospital_i.png'),
  },
  pharmacy: {
    icon: require('../assets/images/pharmacy_o.png'),
    background: require('../assets/images/parmacy_i.png'),
  },
  dental: {
    icon: require('../assets/images/dental_o.png'),
    background: require('../assets/images/dental_i.png'),
  },
  nurse: {
    icon: require('../assets/images/nurse_o.png'),
    background: require('../assets/images/nurse_i.png'),
  },
  company: {
    icon: require('../assets/images/office_o.jpeg'),
    background: require('../assets/images/office_i.jpg'),
  },
  school: {
    icon: require('../assets/images/school_o.jpeg'),
    background: require('../assets/images/school_i.jpeg'),
  },
  library: {
    icon: require('../assets/images/library_o.jpg'),
    background: require('../assets/images/library_i.jpg'),
  },
  car: {
    icon: require('../assets/images/car_o.png'),
    background: require('../assets/images/car_i.jpg'),
  },
  bus: {
    icon: require('../assets/images/bus_o.png'),
    background: require('../assets/images/bus_i.jpg'),
  },
  taxi: {
    icon: require('../assets/images/taxi_o.png'),
    background: require('../assets/images/taxi_i.jpg'),
  },
  metro: {
    icon: require('../assets/images/subway_o.png'),
    background: require('../assets/images/subway_i.jpg'),
  },
};

// 카테고리별 색상 매핑
const categoryColors: { [key: string]: { background: string; border: string } } = {
  transport: { background: '#E8F4FD', border: '#4A90E2' },
  medical: { background: '#FFE8E8', border: '#FF6B6B' },
  shopping: { background: '#E8E8FF', border: '#8B7ED8' },
  workstudy: { background: '#E8F5E9', border: '#66BB6A' },
};

// 카테고리별 이미지 매핑
const categoryImageMap: { [key: string]: any } = {
  transport: require('../assets/images/bus_o.png'), // 교통수단 대표 이미지
  medical: require('../assets/images/hospital_o.png'),
  shopping: require('../assets/images/grocery_o.png'),
  workstudy: require('../assets/images/school_o.jpeg'),
};

// 장소별 색상 매핑 (앞면/뒷면 동일)
const placeColors: { [key: string]: { background: string; border: string } } = {
  car: { background: '#E8F4FD', border: '#4A90E2' },
  bus: { background: '#E8F4FD', border: '#4A90E2' },
  taxi: { background: '#E8F4FD', border: '#4A90E2' },
  metro: { background: '#E8F4FD', border: '#4A90E2' },
  hospital: { background: '#FFE8E8', border: '#FF6B6B' },
  pharmacy: { background: '#FFE8E8', border: '#FF6B6B' },
  dental: { background: '#FFE8E8', border: '#FF6B6B' },
  nurse: { background: '#FFE8E8', border: '#FF6B6B' },
  mart: { background: '#E8E8FF', border: '#8B7ED8' },
  cvs: { background: '#E8E8FF', border: '#8B7ED8' },
  bakery: { background: '#E8E8FF', border: '#8B7ED8' },
  daiso: { background: '#E8E8FF', border: '#8B7ED8' },
  book: { background: '#E8E8FF', border: '#8B7ED8' },
  company: { background: '#E8F5E9', border: '#66BB6A' },
  school: { background: '#E8F5E9', border: '#66BB6A' },
  library: { background: '#E8F5E9', border: '#66BB6A' },
};

// 장소 설명 (카드 뒷면용)
const placeDescriptions: { [key: string]: string } = {
  car: '자동차는 빠르게 이동할 수 있는 교통수단이에요. 안전벨트를 꼭 매야 해요.',
  bus: '버스는 많은 사람들이 함께 타는 대중교통이에요. 줄을 서서 기다려야 해요.',
  taxi: '택시는 목적지까지 직접 가는 교통수단이에요. 기사님께 정중하게 말해야 해요.',
  metro: '지하철은 빠르고 편리한 교통수단이에요. 교통카드를 찍고 타야 해요.',
  hospital: '병원은 몸이 아플 때 가는 곳이에요. 조용히 기다리고 선생님 말씀을 들어야 해요.',
  pharmacy: '약국은 약을 받는 곳이에요. 약사님께 감사 인사를 해야 해요.',
  dental: '치과는 이를 치료하는 곳이에요. 조용히 앉아서 치료를 받아야 해요.',
  nurse: '보건실은 학교에서 아플 때 가는 곳이에요. 선생님께 먼저 말씀드려야 해요.',
  mart: '마트는 물건을 사는 큰 가게예요. 천천히 걸어야 안전해요.',
  cvs: '편의점은 작은 물건을 사는 가게예요. 인사를 하고 물건을 고르면 돼요.',
  bakery: '빵집은 맛있는 빵을 파는 가게예요. 집게를 사용해서 빵을 고르면 돼요.',
  daiso: '생활용품가게는 작은 물건들을 파는 가게예요. 조심히 물건을 살펴봐야 해요.',
  book: '책방은 책을 파는 가게예요. 조용히 책을 살펴보고 계산해야 해요.',
  company: '회사는 일하는 곳이에요. 동료들에게 인사를 하고 조용히 일해야 해요.',
  school: '학교는 공부하는 곳이에요. 선생님께 인사하고 친구들과 함께 공부해요.',
  library: '도서관은 조용히 책을 읽는 곳이에요. 조용히 걸어야 해요.',
};

const PlaceSimulation = () => {
  const [step, setStep] = useState<Step>('CATEGORY_SELECT');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [flipAnimations, setFlipAnimations] = useState<{ [key: string]: Animated.Value }>({});
  const [flipTimeouts, setFlipTimeouts] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);

  const categories = scenarioData.categories as Category[];
  const places = scenarioData.places as Place[];
  const scenarios = scenarioData.scenarios as Scenario[];

  // 선택한 카테고리의 장소들
  const categoryPlaces = useMemo(() => {
    if (!selectedCategory) return [];
    return places.filter((p) => p.categoryId === selectedCategory.id);
  }, [selectedCategory, places]);

  // 선택한 장소의 시나리오들
  const placeScenarios = useMemo(() => {
    if (!selectedPlace) return [];
    return scenarios.filter((s) => s.placeId === selectedPlace.id);
  }, [selectedPlace, scenarios]);

  const currentScenario = placeScenarios[currentScenarioIndex];

  // TTS 완료 이벤트 리스너
  useEffect(() => {
    TTS.addEventListener('tts-finish', () => {
      setSpeakingSection(null);
    });
    TTS.addEventListener('tts-cancel', () => {
      setSpeakingSection(null);
    });
  }, []);

  // 카테고리 선택
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep('PLACE_SELECT');
    // 모든 타이머 정리
    Object.values(flipTimeouts).forEach((timeout) => clearTimeout(timeout));
    setFlipTimeouts({});
    setFlipAnimations({});
  };

  // 장소 카드 뒤집기 애니메이션
  const handleCardFlip = (placeId: string) => {
    // 이미 애니메이션이 진행 중이면 무시
    if (flipAnimations[placeId]) {
      const currentValue = (flipAnimations[placeId] as any)._value;
      if (currentValue > 0 && currentValue < 1) {
        return; // 애니메이션 진행 중
      }
    }

    // 애니메이션 값 초기화 또는 생성
    let flipValue = flipAnimations[placeId];
    if (!flipValue) {
      flipValue = new Animated.Value(0);
      setFlipAnimations((prev) => ({
        ...prev,
        [placeId]: flipValue,
      }));
    }

    // 기존 타이머가 있으면 취소
    if (flipTimeouts[placeId]) {
      clearTimeout(flipTimeouts[placeId]);
    }

    // 카드 뒤집기 애니메이션 (앞면 -> 뒷면)
    Animated.sequence([
      // 0 -> 0.5: 앞면이 사라지면서 회전
      Animated.timing(flipValue, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      // 뒷면이 나타나면서 회전
      Animated.timing(flipValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 5초 후 자동으로 원래대로 돌아가기
    const timeout = setTimeout(() => {
      Animated.sequence([
        // 1 -> 0.5: 뒷면이 사라지면서 회전
        Animated.timing(flipValue, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        // 앞면이 나타나면서 회전
        Animated.timing(flipValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 애니메이션 완료 후 정리
        setFlipTimeouts((prev) => {
          const newTimeouts = { ...prev };
          delete newTimeouts[placeId];
          return newTimeouts;
        });
      });
    }, 5000);

    setFlipTimeouts((prev) => ({
      ...prev,
      [placeId]: timeout,
    }));
  };

  // 장소 선택
  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setCurrentScenarioIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setStep('SCENARIO_QUIZ');
  };

  // 옵션 선택
  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return; // 이미 선택했으면 무시
    setSelectedOption(index);
    setShowFeedback(true);
  };

  // 다음 시나리오로
  const handleNextScenario = () => {
    if (currentScenarioIndex < placeScenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      // 모든 시나리오 완료
      setStep('CATEGORY_SELECT');
      setSelectedCategory(null);
      setSelectedPlace(null);
      setCurrentScenarioIndex(0);
      setSelectedOption(null);
      setShowFeedback(false);
    }
  };

  // 뒤로가기
  const handleBack = () => {
    if (step === 'PLACE_SELECT') {
      setStep('CATEGORY_SELECT');
      setSelectedCategory(null);
    } else if (step === 'SCENARIO_QUIZ') {
      setStep('PLACE_SELECT');
      setSelectedPlace(null);
      setCurrentScenarioIndex(0);
      setSelectedOption(null);
      setShowFeedback(false);
    }
  };

  // 카테고리 선택 화면
  const renderCategorySelect = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>어디로 가볼까요?</Text>
        <Text style={styles.subtitle}>갈 곳을 선택해주세요.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.categoryGrid}>
        {categories.map((category) => {
          const categoryColor = categoryColors[category.id] || { background: '#FFFFFF', border: '#E0E0E0' };
          const categoryImage = categoryImageMap[category.id];
          const speakingKey = `category-${category.id}`;
          const isCurrentlySpeaking = speakingSection === speakingKey;
          
          return (
            <View key={category.id} style={styles.categoryCardContainer}>
            <TouchableOpacity
              style={[
                styles.categoryCard,
                {
                  backgroundColor: categoryColor.background,
                  borderColor: categoryColor.border,
                },
              ]}
              onPress={() => handleCategorySelect(category)}>
              {categoryImage && (
                <Image source={categoryImage} style={styles.categoryImage} resizeMode="contain" />
              )}
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
              <TouchableOpacity
                style={styles.categoryTtsButton}
                onPress={async () => {
                  if (isCurrentlySpeaking) {
                    await stopSpeaking();
                    setSpeakingSection(null);
                    return;
                  }
                  setSpeakingSection(speakingKey);
                  await speakText(category.name);
                }}
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

  // 장소 선택 화면
  const renderPlaceSelect = () => {
    if (!selectedCategory) return null;

  return (
    <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <FeatherIcon name="chevron-left" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>어디로 가볼까요?</Text>
            <Text style={styles.subtitle}>갈 곳을 선택해주세요.</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.placeGrid}>
          {categoryPlaces.map((place) => {
            const imageInfo = placeImageMap[place.id];
            const flipAnim = flipAnimations[place.id];

            // 앞면 애니메이션: 0일 때 보임, 0.5일 때 안 보임, 1일 때 안 보임
            const frontOpacity = flipAnim
              ? flipAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0, 0],
                })
              : 1;

            const frontRotateY = flipAnim
              ? flipAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['0deg', '90deg', '90deg'],
                })
              : '0deg';

            // 뒷면 애니메이션: 0일 때 안 보임, 0.5일 때 안 보임, 1일 때 보임
            const backOpacity = flipAnim
              ? flipAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0, 1],
                })
              : 0;

            const backRotateY = flipAnim
              ? flipAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['-90deg', '-90deg', '0deg'],
                })
              : '-90deg';

            const placeColor = placeColors[place.id] || { background: '#E8E8FF', border: '#D0D0D0' };
            const placeDescriptionText = placeDescriptions[place.id] || `${place.name}에 대한 설명입니다.`;
            const speakingKeyName = `place-name-${place.id}`;
            const speakingKeyDesc = `place-desc-${place.id}`;
            const isSpeakingName = speakingSection === speakingKeyName;
            const isSpeakingDesc = speakingSection === speakingKeyDesc;

            return (
              <View key={place.id} style={styles.placeCardContainer}>
              <TouchableOpacity
                style={styles.placeCard}
                onPress={() => handlePlaceSelect(place)}
                activeOpacity={0.8}>
                <View style={styles.placeCardInner}>
                  {/* 앞면 */}
                  <Animated.View
                    style={[
                      styles.cardFace,
                      {
                        backgroundColor: placeColor.background,
                        borderColor: placeColor.border,
                        opacity: frontOpacity,
                        transform: [{ rotateY: frontRotateY }],
                      },
                    ]}>
                    <TouchableOpacity
                      style={styles.questionIcon}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCardFlip(place.id);
                      }}
                      activeOpacity={0.7}>
                      <Text style={styles.questionIconText}>?</Text>
                    </TouchableOpacity>
                    {imageInfo?.icon && (
                      <Image source={imageInfo.icon} style={styles.placeIcon} resizeMode="contain" />
                    )}
                    <Text style={styles.placeName}>{place.name}</Text>
                  </Animated.View>

                  {/* 뒷면 */}
                  <Animated.View
                    style={[
                      styles.cardFace,
                      {
                        backgroundColor: placeColor.background,
                        borderColor: placeColor.border,
                        opacity: backOpacity,
                        transform: [{ rotateY: backRotateY }],
                      },
                    ]}>
                    <Text style={styles.placeDescription}>
                        {placeDescriptionText}
                    </Text>
                  </Animated.View>
                </View>
              </TouchableOpacity>
                {/* 앞면 TTS 버튼 */}
                <Animated.View
                  style={[
                    styles.placeTtsButton,
                    { opacity: frontOpacity },
                  ]}>
                  <TouchableOpacity
                    onPress={async (e) => {
                      e.stopPropagation();
                      if (isSpeakingName) {
                        await stopSpeaking();
                        setSpeakingSection(null);
                        return;
                      }
                      setSpeakingSection(speakingKeyName);
                      await speakText(place.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <FeatherIcon
                      name={isSpeakingName ? 'volume-2' : 'volume-1'}
                      size={12}
                      color={isSpeakingName ? '#FFA000' : '#666'}
                    />
                  </TouchableOpacity>
                </Animated.View>
                {/* 뒷면 TTS 버튼 */}
                <Animated.View
                  style={[
                    styles.placeTtsButton,
                    { opacity: backOpacity },
                  ]}>
                  <TouchableOpacity
                    onPress={async (e) => {
                      e.stopPropagation();
                      if (isSpeakingDesc) {
                        await stopSpeaking();
                        setSpeakingSection(null);
                        return;
                      }
                      setSpeakingSection(speakingKeyDesc);
                      await speakText(placeDescriptionText);
                    }}
                    activeOpacity={0.7}
                  >
                    <FeatherIcon
                      name={isSpeakingDesc ? 'volume-2' : 'volume-1'}
                      size={12}
                      color={isSpeakingDesc ? '#FFA000' : '#666'}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 시나리오 퀴즈 화면
  const renderScenarioQuiz = () => {
    if (!currentScenario || !selectedPlace) return null;

    const imageInfo = placeImageMap[selectedPlace.id];
    const isCorrect = selectedOption !== null && currentScenario.options[selectedOption]?.isCorrect;
    const selectedOptionData = selectedOption !== null ? currentScenario.options[selectedOption] : null;

    return (
      <View style={styles.quizContainer}>
        {imageInfo?.background && (
          <Image source={imageInfo.background} style={styles.backgroundImage} resizeMode="cover" />
        )}
        <View style={styles.quizOverlay}>
          <View style={styles.quizHeader}>
            <TouchableOpacity style={styles.quizBackButton} onPress={handleBack}>
              <FeatherIcon name="chevron-left" size={28} color="#333" />
            </TouchableOpacity>
            <View style={styles.placeHeader}>
              <Text style={styles.placeHeaderText}>{selectedPlace.name}</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.quizScrollView}
            contentContainerStyle={styles.quizContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.situationBox}>
              <View style={styles.situationBoxHeader}>
              <Text style={styles.situationText}>{currentScenario.situation}</Text>
                <TouchableOpacity
                  style={styles.quizTtsButton}
                  onPress={async () => {
                    const speakingKey = 'situation';
                    if (speakingSection === speakingKey) {
                      await stopSpeaking();
                      setSpeakingSection(null);
                      return;
                    }
                    setSpeakingSection(speakingKey);
                    await speakText(currentScenario.situation);
                  }}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={speakingSection === 'situation' ? 'volume-2' : 'volume-1'}
                    size={14}
                    color={speakingSection === 'situation' ? '#FFA000' : '#666'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.questionBox}>
              <View style={styles.questionBoxHeader}>
              <Text style={styles.questionText}>{currentScenario.question}</Text>
                <TouchableOpacity
                  style={styles.quizTtsButton}
                  onPress={async () => {
                    const speakingKey = 'question';
                    if (speakingSection === speakingKey) {
                      await stopSpeaking();
                      setSpeakingSection(null);
                      return;
                    }
                    setSpeakingSection(speakingKey);
                    await speakText(currentScenario.question);
                  }}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={speakingSection === 'question' ? 'volume-2' : 'volume-1'}
                    size={14}
                    color={speakingSection === 'question' ? '#FFA000' : '#666'}
                  />
                </TouchableOpacity>
              </View>
      </View>

            <View style={styles.optionsContainer}>
              {currentScenario.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isOptionCorrect = option.isCorrect;
                let buttonStyle: any = styles.optionButton;
                let textStyle: any = styles.optionText;
                const speakingKey = `option-${index}`;
                const isSpeakingOption = speakingSection === speakingKey;

                if (isSelected) {
                  if (isOptionCorrect) {
                    buttonStyle = [styles.optionButton, styles.optionButtonCorrect];
                    textStyle = [styles.optionText, styles.optionTextCorrect];
                  } else {
                    buttonStyle = [styles.optionButton, styles.optionButtonIncorrect];
                    textStyle = [styles.optionText, styles.optionTextIncorrect];
                  }
                }

                return (
                  <View key={index} style={styles.optionButtonContainer}>
                  <TouchableOpacity
                    style={buttonStyle}
                    onPress={() => handleOptionSelect(index)}
                    disabled={selectedOption !== null}>
                    <Text style={textStyle}>{option.text}</Text>
                  </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.optionTtsButton}
                      onPress={async () => {
                        if (isSpeakingOption) {
                          await stopSpeaking();
                          setSpeakingSection(null);
                          return;
                        }
                        setSpeakingSection(speakingKey);
                        await speakText(option.text);
                      }}
                      activeOpacity={0.7}
                    >
                      <FeatherIcon
                        name={isSpeakingOption ? 'volume-2' : 'volume-1'}
                        size={12}
                        color={isSpeakingOption ? '#FFA000' : '#666'}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {showFeedback && selectedOptionData && (
              <View style={styles.feedbackContainer}>
                <View
                  style={[
                    styles.feedbackBox,
                    isCorrect ? styles.feedbackBoxCorrect : styles.feedbackBoxIncorrect,
                  ]}>
                  <View style={styles.feedbackBoxHeader}>
                  <Text style={styles.feedbackText}>
                    {isCorrect ? currentScenario.feedback.correct : currentScenario.feedback.incorrect}
        </Text>
                    <TouchableOpacity
                      style={styles.quizTtsButton}
                      onPress={async () => {
                        const speakingKey = 'feedback';
                        if (speakingSection === speakingKey) {
                          await stopSpeaking();
                          setSpeakingSection(null);
                          return;
                        }
                        const feedbackText = isCorrect ? currentScenario.feedback.correct : currentScenario.feedback.incorrect;
                        setSpeakingSection(speakingKey);
                        await speakText(feedbackText);
                      }}
                      activeOpacity={0.7}
                    >
                      <FeatherIcon
                        name={speakingSection === 'feedback' ? 'volume-2' : 'volume-1'}
                        size={14}
                        color={speakingSection === 'feedback' ? '#FFA000' : '#666'}
                      />
                    </TouchableOpacity>
                  </View>
      </View>
                <TouchableOpacity style={styles.nextButton} onPress={handleNextScenario}>
                  <Text style={styles.nextButtonText}>다음</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  // 메인 렌더링
  return (
    <View style={styles.safeArea}>
      {step === 'CATEGORY_SELECT' && renderCategorySelect()}
      {step === 'PLACE_SELECT' && renderPlaceSelect()}
      {step === 'SCENARIO_QUIZ' && renderScenarioQuiz()}
    </View>
  );
};

export default PlaceSimulation;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  categoryCardContainer: {
    width: (SCREEN_WIDTH - 60) / 2,
    marginBottom: 20,
    position: 'relative',
  },
  categoryCard: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryTtsButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  categoryImage: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  placeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  placeCardContainer: {
    width: (SCREEN_WIDTH - 60) / 2,
    height: 200,
    marginBottom: 20,
    position: 'relative',
  },
  placeCard: {
    width: '100%',
    height: '100%',
  },
  placeTtsButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 20,
  },
  placeCardInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardFace: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderWidth: 2,
  },
  questionIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  questionIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeIcon: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  placeDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    padding: 10,
  },
  quizContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  quizOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1,
  },
  quizScrollView: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    position: 'relative',
    justifyContent: 'center',
  },
  quizBackButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  placeHeader: {
    flex: 1,
    alignItems: 'center',
  },
  placeHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  quizContent: {
    padding: 20,
    paddingBottom: 40,
    zIndex: 2,
  },
  situationBox: {
    backgroundColor: 'rgba(255, 248, 230, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFC364',
    zIndex: 2,
  },
  situationBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  situationText: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    lineHeight: 26,
    fontWeight: '600',
    marginRight: 8,
  },
  questionBox: {
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    zIndex: 2,
  },
  questionBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginRight: 8,
  },
  quizTtsButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButtonContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  optionButton: {
    backgroundColor: 'rgba(232, 232, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    minHeight: 60,
    justifyContent: 'center',
    zIndex: 2,
  },
  optionTtsButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  optionButtonCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  optionButtonIncorrect: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  optionTextCorrect: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#C62828',
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: 20,
  },
  feedbackBox: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    zIndex: 2,
  },
  feedbackBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  feedbackBoxCorrect: {
    backgroundColor: 'rgba(232, 245, 233, 0.95)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  feedbackBoxIncorrect: {
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  feedbackText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
    marginRight: 8,
  },
  nextButton: {
    backgroundColor: '#FFC364',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});
