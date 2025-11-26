import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView 
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import { ApiSchedule } from '../contexts/ScheduleContext'; 
import { COLOR_NAME_MAP, NORMALIZED_SCHEDULE_COLORS } from '../types/colors';
import { getDayLabelFromKey, DayOfWeek } from '../types/datetime';

const DEFAULT_COLOR = COLOR_NAME_MAP.gray;

const getDisplayColorStyle = (colorValue: string | null) => {
  if (!colorValue) return DEFAULT_COLOR;

  const normalizedHex = colorValue.toUpperCase();
  const isExactMatch = NORMALIZED_SCHEDULE_COLORS.includes(normalizedHex);
  if (isExactMatch) {
    return normalizedHex;
  }

  const mapped =
    COLOR_NAME_MAP[colorValue.toLowerCase()] ||
    COLOR_NAME_MAP[normalizedHex.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  return DEFAULT_COLOR;
};

// 시간 범위를 포맷하는 함수 ("HH:mm:ss" -> "오전/오후 H:mm ~ 오전/오후 H:mm")
const formatApiTimeRange = (startTime: string, endTime: string) => {
  const parseAndFormat = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return ''; 
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour, 10);
    const period = h < 12 ? '오전' : '오후';
    const formattedHour = h % 12 === 0 ? 12 : h % 12;
    const formattedMinute = minute.padStart(2, '0');
    return `${period} ${formattedHour}:${formattedMinute}`;
  };
  // 시작 시간과 종료 시간 모두 유효할 때만
  const startFormatted = parseAndFormat(startTime);
  const endFormatted = parseAndFormat(endTime);
  if (startFormatted && endFormatted) {
    return `${startFormatted} ~ ${endFormatted}`;
  }
  return '시간 정보 없음'; // 둘 중 하나라도 유효하지 않으면 대체 텍스트 제공
};

// 모달 컴포넌트의 props 타입 정의
interface ScheduleDetailModalProps {
  visible: boolean; // 모달 표시 여부
  onClose: () => void; // 모달 닫기 함수
  schedule: ApiSchedule | null; // 표시할 일정 데이터 (null 가능성 처리)
  onEdit?: () => void; // 수정 버튼 클릭 시 호출되는 함수 (선택적)
  onDelete?: () => void; // 삭제 버튼 클릭 시 호출되는 함수 (선택적)
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ visible, onClose, schedule, onEdit, onDelete }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // TTS 완료 이벤트 리스너
  useEffect(() => {
    TTS.addEventListener('tts-finish', () => {
      setIsSpeaking(false);
    });
    TTS.addEventListener('tts-cancel', () => {
      setIsSpeaking(false);
    });
  }, []);

  // schedule 데이터가 없으면 모달을 렌더링하지 않음
  if (!schedule) return null;

  // 표시할 색상과 시간 범위 계산
  const displayColor = getDisplayColorStyle(schedule.color);
  const timeRange = formatApiTimeRange(schedule.startTime, schedule.endTime);

  // 일정 날짜(date) 문자열로부터 요일 이름 계산
  // 루틴 일정의 경우 "매주 [요일]" 형식으로 표시
  let weekdayName = '';
  if (schedule.isRoutine) {
    const normalizedKey = schedule.routineDayOfWeek
      ? (schedule.routineDayOfWeek.toUpperCase() as DayOfWeek)
      : undefined;
    weekdayName = getDayLabelFromKey(normalizedKey);
    if (!schedule.routineDayOfWeek && schedule.date && schedule.date.trim() !== '') {
      try {
        const dateObj = new Date(`${schedule.date}T00:00:00`);
        if (!isNaN(dateObj.getTime())) {
          const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
          weekdayName = weekdayNames[dateObj.getDay()];
        }
      } catch {
        console.warn('Failed to parse date for routine schedule:', schedule.date);
      }
    }
    weekdayName = weekdayName || '요일';
  } else {
    // 일회성 일정: 특정 날짜의 요일 표시
    if (schedule.date && schedule.date.trim() !== '') {
      try {
        const dateObj = new Date(`${schedule.date}T00:00:00`);
        if (!isNaN(dateObj.getTime())) {
          const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
          weekdayName = weekdayNames[dateObj.getDay()];
        }
      } catch {
        console.warn('Failed to parse date:', schedule.date);
      }
    }
    // 요일을 찾지 못한 경우 기본값
    weekdayName = weekdayName || '요일';
  }

  // TTS로 모든 정보 읽기
  const handleReadAll = async () => {
    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    const timeInfo = schedule.isRoutine ? `매주 ${weekdayName}, ${timeRange}` : `${weekdayName}, ${timeRange}`;
    const locationInfo = schedule.location || '장소 정보 없음';
    const fullText = `${schedule.title}. ${timeInfo}. ${locationInfo}`;

    setIsSpeaking(true);
    await speakText(fullText);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade" // 부드러운 효과
      transparent
      statusBarTranslucent={true}
      onRequestClose={onClose} 
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPressOut={onClose} 
      >

        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <ScrollView>
            <View style={styles.headerRow}>
              <View style={[styles.colorIndicator, { backgroundColor: displayColor }]} />
              <TouchableOpacity
                style={styles.ttsButton}
                onPress={handleReadAll}
                activeOpacity={0.7}
              >
                <FeatherIcon
                  name={isSpeaking ? 'volume-2' : 'volume-1'}
                  size={20}
                  color={isSpeaking ? '#FFA000' : '#666'}
                />
                <Text style={styles.ttsButtonText}>
                  {isSpeaking ? '읽는 중...' : '전체 읽기'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{schedule.title}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.icon}>🕒</Text>
              <Text style={styles.infoText}>
                {schedule.isRoutine ? `매주 ${weekdayName}, ${timeRange}` : `${weekdayName}, ${timeRange}`}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.icon}>📍</Text>
              <Text style={styles.infoText}>{schedule.location || '장소 정보 없음'}</Text>
            </View>

            {/* 추후 ApiSchedule 타입에 다른 속성이 추가되면 여기에 표시 */}

          </ScrollView>

          <View style={styles.buttonRow}>
            {onDelete && (
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <Text style={styles.deleteButtonText}>삭제하기</Text>
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                <Text style={styles.editButtonText}>수정하기</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxHeight: '70%', 
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  colorIndicator: {
    height: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  ttsButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 20, 
    marginRight: 10,
  },
  infoText: {
    fontSize: 18, 
    color: '#555',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFE6E6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9E9E',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#4D96FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#e0e0e0', 
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
});

export default ScheduleDetailModal;