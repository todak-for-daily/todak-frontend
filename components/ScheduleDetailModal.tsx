import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView 
} from 'react-native';
import { ApiSchedule } from '../contexts/ScheduleContext'; 

const getDisplayColorStyle = (colorName: string | null) => {
  const colorMap: { [key: string]: string } = {
    'red': '#FF6B6B',
    'green': '#6BCB77',
    'blue': '#4D96FF',
    'yellow': '#d2a800ff', 
    'purple': '#845EC2',
    'gray': '#9b9b9bff',
    'brown': '#59411bff',
    'pink': '#FF6EC7',
  };
  return colorMap[colorName?.toLowerCase() || 'gray'] || colorMap['gray'];
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
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ visible, onClose, schedule }) => {
  // schedule 데이터가 없으면 모달을 렌더링하지 않음
  if (!schedule) return null;

  // 표시할 색상과 시간 범위 계산
  const displayColor = getDisplayColorStyle(schedule.color);
  const timeRange = formatApiTimeRange(schedule.startTime, schedule.endTime);

  // 일정 날짜(date) 문자열로부터 요일 이름 계산
  // 'date' 필드는 'YYYY-MM-DD' 형식이므로, 시간 부분을 'T00:00:00'으로 추가하여 Date 객체 생성
  // 이렇게 하면 사용자의 로컬 시간대 기준으로 요일을 계산
  const dateObj = new Date(`${schedule.date}T00:00:00`);
  const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  // getDay()는 0(일요일) ~ 6(토요일) 반환
  const weekdayName = weekdayNames[dateObj.getDay()];

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
            <View style={[styles.colorIndicator, { backgroundColor: displayColor }]} />

            <Text style={styles.title}>{schedule.title}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.icon}>🕒</Text>
              <Text style={styles.infoText}>{`매주 ${weekdayName}, ${timeRange}`}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.icon}>📍</Text>
              <Text style={styles.infoText}>{schedule.location || '장소 정보 없음'}</Text>
            </View>

            {/* 추후 ApiSchedule 타입에 다른 속성이 추가되면 여기에 표시 */}

          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
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
  colorIndicator: {
    height: 10,
    borderRadius: 5,
    marginBottom: 15,
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
  closeButton: {
    backgroundColor: '#e0e0e0', 
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 20, 
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
});

export default ScheduleDetailModal;