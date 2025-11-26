import React, { useState } from 'react'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Dimensions,
  TouchableOpacity 
} from 'react-native';

import { useWeeklySchedule, ApiWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import RoutineScheduleModal from '../components/RoutineScheduleModal';
import ScheduleDetailModal from '../components/ScheduleDetailModal'; 
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {COLOR_NAME_MAP} from '../types/colors';
import { ApiSchedule } from '../contexts/ScheduleContext';

const HOUR_HEIGHT = 60; 
const DAY_HEADER_HEIGHT = 35; 
const TIME_INDEX_WIDTH = 30;


const getScheduleColorStyle = (colorHex: string | null) => {
  const normalizedHex = colorHex ? colorHex.toUpperCase() : null;
  const defaultGray = COLOR_NAME_MAP['gray'] || '#9B9B9BFF'; 
     
    const scheduleHexes = Object.values(COLOR_NAME_MAP); // Hex 코드 목록
    
    const isColorValid = (normalizedHex && scheduleHexes.includes(normalizedHex));

    const backgroundColor = 
        isColorValid
            ? normalizedHex // 유효한 Hex 코드가 들어왔다면 그대로 사용
            : defaultGray;
  const textColor = ['#B5A08A', '#DDDDDD'].includes(backgroundColor) ? '#333333' : '#333333';
  return { backgroundColor, color: textColor };
};

// API 시간 포맷 ("14:00:00" -> "오후 2:00")
const formatApiTime = (time: string) => {
  if (!time) return '';
  const [hour, minute] = time.split(':');
  const h = parseInt(hour, 10);
  const period = h < 12 ? '오전' : '오후';
  const formattedHour = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${formattedHour}:${minute}`;
};

// 시간 문자열을 자정(00:00)부터의 총 분으로 변환
const timeToMinutes = (timeStr: string) => {
  if (!timeStr || !timeStr.includes(':')) return 0; // 예외 처리 추가
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
};

// 스케줄의 위치(top)와 높이(height)를 픽셀 단위로 계산
const calculateScheduleStyle = (schedule: { startTime: string, endTime: string }) => {
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const topOffset = (startMinutes / 60) * HOUR_HEIGHT; 
  const durationMinutes = endMinutes - startMinutes;
  const height = (durationMinutes / 60) * HOUR_HEIGHT - 1; 

  return {
    top: topOffset,
    height: Math.max(height, 10), // 최소 높이 10px 보장
  };
};

// 달력 렌더링을 위한 변수 정의
const screenWidth = Dimensions.get('window').width;
const daysInWeek = 7;
const dayColumnWidth = (screenWidth - TIME_INDEX_WIDTH - 4) / daysInWeek; 

// 시간 인덱스 데이터 생성
const generateTimeMarkers = () => {
  const markers = [];
  for (let i = 0; i < 24; i++) {
    const displayHour = i % 12 === 0 ? 12 : i % 12;
    markers.push({ hour: i, display: displayHour });
  }
  return markers;
};
const TIME_MARKERS = generateTimeMarkers();


// 주간 시간표 페이지 컴포넌트 (반복 루틴 표시)
const RoutinePage = () => {
  const { weeklySchedules, loading, error, deleteWeeklySchedule } = useWeeklySchedule();
  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
  const todayApiIndex = new Date().getDay(); // 0=일요일

  // 모달 상태
  const [addModalVisible, setAddModalVisible] = useState(false); 
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ApiWeeklySchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiWeeklySchedule | null>(null);

  // ApiWeeklySchedule를 ApiSchedule 형식으로 변환 (표시용)
  const convertWeeklyToDisplay = (weekly: ApiWeeklySchedule): ApiSchedule => ({
    id: weekly.id,
    date: '',
    startTime: weekly.startTime,
    endTime: weekly.endTime,
    title: weekly.title,
    color: weekly.color,
    location: weekly.location,
    isRoutine: true,
    routineDayOfWeek: weekly.dayOfWeek,
  });

  const handlePressSchedule = (schedule: ApiWeeklySchedule) => {
    setSelectedSchedule(schedule);
    setDetailModalVisible(true);
  };

  const handleEditSchedule = () => {
    if (selectedSchedule) {
      setDetailModalVisible(false);
      setEditModalVisible(true);
    }
  };

  const handleDeleteSchedule = () => {
    if (!selectedSchedule) return;
    setDeleteTarget(selectedSchedule);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWeeklySchedule(deleteTarget.id);
    } catch (error) {
      console.error('Failed to delete weekly schedule', error);
    } finally {
      setDeleteTarget(null);
      setSelectedSchedule(null);
      setDetailModalVisible(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const renderDayHeaderRow = () => (
    <View style={styles.dayHeaderRow}>
      <View style={styles.timeIndexHeaderPlaceholder} />
      {daysOfWeek.map((dayName, index) => {
        const apiDayIndex = (index + 1) % 7;
        const isToday = apiDayIndex === todayApiIndex;
        
        return (
          <View key={dayName} style={[styles.dayHeader, isToday && styles.todayHeader]}>
            <Text style={[styles.dayHeaderText, isToday && styles.todayHeaderText]}>
              {dayName}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // 시간 인덱스 컬럼 렌더링 (스크롤 내부)
  const renderTimeIndexColumn = () => (
    <View style={styles.timeIndexContainer}>
      {TIME_MARKERS.map((marker) => (
        <View key={marker.hour} style={styles.timeMarker}>
          <Text style={styles.timeMarkerText}>
            {marker.display}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderDayColumnsGrid = () => (
    <View style={styles.dayColumnsWrapper}>
      {daysOfWeek.map((dayName, dayIndex) => {
        const apiDayIndex = (dayIndex + 1) % 7; // 월=1, 화=2, ..., 일=0
        // 주간 반복 일정에서 해당 요일의 일정 가져오기
        const daySchedules = weeklySchedules[apiDayIndex] || [];

        return (
          <View key={dayName} style={styles.dayColumn}>
            {TIME_MARKERS.map(marker => (
              <View key={`${dayName}-grid-${marker.hour}`} style={styles.timeGridLine} /> // key 수정
            ))}

            {daySchedules.map(schedule => {
              // schedule 객체 및 startTime/endTime 유효성 검사
              if (!schedule || typeof schedule.startTime !== 'string' || typeof schedule.endTime !== 'string') {
                  console.warn('Invalid schedule data detected:', schedule);
                  return null; // 유효하지 않으면 렌더링하지 않음
              }
                
              const { backgroundColor, color } = getScheduleColorStyle(schedule.color);
              const scheduleStyle = calculateScheduleStyle(schedule);

              return (
                <TouchableOpacity
                  key={schedule.id}
                  style={[
                    styles.scheduledCardAbsolute,
                    { backgroundColor, borderColor: backgroundColor },
                    scheduleStyle,
                  ]}
                  onPress={() => handlePressSchedule(schedule)}
                  activeOpacity={0.7} 
                >
                  {/* 카드 내용 */}
                  <Text style={[styles.scheduleTitleAbsolute, { color }]} numberOfLines={1}>{schedule.title}</Text>
                  
                  {scheduleStyle.height > 20 && schedule.location && (
                    <Text style={[styles.scheduleLocationAbsolute, { color }]} numberOfLines={1}>
                      {schedule.location}
                    </Text>
                  )}
                  {scheduleStyle.height > 35 && (
                    <Text style={[styles.scheduleTimeAbsolute, { color, opacity: 0.9 }]} numberOfLines={2}> 
                      {`${formatApiTime(schedule.startTime)}\n${formatApiTime(schedule.endTime)}`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );


  // 로딩-에러
  if (loading) {
    return (
      <View style={[styles.container, styles.centerAlign]}>
        <ActivityIndicator size="large" color="#79B3F7" />
        <Text style={styles.infoText}>매주 하는 일을 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerAlign]}>
        <Text style={styles.errorText}>오류: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>일주일 시간표</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setAddModalVisible(true)}
          accessibilityLabel="새 할일 추가"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      {renderDayHeaderRow()}

      {/* 단일 스크롤뷰 */}
      <ScrollView 
        style={styles.mainScrollContainer}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={true}
      >
        {renderTimeIndexColumn()}
        {renderDayColumnsGrid()}
      </ScrollView>

      {/* 주간 반복 일정 추가 모달 */}
      <RoutineScheduleModal 
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />

      {/* 주간 반복 일정 수정 모달 */}
      <RoutineScheduleModal 
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedSchedule(null);
        }}
        initialSchedule={selectedSchedule || undefined}
      />

      {/* 일정 상세 모달 */}
      {selectedSchedule && ( // 선택된 일정이 있을 때만 렌더링
        <ScheduleDetailModal
          visible={detailModalVisible}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedSchedule(null);
          }}
          schedule={convertWeeklyToDisplay(selectedSchedule)}
          onEdit={handleEditSchedule}
          onDelete={handleDeleteSchedule}
        />
      )}

      <DeleteConfirmModal
        visible={!!deleteTarget}
        target={
          deleteTarget
            ? {
                id: deleteTarget.id,
                title: deleteTarget.title,
                date: '',
                startTime: deleteTarget.startTime,
                endTime: deleteTarget.endTime,
                location: deleteTarget.location,
              }
            : null
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </View>
  );
};

export default RoutinePage;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    marginTop:10,
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#e0e0e0',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 24,
    color: '#555',
    fontWeight: '600',
  },
  centerAlign: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeIndexHeaderPlaceholder: {
    width: TIME_INDEX_WIDTH,
    height: DAY_HEADER_HEIGHT,
  },
  dayHeader: {
    width: dayColumnWidth,
    height: DAY_HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  todayHeader: {
    backgroundColor: '#E6F0FA', 
  },
  todayHeaderText: {
    color: '#005A9C', 
  },
  mainScrollContainer: {
    flex: 1,
  },
  mainScrollContent: {
    height: 24 * HOUR_HEIGHT, 
    flexDirection: 'row',
    paddingHorizontal: 2,
  },
  timeIndexContainer: {
    width: TIME_INDEX_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingRight: 2,
  },
  timeMarker: {
    height: HOUR_HEIGHT, 
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeMarkerText: {
    fontSize: 10,
    color: '#999',
    transform: [{ translateY: -5 }], 
  },
  dayColumnsWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  dayColumn: {
    width: dayColumnWidth,
    height: '100%', 
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1, 
    borderLeftColor: '#e0e0e0',
    position: 'relative', 
  },
  timeGridLine: {
    height: HOUR_HEIGHT, 
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scheduledCardAbsolute: {
    position: 'absolute',
    left: 2,
    right: 2, 
    padding: 2, 
    borderRadius: 3,
    borderWidth: 1,
    zIndex: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  scheduleTitleAbsolute: {
    fontSize: 9, 
    fontWeight: 'bold',
    marginBottom: 0,
  },
  scheduleLocationAbsolute: {
    fontSize: 8,
    fontWeight: '500',
    opacity: 0.9,
  },
  scheduleTimeAbsolute: {
    fontSize: 8, 
    fontWeight: '500',
    opacity: 0.9,
    marginTop: 2,
  },
  noSchedulePlaceholder: {},
  noScheduleText: {},
});