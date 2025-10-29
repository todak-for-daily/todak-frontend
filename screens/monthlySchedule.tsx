import { useState, useMemo, useCallback } from 'react';
import {
 View,
 Text,
 StyleSheet,
 TouchableOpacity,
 ActivityIndicator,
 FlatList // 주 단위 렌더링을 위해 FlatList 사용
} from 'react-native';

import { useSchedule, ApiSchedule } from '../contexts/ScheduleContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// 색상 정의 가져오기 (이름->Hex 매핑)
import { COLOR_NAME_MAP } from '../types/colors'; 

type RootStackParamList = {
 Login: undefined;
 Tabs: undefined; 
 MonthlyPlanner: undefined;
 WeeklySchedule: { year: number, month: number, weekIndex: number }; // 최상위 스택에 있으므로 접근 가능
};

// 네비게이션 prop 타입
type MonthlyPlannerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MonthlyPlanner'>;

// 날짜별로 그룹화된 스케줄 타입
type SchedulesMap = {
 [dateKey: string]: ApiSchedule[]; // "YYYY-MM-DD" : Schedule[]
};

// 한 주의 날짜 데이터 타입
interface WeekData {
 weekIndex: number; // 해당 월의 몇 번째 주인지 (0부터 시작)
 days: CalendarDay[];
}

// 달력의 각 날짜 셀 데이터 타입
interface CalendarDay {
 key: string; // 고유 키 (YYYY-MM-DD)
 date: Date;
 dayOfMonth: number; // 날짜 (1, 2, ...)
 isCurrentMonth: boolean; // 현재 표시 중인 월에 속하는지 여부
 isToday: boolean; // 오늘 날짜인지 여부
 schedules: ApiSchedule[]; // 해당 날짜의 스케줄 목록
}

// --- 먼슬리 플래너 컴포넌트 ---
const MonthlySchedule = () => {
 const navigation = useNavigation<MonthlyPlannerNavigationProp>();
 const { rawSchedules, loading, error } = useSchedule();

 // 현재 표시할 연도와 월 상태
 const [currentDate, setCurrentDate] = useState(new Date()); // 오늘 날짜로 초기화
 const currentYear = currentDate.getFullYear();
 const currentMonth = currentDate.getMonth(); // 0 (1월) ~ 11 (12월)

 // 달력 데이터 생성
 const calendarWeeks = useMemo<WeekData[]>(() => {
   const weeks: WeekData[] = [];
   const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
   //const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
   const firstDayWeekday = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)
   
   // 달력 시작 날짜 계산 (첫 주의 일요일)
   const startDate = new Date(firstDayOfMonth);
   startDate.setDate(startDate.getDate() - firstDayWeekday);

   // rawSchedules를 날짜별 Map으로 변환 
   const schedulesMap = rawSchedules.reduce((acc, schedule) => {
       // 날짜 유효성 검사 추가
       if (!schedule || typeof schedule.date !== 'string') {
           console.warn('Invalid schedule object in reduce:', schedule);
           return acc;
       }
       const dateKey = schedule.date; // "YYYY-MM-DD"
       if (!acc[dateKey]) {
           acc[dateKey] = [];
       }
       acc[dateKey].push(schedule);
       return acc;
   }, {} as SchedulesMap);

   let currentWeekDays: CalendarDay[] = [];
   // 6주(42일) 동안 반복
   for (let i = 0; i < 42; i++) {
     const date = new Date(startDate);
     date.setDate(startDate.getDate() + i);
     const dateKey = date.toISOString().split('T')[0]; // "YYYY-MM-DD"
     
     const dayData: CalendarDay = {
       key: dateKey,
       date: date,
       dayOfMonth: date.getDate(),
       isCurrentMonth: date.getMonth() === currentMonth,
       isToday: date.toDateString() === new Date().toDateString(),
       // Map에서 해당 날짜의 스케줄 가져오기
       schedules: schedulesMap[dateKey] || [],
     };

     currentWeekDays.push(dayData);

     // 토요일이면 한 주 완성
     if (date.getDay() === 6) {
       weeks.push({
         weekIndex: weeks.length, // 0부터 시작하는 주 인덱스
         days: currentWeekDays,
       });
       currentWeekDays = []; // 초기화
     }
   }
   // 마지막 주가 6일 미만일 경우 처리
   if (currentWeekDays.length > 0) {
       weeks.push({ weekIndex: weeks.length, days: currentWeekDays });
   }

   return weeks.slice(0, 6); // 최대 6주만 표시
 }, [currentYear, currentMonth, rawSchedules]); // 연도, 월, 스케줄 데이터가 바뀔 때만 재계산

 // 월 이동 함수
 const goToPreviousMonth = useCallback(() => {
   setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
 }, []);

 const goToNextMonth = useCallback(() => {
   setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
 }, []);

 // 주 렌더링 함수
 const renderWeek = ({ item }: { item: WeekData }) => {
     // 주 클릭 시 WeeklySchedule 페이지로 이동
     const handlePressWeek = () => {
         console.log(`Navigating to WeeklySchedule: Year ${currentYear}, Month ${currentMonth + 1}, Week ${item.weekIndex + 1}`);
         navigation.navigate('WeeklySchedule', {
             year: currentYear,
             month: currentMonth, // 0부터 시작하는 월 인덱스 전달
             weekIndex: item.weekIndex // 0부터 시작하는 주 인덱스 전달
         });
     };

     return (
         <TouchableOpacity
             style={styles.weekRow}
             onPress={handlePressWeek}
             activeOpacity={0.7}
         >
             {/* days 배열 유효성 검사 추가 */}
             {Array.isArray(item?.days) ? item.days.map(day => renderDayCell(day)) : null}
         </TouchableOpacity>
     );
 };
   
