import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import {
  DayOfWeek,
  DAY_OF_WEEK_INDEX_MAP,
} from '../types/datetime';
import { COLOR_NAME_MAP } from '../types/colors';

// 주간 스케줄 데이터 타입 (API 명세 기반)
export interface ApiWeeklySchedule {
  id: number;
  memberId: number; // 사용자를 위한 필드
  dayOfWeek: DayOfWeek; // "FRIDAY" 등 요일 문자열
  startTime: string;    // "HH:mm:ss"
  endTime: string;      // "HH:mm:ss"
  title: string;
  color: string;
  location: string;
}

// 주간 일정을 추가할 때 ID는 서버에서 부여되므로 제외
interface AddWeeklyScheduleData extends Omit<ApiWeeklySchedule, 'id'> {}


// 요일별 그룹화 타입 (0: 일요일 ~ 6: 토요일)
// 기존 일회성 스케줄과 동일하게 요일 인덱스로 그룹화합니다.
type WeeklySchedulesByDay = {
  [key: number]: ApiWeeklySchedule[];
};

// 컨텍스트 타입 정의
interface WeeklyScheduleContextType {
  rawWeeklySchedules: ApiWeeklySchedule[];
  weeklySchedules: WeeklySchedulesByDay;
  loading: boolean;
  error: string | null;
  addWeeklySchedule: (newScheduleData: AddWeeklyScheduleData) => Promise<void>;
  updateWeeklySchedule: (updatedSchedule: ApiWeeklySchedule) => Promise<void>;
  deleteWeeklySchedule: (id: number) => Promise<void>;
}

const WeeklyScheduleContext = createContext<WeeklyScheduleContextType | undefined>(undefined);

// --- 요일 매핑 및 그룹화 로직 ---
const dayOfWeekMap: { [key in DayOfWeek]: number } = DAY_OF_WEEK_INDEX_MAP;

// 주간 일정을 요일 인덱스(0-6)로 그룹화하는 함수
const groupWeeklySchedulesByDay = (schedules: ApiWeeklySchedule[]): WeeklySchedulesByDay => {
  return schedules.reduce((acc, schedule) => {
    const dayIndex = dayOfWeekMap[schedule.dayOfWeek];

    if (dayIndex === undefined) return acc; // 유효하지 않은 요일 무시

    if (!acc[dayIndex]) {
      acc[dayIndex] = [];
    }
    acc[dayIndex].push(schedule);

    // 시작 시간 기준 정렬 (기존 스케줄과 동일하게)
    acc[dayIndex].sort((a, b) =>
      (a.startTime || '').localeCompare(b.startTime || '')
    );
    return acc;
  }, {} as WeeklySchedulesByDay);
};


// --- Mock Data (주간 반복 일정) ---
const weeklyBlue = COLOR_NAME_MAP.blue;
const weeklyGrey = COLOR_NAME_MAP.gray;
const weeklyPink = COLOR_NAME_MAP.pink;
const weeklyRed = COLOR_NAME_MAP.red;

