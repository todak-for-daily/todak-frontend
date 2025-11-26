import React, { useState, useMemo, useCallback } from 'react';
import {
 View,
 Text,
 TouchableOpacity,
 StyleSheet,
 FlatList,
 ActivityIndicator,
 Dimensions,
} from 'react-native';
import { useSchedule, ApiSchedule } from '../contexts/ScheduleContext';
import { useWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ScheduleModal from '../components/ScheduleModal';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getSchedulesForDate } from '../utils/scheduleMerger';

// 시각적 이해를 돕기 위한 이모지 추가
const DAYS = [
 { key: 0, label: '일요일', emoji: '☀️' },
 { key: 1, label: '월요일', emoji: '🌙' },
 { key: 2, label: '화요일', emoji: '🔥' },
 { key: 3, label: '수요일', emoji: '💧' },
 { key: 4, label: '목요일', emoji: '🌳' },
 { key: 5, label: '금요일', emoji: '💰' },
 { key: 6, label: '토요일', emoji: '🪨' },
];

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
   const startFormatted = parseAndFormat(startTime);
   const endFormatted = parseAndFormat(endTime);
   if (startFormatted && endFormatted) {
     return `${startFormatted} ~ ${endFormatted}`;
   }
   return '시간 정보 없음';
};


type WeeklyScheduleRouteParams = {
  year: number;
  month: number; // 0-based (0=January, 11=December)
  weekIndex: number; // 0-based week index within the month
};

type WeeklyScheduleRouteProp = RouteProp<{ WeeklySchedule: WeeklyScheduleRouteParams }, 'WeeklySchedule'>;

const WeeklySchedule1 = () => {
 const navigation = useNavigation();
 const route = useRoute<WeeklyScheduleRouteProp>();
 const routeParams = route.params;

 const { rawSchedules: oneTimeSchedules, deleteSchedule, loading: loadingOneTime } = useSchedule();
 const { rawWeeklySchedules, deleteWeeklySchedule, loading: loadingWeekly } = useWeeklySchedule();
 const loading = loadingOneTime || loadingWeekly;
 
 // 네비게이션 파라미터가 있으면 해당 주의 첫 날짜 계산, 없으면 오늘 날짜 사용
 const getTargetWeekStartDate = useCallback((): Date => {
   if (routeParams?.year && routeParams?.month !== undefined && routeParams?.weekIndex !== undefined) {
     // 해당 월의 첫 날짜
     const firstDayOfMonth = new Date(routeParams.year, routeParams.month, 1);
     const firstDayWeekday = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)
     
     // 달력 시작 날짜 계산 (첫 주의 일요일)
     const startDate = new Date(firstDayOfMonth);
     startDate.setDate(startDate.getDate() - firstDayWeekday);
     
     // 해당 주의 시작 날짜 (일요일)
     const targetWeekStart = new Date(startDate);
     targetWeekStart.setDate(startDate.getDate() + routeParams.weekIndex * 7);
     
     return targetWeekStart;
   }
   // 파라미터가 없으면 오늘 날짜 기준
   const today = new Date();
   const todayIndex = today.getDay();
   const weekStart = new Date(today);
   weekStart.setDate(today.getDate() - todayIndex); // 이번 주 일요일
   return weekStart;
 }, [routeParams]);

 const [selectedDay, setSelectedDay] = useState(new Date().getDay()); // 오늘 요일로 초기화 (0=일)
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedSchedule, setSelectedSchedule] = useState<ApiSchedule | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<ApiSchedule | null>(null);
 const [addModalDate, setAddModalDate] = useState<string | null>(null);

 // 현재 시간을 KST 기준으로 반환 (기본적으로 로컬 시간이지만, 필요 시 확장 가능)
 const getKoreanTime = useCallback(() => {
   const tempNow = new Date();
   const utc = tempNow.getTime() + tempNow.getTimezoneOffset() * 60000;
   const KR_TIME_DIFF = 9 * 60 * 60000;
   return new Date(utc + KR_TIME_DIFF);
 }, []);

 // 선택된 요일 인덱스에 해당하는 '타겟 주'의 날짜 문자열(YYYY-MM-DD) 반환
  const getDateStringForSelectedDay = useCallback((dayIndex: number): string => {
    const weekStart = getTargetWeekStartDate();
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex); // 일요일(0)부터 시작

    // YYYY-MM-DD 포맷 처리
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [getTargetWeekStartDate]);

 // 선택된 요일 및 해당 주의 날짜에 맞는 스케줄 목록 (병합된 스케줄)
