import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// 타입 정의
interface Schedule {
  id: number;
  scheName: string;
  scheStartTime: Date;
  scheEndTime: Date;
  schePlace: string;
  date: string;
  isUnfamiliar?: boolean,
  color?: string;
}

interface ScheduleState {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  todaySchedule: Schedule | null;
  todaySchedules: Schedule[];
  weekSchedules: Schedule[];
}

interface ScheduleContextType extends ScheduleState {
  fetchSchedules: () => Promise<void>;
  updateSchedule: (id: number, updates: Partial<Schedule>) => void;
  addSchedule: (schedule: Omit<Schedule, 'id'>) => void;
  deleteSchedule: (id: number) => void;
  setTodaySchedule: (schedule: Schedule | null) => void;
}

interface ScheduleProviderProps {
  children: ReactNode;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// 초기 상태
const initialState: ScheduleState = {
  schedules: [],
  loading: false,
  error: null,
  todaySchedule: null,
  todaySchedules: [],
  weekSchedules: [],
};

// Action 타입 정의
type ScheduleAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_SCHEDULES'; payload: Schedule[] }
  | { type: 'SET_TODAY_SCHEDULE'; payload: Schedule | null }
  | { type: 'SET_TODAY_SCHEDULES'; payload: Schedule[] }
  | { type: 'SET_WEEK_SCHEDULES'; payload: Schedule[] }
  | { type: 'UPDATE_SCHEDULE'; payload: { id: number; updates: Partial<Schedule> } }
  | { type: 'ADD_SCHEDULE'; payload: Schedule }
  | { type: 'DELETE_SCHEDULE'; payload: number }

// Reducer 함수
const scheduleReducer = (state: ScheduleState, action: ScheduleAction): ScheduleState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_SCHEDULES':
      return { 
        ...state, 
        schedules: action.payload, 
        loading: false, 
        error: null 
      };
    
    case 'SET_TODAY_SCHEDULE':
      return { ...state, todaySchedule: action.payload };

    case 'SET_TODAY_SCHEDULES':
      return { ...state, todaySchedules: action.payload };
    
    case 'SET_WEEK_SCHEDULES':
      return { ...state, weekSchedules: action.payload };
    
    case 'UPDATE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.map(schedule =>
          schedule.id === action.payload.id
            ? { ...schedule, ...action.payload.updates }
            : schedule
        )
      };
    
    case 'ADD_SCHEDULE':
      return {
        ...state,
        schedules: [...state.schedules, action.payload]
      };
    
    case 'DELETE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.filter(schedule => schedule.id !== action.payload)
      };
     
    default:
      return state;
  }
};

// Context 공유를 위한 Provider 컴포넌트
export const ScheduleProvider: React.FC<ScheduleProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);

  // 일정 데이터 가져오기
  const fetchSchedules = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // TODO: 실제 API 호출로 교체
      // const response = await api.getSchedules();
      // const data = await response.json();
      
      // 임시 데이터 (나중에 서버 데이터로)
      const mockData: Schedule[] = [
        {
          id: 1,
          scheName: '알바',
          scheStartTime: new Date('2025-10-16T09:30:00'),
          scheEndTime: new Date('2025-10-16T10:30:00'),
          schePlace: '맥도날드',
          date: '2025-10-16',
          color: '#FF6B6B',
          isUnfamiliar: false,
        },
        {
          id: 2,
          scheName: '수업',
          scheStartTime: new Date('2025-10-16T14:00:00'),
          scheEndTime: new Date('2025-10-16T16:00:00'),
          schePlace: '대학교',
          date: '2025-10-16',
          color: '#d2a800ff',
          isUnfamiliar: true,
        }
      ];
      
      dispatch({ type: 'SET_SCHEDULES', payload: mockData });
      
      // 오늘 일정 설정
      const today = new Date().toISOString().split('T')[0];
      const todaySchedules = mockData.filter(schedule => schedule.date === today);
      dispatch({ type: 'SET_TODAY_SCHEDULE', payload: todaySchedules[0] || null });
      dispatch({ type: 'SET_TODAY_SCHEDULES', payload: todaySchedules });
      
      // 주간 일정 설정
      dispatch({ type: 'SET_WEEK_SCHEDULES', payload: mockData });
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' });
    }
  };

  // 일정 업데이트
  const updateSchedule = (id: number, updates: Partial<Schedule>): void => {
    dispatch({ type: 'UPDATE_SCHEDULE', payload: { id, updates } });
  };

  // 일정 추가
  const addSchedule = (schedule: Omit<Schedule, 'id'>): void => {
    dispatch({ type: 'ADD_SCHEDULE', payload: { ...schedule, id: Date.now() } });
  };

  // 일정 삭제
  const deleteSchedule = (id: number): void => {
    dispatch({ type: 'DELETE_SCHEDULE', payload: id });
  };

  const setTodaySchedule = (schedule: Schedule | null): void => {
  dispatch({ type: 'SET_TODAY_SCHEDULE', payload: schedule });
  };


  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchSchedules();
  }, []);

  const value: ScheduleContextType = {
    ...state,
    fetchSchedules,
    updateSchedule,
    addSchedule,
    deleteSchedule,
    setTodaySchedule,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};

// Custom Hook
export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

export default ScheduleContext;