const mockWeeklyData: ApiWeeklySchedule[] = [
  { id: 1, memberId: 2, dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00', title: '회사 근무', color: weeklyBlue, location: '회사 사무실' },
  { id: 3, memberId: 2, dayOfWeek: 'TUESDAY', startTime: '09:00:00', endTime: '18:00:00', title: '회사 근무', color: weeklyBlue, location: '회사 사무실' },
  { id: 5, memberId: 2, dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '18:00:00', title: '회사 근무', color: weeklyBlue, location: '회사 사무실' },
  { id: 6, memberId: 2, dayOfWeek: 'THURSDAY', startTime: '09:00:00', endTime: '18:00:00', title: '회사 근무', color: weeklyBlue, location: '회사 사무실' },
  { id: 7, memberId: 2, dayOfWeek: 'THURSDAY', startTime: '18:30:00', endTime: '19:30:00', title: '직장 코치 상담', color: weeklyPink, location: '온라인' },
  { id: 8, memberId: 2, dayOfWeek: 'FRIDAY', startTime: '09:00:00', endTime: '18:00:00', title: '회사 근무', color: weeklyBlue, location: '회사 사무실' },
  { id: 10, memberId: 2, dayOfWeek: 'SATURDAY', startTime: '10:00:00', endTime: '12:00:00', title: '집 정리', color: weeklyGrey, location: '집' },
  { id: 11, memberId: 2, dayOfWeek: 'SUNDAY', startTime: '14:00:00', endTime: '16:00:00', title: '병원 방문', color: weeklyRed, location: 'OO 병원' },
];


// Provider 컴포넌트
export const WeeklyScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawWeeklySchedules, setRawWeeklySchedules] = useState<ApiWeeklySchedule[]>([]);
  const [groupedWeeklySchedules, setGroupedWeeklySchedules] = useState<WeeklySchedulesByDay>({});

  // MockData 로드
  useEffect(() => {
    const loadMockWeeklySchedules = async () => {
      try {
        setLoading(true);
        // API 호출 지연을 흉내냅니다.
        await new Promise(resolve => setTimeout(resolve, 500));

        // 초기 데이터 설정
        setRawWeeklySchedules(mockWeeklyData);
        setError(null);

      } catch (_err: unknown) {
        console.error("주간 스케줄 로드 중 오류 발생:", _err);
        setError('주간 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    loadMockWeeklySchedules();
  }, []);

  // 원본 데이터가 변경될 때마다 그룹화 업데이트
  useEffect(() => {
    const processedSchedules = groupWeeklySchedulesByDay(rawWeeklySchedules);
    setGroupedWeeklySchedules(processedSchedules);
  }, [rawWeeklySchedules]); // rawWeeklySchedules 변수 사용

  // --- CRUD 함수들 (API 연동 가정) ---
  const addWeeklySchedule = useCallback(async (newScheduleData: AddWeeklyScheduleData) => {
    // POST /api/schedules/weekly 로직
    console.log("Adding weekly schedule (API POST mock):", newScheduleData);

    const newSchedule: ApiWeeklySchedule = {
      ...newScheduleData,
      id: Math.floor(Math.random() * 10000) + 2000, // ID 생성 (2000부터 시작하여 기존 일정과 충돌 방지)
    };
    // 상태 업데이트
    setRawWeeklySchedules(prevSchedules => [...prevSchedules, newSchedule]);
  }, []); // addWeeklySchedule 변수 사용

  const updateWeeklySchedule = useCallback(async (updatedSchedule: ApiWeeklySchedule) => {
    // PUT /api/schedules/weekly/{id} 로직
    console.log("Updating weekly schedule:", updatedSchedule);
    setRawWeeklySchedules(prevSchedules =>
      prevSchedules.map(schedule =>
        schedule.id === updatedSchedule.id ? updatedSchedule : schedule
      )
    );
  }, []); // updateWeeklySchedule 변수 사용

  const deleteWeeklySchedule = useCallback(async (id: number) => {
    // DELETE /api/schedules/weekly/{id} 로직
    console.log("Deleting weekly schedule ID:", id);
    setRawWeeklySchedules(prevSchedules =>
      prevSchedules.filter(schedule => schedule.id !== id)
    );
  }, []); // deleteWeeklySchedule 변수 사용


  // Context 값
  const value = {
    rawWeeklySchedules,
    weeklySchedules: groupedWeeklySchedules,
    loading,
    error,
    addWeeklySchedule,
    updateWeeklySchedule,
    deleteWeeklySchedule,
  }; // loading, error 등 모든 state 변수가 value 객체 내에 사용됨

  return (
    <WeeklyScheduleContext.Provider value={value}>
      {children}
    </WeeklyScheduleContext.Provider>
  );
};

// 커스텀 훅
export const useWeeklySchedule = () => {
  const context = useContext(WeeklyScheduleContext);
  if (context === undefined) {
    throw new Error('useWeeklySchedule must be used within a WeeklyScheduleProvider');
  }
  return context;
};