import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { UserRole } from './AuthContext';
import { IconKey } from '../constants/iconCatalog';
import {
  getAdminProfile,
  createAdminProfile,
  updateAdminProfile,
  deleteAdminProfile,
  AdminProfile,
  CreateAdminProfileRequest,
  UpdateAdminProfileRequest,
} from '../services/adminApi';

// 감정 기록 타입
export interface EmotionLog {
  id: string;
  feeling: string; // 최종 피드백 감정
  initialMood?: string | null; // 첫 페이지에서 선택한 초기 기분 이모지
  situationText?: string | null;
  feedback?: string | null;
  category?: string | null; // ENV, BODY, ACT, COMM, MIND, MISC
  categoryLabel?: string | null; // '주변 때문에 힘들어요' 등
  action?: string | null; // 선택한 행동 (예: '심호흡하기')
  actionEmojis?: string | null; // 행동 이모지
  createdAt: string;
}

export interface MemberTrait {
  id: string;
  situation: string; // 기존 호환성 유지
  strategy: string; // 기존 호환성 유지
  lastUpdatedAt: string;
  // 새로운 필드들
  traitType?: '감각' | '인지'; // 특성 종류
  sense?: '시각' | '청각' | '미각' | '후각' | '촉각' | '운동감각'; // 감각 종류
  time?: string; // 언제 나타나나요 (인지)
  place?: string; // 주로 어디에서 일어나나요 (인지)
  target?: string; // 누구와 있을 때 나타나나요 (인지)
  trigger?: string; // 어떤 상황에서 나타나나요
  description?: string; // 이 상황에서 어떻게 행동하나요
  soothingAction?: string; // 불안할 때 무엇을 하면 괜찮아지나요
}

// 조직 타입
export interface SafetyGuideline {
  id: string;
  text: string;
  imageKey: IconKey;
  imageUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface Organization {
  id: number;
  name: string;
  adminName: string;
  adminEmail: string;
  adminPhoto?: string;
  companyImageKey?: IconKey;
  companyImageUrl?: string;
  safetyGuidelines: SafetyGuideline[];
}

// 멤버 타입
export interface Member {
  id: number;
  email: string;
  name: string;
  organizationId: number | null;
  role: UserRole;
  department?: string; // 부서명
  avatarUrl?: string;
  lastEmotion?: string;
  lastEmotionAt?: string;
  lastFeedback?: string;
  safetyAcknowledged?: boolean;
  lastSafetyAckAt?: string;
  lastSafetyReminderAt?: string;
  emotionHistory?: EmotionLog[];
  traits?: MemberTrait[];
  reminderMode?: 'daily' | 'interval';
  reminderTime?: string;
  reminderIntervalHours?: number;
  lastEmotionReminderAt?: string;
  showSafetyModalOnWorkTab?: boolean;
  lastScheduleUpdateAt?: string; // 스케줄 업데이트 알림 시간
}

// 관리자 컨텍스트 타입
interface AdminContextType {
  organizations: Organization[];
  members: Member[];
  loading: boolean;
  error: string | null;
  addOrganization: (name: string, adminName: string, adminEmail: string) => Promise<Organization | null>;
  assignMemberToOrganization: (email: string, organizationName: string, memberName?: string) => Promise<boolean>;
  getOrganizationByMemberEmail: (email: string) => Organization | null;
  getMemberByEmail: (email: string) => Member | null;
  updateMemberStatus: (email: string, updates: Partial<Member>) => void;
  updateOrganization: (id: number, updates: Partial<Organization>) => void;
  logMemberEmotion: (email: string, log: EmotionLog) => void;
  // Traits CRUD
  addMemberTrait: (email: string, trait: Omit<MemberTrait, 'id' | 'lastUpdatedAt'>) => void;
  updateMemberTrait: (email: string, traitId: string, updates: Partial<Omit<MemberTrait, 'id'>>) => void;
  deleteMemberTrait: (email: string, traitId: string) => void;
  // 관리자 프로필 API
  fetchAdminProfile: () => Promise<AdminProfile | null>;
  createAdminProfileApi: (profile: CreateAdminProfileRequest) => Promise<AdminProfile | null>;
  updateAdminProfileApi: (id: number, updates: UpdateAdminProfileRequest) => Promise<AdminProfile | null>;
  deleteAdminProfileApi: (id: number) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Mock 데이터: 기존 조직들
const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: '토닥이 기업',
    adminName: '김관리',
    adminEmail: 'admin@todaki.com',
    companyImageKey: 'hugIcon',
    safetyGuidelines: [
      { id: 'rule-1', text: '작업 전 안전장비를 꼭 착용해요.', imageKey: 'hugIcon', mediaType: 'image' },
      { id: 'rule-2', text: '무거운 기계는 혼자 만지지 않아요.', imageKey: 'hugIcon', mediaType: 'image' },
      { id: 'rule-3', text: '불이 나면 가장 가까운 문으로 천천히 나가요.', imageKey: 'hugIcon', mediaType: 'image' },
      { id: 'rule-4', text: '다치면 바로 관리자에게 알려요.', imageKey: 'hugIcon', mediaType: 'image' },
    ],
  },
  {
    id: 2,
    name: '안전제일 회사',
    adminName: '이안전',
    adminEmail: 'safety@company.com',
    companyImageKey: 'hugIcon',
    safetyGuidelines: [
      { id: 'rule-5', text: '출입증을 목에 걸고 들어와요.', imageKey: 'hugIcon', mediaType: 'image' },
      { id: 'rule-6', text: '바닥의 흰 줄을 따라 이동해요.', imageKey: 'hugIcon', mediaType: 'image' },
      { id: 'rule-7', text: '화학물질을 만질 때 장갑을 꼭 껴요.', imageKey: 'hugIcon', mediaType: 'image' },
      { id: 'rule-8', text: '위험하면 "119"로 바로 전화해요.', imageKey: 'hugIcon', mediaType: 'image' },
    ],
  },
];

