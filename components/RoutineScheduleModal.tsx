import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import TextWithTTS from '../components/TextWithTTS';

import { useWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import { scheduleColors, COLOR_NAME_MAP } from '../types/colors';

// 타입 정의
type DayOfWeek = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
import { ApiWeeklySchedule } from '../contexts/WeeklyScheduleContext';

interface WeeklyScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  initialSchedule?: ApiWeeklySchedule; // 수정 모드일 때 사용
  onSave?: () => void; // 스케줄 저장 완료 시 호출되는 콜백
}


// 1-12시 배열, 분 배열
const hours12 = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]
const minutes = [0, 10, 20, 30, 40, 50];

// 24시 <-> 12시 변환 로직
const convertTo12Hour = (hour24: number) => {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12; // 0시(자정)는 12, 12시(정오)도 12
  return { hour12, period: period as 'AM' | 'PM' };
};

const convertTo24Hour = (hour12: number, period: 'AM' | 'PM') => {
  if (period === 'PM' && hour12 !== 12) return hour12 + 12; // 오후 1시(13) ~ 11시(23)
  if (period === 'AM' && hour12 === 12) return 0; // 오전 12시(자정)는 0시
  if (period === 'PM' && hour12 === 12) return 12; // 오후 12시(정오)는 12시
  return hour12; // 오전 1시(1) ~ 11시(11)
};

// API 시간 포맷 ("HH:mm:ss")
const formatToApiTime = (h: number, m: number): string => {
  const hourString = h.toString().padStart(2, '0');
  const minuteString = m.toString().padStart(2, '0');
  const s = '00';
  return `${hourString}:${minuteString}:${s}`;
};

const weekdayEmoji = ['☀️','🌙','🔥','💧','🌳','💰','🪨'];
const weekdayLabel = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
const dayOfWeekAPI: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// 초기 선택 요일 인덱스를 현재 요일로 설정
const getInitialDayIndex = () => new Date().getDay(); // 0(일) ~ 6(토)

