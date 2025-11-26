import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import { useAdmin, Member, MemberTrait } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import { useSchedule } from '../contexts/ScheduleContext';
import { useWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import { Picker } from '@react-native-picker/picker';
import FeatherIcon from 'react-native-vector-icons/Feather';
import ScheduleModal from '../components/ScheduleModal';
import RoutineScheduleModal from '../components/RoutineScheduleModal';
import TraitEditModal from '../components/TraitEditModal';
import { getUnreadChanges, getChanges, ChangeLog } from '../services/changesApi';

type EmployeeStackParamList = {
  EmployeeList: undefined;
  EmotionReport: { employeeEmail?: string; employeeName?: string };
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '기록 없음';
  try {
    const date = new Date(value);
    return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '기록 없음';
  }
};

// 가나다 순 정렬 함수
const sortKorean = (a: string, b: string) => {
  return a.localeCompare(b, 'ko');
};

const EmployeeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<EmployeeStackParamList>>();
  const { organizations, members, updateMemberStatus, addMemberTrait, updateMemberTrait, deleteMemberTrait } = useAdmin();
  const { userRole } = useAuth();
  const { rawSchedules } = useSchedule();
  const { rawWeeklySchedules } = useWeeklySchedule();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Member | null>(null);
  const [traitEditModalVisible, setTraitEditModalVisible] = useState(false);
  const [editingTrait, setEditingTrait] = useState<MemberTrait | null>(null);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [traitToDelete, setTraitToDelete] = useState<string | null>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isRoutineSchedule, setIsRoutineSchedule] = useState(false);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);

  const isAdmin = userRole === '관리자';
  const isEmployee = userRole === '기업 재직자';
  const currentOrganization = organizations[0] || null;

  // TTS 완료 이벤트 리스너
  useEffect(() => {
    TTS.addEventListener('tts-finish', () => {
      setSpeakingSection(null);
    });
    TTS.addEventListener('tts-cancel', () => {
      setSpeakingSection(null);
    });
  }, []);

  // 부서 목록 가져오기 (가나다 순 정렬)
  const departments = useMemo(() => {
    if (!currentOrganization) return [];
    const deptSet = new Set<string>();
    members
      .filter(
        (m) =>
          m.organizationId === currentOrganization.id &&
          m.role === '기업 재직자' &&
          m.department
      )
      .forEach((m) => {
        if (m.department) deptSet.add(m.department);
      });
    return Array.from(deptSet).sort(sortKorean);
  }, [members, currentOrganization]);

  // 선택된 부서의 직원 목록 (가나다 순 정렬)
  const employees = useMemo(() => {
    if (!currentOrganization) return [];
    const dept = selectedDepartment || departments[0] || '';
    return members
      .filter(
        (m) =>
          m.organizationId === currentOrganization.id &&
          m.role === '기업 재직자' &&
          m.department === dept
      )
      .sort((a, b) => sortKorean(a.name, b.name));
  }, [members, currentOrganization, selectedDepartment, departments]);

  // 초기 부서 선택
  React.useEffect(() => {
    if (departments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  // 감정 기록 정렬 (최신순, 불안한 감정-취한 행동 순)
  const sortedEmotionHistory = useMemo(() => {
    if (!selectedEmployee?.emotionHistory) return [];
    const negativeEmotions = ['😰', '😨', '😱', '😢', '😞', '😟', '😔', '😕', '😖', '😫', '😩'];
    return [...selectedEmployee.emotionHistory].sort((a, b) => {
      const aIsNegative = negativeEmotions.some((emoji) => a.feeling.includes(emoji));
      const bIsNegative = negativeEmotions.some((emoji) => b.feeling.includes(emoji));
      
      // 불안한 감정을 먼저
      if (aIsNegative && !bIsNegative) return -1;
      if (!aIsNegative && bIsNegative) return 1;
      
      // 최신순
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [selectedEmployee]);

  const handleEmployeePress = (employee: Member) => {
    setSelectedEmployee(employee);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
  };

  const handleAddTrait = () => {
    setEditingTrait(null);
    setTraitEditModalVisible(true);
  };

  const handleEditTrait = (trait: MemberTrait) => {
    setEditingTrait(trait);
    setTraitEditModalVisible(true);
  };

  const handleDeleteTrait = (traitId: string) => {
    if (!selectedEmployee) return;
    setTraitToDelete(traitId);
    setDeleteConfirmModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedEmployee || !traitToDelete) return;
    deleteMemberTrait(selectedEmployee.email, traitToDelete);
    setDeleteConfirmModalVisible(false);
    setTraitToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModalVisible(false);
    setTraitToDelete(null);
  };

  const handleSendSafetyReminder = () => {
    if (!selectedEmployee) return;
    updateMemberStatus(selectedEmployee.email, {
      lastSafetyReminderAt: new Date().toISOString(),
      safetyAcknowledged: false,
    });
    Alert.alert('알림 보냄', '안전 수칙 알림을 보냈어요.');
  };

  // 해당 직원의 스케줄 필터링 (이메일 기반, 현재는 모든 스케줄 표시)
  const employeeSchedules = useMemo(() => {
    if (!selectedEmployee) return [];
    // 실제로는 selectedEmployee.email과 연결된 스케줄을 필터링해야 함
    // 현재는 모든 일회성 스케줄을 표시
    return rawSchedules;
  }, [rawSchedules, selectedEmployee]);

  const employeeRoutineSchedules = useMemo(() => {
    if (!selectedEmployee) return [];
    // 실제로는 selectedEmployee.email과 연결된 루틴 스케줄을 필터링해야 함
    // 현재는 모든 루틴 스케줄을 표시
    return rawWeeklySchedules;
  }, [rawWeeklySchedules, selectedEmployee]);

  const handleEditSchedule = (schedule: any, isRoutine: boolean) => {
    setSelectedSchedule(schedule);
    setIsRoutineSchedule(isRoutine);
    setScheduleModalVisible(true);
  };

  // 선택된 직원의 변경사항 조회 (모든 변경사항 조회로 변경하여 읽음 상태 확인)
  useEffect(() => {
    const fetchChanges = async () => {
      if (!selectedEmployee?.id || !isAdmin) {
        setChangeLogs([]);
        return;
      }

      try {
        // 모든 변경사항 조회 (읽음/안 읽음 모두)
        const changes = await getChanges(selectedEmployee.id);
        setChangeLogs(changes);
      } catch (error) {
        console.error('변경사항 조회 오류:', error);
        setChangeLogs([]);
      }
    };

    fetchChanges();
  }, [selectedEmployee?.id, isAdmin]);

  // 스케줄의 변경사항 읽음 상태 확인
  const getScheduleChangeStatus = useMemo(() => {
    return (scheduleId: number, fieldName?: string): 'read' | 'unread' | null => {
      if (!isAdmin || changeLogs.length === 0) return null;

      // category가 "근무 스케줄"이고 해당 스케줄과 관련된 변경사항 찾기
      // fieldName이 있으면 정확히 매칭, 없으면 모든 변경사항 확인
      const relevantChanges = changeLogs.filter(
        (log) =>
          log.category === '근무 스케줄' &&
          (!fieldName || log.fieldName === fieldName),
      );

      if (relevantChanges.length === 0) return null;

      // 읽지 않은 변경사항이 있으면 unread, 모두 읽었으면 read
      const hasUnread = relevantChanges.some((log) => !log.isRead);
      return hasUnread ? 'unread' : 'read';
    };
  }, [changeLogs, isAdmin]);

  // 변경사항 읽음 표시 (필요 시 사용)
  // const handleMarkChangesAsRead = async (changeLogIds: number[]) => {
  //   if (!selectedEmployee?.id || changeLogIds.length === 0) return;

  //   try {
  //     await markChangesAsRead({
  //       changeLogIds,
  //       memberId: selectedEmployee.id,
  //     });
      
  //     // 변경사항 목록 업데이트
  //     setChangeLogs((prev) =>
  //       prev.map((log) =>
  //         changeLogIds.includes(log.changeLogId)
  //           ? { ...log, isRead: true }
  //           : log,
  //       ),
  //     );
  //   } catch (error) {
  //     console.error('변경사항 읽음 표시 오류:', error);
  //     Alert.alert('오류', '변경사항 읽음 표시에 실패했습니다.');
  //   }
  // };

  if (!isAdmin || !currentOrganization) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>접근 권한이 없습니다.</Text>
      </View>
    );
  }

  // 직원 상세 화면
  if (selectedEmployee) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <FeatherIcon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>직원 상세</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 직원 프로필 */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                {selectedEmployee.avatarUrl ? (
                  <Image source={{ uri: selectedEmployee.avatarUrl }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Text style={styles.profilePlaceholderText}>
                      {selectedEmployee.name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              {isEmployee && (
                <TouchableOpacity
                  style={styles.ttsButton}
                  onPress={async () => {
                    if (speakingSection === 'profile') {
                      await stopSpeaking();
                      setSpeakingSection(null);
                      return;
                    }
                    const profileText = `${selectedEmployee.name}. ${selectedEmployee.email}. ${selectedEmployee.department || '부서 정보 없음'}`;
                    setSpeakingSection('profile');
                    await speakText(profileText);
                  }}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={speakingSection === 'profile' ? 'volume-2' : 'volume-1'}
                    size={16}
                    color={speakingSection === 'profile' ? '#FFA000' : '#666'}
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.profileName}>{selectedEmployee.name}</Text>
            <Text style={styles.profileEmail}>{selectedEmployee.email}</Text>
            {selectedEmployee.department && (
              <Text style={styles.profileDepartment}>{selectedEmployee.department}</Text>
            )}
          </View>

          {/* 안전 수칙 확인 여부 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>안전 수칙 확인</Text>
              {isEmployee && (
                <TouchableOpacity
                  style={styles.ttsButton}
                  onPress={async () => {
                    if (speakingSection === 'safety') {
                      await stopSpeaking();
                      setSpeakingSection(null);
                      return;
                    }
                    const safetyText = `안전 수칙 확인. 확인 상태: ${selectedEmployee.safetyAcknowledged ? '확인 완료' : '미확인'}. ${selectedEmployee.lastSafetyAckAt ? `확인 시간: ${formatDateTime(selectedEmployee.lastSafetyAckAt)}` : '확인 시간 없음'}`;
                    setSpeakingSection('safety');
                    await speakText(safetyText);
                  }}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={speakingSection === 'safety' ? 'volume-2' : 'volume-1'}
                    size={16}
                    color={speakingSection === 'safety' ? '#FFA000' : '#666'}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>확인 상태</Text>
              <View
                style={[
                  styles.statusBadge,
                  selectedEmployee.safetyAcknowledged
                    ? styles.statusBadgeSuccess
                    : styles.statusBadgeWarning,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    selectedEmployee.safetyAcknowledged
                      ? styles.statusBadgeTextSuccess
                      : styles.statusBadgeTextWarning,
                  ]}
                >
                  {selectedEmployee.safetyAcknowledged ? '확인 완료' : '미확인'}
                </Text>
              </View>
            </View>
            {selectedEmployee.lastSafetyAckAt && (
              <Text style={styles.infoText}>
                확인 시간: {formatDateTime(selectedEmployee.lastSafetyAckAt)}
              </Text>
            )}
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={handleSendSafetyReminder}
            >
              <Text style={styles.reminderButtonText}>안전 수칙 알림 보내기</Text>
            </TouchableOpacity>
          </View>

          {/* 행동 특성 (상황 카드) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>행동 특성</Text>
              <View style={styles.cardHeaderRight}>
                {isEmployee && (
                  <TouchableOpacity
                    style={styles.ttsButton}
                    onPress={async () => {
                      if (speakingSection === 'traits') {
                        await stopSpeaking();
                        setSpeakingSection(null);
                        return;
                      }
                      if (!selectedEmployee.traits || selectedEmployee.traits.length === 0) {
                        setSpeakingSection('traits');
                        await speakText('행동 특성. 아직 행동 특성이 등록되지 않았습니다.');
                        return;
                      }
                      const traitTexts = selectedEmployee.traits.map((trait, index) => {
                        return `${index + 1}. ${trait.traitType || '기록 없음'} 특성`;
                      });
                      const fullText = `행동 특성. ${traitTexts.join('. ')}`;
                      setSpeakingSection('traits');
                      await speakText(fullText);
                    }}
                    activeOpacity={0.7}
                  >
                    <FeatherIcon
                      name={speakingSection === 'traits' ? 'volume-2' : 'volume-1'}
                      size={16}
                      color={speakingSection === 'traits' ? '#FFA000' : '#666'}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleAddTrait} style={styles.addButton}>
                  <Text style={styles.addButtonText}>+ 추가</Text>
                </TouchableOpacity>
              </View>
            </View>
            {selectedEmployee.traits && selectedEmployee.traits.length > 0 ? (
              selectedEmployee.traits.map((trait) => (
                <View key={trait.id} style={styles.traitCard}>
                  <View style={styles.traitContent}>
                    {trait.traitType ? (
                      <>
                        <Text style={styles.traitLabel}>특성 종류: {trait.traitType}</Text>
                        {trait.traitType === '감각' && trait.sense && (
                          <Text style={styles.traitValue}>감각: {trait.sense}</Text>
                        )}
                        {trait.traitType === '인지' && (
                          <>
                            {trait.time && <Text style={styles.traitValue}>시간: {trait.time}</Text>}
                            {trait.place && <Text style={styles.traitValue}>장소: {trait.place}</Text>}
                            {trait.target && <Text style={styles.traitValue}>대상: {trait.target}</Text>}
                          </>
                        )}
                        {trait.trigger && (
                          <>
                            <Text style={[styles.traitLabel, styles.traitLabelWithMargin]}>어떤 상황인가요?</Text>
                            <Text style={styles.traitValue}>{trait.trigger}</Text>
                          </>
                        )}
                        {trait.description && (
                          <>
                            <Text style={[styles.traitLabel, styles.traitLabelWithMargin]}>어떻게 행동하나요?</Text>
                            <Text style={styles.traitValue}>{trait.description}</Text>
                          </>
                        )}
                        {trait.soothingAction && (
                          <>
                            <Text style={[styles.traitLabel, styles.traitLabelWithMargin]}>
                              힘들 때 어떻게 하면 괜찮아지나요?
                            </Text>
                            <Text style={styles.traitValue}>{trait.soothingAction}</Text>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.traitLabel}>이럴 때</Text>
                        <Text style={styles.traitValue}>{trait.situation || '기록 없음'}</Text>
                        <Text style={[styles.traitLabel, styles.traitLabelWithMargin]}>이렇게 해요</Text>
                        <Text style={styles.traitValue}>{trait.strategy || '기록 없음'}</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.traitActions}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEditTrait(trait)}>
                      <Text style={styles.editButtonText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteTrait(trait.id)}
                    >
                      <Text style={styles.deleteButtonText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>아직 행동 특성이 등록되지 않았습니다.</Text>
            )}
          </View>

          {/* 스케줄 관리 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>스케줄 관리</Text>
              {isEmployee && (
                <TouchableOpacity
                  style={styles.ttsButton}
                  onPress={async () => {
                    if (speakingSection === 'schedules') {
                      await stopSpeaking();
                      setSpeakingSection(null);
                      return;
                    }
                    const routineTexts = employeeRoutineSchedules.length > 0
                      ? employeeRoutineSchedules.map((s, i) => `${i + 1}. ${s.title}. ${s.dayOfWeek} ${s.startTime} - ${s.endTime}. ${s.location}`)
                      : ['등록된 루틴 스케줄이 없습니다'];
                    const oneTimeTexts = employeeSchedules.length > 0
                      ? employeeSchedules.map((s, i) => `${i + 1}. ${s.title}. ${s.date} ${s.startTime} - ${s.endTime}. ${s.location}`)
                      : ['등록된 일회성 스케줄이 없습니다'];
                    const fullText = `스케줄 관리. 루틴 스케줄. ${routineTexts.join('. ')}. 일회성 스케줄. ${oneTimeTexts.join('. ')}`;
                    setSpeakingSection('schedules');
                    await speakText(fullText);
                  }}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={speakingSection === 'schedules' ? 'volume-2' : 'volume-1'}
                    size={16}
                    color={speakingSection === 'schedules' ? '#FFA000' : '#666'}
                  />
                </TouchableOpacity>
              )}
            </View>
            
            {/* 루틴 스케줄 */}
            <Text style={styles.scheduleSectionTitle}>루틴 스케줄</Text>
            {employeeRoutineSchedules.length > 0 ? (
              employeeRoutineSchedules.map((schedule) => {
                const changeStatus = getScheduleChangeStatus(schedule.id);
                const scheduleStyle = changeStatus === 'unread' 
                  ? styles.scheduleItemUnread 
                  : changeStatus === 'read' 
                  ? styles.scheduleItemRead 
                  : null;
                
                // 해당 스케줄의 변경사항 찾기
                const scheduleChanges = changeLogs.filter(
                  log => log.category === '근무 스케줄'
                );
                const hasChanges = scheduleChanges.length > 0;
                const readChanges = scheduleChanges.filter(log => log.isRead);
                const hasReadChanges = readChanges.length > 0;

                return (
                <TouchableOpacity
                  key={schedule.id}
                    style={[styles.scheduleItem, scheduleStyle]}
                  onPress={() => handleEditSchedule(schedule, true)}
                >
                  <View style={[styles.scheduleColorBar, { backgroundColor: schedule.color || '#FFC107' }]} />
                  <View style={styles.scheduleContent}>
                    <View style={styles.scheduleTitleRow}>
                      <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                      {hasChanges && (
                        <Text style={styles.changedBadge}>변경됨</Text>
                      )}
                    </View>
                    <Text style={styles.scheduleTime}>
                      {schedule.dayOfWeek} {schedule.startTime} - {schedule.endTime}
                    </Text>
                    <Text style={styles.scheduleLocation}>{schedule.location}</Text>
                    {hasReadChanges && (
                      <Text style={styles.changeReadTime}>
                        확인: {formatDateTime(readChanges[readChanges.length - 1].changedAt)}
                      </Text>
                    )}
                  </View>
                  <FeatherIcon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>등록된 루틴 스케줄이 없습니다.</Text>
            )}

            {/* 일회성 스케줄 */}
            <Text style={[styles.scheduleSectionTitle, styles.scheduleSectionTitleMargin]}>일회성 스케줄</Text>
            {employeeSchedules.length > 0 ? (
              employeeSchedules.map((schedule) => {
                const changeStatus = getScheduleChangeStatus(schedule.id);
                const scheduleStyle = changeStatus === 'unread' 
                  ? styles.scheduleItemUnread 
                  : changeStatus === 'read' 
                  ? styles.scheduleItemRead 
                  : null;
                
                // 해당 스케줄의 변경사항 찾기
                const scheduleChanges = changeLogs.filter(
                  log => log.category === '근무 스케줄'
                );
                const hasChanges = scheduleChanges.length > 0;
                const readChanges = scheduleChanges.filter(log => log.isRead);
                const hasReadChanges = readChanges.length > 0;

                return (
                <TouchableOpacity
                  key={schedule.id}
                    style={[styles.scheduleItem, scheduleStyle]}
                  onPress={() => handleEditSchedule(schedule, false)}
                >
                  <View style={[styles.scheduleColorBar, { backgroundColor: schedule.color || '#FFC107' }]} />
                  <View style={styles.scheduleContent}>
                    <View style={styles.scheduleTitleRow}>
                      <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                      {hasChanges && (
                        <Text style={styles.changedBadge}>변경됨</Text>
                      )}
                    </View>
                    <Text style={styles.scheduleTime}>
                      {schedule.date} {schedule.startTime} - {schedule.endTime}
                    </Text>
                    <Text style={styles.scheduleLocation}>{schedule.location}</Text>
                    {hasReadChanges && (
                      <Text style={styles.changeReadTime}>
                        확인: {formatDateTime(readChanges[readChanges.length - 1].changedAt)}
                      </Text>
                    )}
                  </View>
                  <FeatherIcon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>등록된 일회성 스케줄이 없습니다.</Text>
            )}
          </View>

          {/* 불안 감정 기록 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>불안 감정 기록</Text>
              <View style={styles.cardHeaderRight}>
                {isEmployee && (
                  <TouchableOpacity
                    style={styles.ttsButton}
                    onPress={async () => {
                      if (speakingSection === 'emotions') {
                        await stopSpeaking();
                        setSpeakingSection(null);
                        return;
                      }
                      if (sortedEmotionHistory.length === 0) {
                        setSpeakingSection('emotions');
                        await speakText('불안 감정 기록. 아직 감정 기록이 없습니다.');
                        return;
                      }
                      const emotionTexts = sortedEmotionHistory.map((log, index) => {
                        const getInitialMoodLabel = (emoji: string | null | undefined): string => {
                          if (!emoji) return '';
                          const moodMap: { [key: string]: string } = {
                            '😊': '괜찮아요',
                            '😐': '조금 힘들지만 괜찮아요',
                            '😟': '힘들어요',
                            '😢': '많이 힘들어요',
                            '😭': '도움이 필요해요',
                          };
                          return moodMap[emoji] || '';
                        };
                        const parts = [
                          `${index + 1}번 기록`,
                          log.initialMood ? `첫 기분: ${log.initialMood} ${getInitialMoodLabel(log.initialMood)}` : '',
                          log.categoryLabel ? `어려움 이유: ${log.categoryLabel}` : '',
                          log.situationText ? `상황: ${log.situationText}` : '',
                          log.action ? `선택한 행동: ${log.actionEmojis ? `${log.actionEmojis} ` : ''}${log.action}` : '',
                          log.feedback ? `최종 기분: ${log.feedback}` : '',
                          `기록 시간: ${formatDateTime(log.createdAt)}`,
                        ].filter(Boolean);
                        return parts.join('. ');
                      });
                      const fullText = `불안 감정 기록. ${emotionTexts.join('. ')}`;
                      setSpeakingSection('emotions');
                      await speakText(fullText);
                    }}
                    activeOpacity={0.7}
                  >
                    <FeatherIcon
                      name={speakingSection === 'emotions' ? 'volume-2' : 'volume-1'}
                      size={16}
                      color={speakingSection === 'emotions' ? '#FFA000' : '#666'}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => {
                    navigation.navigate('EmotionReport', {
                      employeeEmail: selectedEmployee.email,
                      employeeName: selectedEmployee.name,
                    });
                  }}
                >
                  <FeatherIcon name="bar-chart-2" size={20} color="#333" />
                  <Text style={styles.reportButtonText}>상세 보기</Text>
                </TouchableOpacity>
              </View>
            </View>
            {sortedEmotionHistory.length > 0 ? (
              sortedEmotionHistory.map((log) => {
                // 초기 기분 레이블 매핑
                const getInitialMoodLabel = (emoji: string | null | undefined): string => {
                  if (!emoji) return '';
                  const moodMap: { [key: string]: string } = {
                    '😊': '괜찮아요',
                    '😐': '조금 힘들지만 괜찮아요',
                    '😟': '힘들어요',
                    '😢': '많이 힘들어요',
                    '😭': '도움이 필요해요',
                  };
                  return moodMap[emoji] || '';
                };

                return (
                  <View key={log.id} style={styles.emotionReportCard}>
                    <View style={styles.emotionCardHeader}>
                      <Text style={styles.emotionCardEmoji}>{log.feeling}</Text>
                      <Text style={styles.emotionCardDateTime}>{formatDateTime(log.createdAt)}</Text>
                    </View>
                    {log.initialMood && (
                      <View style={styles.emotionInfoRow}>
                        <Text style={styles.emotionInfoLabel}>첫 기분:</Text>
                        <Text style={styles.emotionInfoValue}>
                          {log.initialMood} {getInitialMoodLabel(log.initialMood)}
                        </Text>
                      </View>
                    )}
                    {log.categoryLabel && (
                      <View style={styles.emotionInfoRow}>
                        <Text style={styles.emotionInfoLabel}>어려움 이유:</Text>
                        <Text style={styles.emotionInfoValue}>{log.categoryLabel}</Text>
                      </View>
                    )}
                    {log.situationText && (
                      <View style={styles.emotionInfoRow}>
                        <Text style={styles.emotionInfoLabel}>상황:</Text>
                        <Text style={styles.emotionInfoValue}>{log.situationText}</Text>
                      </View>
                    )}
                    {log.action && (
                      <View style={styles.emotionInfoRow}>
                        <Text style={styles.emotionInfoLabel}>선택한 행동:</Text>
                        <Text style={styles.emotionInfoValue}>
                          {log.actionEmojis ? `${log.actionEmojis} ` : ''}{log.action}
                        </Text>
                      </View>
                    )}
                    {log.feedback && (
                      <View style={styles.emotionInfoRow}>
                        <Text style={styles.emotionInfoLabel}>최종 기분:</Text>
                        <Text style={styles.emotionInfoValue}>{log.feedback}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>아직 감정 기록이 없습니다.</Text>
            )}
          </View>
        </ScrollView>

        {/* 행동습관 편집 모달 */}
        <TraitEditModal
          visible={traitEditModalVisible}
          member={selectedEmployee}
          editingTrait={editingTrait}
          onClose={() => {
            setTraitEditModalVisible(false);
            setEditingTrait(null);
          }}
          onSave={(trait) => {
            if (!selectedEmployee) return;
            if (editingTrait) {
              updateMemberTrait(selectedEmployee.email, editingTrait.id, trait);
            } else {
              addMemberTrait(selectedEmployee.email, trait);
            }
            setTraitEditModalVisible(false);
            setEditingTrait(null);
          }}
        />

        {/* 삭제 확인 모달 */}
        <Modal
          visible={deleteConfirmModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCancelDelete}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>지울까요?</Text>
              <Text style={styles.modalMessage}>이 상황 카드를 지우시겠어요?</Text>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCancelDelete}
                >
                  <Text style={styles.modalCancelButtonText}>아니오</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.modalDeleteButtonText}>네</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 스케줄 수정 모달 */}
        {scheduleModalVisible && selectedSchedule && (
          isRoutineSchedule ? (
            <RoutineScheduleModal
              visible={scheduleModalVisible}
              onClose={() => {
                setScheduleModalVisible(false);
                setSelectedSchedule(null);
              }}
              onSave={() => {
                // 스케줄 업데이트 완료 시 알림 전송
                if (selectedEmployee) {
                  updateMemberStatus(selectedEmployee.email, {
                    lastScheduleUpdateAt: new Date().toISOString(),
                  });
                  Alert.alert('알림 보냄', '시간표가 바뀐 것을 알려줬어요.');
                }
              }}
              initialSchedule={selectedSchedule}
            />
          ) : (
            <ScheduleModal
              visible={scheduleModalVisible}
              onClose={() => {
                setScheduleModalVisible(false);
                setSelectedSchedule(null);
              }}
              onSave={() => {
                // 스케줄 업데이트 완료 시 알림 전송
                if (selectedEmployee) {
                  updateMemberStatus(selectedEmployee.email, {
                    lastScheduleUpdateAt: new Date().toISOString(),
                  });
                  Alert.alert('알림 보냄', '시간표가 바뀐 것을 알려줬어요.');
                }
              }}
              targetDate={selectedSchedule.date || new Date().toISOString().split('T')[0]}
              initialSchedule={selectedSchedule}
            />
          )
        )}
      </View>
    );
  }

  // 직원 목록 화면
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>직원 관리</Text>
      </View>

      {/* 부서 선택 */}
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerLabel}>부서 선택</Text>
          {isEmployee && (
            <TouchableOpacity
              style={styles.ttsButton}
              onPress={async () => {
                if (speakingSection === 'department') {
                  await stopSpeaking();
                  setSpeakingSection(null);
                  return;
                }
                const deptText = departments.length > 0
                  ? `부서 선택. ${departments.join(', ')}`
                  : '부서 선택. 등록된 부서가 없습니다';
                setSpeakingSection('department');
                await speakText(deptText);
              }}
              activeOpacity={0.7}
            >
              <FeatherIcon
                name={speakingSection === 'department' ? 'volume-2' : 'volume-1'}
                size={16}
                color={speakingSection === 'department' ? '#FFA000' : '#666'}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedDepartment || departments[0] || ''}
            onValueChange={(value) => setSelectedDepartment(value)}
            style={styles.picker}
          >
            {departments.map((dept) => (
              <Picker.Item key={dept} label={dept} value={dept} />
            ))}
          </Picker>
        </View>
      </View>

      {/* 직원 목록 */}
      <View style={styles.employeeListHeader}>
        <Text style={styles.employeeListTitle}>직원 목록</Text>
        {isEmployee && (
          <TouchableOpacity
            style={styles.ttsButton}
            onPress={async () => {
              if (speakingSection === 'employeeList') {
                await stopSpeaking();
                setSpeakingSection(null);
                return;
              }
              if (employees.length === 0) {
                setSpeakingSection('employeeList');
                await speakText('직원 목록. 해당 부서에 직원이 없습니다.');
                return;
              }
              const employeeNames = employees.map((e) => e.name).join(', ');
              const fullText = `직원 목록. ${employeeNames}`;
              setSpeakingSection('employeeList');
              await speakText(fullText);
            }}
            activeOpacity={0.7}
          >
            <FeatherIcon
              name={speakingSection === 'employeeList' ? 'volume-2' : 'volume-1'}
              size={16}
              color={speakingSection === 'employeeList' ? '#FFA000' : '#666'}
            />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.employeeList}>
        {employees.length > 0 ? (
          employees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              style={styles.employeeCard}
              onPress={() => handleEmployeePress(employee)}
              activeOpacity={0.7}
            >
              <View style={styles.employeeImageContainer}>
                {employee.avatarUrl ? (
                  <Image source={{ uri: employee.avatarUrl }} style={styles.employeeImage} />
                ) : (
                  <View style={styles.employeeImagePlaceholder}>
                    <Text style={styles.employeeImagePlaceholderText}>
                      {employee.name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.employeeName}>{employee.name}</Text>
              <FeatherIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>해당 부서에 직원이 없습니다.</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default EmployeeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    padding: 8,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  employeeList: {
    padding: 20,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  employeeImageContainer: {
    marginRight: 12,
  },
  employeeImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
  },
  employeeImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeImagePlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  employeeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#000',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
  },
  ttsButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  employeeListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#E6F7E8',
  },
  statusBadgeWarning: {
    backgroundColor: '#FFE8E8',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeTextSuccess: {
    color: '#1B5E20',
  },
  statusBadgeTextWarning: {
    color: '#B71C1C',
  },
  addButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  traitCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE7A0',
  },
  traitContent: {
    marginBottom: 12,
  },
  traitLabel: {
    fontSize: 12,
    color: '#8A6D00',
    fontWeight: '700',
    marginBottom: 4,
  },
  traitValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  traitActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  emotionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  emotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionEmoji: {
    fontSize: 24,
  },
  emotionTime: {
    fontSize: 12,
    color: '#666',
  },
  emotionReportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emotionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  emotionCardEmoji: {
    fontSize: 32,
  },
  emotionCardDateTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  emotionSituation: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  emotionFeedback: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emotionInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  emotionInfoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
    minWidth: 60,
  },
  emotionInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalFieldGroup: {
    marginBottom: 20,
  },
  modalFieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },
  modalTextField: {
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#FFD54F',
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 16,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  traitLabelWithMargin: {
    marginTop: 8,
  },
  reminderButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  reminderButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  scheduleSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
  },
  scheduleSectionTitleMargin: {
    marginTop: 20,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  scheduleItemUnread: {
    backgroundColor: '#FFE8E8', // 연한 빨간색
    borderColor: '#FFB3B3',
  },
  scheduleItemRead: {
    backgroundColor: '#E8F5E8', // 연한 녹색
    borderColor: '#B3E6B3',
  },
  scheduleColorBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  scheduleLocation: {
    fontSize: 12,
    color: '#999',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  reportButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginRight: 4,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  changedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B6B',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  changeReadTime: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

