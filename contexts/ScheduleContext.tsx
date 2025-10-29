import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback
} from 'react';

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

// --- 수정된 Mock Data (Hex 코드 적용) ---
const mockData: ApiSchedule[] = [
  // 10월 29일 (수)
  { id: 101, date: '2025-10-29', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 102, date: '2025-10-29', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 103, date: '2025-10-29', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 104, date: '2025-10-29', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 105, date: '2025-10-29', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },

  // 10월 30일 (목) - 반복
  { id: 106, date: '2025-10-30', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 107, date: '2025-10-30', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 108, date: '2025-10-30', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 109, date: '2025-10-30', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 110, date: '2025-10-30', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },

  // 10월 31일 (금) - 반복
  { id: 111, date: '2025-10-31', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 112, date: '2025-10-31', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 113, date: '2025-10-31', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 114, date: '2025-10-31', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 115, date: '2025-10-31', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },

  // 11월 1일 (토) - 반복
  { id: 116, date: '2025-11-01', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 117, date: '2025-11-01', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 118, date: '2025-11-01', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 119, date: '2025-11-01', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 120, date: '2025-11-01', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // 11월 2일 (일) - 반복
  { id: 121, date: '2025-11-02', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 122, date: '2025-11-02', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 123, date: '2025-11-02', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 124, date: '2025-11-02', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 125, date: '2025-11-02', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },

  // 11월 3일 (월) - 반복
  { id: 126, date: '2025-11-03', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 127, date: '2025-11-03', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 128, date: '2025-11-03', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 129, date: '2025-11-03', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 130, date: '2025-11-03', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // 11월 4일 (화) - 반복
  { id: 131, date: '2025-11-04', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 132, date: '2025-11-04', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 133, date: '2025-11-04', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 134, date: '2025-11-04', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 135, date: '2025-11-04', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // --- 2주차 (11월 5일 ~ 11월 11일) ---

  // 11월 5일 (수) - 반복
  { id: 136, date: '2025-11-05', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 137, date: '2025-11-05', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 138, date: '2025-11-05', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 139, date: '2025-11-05', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 140, date: '2025-11-05', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // 11월 6일 (목) - 반복
  { id: 141, date: '2025-11-06', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 142, date: '2025-11-06', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 143, date: '2025-11-06', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 144, date: '2025-11-06', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 145, date: '2025-11-06', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // 11월 7일 (금) - 반복
  { id: 146, date: '2025-11-07', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 147, date: '2025-11-07', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 148, date: '2025-11-07', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 149, date: '2025-11-07', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 150, date: '2025-11-07', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },

  // 11월 8일 (토) - 반복
  { id: 151, date: '2025-11-08', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 152, date: '2025-11-08', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 153, date: '2025-11-08', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 154, date: '2025-11-08', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 155, date: '2025-11-08', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // 11월 9일 (일) - 반복
  { id: 156, date: '2025-11-09', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 157, date: '2025-11-09', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 158, date: '2025-11-09', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 159, date: '2025-11-09', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 160, date: '2025-11-09', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },

  // 11월 10일 (월) - 반복
  { id: 161, date: '2025-11-10', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 162, date: '2025-11-10', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 163, date: '2025-11-10', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 164, date: '2025-11-10', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 165, date: '2025-11-10', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
  
  // 11월 11일 (화) - 반복
  { id: 166, date: '2025-11-11', startTime: '07:30:00', endTime: '08:00:00', title: '아침 식사 및 준비', color: '#9B9B9B', location: '집' },
  { id: 167, date: '2025-11-11', startTime: '09:00:00', endTime: '12:00:00', title: '오전 집중 공부', color: '#4D96FF', location: '도서관 1열람실' },
  { id: 168, date: '2025-11-11', startTime: '13:00:00', endTime: '14:00:00', title: '점심 식사 및 휴식', color: '#6BCB77', location: '학생식당' },
  { id: 169, date: '2025-11-11', startTime: '15:00:00', endTime: '17:00:00', title: '오후 과제 처리', color: '#9370DB', location: '스터디 카페' },
  { id: 170, date: '2025-11-11', startTime: '20:00:00', endTime: '21:00:00', title: '저녁 운동 (산책/스트레칭)', color: '#FF6EC7', location: '공원 트랙' },
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
        // 루틴/일회성 구분을 위해 isRoutine 플래그 추가
        const initialSchedules = mockData.map(item => ({
             ...item,
             isRoutine: item.id < 300 // 예시: ID 기반으로 루틴 구분
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
