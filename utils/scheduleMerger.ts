import { ApiSchedule } from '../contexts/ScheduleContext';
import { ApiWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import { DAY_OF_WEEK_INDEX_MAP } from '../types/datetime';

// 주간 반복 일정을 특정 날짜로 변환하는 함수
const expandWeeklyScheduleToDate = (
  weeklySchedule: ApiWeeklySchedule,
  targetDate: Date,
): ApiSchedule | null => {
  const targetDayOfWeek = targetDate.getDay(); // 0: 일요일, 6: 토요일
  const scheduleDayOfWeek = DAY_OF_WEEK_INDEX_MAP[weeklySchedule.dayOfWeek];

  // 요일이 일치하는 경우에만 변환
  if (targetDayOfWeek !== scheduleDayOfWeek) {
    return null;
  }

  // 날짜 문자열 생성 (YYYY-MM-DD)
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  // ApiSchedule 형식으로 변환
  // ID는 원본 주간 일정 ID를 유지하되, 음수로 변환하여 일회성 일정과 구분
  // 또는 별도 필드로 원본 ID 저장 (현재는 ID에 인코딩)
  return {
    id: -weeklySchedule.id, // 음수 ID로 주간 일정임을 표시 (원본 ID 복원 시 Math.abs 사용)
    date: dateString,
    startTime: weeklySchedule.startTime,
    endTime: weeklySchedule.endTime,
    title: weeklySchedule.title,
    color: weeklySchedule.color,
    location: weeklySchedule.location,
    isRoutine: true,
    routineDayOfWeek: weeklySchedule.dayOfWeek,
  };
};

// 특정 날짜 범위에 대해 주간 반복 일정을 확장하는 함수
const expandWeeklySchedulesForDateRange = (
  weeklySchedules: ApiWeeklySchedule[],
  startDate: Date,
  endDate: Date,
): ApiSchedule[] => {
  const expanded: ApiSchedule[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    for (const weeklySchedule of weeklySchedules) {
      const expandedSchedule = expandWeeklyScheduleToDate(weeklySchedule, currentDate);
      if (expandedSchedule) {
        expanded.push(expandedSchedule);
      }
    }
    // 다음 날로 이동
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return expanded;
};

// 주간 반복 일정과 일회성 일정을 특정 날짜에 대해 병합하는 함수
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSchedulesForDate = (
  date: Date,
  weeklySchedules: ApiWeeklySchedule[],
  oneTimeSchedules: ApiSchedule[],
): ApiSchedule[] => {
  const dateString = formatDateKey(date);

  // 해당 날짜의 일회성 일정 필터링
  const oneTimeForDate = oneTimeSchedules.filter(
    (schedule) => schedule.date === dateString,
  );

  // 모든 주간 반복 일정을 해당 날짜로 확장
  const allWeeklyForDate: ApiSchedule[] = [];
  for (const weeklySchedule of weeklySchedules) {
    const expanded = expandWeeklyScheduleToDate(weeklySchedule, date);
    if (expanded) {
      allWeeklyForDate.push(expanded);
    }
  }

  // 병합 및 시간순 정렬
  const merged = [...allWeeklyForDate, ...oneTimeForDate];
  merged.sort((a, b) => {
    const timeA = a.startTime || '';
    const timeB = b.startTime || '';
    return timeA.localeCompare(timeB);
  });

  return merged;
};

// 특정 날짜 범위에 대해 모든 일정을 병합하는 함수
export const getSchedulesForDateRange = (
  startDate: Date,
  endDate: Date,
  weeklySchedules: ApiWeeklySchedule[],
  oneTimeSchedules: ApiSchedule[],
): { [dateKey: string]: ApiSchedule[] } => {
  const result: { [dateKey: string]: ApiSchedule[] } = {};
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateString = formatDateKey(currentDate);
    result[dateString] = getSchedulesForDate(
      currentDate,
      weeklySchedules,
      oneTimeSchedules,
    );
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
};