// Mock 데이터: 기존 멤버들
const mockMembers: Member[] = [
  {
    id: 1,
    email: 'user1@todaki.com',
    name: '홍길동',
    organizationId: 1,
    role: '기업 재직자',
    department: '생산팀',
    safetyAcknowledged: false,
    reminderMode: 'daily',
    reminderTime: '09:00',
    reminderIntervalHours: 4,
    traits: [
      {
        id: 'trait-user1-1',
        situation: '사람이 많이 모여서 시끄러울 때',
        strategy: '잠깐 귀를 막고 관리자에게 조용한 곳으로 가고 싶다고 말해요.',
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
    emotionHistory: [
      {
        id: 'log-1',
        feeling: '😊',
        initialMood: '😟',
        situationText: '시끄러운 환경에서 일해야 했어요',
        feedback: '😊',
        category: 'ENV',
        categoryLabel: '주변 때문에 힘들어요',
        action: '이어폰이나 귀마개를 끼기',
        actionEmojis: '🎧',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      },
      {
        id: 'log-2',
        feeling: '😐',
        initialMood: '😢',
        situationText: '작업 순서가 갑자기 바뀌었어요',
        feedback: '😐',
        category: 'ACT',
        categoryLabel: '해야 하는 일이 힘들어요',
        action: '잠깐 조용한 곳으로 이동하기',
        actionEmojis: '🚶',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
      },
      {
        id: 'log-3',
        feeling: '😟',
        initialMood: '😭',
        situationText: '새로운 사람들과 대화해야 했어요',
        feedback: '😟',
        category: 'COMM',
        categoryLabel: '대화가\n힘들어요',
        action: '입으로 천천히 숨쉬기',
        actionEmojis: '😮💨',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 전
      },
    ],
  },
  {
    id: 2,
    email: 'user2@company.com',
    name: '김철수',
    organizationId: 2,
    role: '기업 재직자',
    department: '품질관리팀',
    safetyAcknowledged: false,
    reminderMode: 'interval',
    reminderIntervalHours: 3,
    traits: [
      {
        id: 'trait-user2-1',
        situation: '작업 순서가 갑자기 바뀔 때',
        strategy: '숨을 세 번 쉬고 담당자에게 다시 한 번 설명해 달라고 부탁해요.',
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
    emotionHistory: [],
  },
];

const generateGuidelineId = () => `guide-${Math.random().toString(36).slice(2, 8)}`;

const createDefaultGuidelines = (): SafetyGuideline[] => [
  { id: generateGuidelineId(), text: '기본 안전 수칙을 지켜요.', imageKey: 'hugIcon', mediaType: 'image' },
  { id: generateGuidelineId(), text: '작업 전 몸 상태를 확인해요.', imageKey: 'hugIcon', mediaType: 'image' },
  { id: generateGuidelineId(), text: '위험하면 즉시 관리자에게 알려요.', imageKey: 'hugIcon', mediaType: 'image' },
  { id: generateGuidelineId(), text: '안전하게 일해요.', imageKey: 'hugIcon', mediaType: 'image' },
];

// Provider 컴포넌트
export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [organizations, setOrganizations] = useState<Organization[]>(mockOrganizations);
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 조직 추가 (관리자가 새 조직을 등록)
  const addOrganization = useCallback(
    async (name: string, adminName: string, adminEmail: string): Promise<Organization | null> => {
      setLoading(true);
      setError(null);

      try {
        // API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 조직 이름 중복 체크
        const existingOrg = organizations.find((org) => org.name === name);
        if (existingOrg) {
          setError('이미 존재하는 조직 이름입니다.');
          setLoading(false);
          return null;
        }

        // 새 조직 생성
        const newOrganization: Organization = {
          id: organizations.length + 1,
          name,
          adminName,
          adminEmail,
          companyImageKey: 'hugIcon',
          safetyGuidelines: createDefaultGuidelines(),
        };

        setOrganizations((prev) => [...prev, newOrganization]);
        setLoading(false);
        return newOrganization;
      } catch (err) {
        console.error('조직 추가 중 오류:', err);
        setError('조직을 추가하는 중 오류가 발생했습니다.');
        setLoading(false);
        return null;
      }
    },
    [organizations],
  );

  // 멤버를 조직에 할당
  const assignMemberToOrganization = useCallback(
    async (email: string, organizationName: string, memberName?: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        // API 호출 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 조직 찾기
        const organization = organizations.find((org) => org.name === organizationName);
        if (!organization) {
          setError('존재하지 않는 조직 이름입니다.');
          setLoading(false);
          return false;
        }

        // 멤버 찾기 또는 생성
        const existingMember = members.find((member) => member.email === email);
        if (existingMember) {
          setMembers((prev) =>
            prev.map((member) =>
              member.id === existingMember.id
                ? {
                    ...member,
                    organizationId: organization.id,
                    name: memberName || member.name,
                    role: member.role || '기업 재직자',
                    reminderMode: member.reminderMode || 'daily',
                    reminderTime: member.reminderTime || '09:00',
                    reminderIntervalHours: member.reminderIntervalHours || 4,
                  }
                : member,
            ),
          );
        } else {
          const newMember: Member = {
            id: members.length + 1,
            email,
            name: memberName || email.split('@')[0],
            organizationId: organization.id,
            role: '기업 재직자',
            safetyAcknowledged: false,
            reminderMode: 'daily',
            reminderTime: '09:00',
            reminderIntervalHours: 4,
            emotionHistory: [],
          };
          setMembers((prev) => [...prev, newMember]);
        }

        setLoading(false);
        return true;
      } catch (err) {
        console.error('멤버 할당 중 오류:', err);
        setError('멤버를 할당하는 중 오류가 발생했습니다.');
        setLoading(false);
        return false;
      }
    },
    [organizations, members],
  );

  // 이메일로 멤버의 조직 찾기
  const getOrganizationByMemberEmail = useCallback(
    (email: string): Organization | null => {
      const member = members.find((m) => m.email === email);
      if (!member || !member.organizationId) {
        return null;
      }
      return organizations.find((org) => org.id === member.organizationId) || null;
    },
    [members, organizations],
  );

  // 이메일로 멤버 찾기
  const getMemberByEmail = useCallback(
    (email: string): Member | null => {
      return members.find((m) => m.email === email) || null;
    },
    [members],
  );

  const updateMemberStatus = useCallback(
    (email: string, updates: Partial<Member>) => {
      setMembers((prev) => {
        const existingMember = prev.find((m) => m.email === email);
        if (existingMember) {
          // 기존 멤버 업데이트
          return prev.map((member) =>
            member.email === email ? { ...member, ...updates } : member,
          );
        } else {
          // 새로운 멤버 생성 (일반 사용자용)
          const newMember: Member = {
            id: updates.id || prev.length + 1,
            email: email,
            name: updates.name || email.split('@')[0],
            organizationId: updates.organizationId ?? null,
            role: (updates.role || '일반 사용자') as UserRole,
            traits: updates.traits || [],
            emotionHistory: [],
            ...updates,
          };
          return [...prev, newMember];
        }
      });
    },
    [],
  );

  const updateOrganization = useCallback((id: number, updates: Partial<Organization>) => {
    setOrganizations((prev) =>
      prev.map((org) => (org.id === id ? { ...org, ...updates } : org)),
    );
  }, []);

  const logMemberEmotion = useCallback(
    (email: string, log: EmotionLog) => {
      setMembers((prev) =>
        prev.map((member) => {
          if (member.email !== email) return member;
          const history = member.emotionHistory || [];
          const updatedHistory = [log, ...history].slice(0, 10);
          return {
            ...member,
            lastEmotion: log.feeling,
            lastEmotionAt: log.createdAt,
            lastFeedback: log.feedback ?? member.lastFeedback,
            emotionHistory: updatedHistory,
          };
        }),
      );
    },
    [],
  );

  // Traits CRUD 함수들
  const addMemberTrait = useCallback((email: string, trait: Omit<MemberTrait, 'id' | 'lastUpdatedAt'>) => {
    setMembers((prev) => {
      const existingMember = prev.find((member) => member.email === email);
      if (existingMember) {
        // 기존 멤버가 있으면 업데이트
        return prev.map((member) => {
        if (member.email !== email) return member;
        const newTrait: MemberTrait = {
          id: `trait-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...trait,
          lastUpdatedAt: new Date().toISOString(),
        };
        const existingTraits = member.traits || [];
        return {
          ...member,
          traits: [...existingTraits, newTrait],
        };
        });
      } else {
        // 기존 멤버가 없으면 새로 생성
        const newTrait: MemberTrait = {
          id: `trait-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...trait,
          lastUpdatedAt: new Date().toISOString(),
        };
        const newMember: Member = {
          id: prev.length + 1,
          email,
          name: email.split('@')[0],
          organizationId: null,
          role: '일반 사용자',
          traits: [newTrait],
          emotionHistory: [],
        };
        return [...prev, newMember];
      }
    });
  }, []);

  const updateMemberTrait = useCallback(
    (email: string, traitId: string, updates: Partial<Omit<MemberTrait, 'id'>>) => {
      setMembers((prev) => {
        const existingMember = prev.find((member) => member.email === email);
        if (existingMember) {
          // 기존 멤버가 있으면 업데이트
          return prev.map((member) => {
          if (member.email !== email) return member;
          const traits = (member.traits || []).map((trait) =>
            trait.id === traitId
              ? { ...trait, ...updates, lastUpdatedAt: new Date().toISOString() }
              : trait,
          );
          return {
            ...member,
            traits,
          };
          });
        }
        // 기존 멤버가 없으면 아무것도 하지 않음 (수정은 기존 데이터가 있어야 함)
        return prev;
      });
    },
    [],
  );

  const deleteMemberTrait = useCallback((email: string, traitId: string) => {
    setMembers((prev) => {
      const existingMember = prev.find((member) => member.email === email);
      if (existingMember) {
        // 기존 멤버가 있으면 업데이트
        return prev.map((member) => {
        if (member.email !== email) return member;
        const traits = (member.traits || []).filter((trait) => trait.id !== traitId);
        return {
          ...member,
          traits,
        };
        });
      }
      // 기존 멤버가 없으면 아무것도 하지 않음 (삭제는 기존 데이터가 있어야 함)
      return prev;
    });
  }, []);

  // 관리자 프로필 API 함수들
  const fetchAdminProfile = useCallback(async (): Promise<AdminProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getAdminProfile();
      setLoading(false);
      return profile;
    } catch (err: any) {
      const errorMessage = err?.message || '관리자 프로필 조회 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
      console.error('관리자 프로필 조회 오류:', err);
      return null;
    }
  }, []);

  const createAdminProfileApi = useCallback(
    async (profile: CreateAdminProfileRequest): Promise<AdminProfile | null> => {
      setLoading(true);
      setError(null);
      try {
        const newProfile = await createAdminProfile(profile);
        setLoading(false);
        return newProfile;
      } catch (err: any) {
        const errorMessage = err?.message || '관리자 프로필 생성 중 오류가 발생했습니다.';
        setError(errorMessage);
        setLoading(false);
        console.error('관리자 프로필 생성 오류:', err);
        return null;
      }
    },
    [],
  );

  const updateAdminProfileApi = useCallback(
    async (id: number, updates: UpdateAdminProfileRequest): Promise<AdminProfile | null> => {
      setLoading(true);
      setError(null);
      try {
        const updatedProfile = await updateAdminProfile(id, updates);
        setLoading(false);
        return updatedProfile;
      } catch (err: any) {
        const errorMessage = err?.message || '관리자 프로필 수정 중 오류가 발생했습니다.';
        setError(errorMessage);
        setLoading(false);
        console.error('관리자 프로필 수정 오류:', err);
        return null;
      }
    },
    [],
  );

  const deleteAdminProfileApi = useCallback(
    async (id: number): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const success = await deleteAdminProfile(id);
        setLoading(false);
        return success;
      } catch (err: any) {
        const errorMessage = err?.message || '관리자 프로필 삭제 중 오류가 발생했습니다.';
        setError(errorMessage);
        setLoading(false);
        console.error('관리자 프로필 삭제 오류:', err);
        return false;
      }
    },
    [],
  );

  const value = {
    organizations,
    members,
    loading,
    error,
    addOrganization,
    assignMemberToOrganization,
    getOrganizationByMemberEmail,
    getMemberByEmail,
    updateMemberStatus,
    updateOrganization,
    logMemberEmotion,
    addMemberTrait,
    updateMemberTrait,
    deleteMemberTrait,
    fetchAdminProfile,
    createAdminProfileApi,
    updateAdminProfileApi,
    deleteAdminProfileApi,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

// 커스텀 훅
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

