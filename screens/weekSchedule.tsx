import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
 View,
 Text,
 TouchableOpacity,
 StyleSheet,
 FlatList,
 ActivityIndicator,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useSchedule, ApiSchedule } from '../contexts/ScheduleContext';
import { useWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import { getSchedulesForDate } from '../utils/scheduleMerger';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ScheduleModal from '../components/ScheduleModal';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

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
  date?: string; // YYYY-MM-DD 형식의 날짜 (선택적)
  year?: number; // 하위 호환성을 위한 옵션
  month?: number; // 하위 호환성을 위한 옵션
  day?: number; // 하위 호환성을 위한 옵션
  weekIndex?: number; // 기존 주 단위 호환성을 위한 옵션
};

type WeeklyScheduleRouteProp = RouteProp<{ WeeklySchedule: WeeklyScheduleRouteParams }, 'WeeklySchedule'>;

const WeeklySchedule = () => {
 const navigation = useNavigation();
 const route = useRoute<WeeklyScheduleRouteProp>();
 const routeParams = route.params;

 const { rawSchedules: oneTimeSchedules, deleteSchedule, loading: loadingOneTime } = useSchedule();
 const { rawWeeklySchedules, loading: loadingWeekly } = useWeeklySchedule();
 const loading = loadingOneTime || loadingWeekly;
 
 // KST 기준 날짜 문자열 생성 함수 (시간대 문제 방지)
 const formatDateToKST = useCallback((year: number, month: number, day: number): string => {
   // 로컬 시간대로 Date 객체 생성 (시간대 문제 없음)
   const date = new Date(year, month, day);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
 }, []);

 // 선택된 날짜 초기화 함수
 const getInitialDate = useCallback(() => {
   if (routeParams?.date) {
     // YYYY-MM-DD 형식의 날짜 문자열
     return routeParams.date;
   } else if (routeParams?.year !== undefined && routeParams?.month !== undefined && routeParams?.day !== undefined) {
     // 하위 호환성: year, month, day로 받은 경우
     const year = routeParams.year;
     const month = routeParams.month; // 0-based
     const day = routeParams.day;
     return formatDateToKST(year, month, day);
   } else if (routeParams?.year !== undefined && routeParams?.month !== undefined && routeParams?.weekIndex !== undefined) {
     // 기존 주 단위 호환성: year, month, weekIndex로 받은 경우 - 주의 첫 번째 날짜 계산
     const year = routeParams.year;
     const month = routeParams.month; // 0-based
     const weekIndex = routeParams.weekIndex;
     const firstDayOfMonth = new Date(year, month, 1);
   const firstDayWeekday = firstDayOfMonth.getDay();
     // 달력 시작 날짜 계산 (첫 주의 일요일)
   const startDate = new Date(firstDayOfMonth);
   startDate.setDate(startDate.getDate() - firstDayWeekday);
     // weekIndex에 해당하는 주의 첫 번째 날짜 (일요일)
     const targetDate = new Date(startDate);
     targetDate.setDate(startDate.getDate() + (weekIndex * 7));
     return formatDateToKST(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
   }
   // routeParams가 없으면 오늘 날짜 (KST 기준)
   // 로컬 시간대 기준으로 직접 날짜 문자열 생성 (시간대 문제 방지)
   const today = new Date();
   const year = today.getFullYear();
   const month = today.getMonth();
   const day = today.getDate();
   return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 }, [routeParams, formatDateToKST]);

 // 선택된 날짜 (routeParams에서 받은 날짜 또는 오늘)
 const [selectedDate, setSelectedDate] = useState<string>(() => getInitialDate());

 // routeParams가 변경되면 selectedDate 업데이트
 useEffect(() => {
   const newDate = getInitialDate();
   setSelectedDate(newDate);
 }, [getInitialDate]);

 
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedSchedule, setSelectedSchedule] = useState<ApiSchedule | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<ApiSchedule | null>(null);

 // 현재 시간을 KST 기준으로 반환
 const getKoreanTime = useCallback(() => {
   const tempNow = new Date();
   const utc = tempNow.getTime() + tempNow.getTimezoneOffset() * 60000;
   const KR_TIME_DIFF = 9 * 60 * 60000;
   return new Date(utc + KR_TIME_DIFF);
 }, []);

 // 선택된 날짜의 스케줄 목록 (주간 반복 + 일회성 병합)
const selectedDaySchedules = useMemo(() => {
  // selectedDate를 Date 객체로 변환
  const [year, month, day] = selectedDate.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  
  // getSchedulesForDate를 사용하여 주간 반복 일정과 일회성 일정 병합
  const mergedSchedules = getSchedulesForDate(
    targetDate,
    rawWeeklySchedules,
    oneTimeSchedules
  );
  
  console.log('Selected date:', selectedDate);
  console.log('Merged schedules:', mergedSchedules.map(s => ({ id: s.id, date: s.date, title: s.title, isRoutine: s.isRoutine })));
  
  return mergedSchedules;
}, [selectedDate, rawWeeklySchedules, oneTimeSchedules]);


 const isCurrent = useCallback((item: ApiSchedule) => {
   if (!item.date || !item.startTime || !item.endTime) return false;
   try {
       const now = getKoreanTime().getTime();
       const startTime = new Date(`${item.date}T${item.startTime}+09:00`).getTime();
       const endTime = new Date(`${item.date}T${item.endTime}+09:00`).getTime();
       if (isNaN(startTime) || isNaN(endTime)) return false;
       return startTime <= now && now <= endTime;
   } catch (e) {
       console.error("Error parsing date/time in isCurrent:", e);
       return false;
   }
 }, [getKoreanTime]);

 const handleDeleteConfirm = useCallback(() => {
   if (deleteTarget) {
     // 일 단위 일정만 삭제
       deleteSchedule(deleteTarget.id);
     setDeleteTarget(null);
   }
 }, [deleteTarget, deleteSchedule]);

 const handleOpenAddModal = useCallback(() => {
   setIsAddModalOpen(true);
 }, []);

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
           <Text style={styles.deleteBtnText}>지울래요</Text>
         </TouchableOpacity>
       </View>
     </TouchableOpacity>
   );
 }, [isCurrent, handlePressSchedule]); 

 // 선택된 날짜 정보
 const selectedDateObj = useMemo(() => {
   const [year, month, day] = selectedDate.split('-').map(Number);
   return new Date(year, month - 1, day);
 }, [selectedDate]);

 const selectedDateLabel = useMemo(() => {
   const date = selectedDateObj;
   const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
   const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
   return `${date.getFullYear()}년 ${monthNames[date.getMonth()]} ${date.getDate()}일 ${weekdayNames[date.getDay()]}`;
 }, [selectedDateObj]);

