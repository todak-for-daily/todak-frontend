import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, // 🌟 FlatList 대신 ScrollView 사용
  ActivityIndicator,
} from 'react-native';
import { useSchedule } from '../contexts/ScheduleContext'; 

// 🎨 색상 팔레트 (부드러운 톤)
const getScheduleColorStyle = (colorName: string | null) => {
  const colorMap: { [key: string]: string } = {
    'red': '#FF6B6B',
    'green': '#6BCB77', 'blue': '#4D96FF',
    'yellow': '#d2a800ff', 'purple': '#845EC2',
    'gray': '#9b9b9bff', 'brown': '#59411bff',
    'pink': '#FF6EC7',
  };
  // 🌟 스케줄 카드의 좌측 테두리 색상으로 사용
  const borderColor = colorMap[colorName?.toLowerCase() || 'gray'] || colorMap['gray'];
  return { borderColor };
};

// API 시간 포맷 ("14:00:00" -> "오후 2:00 ~ 오후 3:00")
const formatApiTimeRange = (startTime: string, endTime: string) => {
  const parseAndFormat = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const h = parseInt(hour, 10);
    const period = h < 12 ? '오전' : '오후';
    const formattedHour = h % 12 === 0 ? 12 : h % 12;
    const formattedMinute = minute.padStart(2, '0');
    return `${period} ${formattedHour}:${formattedMinute}`;
  };
  return `${parseAndFormat(startTime)} ~ ${parseAndFormat(endTime)}`;
};

// --- 주간 시간표 페이지 컴포넌트 (리스트 뷰) ---
const RoutinePage = () => {
  const { schedules, loading, error } = useSchedule();
  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
  const todayApiIndex = new Date().getDay(); // 0=일요일

  // --- 렌더링 ---
  if (loading) {
    return (
      <View style={[styles.container, styles.centerAlign]}>
        <ActivityIndicator size="large" color="#79B3F7" />
        <Text style={styles.infoText}>매주 계속 하는 일을 불러오는 중...</Text>
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

  // --- 메인 렌더링 ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>주간 시간표</Text>
      </View>

      {/* 🌟 요일별 리스트를 보여주는 ScrollView */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {daysOfWeek.map((dayName, index) => {
          const apiDayIndex = (index + 1) % 7;
          const daySchedules = schedules[apiDayIndex] || [];
          const isToday = apiDayIndex === todayApiIndex;

          return (
            <View key={dayName} style={styles.dayContainer}>
              {/* 요일 헤더 */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{dayName}</Text>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>오늘</Text>
                  </View>
                )}
              </View>

              {/* 일정 목록 */}
              <View style={styles.scheduleListContainer}>
                {daySchedules.length > 0 ? (
                  daySchedules.map(schedule => {
                    const { borderColor } = getScheduleColorStyle(schedule.color);
                    return (
                      <View 
                        key={schedule.id} 
                        style={[styles.scheduleCard, { borderLeftColor: borderColor }]}
                      >
                        <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                        <Text style={styles.scheduleTime}>
                          {formatApiTimeRange(schedule.startTime, schedule.endTime)}
                        </Text>
                        <Text style={styles.scheduleLocation}>{schedule.location}</Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={[styles.scheduleCard, styles.noScheduleCard]}>
                    <Text style={styles.noScheduleText}>등록된 일정이 없습니다.</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default RoutinePage;


// --- 스타일시트 (리스트 뷰) ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // 전체 배경색
    paddingVertical: 10,
  },
  header: {
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
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

  // --- 스크롤 뷰 ---
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15, // 좌우 여백
    paddingBottom: 30, // 하단 여백
  },

  // --- 요일 섹션 ---
  dayContainer: {
    marginBottom: 25, // 요일 간 간격
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  dayHeaderText: {
    fontSize: 22, // 폰트 크기 키움
    fontWeight: 'bold',
    color: '#333',
  },
  todayBadge: {
    backgroundColor: '#E6F0FA', // 연한 파란색
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  todayBadgeText: {
    color: '#005A9C', // 진한 파란색
    fontWeight: 'bold',
    fontSize: 14,
  },

  // --- 일정 카드 ---
  scheduleListContainer: {
    // MainPage의 카드 스타일과 유사하게
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 6, // 🌟 색상 라벨을 좌측 테두리로
    // 그림자 (MainPage와 유사)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noScheduleCard: {
    borderLeftColor: '#DDDDDD', // 일정이 없을 때
    alignItems: 'center',
  },
  noScheduleText: {
    fontSize: 16,
    color: '#888',
  },

  // --- 카드 내부 텍스트 ---
  scheduleTitle: {
    fontSize: 18, // 폰트 크기 키움
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  scheduleTime: {
    fontSize: 16, // 폰트 크기 키움
    color: '#555',
    marginBottom: 5,
  },
  scheduleLocation: {
    fontSize: 15,
    color: '#777',
  },
});