const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({ visible, onClose, initialSchedule, onSave }) => {
  // 주간 스케줄 API 연동을 위한 Context 사용을 가정합니다.
  const { addWeeklySchedule, updateWeeklySchedule } = useWeeklySchedule();
  const isEditMode = !!initialSchedule;

  const [scheName, setScheName] = useState('');
  const [schePlace, setSchePlace] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pickedColor, setPickedColor] = useState<string | undefined>(undefined);
  
  // 주간 일정 추가를 위한 요일 상태
  const [selectedDayIndex, setSelectedDayIndex] = useState(getInitialDayIndex()); // 0:일, 1:월, ..., 6:토

  // 24시간제 (로직용)
  const [startHour, setStartHour] = useState(9); // 0-23
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(10); // 0-23
  const [endMinute, setEndMinute] = useState(0);

  // 12시간제 상태 (UI용)
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [startHour12, setStartHour12] = useState(9); // 1-12
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM');
  const [endHour12, setEndHour12] = useState(10); // 1-12

  // 12-24 동기화
  useEffect(() => {
    setStartHour(convertTo24Hour(startHour12, startPeriod));
  }, [startHour12, startPeriod]);

  useEffect(() => {
    setEndHour(convertTo24Hour(endHour12, endPeriod));
  }, [endHour12, endPeriod]);

  useEffect(() => {
    if (visible) {
      if (initialSchedule) {
        // 수정 모드: 기존 일정 데이터로 초기화
        setScheName(initialSchedule.title);
        setSchePlace(initialSchedule.location);
        setPickedColor(initialSchedule.color);
        
        // API 요일을 인덱스로 변환
        const dayIndex = dayOfWeekAPI.indexOf(initialSchedule.dayOfWeek);
        setSelectedDayIndex(dayIndex >= 0 ? dayIndex : getInitialDayIndex());
        
        // 시작 시간 파싱
        const [startH, startM] = initialSchedule.startTime.split(':').map(Number);
        setStartHour(startH);
        setStartMinute(startM || 0);
        const { hour12: sHour12, period: sPeriod } = convertTo12Hour(startH);
        setStartHour12(sHour12);
        setStartPeriod(sPeriod);
        
        // 끝나는 시간 파싱
        const [endH, endM] = initialSchedule.endTime.split(':').map(Number);
        setEndHour(endH);
        setEndMinute(endM || 0);
        const { hour12: eHour12, period: ePeriod } = convertTo12Hour(endH);
        setEndHour12(eHour12);
        setEndPeriod(ePeriod);
      } else {
        // 추가 모드: 기본값으로 초기화
        setScheName('');
        setSchePlace('');
        setErrorMessage('');
        setPickedColor(undefined);
        setSelectedDayIndex(getInitialDayIndex());
        
        const initialStartHour = 9;
        const initialEndHour = 10;
        setStartHour(initialStartHour);
        setStartMinute(0);
        setEndHour(initialEndHour);
        setEndMinute(0);

        const { hour12: sHour12, period: sPeriod } = convertTo12Hour(initialStartHour);
        setStartHour12(sHour12);
        setStartPeriod(sPeriod);

        const { hour12: eHour12, period: ePeriod } = convertTo12Hour(initialEndHour);
        setEndHour12(eHour12);
        setEndPeriod(ePeriod);
      }
    }
  }, [visible, initialSchedule]);

  const canSubmit = scheName.trim().length > 0;
  
  // API 명세에 맞는 데이터 구조
  const handleAddWeeklySchedule = async () => {
    // 24시간을 이용해 시간 유효성 검사
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (endTimeInMinutes <= startTimeInMinutes) {
      setErrorMessage('끝나는 시간이 시작보다 빨라요. 시간을 다시 확인해주세요.');
      return;
    }

    if (isEditMode && initialSchedule) {
      // 수정 모드
      const updatedSchedule: ApiWeeklySchedule = {
        ...initialSchedule,
        dayOfWeek: dayOfWeekAPI[selectedDayIndex],
        startTime: formatToApiTime(startHour, startMinute),
        endTime: formatToApiTime(endHour, endMinute),
        title: scheName.trim(),
        color: pickedColor || COLOR_NAME_MAP.gray,
        location: (schePlace || '장소 없음').trim(),
      };

      try {
        await updateWeeklySchedule(updatedSchedule);
        onSave?.(); // 저장 완료 콜백 호출
        onClose();
      } catch (error) {
        setErrorMessage('일정 수정에 실패했습니다. 다시 시도해주세요.');
      }
    } else {
      // 추가 모드
      const weeklyScheduleData = {
        memberId: 2, // 사용자 ID는 임의로 2로 설정. 실제 환경에서는 context나 prop으로 받아야 합니다.
        dayOfWeek: dayOfWeekAPI[selectedDayIndex],
        startTime: formatToApiTime(startHour, startMinute),
        endTime: formatToApiTime(endHour, endMinute),
        title: scheName.trim(),
        color: pickedColor || COLOR_NAME_MAP.gray,
        location: (schePlace || '장소 없음').trim(),
      };

      try {
        await addWeeklySchedule(weeklyScheduleData);
        onSave?.(); // 저장 완료 콜백 호출
        onClose();
      } catch (error) {
        setErrorMessage('일정 등록에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };
  
  // 헤더에 표시될 요일 레이블
  const headerDayLabel = weekdayLabel[selectedDayIndex];
  const headerDayEmoji = weekdayEmoji[selectedDayIndex];


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }} // KeyboardAvoidingView 스타일은 인라인 유지
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* 상단 헤더 */}
            <View style={styles.header}>
              <TextWithTTS style={styles.headerTitle}>
                {headerDayEmoji} {headerDayLabel} 주간 일정 {isEditMode ? '수정' : '추가'}
              </TextWithTTS>
              <TouchableOpacity
                style={styles.closeButton}
                accessible
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.contentScrollView}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              {/* 요일 선택 */}
              <View style={styles.card} accessible accessibilityLabel="일정이 반복될 요일 선택">
                <TextWithTTS style={styles.cardTitle}>0. 언제 반복되나요?</TextWithTTS>
                <View style={styles.toggleRow}>
                  {weekdayLabel.map((label, idx) => {
                    const isActive = selectedDayIndex === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.toggleButton,
                          isActive && styles.toggleButtonActive,
                          { borderColor: isActive ? '#b3dbfcff' : '#787878ff' }
                        ]}
                        onPress={() => setSelectedDayIndex(idx)}
                        accessible
                        accessibilityRole="button"
                        accessibilityState={{ checked: isActive }}
                        accessibilityLabel={label}
                      >
                        <Text
                          style={[
                            styles.toggleText,
                            isActive && { color: '#0A4730' },
                          ]}
                        >
                          {`${weekdayEmoji[idx]}\n${label.substring(0, 1)}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 1단계: 이름·장소 */}
              <View style={styles.card} accessible accessibilityLabel="일정 이름과 장소 입력">
                <TextWithTTS style={styles.cardTitle}>1. 무엇을 할까요?</TextWithTTS>
                <TextInput
                  style={styles.input}
                  placeholder="예: 근무, 병원 가기, 밥 먹기"
                  placeholderTextColor="#999999"
                  value={scheName}
                  onChangeText={setScheName}
                  maxLength={40}
                  accessibilityLabel="일정 이름 입력"
                />

                <TextWithTTS style={styles.cardTitleSmall}>어디에서 하나요?</TextWithTTS>
                <TextInput
                  style={styles.input}
                  placeholder="예: 회사, 집, 학교, 병원"
                  placeholderTextColor="#999999"
                  value={schePlace}
                  onChangeText={setSchePlace}
                  maxLength={40}
                  accessibilityLabel="장소 입력"
                />
              </View>

              {/* 2단계: 시간 선택 */}
              <View style={styles.card} accessible accessibilityLabel="시작과 끝 시간 선택">
                <TextWithTTS style={styles.cardTitle}>2. 몇 시부터 몇 시까지 하나요?</TextWithTTS>

                {/* === 시작 시간 === */}
                <TextWithTTS style={styles.timeLabel}>시작 시간</TextWithTTS>
                <View style={styles.periodToggleContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      startPeriod === 'AM' && styles.periodButtonActive
                    ]}
                    onPress={() => setStartPeriod('AM')}
                  >
                    <Text style={[
                      styles.periodButtonEmoji, 
                      startPeriod === 'AM' && styles.periodButtonTextActive
                    ]}>☀️</Text>
                    <Text style={[
                      styles.periodButtonText, 
                      startPeriod === 'AM' && styles.periodButtonTextActive
                    ]}>오전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      startPeriod === 'PM' && styles.periodButtonActive
                    ]}
                    onPress={() => setStartPeriod('PM')}
                  >
                    <Text style={[
                      styles.periodButtonEmoji, 
                      startPeriod === 'PM' && styles.periodButtonTextActive
                    ]}>🌙</Text>
                    <Text style={[
                      styles.periodButtonText, 
                      startPeriod === 'PM' && styles.periodButtonTextActive
                    ]}>오후</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  {/* 1-12시 피커 */}
                  <View style={styles.pickerWrap}>
                    <Picker
                      style={styles.picker}
                      selectedValue={startHour12}
                      onValueChange={setStartHour12}
                      dropdownIconColor="#333"
                    >
                      {hours12.map(h => (
                      <Picker.Item key={h} label={`${h}시`} value={h} color="#000" />
                      ))}
                    </Picker>
                  </View>
                  {/* 분 피커 */}
                  <View style={styles.pickerWrap}>
                    <Picker
                      style={styles.picker}
                      selectedValue={startMinute}
                      onValueChange={setStartMinute}
                      dropdownIconColor="#333"
                    >
                      {minutes.map(m => (
                      <Picker.Item key={m} label={`${m}분`} value={m} color="#000" />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* === 끝나는 시간 === */}
                <TextWithTTS style={[styles.timeLabel, { marginTop: 10 }]}>끝나는 시간</TextWithTTS>
                <View style={styles.periodToggleContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      endPeriod === 'AM' && styles.periodButtonActive
                    ]}
                    onPress={() => setEndPeriod('AM')}
                  >
                    <Text style={[
                      styles.periodButtonEmoji, 
                      endPeriod === 'AM' && styles.periodButtonTextActive
                    ]}>☀️</Text>
                    <Text style={[
                      styles.periodButtonText, 
                      endPeriod === 'AM' && styles.periodButtonTextActive
                    ]}>오전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      endPeriod === 'PM' && styles.periodButtonActive
                    ]}
                    onPress={() => setEndPeriod('PM')}
                  >
                    <Text style={[
                      styles.periodButtonEmoji, 
                      endPeriod === 'PM' && styles.periodButtonTextActive
                    ]}>🌙</Text>
                    <Text style={[
                      styles.periodButtonText, 
                      endPeriod === 'PM' && styles.periodButtonTextActive
                    ]}>오후</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  {/* 1-12시 피커 */}
                  <View style={styles.pickerWrap}>
                    <Picker
                      style={styles.picker}
                      selectedValue={endHour12}
                      onValueChange={setEndHour12}
                      dropdownIconColor="#333"
                    >
                      {hours12.map(h => (
                      <Picker.Item key={h} label={`${h}시`} value={h} color="#000" />
                      ))}
                    </Picker>
                  </View>
                  {/* 분 피커 */}
                  <View style={styles.pickerWrap}>
                    <Picker
                      style={styles.picker}
                      selectedValue={endMinute}
                      onValueChange={setEndMinute}
                      dropdownIconColor="#333"
                    >
                      {minutes.map(m => (
                      <Picker.Item key={m} label={`${m}분`} value={m} color="#000" />
                      ))}
                    </Picker>
                  </View>
                </View>

                {!!errorMessage && <TextWithTTS style={styles.errorText}>{errorMessage}</TextWithTTS>}
              </View>


              <View style={styles.card} accessible accessibilityLabel="이 일은...">
                <TextWithTTS style={styles.cardTitle}>3. 선택 옵션</TextWithTTS>

                <TextWithTTS style={styles.cardTitleSmall}>색상 선택</TextWithTTS>
                <View style={styles.colorGrid} accessible accessibilityLabel="색상 선택 목록">
                  {scheduleColors.map((color, idx) => {
                    const selected = pickedColor === color;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setPickedColor(color)}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          selected && styles.colorCircleSelected,
                        ]}
                        accessible
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`색상 선택 ${idx + 1}`}
                      >
                        {selected && <Text style={styles.colorCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.footerBar}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="그만 두기"
                >
                  <Text style={styles.secondaryButtonText}>그만 두기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    !canSubmit && styles.primaryButtonDisabled
                  ]}
                  onPress={handleAddWeeklySchedule} // 주간 일정 등록 핸들러 사용
                  disabled={!canSubmit}
                  accessibilityRole="button"
                  accessibilityLabel="할 일 만들기"
                >
                  <Text style={styles.primaryButtonText}>할 일 만들기</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default WeeklyScheduleModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#BDBDBD',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '700',
  },
  contentScrollView: {
  },
  contentContainer: {
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#787878ff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
  },
  cardTitleSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginTop: 4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    borderWidth: 3,
    borderColor: '#787878ff',
    color: '#333',
    marginBottom: 10,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  periodToggleContainer: {
    flex: 0.8,
    borderWidth: 3,
    borderColor: '#787878ff',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 52,
    marginBottom: 10,
  },
  periodButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  periodButtonActive: {
    backgroundColor: '#b3dbfcff', 
    borderColor: '#787878ff',
    borderWidth: 1,
  },
  periodButtonEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  periodButtonTextActive: {
    fontWeight: '800',
    color: '#333',
  },
  pickerWrap: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#787878ff',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    height: 52,
    justifyContent: 'center',
    minWidth: 90,
    paddingHorizontal: 4,
  },
  picker: {
    height: 52,
    width: '100%',
    color: '#000',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#787878ff',
    backgroundColor: '#FFFFFF',
  },
  toggleButtonActive: {
    backgroundColor: '#E9F8F0',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  colorCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#787878ff',
  },
  colorCircleSelected: {
    borderWidth: 4,
    borderColor: '#5DA8D9',
  },
  colorCheck: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  footerBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#BDBDBD',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#555',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#79B3F7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderColor: '#5DA8D9',
    borderWidth: 3,
  },
  primaryButtonDisabled: { 
    backgroundColor: '#C9DFFB',
    borderColor: '#B3D3F7',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
});