const renderDayCell = (day: CalendarDay) => {
   const getHexColor = (colorNameOrHex: string | null): string => {
       const defaultGray = COLOR_NAME_MAP['gray'] || '#9B9B9BFF';

       if (!colorNameOrHex) {
           return defaultGray;
       }

       // Hex 코드인지 확인 (예: #RRGGBB 또는 #RRGGBBAA)
       const isHexCode = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(colorNameOrHex);
       if (isHexCode) {
           return colorNameOrHex.toUpperCase(); 
       }

       return COLOR_NAME_MAP[colorNameOrHex.toLowerCase()] || defaultGray;
   };

   return (
     <View
       key={day.key}
       style={[
         styles.dayCell,
         !day.isCurrentMonth && styles.otherMonthDay, // 현재 월 아니면 흐리게
       ]}
     >
       <Text style={[styles.dayText, day.isToday && styles.todayText]}>
         {day.dayOfMonth}
       </Text>
       <View style={styles.scheduleList}>
         {Array.isArray(day?.schedules) ? day.schedules.slice(0, 2).map((schedule) => {
            if (!schedule || typeof schedule.color !== 'string' || typeof schedule.title !== 'string') {
                console.warn('Invalid schedule object in renderDayCell:', schedule);
                return null;
            }
            const bgColor = getHexColor(schedule.color); 
            const textColor = '#333333'; 
            
            return (
              <View 
                key={schedule.id} 
                style={[styles.scheduleItem, { backgroundColor: bgColor }]} 
              >
                  <Text 
                    style={[styles.scheduleText, { color: textColor }]} 
                    numberOfLines={1} // 한 줄로 표시
                    ellipsizeMode="tail" // 길면 끝 부분 ... 처리
                  >
                      {schedule.title}
                  </Text>
              </View>
            );
         }) : null}
       </View>
     </View>
   );
 };

// 로딩-에러
 if (loading) {
   return (
     <View style={styles.centerAlign}>
       <ActivityIndicator size="large" color="#4D96FF" />
     </View>
   );
 }
 if (error) {
   return (
     <View style={styles.centerAlign}>
       <Text style={styles.errorText}>데이터 로딩 오류: {error}</Text>
     </View>
   );
 }

 return (
   <View style={styles.container}>
     {/* 헤더: 월 이동 버튼 및 현재 월 표시 */}
     <View style={styles.header}>
       <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton}>
         <Text style={styles.arrowText}>{'<'}</Text>
       </TouchableOpacity>
       <Text style={styles.headerTitle}>
         {`${currentYear}년 ${currentMonth + 1}월`}
       </Text>
       <TouchableOpacity onPress={goToNextMonth} style={styles.arrowButton}>
         <Text style={styles.arrowText}>{'>'}</Text>
       </TouchableOpacity>
     </View>

     {/* 요일 헤더 */}
     <View style={styles.weekdayHeader}>
       {/* 일-토 */}
       {['일', '월', '화', '수', '목', '금', '토'].map(day => (
         <Text key={day} style={styles.weekdayText}>{day}</Text>
       ))}
     </View>

     {/* 달력 격자 */}
     <View style={styles.calendarGridContainer}>
        <FlatList
          data={calendarWeeks}
          renderItem={renderWeek}
          keyExtractor={(item) => `week-${item.weekIndex}`}
          style={styles.calendarGrid}
          // 추가적인 FlatList 최적화 props (선택 사항)
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={10}
        />
     </View>
   </View>
 );
};

export default MonthlySchedule;

const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#ffffff',
 
   paddingTop: 30, 
   paddingHorizontal: 10,
   paddingBottom: 10, 
 },
 centerAlign: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
 },
 errorText: {
   color: 'red',
   fontSize: 16,
 },
 header: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   paddingVertical: 15,
   paddingHorizontal: 10,
   borderBottomWidth: 1,
   borderBottomColor: '#eee',
 },
 arrowButton: {
   padding: 10,
 },
 arrowText: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#4D96FF',
 },
 headerTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#333',
 },
 weekdayHeader: {
   flexDirection: 'row',
   justifyContent: 'space-around',
   paddingVertical: 10,
   borderBottomWidth: 1,
   borderBottomColor: '#eee',
   backgroundColor: '#f9f9f9',
 },
 weekdayText: {
   flex: 1,
   textAlign: 'center',
   fontSize: 14,
   fontWeight: '600',
   color: '#555',
 },
 calendarGridContainer: {
    flex: 1, // 남은 공간을 모두 채움
 },
 calendarGrid: {
   flex: 1, 
 },
 weekRow: {
   flexDirection: 'row',
   borderBottomWidth: 1,
   borderBottomColor: '#f0f0f0',
   flex: 1, 
 },
 dayCell: {
   flex: 1,
   minHeight: 100,
   borderRightWidth: 1,
   borderRightColor: '#f0f0f0',
   padding: 5,
   alignItems: 'flex-start',
 },
 otherMonthDay: {
   backgroundColor: '#fcfcfc',
 },
 dayText: {
   fontSize: 13,
   fontWeight: '500',
   color: '#333',
   marginBottom: 3,
 },
 todayText: {
   color: '#ffffff',
   backgroundColor: '#4D96FF',
   borderRadius: 10,
   paddingHorizontal: 5,
   paddingVertical: 1,
   overflow: 'hidden',
   fontWeight: 'bold',
 },
 scheduleList: {
   marginTop: 4,
   alignSelf: 'stretch', 
 },
 scheduleItem: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 3,
 },
 scheduleText: {
    fontSize: 10,
    fontWeight: '500',
 },
});