const selectedDaySchedules = useMemo(() => {
  const targetDateStr = getDateStringForSelectedDay(selectedDay);
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  return getSchedulesForDate(targetDate, rawWeeklySchedules, oneTimeSchedules);
}, [selectedDay, getDateStringForSelectedDay, rawWeeklySchedules, oneTimeSchedules]);


 const isCurrent = useCallback((item: ApiSchedule) => {
   if (!item.date || !item.startTime || !item.endTime) return false;
   try {
       const now = getKoreanTime().getTime();
       // 시간대 오프셋(+09:00)을 명시적으로 추가
       const startTime = new Date(`${item.date}T${item.startTime}+09:00`).getTime();
       const endTime = new Date(`${item.date}T${item.endTime}+09:00`).getTime();
       if (isNaN(startTime) || isNaN(endTime)) return false;
       return startTime <= now && now <= endTime;
   } catch (e) {
       console.error("Error parsing date/time in isCurrent:", e);
       return false;
   }
 }, [getKoreanTime]);

 const isToday = useCallback((dayIndex: number) =>
     dayIndex === getKoreanTime().getDay(),
 [getKoreanTime]);

 const handleDeleteConfirm = useCallback(() => {
   if (deleteTarget) {
     // 주간 반복 일정인지 확인 (ID가 음수이거나 isRoutine 플래그가 true)
     if (deleteTarget.isRoutine || deleteTarget.id < 0) {
       // 원본 주간 일정 ID로 변환 (음수 ID의 절댓값)
       const originalWeeklyId = Math.abs(deleteTarget.id);
       deleteWeeklySchedule(originalWeeklyId);
     } else {
       // 일회성 일정 삭제
       deleteSchedule(deleteTarget.id);
     }
     setDeleteTarget(null);
   }
 }, [deleteTarget, deleteSchedule, deleteWeeklySchedule]);

 const handleOpenAddModal = useCallback(() => {
   const targetDate = getDateStringForSelectedDay(selectedDay);
   setAddModalDate(targetDate);
   setIsAddModalOpen(true);
 }, [selectedDay, getDateStringForSelectedDay]);

 const handlePressSchedule = useCallback((item: ApiSchedule) => {
   setSelectedSchedule(item);
   setIsDetailModalOpen(true);
 }, []);

 const handleEditSchedule = useCallback(() => {
   if (selectedSchedule) {
     setIsDetailModalOpen(false);
     setIsEditModalOpen(true);
   }
 }, [selectedSchedule]);

 // 렌더링
 const renderScheduleItem = useCallback(({ item }: { item: ApiSchedule }) => {
   const current = isCurrent(item);

   return (
     <TouchableOpacity
       style={[styles.scheduleBox, current && styles.currentBox]}
       onPress={() => handlePressSchedule(item)}
     >
       <View style={styles.scheduleContent}>
         <View style={styles.scheduleInfo}>
           <Text style={[styles.scheduleText, current && styles.currentText]}>
             {item.title}
           </Text>
           <Text style={[styles.scheduleTime, current && styles.currentText]}>
             ⏰ {formatApiTimeRange(item.startTime, item.endTime)}
           </Text>
           <Text style={[styles.schedulePlace, current && styles.currentText]}>
             📍 {item.location || '장소 정보 없음'}
           </Text>
         </View>
         <TouchableOpacity
           style={styles.deleteBtn}
           onPress={() => setDeleteTarget(item)}
         >
           <Text style={styles.deleteBtnText}>🗑️{'\n'}삭제</Text>
         </TouchableOpacity>
       </View>
     </TouchableOpacity>
   );
 }, [isCurrent, handlePressSchedule]); 


 if (loading) {
     return (
         <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
             <ActivityIndicator size="large" color="#FFC364" />
         </View>
     );
 }

 return (
   <View style={styles.container}>
     <View style={styles.header}>
       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< 뒤로'}</Text>
       </TouchableOpacity>

       <Text style={styles.title}>📆 일주일 시간표</Text>

       {/* 헤더 공간 균형을 위한 임시 뷰 */}
       <View style={{ width: 80 }} />
     </View>

     {/* 요일 선택 탭 */}
     <View style={styles.tabContainer}>
       {/* 첫째 줄 (일~수) */}
       <View style={styles.tabRow}>
         {DAYS.slice(0, 4).map((day) => (
           <TouchableOpacity
             key={day.key}
             style={[
               styles.dayTab,
               selectedDay === day.key && styles.selectedDayTab,
               isToday(day.key) && styles.todayTab,
             ]}
             onPress={() => setSelectedDay(day.key)}
           >
             <Text style={styles.dayEmoji}>{day.emoji}</Text>
             <Text
               style={[
                 styles.dayLabel,
                 selectedDay === day.key && styles.selectedDayLabel,
               ]}
             >
               {day.label}
             </Text>
             {isToday(day.key) && (
               <View style={styles.todayBadge}>
                 <Text style={styles.todayBadgeText}>오늘</Text>
               </View>
             )}
           </TouchableOpacity>
         ))}
       </View>

       <View style={styles.tabRowCenter}>
         {DAYS.slice(4, 7).map((day) => (
           <TouchableOpacity
             key={day.key}
             style={[
               styles.dayTab,
               selectedDay === day.key && styles.selectedDayTab,
               isToday(day.key) && styles.todayTab,
             ]}
             onPress={() => setSelectedDay(day.key)}
           >
             <Text style={styles.dayEmoji}>{day.emoji}</Text>
             <Text
               style={[
                 styles.dayLabel,
                 selectedDay === day.key && styles.selectedDayLabel,
               ]}
             >
               {day.label}
             </Text>
             {isToday(day.key) && (
               <View style={styles.todayBadge}>
                 <Text style={styles.todayBadgeText}>오늘</Text>
               </View>
             )}
           </TouchableOpacity>
         ))}
       </View>
     </View>

     {/* 선택된 요일 헤더 */}
     <View style={styles.selectedDayHeader}>
       <Text style={styles.selectedDayTitle}>
         {DAYS[selectedDay].emoji} {DAYS[selectedDay].label} ({getDateStringForSelectedDay(selectedDay).substring(5).replace('-', '/')}) 일정
       </Text>
     </View>

     {/* 일정 추가 버튼 */}
     <TouchableOpacity
       style={styles.addButton}
       onPress={handleOpenAddModal}
     >
       <Text style={styles.addButtonText}>
         + {DAYS[selectedDay].label} 할 일 만들기
       </Text>
     </TouchableOpacity>

     {/* 일정 목록 */}
     <View style={styles.listContainer}>
       <FlatList
         data={selectedDaySchedules} // 필터링된 데이터
         keyExtractor={(item) => item.id.toString()}
         renderItem={renderScheduleItem}
         ListEmptyComponent={
           <View style={styles.emptyContainer}>
             <Text style={styles.emptyIcon}>📝</Text>
             <Text style={styles.emptyText}>
               {getDateStringForSelectedDay(selectedDay).substring(5).replace('-', '/')} {DAYS[selectedDay].label}에 할 일이 없어요
             </Text>
             <Text style={styles.emptySubText}>
               '할 일 만들기'를 눌러 새로운 할 일을 적어볼까요?
             </Text>
           </View>
         }
       />
     </View>

     {/* 일정 추가 모달 */}
     <ScheduleModal
       visible={isAddModalOpen}
       onClose={() => setIsAddModalOpen(false)}
       targetDate={addModalDate ?? getKoreanTime().toString()}
     />

     {/* 일정 수정 모달 */}
     <ScheduleModal
       visible={isEditModalOpen}
       onClose={() => {
         setIsEditModalOpen(false);
         setSelectedSchedule(null);
       }}
       targetDate={selectedSchedule?.date || getKoreanTime().toString()}
       initialSchedule={selectedSchedule || undefined}
     />

     {/* 일정 상세 모달 */}
     {selectedSchedule && (
       <ScheduleDetailModal
         visible={isDetailModalOpen}
         onClose={() => {
           setIsDetailModalOpen(false);
           setSelectedSchedule(null);
         }}
         schedule={selectedSchedule}
         onEdit={handleEditSchedule}
       />
     )}

     {/* 삭제 확인 모달 */}
     <DeleteConfirmModal
       visible={!!deleteTarget}
       target={deleteTarget}
       onConfirm={handleDeleteConfirm}
       onCancel={() => setDeleteTarget(null)}
     />
   </View>
 );
};