if (loading) {
    return (
        <View style={[styles.container, styles.loadingContainer]}>
            <ActivityIndicator size="large" color="#FFC364" />
        </View>
    );
}

 return (
   <View style={styles.container}>
     <View style={styles.header}>
       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FeatherIcon name="chevron-left" size={28} color="#333" />
       </TouchableOpacity>

       <Text style={styles.title}>오늘의 시간표</Text>
     </View>

     {/* 선택된 날짜 헤더 */}
     <View style={styles.selectedDateHeader}>
       <Text style={styles.selectedDateTitle}>{`${selectedDateLabel} 일정`}</Text>
     </View>

     {/* 일정 추가 버튼 */}
     <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
       <Text style={styles.addButtonText}>+ 할 일 만들기</Text>
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
               {`${selectedDateObj.getMonth() + 1}/${selectedDateObj.getDate()}에 할 일이 없어요`}
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
       targetDate={selectedDate}
     />

     {/* 일정 수정 모달 */}
     <ScheduleModal
       visible={isEditModalOpen}
       onClose={() => {
         setIsEditModalOpen(false);
         setSelectedSchedule(null);
       }}
       targetDate={selectedSchedule?.date || selectedDate}
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

export default WeeklySchedule;

const styles = StyleSheet.create({
  container: {
   flex: 1,
   paddingTop: 20,
   backgroundColor: '#FFFFFF',
 },
 loadingContainer: {
   justifyContent: 'center',
   alignItems: 'center',
 },
 header: {
   paddingBottom: 15,
   alignItems: 'center',
   paddingHorizontal: 20,
   flexDirection: 'row',
   justifyContent: 'center',
   position: 'relative',
 },
 backButton: {
     position: 'absolute',
     left: 20,
     top: 20,
     padding: 8,
     marginLeft: -8,
     justifyContent: 'center',
     alignItems: 'center',
     zIndex: 1,
 },
 title: {
   marginTop:20,
   fontSize: 28, 
   fontWeight: 'bold',
   color: '#333333',
   textAlign: 'center',
   flex: 1,
 },
 selectedDateHeader: {
   paddingHorizontal: 20,
   marginBottom: 10,
 },
 selectedDateTitle: {
   fontSize: 22,
   fontWeight: 'bold',
   color: '#333333',
 },
 addButton: {
   backgroundColor: '#FFC364',
   borderRadius: 20,
   padding: 15,
   marginHorizontal: 20,
   marginBottom: 12,
   alignItems: 'center',
   borderWidth: 0,
   shadowColor: '#FFC364',
   shadowOffset: { width: 0, height: 4 },
   shadowOpacity: 0.3,
   shadowRadius: 5,
   elevation: 5,
 },
 addButtonText: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#000000',
 },
 listContainer: {
   flex: 1,
   backgroundColor: '#FFFBF0',
   marginHorizontal: 20,
   marginBottom: 20,
   borderRadius: 20,
   padding: 12,
   borderWidth: 2,
   borderColor: '#FFC364',
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
   backgroundColor: '#FFF5DA',
   borderColor: '#FFC364',
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
   backgroundColor: '#FFC364',
   borderRadius: 15,
   padding: 12,
   alignItems: 'center',
   justifyContent: 'center',
   minWidth: 60,
   borderWidth: 0,
   shadowColor: '#FFC364',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.3,
   shadowRadius: 3,
   elevation: 3,
 },
 deleteBtnText: {
   fontSize: 14,
   color: '#000000',
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