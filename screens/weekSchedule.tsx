import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import ScheduleModal from '../components/ScheduleModal';
import { useSchedule } from '../contexts/ScheduleContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CELL_HEIGHT = (SCREEN_HEIGHT - 70) / 25;
const CELL_WIDTH = SCREEN_WIDTH / 8;

const WeekSchePage = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { schedules } = useSchedule();

  // 연동 전 테스트를 위한 함수-나중에는 서버에서 일주일 치를 받아올 것이므로 삭제
  const weekSchedules = schedules.filter(sche => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // 월요일

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 일요일

  const scheDate = new Date(sche.date);
  return scheDate >= startOfWeek && scheDate <= endOfWeek;
});

  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0~23시

  const getTopOffset = (startTime: Date) => {
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    return hour * CELL_HEIGHT + (minute / 60) * CELL_HEIGHT;
  };

  const getHeight = (start: Date, end: Date) => {
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return durationHours * CELL_HEIGHT;
  };

  const getLeftOffset = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    const dayIndex = (targetDate.getDay() + 6) % 7; // 월=0 ~ 일=6
    return dayIndex * CELL_WIDTH + CELL_WIDTH; // +CELL_WIDTH: 시간칸 보정
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>일주일 시간표</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addText}>일정 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 캘린더 격자 */}
      <ScrollView horizontal>
        <ScrollView>
          <View style={styles.gridContainer}>
            {/* 요일 헤더 */}
            <View style={styles.row}>
              <View style={styles.timeCell} />
              {days.map((day, index) => (
                <View key={index} style={styles.dayCell}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* 시간별 셀 */}
            {hours.map((hour, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                <View style={styles.timeCell}>
                  <Text style={styles.timeText}>{`${hour}시`}</Text>
                </View>
                {days.map((_, colIndex) => (
                  <View key={colIndex} style={styles.cell} />
                ))}
              </View>
            ))}

            {/* 일정 자유 배치 */}
            {weekSchedules.map(schedule => {
              const top = getTopOffset(new Date(schedule.scheStartTime))+CELL_HEIGHT;
              const height = getHeight(
                new Date(schedule.scheStartTime),
                new Date(schedule.scheEndTime)
              );
              const left = getLeftOffset(schedule.date);

              return (
                <TouchableOpacity
                  key={schedule.id}
                  style={[
                    styles.scheduleBlock,
                    {
                      top,
                      left,
                      height,
                      backgroundColor: schedule.color || '#4D96FF',
                    },
                  ]}
                >
                  <Text style={styles.scheduleText}>{schedule.scheName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {/* 일정 추가 모달 */}
      <ScheduleModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop:'7%',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#c6c6c6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addText: {
    color: '#000',
    fontSize: 14,
  },
  gridContainer: {
    position: 'relative',
    flexDirection: 'column',
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
  },
  timeCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderWidth: 0.5,
    borderColor: '#ccc',
  },
  dayCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 0.5,
    borderColor: '#ccc',
  },
  dayText: {
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
  },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  scheduleBlock: {
    position: 'absolute',
    width: CELL_WIDTH,
    borderRadius: 6,
    padding: 4,
    zIndex: 10,
  },
  scheduleText: {
    color: 'white',
    fontSize: 12,
  },
});

export default WeekSchePage;