export default WeeklySchedule1;

const styles = StyleSheet.create({
  container: {
   flex: 1,
   paddingTop: 20,
   backgroundColor: '#FFFFFF',
 },
 header: {
   paddingBottom: 15,
   alignItems: 'center',
   paddingHorizontal: 20,
   flexDirection: 'row',
   justifyContent: 'space-between', 
 },

 backButton: {
     marginTop:20,
     padding: 10,
     marginLeft: -10, 
 },
 backButtonText: {
     fontSize: 24,
     fontWeight: 'bold',
     color: '#4D96FF', 
 },
 title: {
   marginTop:20,
   fontSize: 28, 
   fontWeight: 'bold',
   color: '#333333',
 },
 tabContainer: {
   paddingHorizontal: 15,
   marginBottom: 20,
 },
 tabRow: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   marginBottom: 12,
 },
 tabRowCenter: {
   flexDirection: 'row',
   justifyContent: 'flex-start',
   paddingLeft: (Dimensions.get('window').width / 2) - (80*1.5 + 4*3) ,
   marginBottom: 12,
 },
 dayTab: {
   width: 80,
   height: 80,
   backgroundColor: '#FFFFFF',
   borderRadius: 20,
   marginHorizontal: 4,
   alignItems: 'center',
   justifyContent: 'center',
   borderWidth: 2,
   borderColor: '#DDDDDD',
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.05,
   shadowRadius: 3,
   elevation: 3,
 },
 selectedDayTab: {
   backgroundColor: '#4D96FF',
   borderColor: '#4D96FF',
 },
 todayTab: {
   borderColor: '#FF6B9D',
   borderWidth: 4,
 },
 dayEmoji: {
   fontSize: 24,
   marginBottom: 2,
 },
 dayLabel: {
   fontSize: 11,
   fontWeight: 'bold',
   color: '#333333',
 },
 selectedDayLabel: {
   color: '#FFFFFF',
 },
 todayBadge: {
   backgroundColor: '#FF6B9D',
   borderRadius: 8,
   paddingHorizontal: 4,
   paddingVertical: 1,
   marginTop: 2,
 },
 todayBadgeText: {
   color: '#FFFFFF',
   fontSize: 9,
   fontWeight: 'bold',
 },
 selectedDayHeader: {
   paddingHorizontal: 20,
   marginBottom: 15,
 },
 selectedDayTitle: {
   fontSize: 24,
   fontWeight: 'bold',
   color: '#333333',
 },
 addButton: {
   backgroundColor: '#4D96FF',
   borderRadius: 20,
   padding: 18,
   marginHorizontal: 20,
   marginBottom: 15,
   alignItems: 'center',
   borderWidth: 0,
   shadowColor: '#4D96FF',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.3,
   shadowRadius: 5,
   elevation: 5,
 },
 addButtonText: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#FFFFFF',
 },
 listContainer: {
   flex: 1,
   backgroundColor: '#F8F8F8',
   marginHorizontal: 20,
   borderRadius: 20,
   padding: 15,
   borderWidth: 1,
   borderColor: '#E0E0E0',
 },
 scheduleBox: {
   backgroundColor: '#FFFFFF',
   borderRadius: 15,
   padding: 16,
   marginBottom: 12,
   borderWidth: 1,
   borderColor: '#E0E0E0',
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 1 },
   shadowOpacity: 0.05,
   shadowRadius: 2,
   elevation: 2,
 },
 currentBox: {
   backgroundColor: '#EBF5FF',
   borderColor: '#4D96FF',
   borderWidth: 2,
 },
 scheduleContent: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
 },
 scheduleInfo: {
   flex: 1,
   marginRight: 10,
 },
 scheduleText: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#333333',
   marginBottom: 6,
 },
 currentText: {
   color: '#333333',
 },
 scheduleTime: {
   fontSize: 16,
   color: '#666666',
   marginBottom: 4,
 },
 schedulePlace: {
   fontSize: 16,
   color: '#999999',
 },
 deleteBtn: {
   backgroundColor: '#FF6B9D',
   borderRadius: 15,
   padding: 12,
   alignItems: 'center',
   justifyContent: 'center',
   minWidth: 60,
   borderWidth: 0,
 },
 deleteBtnText: {
   fontSize: 14,
   color: '#FFFFFF',
   fontWeight: 'bold',
   textAlign: 'center',
 },
 emptyContainer: {
   alignItems: 'center',
   justifyContent: 'center',
   paddingVertical: 60,
 },
 emptyIcon: {
   fontSize: 60,
   marginBottom: 15,
 },
 emptyText: {
   fontSize: 20,
   color: '#666666',
   fontWeight: 'bold',
   marginBottom: 8,
 },
 emptySubText: {
   fontSize: 16,
   color: '#999999',
 },
});


