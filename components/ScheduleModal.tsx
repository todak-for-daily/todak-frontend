import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSchedule } from '../contexts/ScheduleContext';
import { scheduleColors } from '../types/colors';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  targetDate: string;
}

// 1-12시 배열, 분 배열
const hours12 = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]
const minutes = [0, 10, 20, 30, 40, 50];

// 24시 <-> 12시 변환
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
const formatToApiTime = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = '00';
  return `${h}:${m}:${s}`;
};

const getKoreanNow = () => {
  const tempNow = new Date();
  const utc = tempNow.getTime() + tempNow.getTimezoneOffset() * 60000;
  const KR = 9 * 60 * 60000;
  return new Date(utc + KR);
};

const weekdayEmoji = ['☀️','🌙','🔥','💧','🌳','💰','🪨'];
const weekdayLabel = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];

const ScheduleModal: React.FC<ScheduleModalProps> = ({ visible, onClose, targetDate }) => {
  const { addSchedule } = useSchedule();

  const [scheName, setScheName] = useState('');
  const [schePlace, setSchePlace] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnfamiliar, setIsUnfamiliar] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | undefined>(undefined);

  // 24시간제 (기존 로직용)
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
      setScheName('');
      setSchePlace('');
      setErrorMessage('');
      setIsUnfamiliar(false);
      setPickedColor(undefined);
      
      // 초기화 (기본값: 오전 9시)
      setStartHour(9);
      setStartMinute(0);
      setEndHour(10);
      setEndMinute(0);

      // 초기화
      const { hour12: sHour12, period: sPeriod } = convertTo12Hour(9);
      setStartHour12(sHour12);
      setStartPeriod(sPeriod);

      const { hour12: eHour12, period: ePeriod } = convertTo12Hour(10);
      setEndHour12(eHour12);
      setEndPeriod(ePeriod);
    }
  }, [visible]);

  const canSubmit = scheName.trim().length > 0;

  const handleAdd = () => {
    const start = new Date(targetDate);
    start.setHours(startHour); // 24시간제
    start.setMinutes(startMinute);
    start.setSeconds(0, 0);

    const end = new Date(targetDate);
    end.setHours(endHour); // 24시간제
    end.setMinutes(endMinute);
    end.setSeconds(0, 0);

    if (end <= start) {
      setErrorMessage('끝나는 시간이 시작보다 빨라요.');
      return;
    }

    addSchedule({
      title: scheName.trim(),
      startTime: formatToApiTime(start),
      endTime: formatToApiTime(end),
      location: (schePlace || '장소 없음').trim(),
      date: start.toISOString().split('T')[0],
      color: pickedColor || 'gray',
    });

    onClose();
  };

  // KST 시간대 보정 (targetDate가 YYYY-MM-DD 문자열이므로 new Date()로 파싱 시 UTC로 해석되는 것 방지)
  const dayIdx = targetDate ? new Date(new Date(targetDate).toISOString().replace('Z', '+09:00')).getDay() : getKoreanNow().getDay(); 

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
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* 상단 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {weekdayEmoji[dayIdx+1]} {weekdayLabel[dayIdx+1]} 일정 추가
            </Text>
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1단계: 이름·장소 */}
            <View style={styles.card} accessible accessibilityLabel="일정 이름과 장소 입력">
              <Text style={styles.cardTitle}>1. 무엇을 할까요?</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 병원 가기, 밥 먹기"
                value={scheName}
                onChangeText={setScheName}
                maxLength={40}
                accessibilityLabel="일정 이름 입력"
              />

              <Text style={styles.cardTitleSmall}>어디에서 하나요?</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 집, 학교, 병원"
                value={schePlace}
                onChangeText={setSchePlace}
                maxLength={40}
                accessibilityLabel="장소 입력"
              />
            </View>

            <View style={styles.card} accessible accessibilityLabel="시작과 끝 시간 선택">
              <Text style={styles.cardTitle}>2. 언제 하나요?</Text>

              {/* === 시작 시간 === */}
              <Text style={styles.timeLabel}>시작 시간</Text>
              <View style={styles.row}>
                {/* 오전/오후 토글 */}
                <View style={styles.periodToggleContainer}>
                  <TouchableOpacity 
                    style={[styles.periodButton, startPeriod === 'AM' && styles.periodButtonActive]}
                    onPress={() => setStartPeriod('AM')}
                  >
                    <Text style={[styles.periodButtonText, startPeriod === 'AM' && styles.periodButtonTextActive]}>☀️</Text>
                    <Text style={[styles.periodButtonText, startPeriod === 'AM' && styles.periodButtonTextActive]}>오전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.periodButton, startPeriod === 'PM' && styles.periodButtonActive]}
                    onPress={() => setStartPeriod('PM')}
                  >
                    <Text style={[styles.periodButtonText, startPeriod === 'PM' && styles.periodButtonTextActive]}>🌙</Text>
                    <Text style={[styles.periodButtonText, startPeriod === 'PM' && styles.periodButtonTextActive]}>오후</Text>
                  </TouchableOpacity>
                </View>
                {/* 1-12시 피커 */}
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={startHour12}
                    onValueChange={setStartHour12}
                    style={styles.picker}
                    dropdownIconColor="#333"
                  >
                    {hours12.map(h => (
                      <Picker.Item key={h} label={`${h}시`} value={h} />
                    ))}
                  </Picker>
                </View>
                {/* 분 피커 (동일) */}
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={startMinute}
                    onValueChange={setStartMinute}
                    style={styles.picker}
                    dropdownIconColor="#333"
                  >
                    {minutes.map(m => (
                      <Picker.Item key={m} label={`${m}분`} value={m} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* === 끝나는 시간 === */}
              <Text style={[styles.timeLabel, { marginTop: 10 }]}>끝나는 시간</Text>
              <View style={styles.row}>
                {/* 오전/오후 토글 */}
                <View style={styles.periodToggleContainer}>
                  <TouchableOpacity 
                    style={[styles.periodButton, endPeriod === 'AM' && styles.periodButtonActive]}
                    onPress={() => setEndPeriod('AM')}
                  >
                    <Text style={[styles.periodButtonText, startPeriod === 'AM' && styles.periodButtonTextActive]}>☀️</Text>
                    <Text style={[styles.periodButtonText, startPeriod === 'AM' && styles.periodButtonTextActive]}>오전</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.periodButton, endPeriod === 'PM' && styles.periodButtonActive]}
                    onPress={() => setEndPeriod('PM')}
                  >
                    <Text style={[styles.periodButtonText, endPeriod === 'PM' && styles.periodButtonTextActive]}>🌙</Text>
                    <Text style={[styles.periodButtonText, endPeriod === 'PM' && styles.periodButtonTextActive]}>오후</Text>
                  </TouchableOpacity>
                </View>
                {/* 1-12시 피커 */}
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={endHour12}
                    onValueChange={setEndHour12}
                    style={styles.picker}
                    dropdownIconColor="#333"
                  >
                    {hours12.map(h => (
                      <Picker.Item key={h} label={`${h}시`} value={h} />
                    ))}
                  </Picker>
                </View>
                {/* 분 피커 */}
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={endMinute}
                    onValueChange={setEndMinute}
                    style={styles.picker}
                    dropdownIconColor="#333"
                  >
                    {minutes.map(m => (
                      <Picker.Item key={m} label={`${m}분`} value={m} />
                    ))}
                  </Picker>
                </View>
              </View>

              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </View>


            <View style={styles.card} accessible accessibilityLabel="이 일은...">
              <Text style={styles.cardTitle}>3. 선택 옵션</Text>

              <Text style={styles.cardTitleSmall}>처음 가는 곳/처음 해보는 일인가요?</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, isUnfamiliar && styles.toggleBtnActive]}
                  onPress={() => setIsUnfamiliar(true)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isUnfamiliar }}
                  accessibilityLabel="낯설어요 선택"
                >
                  <Text style={[styles.toggleText, isUnfamiliar && styles.toggleTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, !isUnfamiliar && styles.toggleBtnActive]}
                  onPress={() => setIsUnfamiliar(false)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isUnfamiliar }}
                  accessibilityLabel="낯설지 않아요 선택"
                >
                  <Text style={[styles.toggleText, !isUnfamiliar && styles.toggleTextActive]}>아니오</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitleSmall}>색상 선택</Text>
              <View style={styles.colorGrid} accessible accessibilityLabel="색상 선택 목록">
                {scheduleColors.map((color, idx) => {
                  const selected = pickedColor === color;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setPickedColor(color)}
                      style={[styles.colorCircle, { backgroundColor: color }, selected && styles.colorSelected]}
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
                style={[styles.secondaryBtn]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="그만 두기"
              >
                <Text style={styles.secondaryBtnText}>그만 두기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
                onPress={handleAdd}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="할 일 만들기"
              >
                <Text style={styles.primaryBtnText}>할 일 만들기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ScheduleModal;

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
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#BDBDBD',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '700',
  },
  content: {
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
    borderColor: '#FFD89C', 
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
    borderColor: '#FFD89C',
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
    borderColor: '#FFD89C',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 52,
  },
  periodButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  periodButtonActive: {
    backgroundColor: '#FFEB99', 
    borderColor: '#FFD89C',
    borderWidth: 1,
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
    borderColor: '#FFD89C',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    height: 52,
    justifyContent: 'center',
  },
  picker: {
    height: 52, 
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD89C',
    backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: {
    borderColor: '#70DA9F',
    backgroundColor: '#E9F8F0',
  },
  toggleText: { fontSize: 16, fontWeight: '700', color: '#333' },
  toggleTextActive: { color: '#0A4730' },
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
    borderColor: '#FFD89C',
  },
  colorSelected: {
    borderColor: '#5DA8D9',
    borderWidth: 4,
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
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#BDBDBD',
  },
  secondaryBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#555',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#79B3F7', 
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderColor: '#5DA8D9',
  },
  primaryBtnDisabled: {
    backgroundColor: '#C9DFFB',
    borderColor: '#B3D3F7',
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
});
