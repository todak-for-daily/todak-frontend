import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback
} from 'react';
import { DayOfWeek } from '../types/datetime';

// 스케줄 데이터 타입 정의
export interface ApiSchedule {
  id: number;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:mm:ss"
  endTime: string;    // "HH:mm:ss"
  title: string;
  color: string;      // Hex 코드
  location: string;
  isRoutine?: boolean; // 루틴 여부 플래그
  routineDayOfWeek?: DayOfWeek;
}

// 요일별 그룹화 타입
type SchedulesByDay = {
  [key: number]: ApiSchedule[]; // 0: 일요일
};

// 컨텍스트 타입 정의
interface ScheduleContextType {
  rawSchedules: ApiSchedule[];
  schedules: SchedulesByDay;
  loading: boolean;
  error: string | null;
  addSchedule: (newScheduleData: Omit<ApiSchedule, 'id' | 'isRoutine'>) => Promise<void>;
  updateSchedule: (updatedSchedule: ApiSchedule) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// --- Mock Data: 일회성 일정만 저장 (반복 일정은 WeeklyScheduleContext에서 관리) ---
const mockData: ApiSchedule[] = [
  // 예시: 특정 날짜의 일회성 일정들
  { id: 201, date: '2025-11-15', startTime: '10:00:00', endTime: '12:00:00', title: '의사 예약', color: '#FF6B6B', location: '병원' },
  { id: 202, date: '2025-11-20', startTime: '14:00:00', endTime: '16:00:00', title: '친구 만나기', color: '#FF6EC7', location: '카페' },
  { id: 203, date: '2025-11-25', startTime: '09:00:00', endTime: '17:00:00', title: '특별 행사 참여', color: '#9370DB', location: '컨벤션 센터' },
];


// 요일별 그룹화 함수
const groupSchedulesByDay = (schedules: ApiSchedule[]): SchedulesByDay => {
  return schedules.reduce((acc, schedule) => {
    // 'YYYY-MM-DD' 문자열을 Date 객체로 변환 시 시간대 문제 방지
    const dateParts = schedule.date.split('-');
    if (dateParts.length !== 3) return acc; // 날짜 형식 오류 방지
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // 달은 0-indexed
    const day = parseInt(dateParts[2], 10);
    
    // 유효한 날짜인지 확인
    if (isNaN(year) || isNaN(month) || isNaN(day)) return acc; 
    
    const dateObj = new Date(year, month, day); 
    const dayIndex = dateObj.getDay(); // 로컬 시간대 기준 요일
    
    if (isNaN(dayIndex)) return acc; // 유효하지 않은 요일 방지

    if (!acc[dayIndex]) {
      acc[dayIndex] = [];
    }
    acc[dayIndex].push(schedule);
    
    // 시작 시간 기준 정렬
    acc[dayIndex].sort((a, b) => 
      (a.startTime || '').localeCompare(b.startTime || '') // startTime null 체크
    );
    return acc;
  }, {} as SchedulesByDay);
};


// Provider 컴포넌트
export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawSchedules, setRawSchedules] = useState<ApiSchedule[]>([]); 
  const [groupedSchedules, setGroupedSchedules] = useState<SchedulesByDay>({});

  // MockData 로드 
  useEffect(() => {
    const loadMockSchedules = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500)); 
        
        // 원본 데이터를 mockData로 설정
        // 모든 일정은 일회성 (isRoutine: false)
        const initialSchedules = mockData.map(item => ({
             ...item,
             isRoutine: false // 일회성 일정
        }));
        setRawSchedules(initialSchedules); 
        setError(null);

      } catch (_err:unknown) {
        console.error("스케줄 로드 중 오류 발생:", _err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    loadMockSchedules();
  }, []);

  useEffect(() => {
    const processedSchedules = groupSchedulesByDay(rawSchedules);
    setGroupedSchedules(processedSchedules);
  }, [rawSchedules]);

  // --- CRUD 함수들 (변경 없음) ---
  const addSchedule = useCallback(async (newScheduleData: Omit<ApiSchedule, 'id' | 'isRoutine'>) => {
    console.log("Adding one-off schedule:", newScheduleData);
    const newSchedule: ApiSchedule = {
      ...newScheduleData,
      id: Math.floor(Math.random() * 10000) + 1000, 
      isRoutine: false, // 일회성 일정
    };
    setRawSchedules(prevSchedules => [...prevSchedules, newSchedule]);
  }, []);

  const updateSchedule = useCallback(async (updatedSchedule: ApiSchedule) => {
    console.log("Updating schedule:", updatedSchedule);
    setRawSchedules(prevSchedules => 
      prevSchedules.map(schedule => 
        schedule.id === updatedSchedule.id ? updatedSchedule : schedule
      )
    );
  }, []);

  const deleteSchedule = useCallback(async (id: number) => {
    console.log("Deleting schedule ID:", id);
    setRawSchedules(prevSchedules => 
      prevSchedules.filter(schedule => schedule.id !== id)
    );
  }, []);

  // Context 값에 rawSchedules 추가
  const value = { 
    rawSchedules, 
    schedules: groupedSchedules, 
    loading, 
    error, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule 
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};

// 커스텀 훅
export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
