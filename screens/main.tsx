import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, Modal, Dimensions } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import { useSchedule } from '../contexts/ScheduleContext';
import { useWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import { getSchedulesForDate } from '../utils/scheduleMerger';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { getUnreadChanges, markChangesAsRead, ChangeLog } from '../services/changesApi';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { setMessageReceivedCallback, registerFcmToken } from '../services/pushNotification';

type MainStackParamList = {
    MainPage: undefined;
    AnxietyInputScreen: { initialMood?: { emoji: string; label: string } };
    PlaceSimulation: undefined;
    Settings: undefined;
    EmotionReport: { employeeEmail?: string; employeeName?: string };
};


// API 시간 포맷 ("14:00:00" -> "오후 2:00 ~ 오후 3:00")으로 변경
const formatApiTime = (startTime: string, endTime: string) => {
    const parseAndFormat = (timeStr: string) => {
        if (!timeStr) return '';
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour, 10);
        const period = h < 12 ? '오전' : '오후';
        const formattedHour = h % 12 === 0 ? 12 : h % 12;
        const formattedMinute = minute.padStart(2, '0');
        return `${period} ${formattedHour}:${formattedMinute}`;
    };

    return `${parseAndFormat(startTime)} ~ ${parseAndFormat(endTime)}`;
};


const MainPage = () => {
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
    const { userProfile, userRole } = useAuth();
    const { getMemberByEmail } = useAdmin();
    
    // 디버깅: userProfile 변경 시 로그 출력
    useEffect(() => {
        console.log('📱 [MainPage] userProfile 업데이트:', JSON.stringify(userProfile, null, 2));
        console.log('📱 [MainPage] userRole:', userRole);
    }, [userProfile, userRole]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [changeModalVisible, setChangeModalVisible] = useState(false);
    const [unreadChanges, setUnreadChanges] = useState<ChangeLog[]>([]);
    const [changedScheduleIds, setChangedScheduleIds] = useState<Set<number>>(new Set());
    const [emotionPushModalVisible, setEmotionPushModalVisible] = useState(false);
    
    const { rawSchedules: oneTimeSchedules, loading: loadingOneTime, error: errorOneTime } = useSchedule();
    const { rawWeeklySchedules, loading: loadingWeekly, error: errorWeekly } = useWeeklySchedule();
    
    const loading = loadingOneTime || loadingWeekly;
    const error = errorOneTime || errorWeekly;
    const isEmployee = userRole === '기업 재직자';
    
    // 현재 사용자의 Member 정보 가져오기
    const currentMember = useMemo(() => {
        if (!userProfile?.email) return null;
        return getMemberByEmail(userProfile.email);
    }, [userProfile?.email, getMemberByEmail]);
    
    // 오늘 날짜의 병합된 스케줄 가져오기
    const todaySchedules = useMemo(() => {
        const today = new Date();
        return getSchedulesForDate(today, rawWeeklySchedules, oneTimeSchedules);
    }, [rawWeeklySchedules, oneTimeSchedules]);

    // 안 읽은 변경사항 조회 (기업 재직자인 경우)
    useEffect(() => {
        const fetchUnreadChanges = async () => {
            if (!isEmployee || !currentMember?.id) {
                return;
            }

            try {
                const changes = await getUnreadChanges(currentMember.id);
                setUnreadChanges(changes);
                
                // 변경사항이 있으면 변경된 스케줄 ID 추출
                // fieldName 형식이 "schedule_{id}_{field}" 또는 변경사항에 scheduleId 필드가 있을 수 있음
                // employeeScreen.tsx의 로직을 참고하여 category가 "근무 스케줄"인 변경사항을 찾음
                const scheduleIds = new Set<number>();
                changes.forEach(change => {
                    if (change.category === '근무 스케줄') {
                        // fieldName에서 스케줄 ID 추출 시도 (예: "schedule_123_startTime")
                        // 또는 별도 필드가 있다면 사용
                        // 일단 변경사항 자체를 추적하기 위해 임시로 처리
                        // 실제 API 응답 구조에 맞게 수정 필요
                    }
                });
                setChangedScheduleIds(scheduleIds);
                
                // 안 읽은 변경사항이 있으면 모달 표시
                if (changes.length > 0) {
                    setChangeModalVisible(true);
                }
            } catch (error) {
                console.error('변경사항 조회 오류:', error);
            }
        };

        fetchUnreadChanges();
    }, [isEmployee, currentMember?.id]);

    // 변경사항 읽음 처리
    const handleMarkChangesAsRead = async () => {
        if (!currentMember?.id || unreadChanges.length === 0) {
            setChangeModalVisible(false);
            return;
        }

        try {
            const changeLogIds = unreadChanges.map(change => change.changeLogId);
            await markChangesAsRead({
                changeLogIds,
                memberId: currentMember.id,
            });
            
            // 읽음 처리 후 상태 업데이트
            setUnreadChanges([]);
            setChangeModalVisible(false);
        } catch (error) {
            console.error('변경사항 읽음 처리 오류:', error);
        }
    };

    // FCM 토큰 등록 및 새로고침 처리 (기업 재직자인 경우)
    useEffect(() => {
        const registerToken = async (token: string) => {
            if (!isEmployee || !currentMember?.id) {
                return;
            }

            try {
                await registerFcmToken(currentMember.id, token);
                console.log('FCM 토큰 등록 완료');
            } catch (error) {
                console.error('FCM 토큰 등록 실패:', error);
            }
        };

        // 초기 토큰 등록
        const initializeToken = async () => {
            if (!isEmployee || !currentMember?.id) {
                return;
            }

            try {
                const fcmToken = await messaging().getToken();
                if (fcmToken) {
                    await registerToken(fcmToken);
                }
            } catch (error) {
                console.error('FCM 토큰 조회 실패:', error);
            }
        };

        initializeToken();

        // 토큰 새로고침 리스너 설정
        const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
            console.log('FCM 토큰 새로고침:', newToken);
            await registerToken(newToken);
        });

        return () => {
            unsubscribeTokenRefresh();
        };
    }, [isEmployee, currentMember?.id]);

    // 푸시 알림 수신 핸들러 설정
    useEffect(() => {
        // 포그라운드 메시지 수신 콜백 설정
        setMessageReceivedCallback((remoteMessage) => {
            console.log('푸시 알림 수신:', remoteMessage);
            
            // 감정 확인 푸시 알림인지 확인 (notification.data에 type이 'emotion_check'인지 확인)
            const notificationType = remoteMessage.data?.type || remoteMessage.notification?.data?.type;
            
            if (notificationType === 'emotion_check' || remoteMessage.notification?.title?.includes('지금 마음이 어때요')) {
                // 감정 확인 모달 표시
                setEmotionPushModalVisible(true);
            }
        });

        // 알림 클릭 핸들러 (백그라운드/종료 상태)
        const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
            console.log('알림 클릭으로 앱 열림:', remoteMessage);
            const notificationType = remoteMessage.data?.type || remoteMessage.notification?.data?.type;
            
            if (notificationType === 'emotion_check' || remoteMessage.notification?.title?.includes('지금 마음이 어때요')) {
                setEmotionPushModalVisible(true);
            }
        });

        // 앱이 종료된 상태에서 알림으로 열린 경우
        messaging().getInitialNotification().then((remoteMessage) => {
            if (remoteMessage) {
                console.log('알림으로 앱이 열림 (종료 상태):', remoteMessage);
                const notificationType = remoteMessage.data?.type || remoteMessage.notification?.data?.type;
                
                if (notificationType === 'emotion_check' || remoteMessage.notification?.title?.includes('지금 마음이 어때요')) {
                    setEmotionPushModalVisible(true);
                }
            }
        });

        return () => {
            unsubscribeNotificationOpened();
        };
    }, []);

    // TTS 완료 이벤트 리스너
    useEffect(() => {
        TTS.addEventListener('tts-finish', () => {
            setIsSpeaking(false);
        });
        TTS.addEventListener('tts-cancel', () => {
            setIsSpeaking(false);
        });
    }, []);

    // TTS로 모든 일정 읽기
    const handleReadAllSchedules = async () => {
        if (isSpeaking) {
            await stopSpeaking();
            setIsSpeaking(false);
            return;
        }

        if (todaySchedules.length === 0) {
            await speakText('오늘 일정이 없습니다.');
            setIsSpeaking(true);
            return;
        }

        const scheduleTexts = todaySchedules.map((schedule, index) => {
            const timeText = formatApiTime(schedule.startTime, schedule.endTime);
            return `${index + 1}. ${schedule.title}. ${timeText}. ${schedule.location || '장소 정보 없음'}`;
        });

        const fullText = `오늘의 일정. ${scheduleTexts.join('. ')}`;
        setIsSpeaking(true);
        await speakText(fullText);
    };


    const handleAnxietyRecord = () => {
        navigation.navigate('AnxietyInputScreen');
    };

    const handlePlaceSimulation = () => {
        navigation.navigate('PlaceSimulation');
    };

    // 감정 확인 모달에서 감정 선택
    const handleEmotionSelect = (mood: { emoji: string; label: string }) => {
        setEmotionPushModalVisible(false);
        // AnxietyInputScreen으로 이동하며 초기 감정 전달
        navigation.navigate('AnxietyInputScreen', { initialMood: mood });
    };

    return (
        <View style={styles.container}>
            
            {/* 제목과 설정 아이콘 */}
            <View style={styles.header}>
                <Text style={styles.title}>오늘의 시간표</Text>
                <View style={styles.headerIcons}>
                    {userRole !== '관리자' && (
                        <>
                            <TouchableOpacity 
                                style={styles.headerIcon} 
                                onPress={() => navigation.navigate('EmotionReport', {})}
                            >
                                <FeatherIcon name="bar-chart-2" size={24} color="#000" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.headerIcon} 
                                onPress={() => navigation.navigate('Settings')}
                            >
                                <FeatherIcon name="settings" size={28} color="#000" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* 기업 재직자 프로필 사진 */}
            {isEmployee && userProfile && (
                <View style={styles.profileSection}>
                    {userProfile.avatarUrl ? (
                        <Image source={{ uri: userProfile.avatarUrl }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.profilePlaceholder}>
                            <Text style={styles.profilePlaceholderText}>
                                {userProfile.name ? userProfile.name.charAt(0) : '나'}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.profileName}>{userProfile.name}님, 안녕하세요!</Text>
                </View>
            )}

            {/* 일정 정보 영역 */}
            <View style={styles.outerScheduleContainer}>
                <View style={styles.scheduleHeader}>
                    <Text style={styles.scheduleHeaderTitle}>오늘의 일정</Text>
                    <TouchableOpacity
                        style={styles.ttsButton}
                        onPress={handleReadAllSchedules}
                        activeOpacity={0.7}
                    >
                        <FeatherIcon
                            name={isSpeaking ? 'volume-2' : 'volume-1'}
                            size={18}
                            color={isSpeaking ? '#FFA000' : '#666'}
                        />
                        <Text style={styles.ttsButtonText}>
                            {isSpeaking ? '읽는 중...' : '전체 읽기'}
                        </Text>
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <ActivityIndicator size="large" color="#FFC364" />
                ) : error ? (
                    <Text style={styles.errorText}>일정을 불러올 수 없습니다.</Text>
                ) : todaySchedules.length > 0 ? (
                    <ScrollView 
                        style={styles.scheduleScrollView}
                        contentContainerStyle={styles.scheduleContentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {todaySchedules.map(schedule => {
                            // 변경된 스케줄인지 확인
                            // scheduleId 필드가 있으면 직접 매칭, 없으면 fieldName에서 추출 시도
                            const scheduleId = schedule.isRoutine ? Math.abs(schedule.id) : schedule.id;
                            const isChanged = unreadChanges.some(change => {
                                if (change.category !== '근무 스케줄') return false;
                                
                                // scheduleId 필드가 있으면 직접 매칭
                                if (change.scheduleId !== undefined) {
                                    return change.scheduleId === scheduleId || 
                                           (schedule.isRoutine && change.scheduleId === schedule.id);
                                }
                                
                                // scheduleId가 없으면 fieldName에서 추출 시도
                                // fieldName 형식이 "schedule_{id}_{field}" 또는 다른 형식일 수 있음
                                return change.fieldName.includes(String(scheduleId)) ||
                                       change.fieldName.includes(String(schedule.id));
                            });
                            
                            return (
                                <View
                                    key={schedule.id}
                                    style={[
                                        styles.scheduleItem,
                                        isChanged && styles.scheduleItemChanged
                                    ]}
                                >
                                    {/* 색상 막대 */}
                                    <View style={[
                                        styles.colorBar, 
                                        { backgroundColor: isChanged ? '#FF6B6B' : schedule.color }
                                    ]} />

                                    {/* 내용 컨테이너 */}
                                    <View style={styles.scheduleContent}>
                                        <View style={styles.scheduleHeaderRow}>
                                            <Text style={styles.scheduleTime}>
                                                {formatApiTime(schedule.startTime, schedule.endTime)}
                                            </Text>
                                            {isChanged && (
                                                <Text style={styles.changedLabel}>변경됨</Text>
                                            )}
                                        </View>
                                        <Text style={styles.scheduleName}>{schedule.title}</Text> 
                                        <Text style={styles.schedulePlace}>{schedule.location}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <Text style={styles.noScheduleText}>오늘 일정이 없습니다.</Text>
                )}
            </View>

            <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                    style={styles.anxietyButton} 
                    onPress={handleAnxietyRecord}
                >
                    <Text style={styles.buttonText}>지금 마음이 어때요?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.simulationButton} 
                    onPress={handlePlaceSimulation}
                >
                    <Text style={styles.buttonText}>오늘 할 일 연습해요</Text>
                </TouchableOpacity>
            </View>

            {/* 변경사항 알림 모달 */}
            <Modal
                visible={changeModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setChangeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>시간표가 바뀌었어요</Text>
                        <Text style={styles.modalMessage}>
                            관리자가 시간표를 바꿨어요.{'\n'}
                            바뀐 시간표를 확인해요.
                        </Text>
                        
                        {/* 변경사항 목록 */}
                        {unreadChanges.length > 0 && (() => {
                            // 변경사항을 scheduleId별로 그룹화
                            const groupedChanges = new Map<number | undefined, ChangeLog[]>();
                            unreadChanges.forEach(change => {
                                const scheduleId = change.scheduleId;
                                if (!groupedChanges.has(scheduleId)) {
                                    groupedChanges.set(scheduleId, []);
                                }
                                groupedChanges.get(scheduleId)!.push(change);
                            });

                            // 날짜 포맷 함수
                            const formatDate = (dateStr: string) => {
                                try {
                                    const date = new Date(dateStr);
                                    const month = date.getMonth() + 1;
                                    const day = date.getDate();
                                    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
                                    const weekday = weekdays[date.getDay()];
                                    return `${month}월 ${day}일 (${weekday})`;
                                } catch {
                                    return dateStr;
                                }
                            };

                            // 스케줄 정보 찾기 함수
                            const findScheduleInfo = (change: ChangeLog): { date?: string; title?: string } | null => {
                                // 변경사항에서 직접 날짜와 제목 정보 가져오기 (API 응답에 포함되어 있을 수 있음)
                                // fieldName이 'title'이고 oldValue나 newValue가 있으면 그것이 제목일 수 있음
                                let scheduleTitle: string | undefined;
                                let scheduleDate: string | undefined;

                                // 제목 정보 찾기
                                if (change.fieldName === 'title') {
                                    scheduleTitle = change.newValue || change.oldValue;
                                } else {
                                    // 같은 scheduleId를 가진 다른 변경사항에서 제목 찾기
                                    const titleChange = unreadChanges.find(
                                        c => c.scheduleId === change.scheduleId && c.fieldName === 'title'
                                    );
                                    if (titleChange) {
                                        scheduleTitle = titleChange.newValue || titleChange.oldValue;
                                    }
                                }

                                // 날짜 정보는 스케줄 ID로 로컬 데이터에서 찾기
                                if (change.scheduleId) {
                                    // 일회성 일정에서 찾기
                                    const oneTimeSchedule = oneTimeSchedules.find(s => s.id === change.scheduleId);
                                    if (oneTimeSchedule) {
                                        scheduleDate = oneTimeSchedule.date;
                                        scheduleTitle = scheduleTitle || oneTimeSchedule.title;
                                    } else {
                                        // 주간 반복 일정에서 찾기
                                        const weeklySchedule = rawWeeklySchedules.find(
                                            s => s.id === change.scheduleId || s.id === Math.abs(change.scheduleId)
                                        );
                                        if (weeklySchedule) {
                                            scheduleTitle = scheduleTitle || weeklySchedule.title;
                                            // 주간 반복 일정은 날짜 정보가 없지만, 변경된 날짜가 있을 수 있음
                                            // changedAt 날짜를 사용하거나, 변경사항에 날짜 정보가 포함되어 있을 수 있음
                                        }
                                    }
                                }

                                if (scheduleDate || scheduleTitle) {
                                    return { date: scheduleDate, title: scheduleTitle };
                                }

                                return null;
                            };

                            return (
                                <ScrollView style={styles.changeList} nestedScrollEnabled>
                                    {Array.from(groupedChanges.entries()).map(([scheduleId, changes]) => {
                                        // 첫 번째 변경사항으로 스케줄 정보 찾기
                                        const scheduleInfo = changes.length > 0 ? findScheduleInfo(changes[0]) : null;
                                        return (
                                            <View key={scheduleId || 'no-schedule'} style={styles.changeGroup}>
                                                {/* 스케줄 정보 표시 (날짜와 제목) */}
                                                {scheduleInfo && (scheduleInfo.date || scheduleInfo.title) && (
                                                    <View style={styles.scheduleInfoHeader}>
                                                        {scheduleInfo.date && (
                                                            <Text style={styles.scheduleDate}>
                                                                {formatDate(scheduleInfo.date)}
                                                            </Text>
                                                        )}
                                                        {scheduleInfo.title && (
                                                            <Text style={styles.scheduleTitle}>
                                                                {scheduleInfo.title}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                                
                                                {/* 해당 스케줄의 변경사항 목록 */}
                                                {changes.map((change) => (
                                                    <View key={change.changeLogId} style={styles.changeItem}>
                                                        <Text style={styles.changeField}>
                                                            {change.fieldName === 'startTime' && '시작하는 시간'}
                                                            {change.fieldName === 'endTime' && '끝나는 시간'}
                                                            {change.fieldName === 'title' && '제목'}
                                                            {change.fieldName === 'location' && '장소'}
                                                            {!['startTime', 'endTime', 'title', 'location'].includes(change.fieldName) && change.fieldName}
                                                        </Text>
                                                        <Text style={styles.changeValue}>
                                                            {change.oldValue} → {change.newValue}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            );
                        })()}
                        
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={handleMarkChangesAsRead}
                        >
                            <Text style={styles.modalButtonText}>알겠어요</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 푸시 알림 감정 확인 모달 */}
            <Modal
                visible={emotionPushModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEmotionPushModalVisible(false)}
            >
                <View style={styles.emotionPushModalOverlay}>
                    <View style={styles.emotionPushModalCard}>
                        <TouchableOpacity
                            style={styles.emotionPushModalCloseButton}
                            onPress={() => setEmotionPushModalVisible(false)}
                        >
                            <FeatherIcon name="chevron-up" size={24} color="#666" />
                        </TouchableOpacity>
                        
                        <View style={styles.emotionPushModalHeader}>
                            <View style={styles.emotionPushModalIcon}>
                                <Text style={styles.emotionPushModalIconText}>👤</Text>
                            </View>
                            <Text style={styles.emotionPushModalTitle}>토닥이</Text>
                        </View>
                        
                        <Text style={styles.emotionPushModalQuestion}>지금 마음이 어때요?</Text>
                        
                        <View style={styles.emotionPushModalButtons}>
                            {[
                                { emoji: '😊', label: '괜찮아요' },
                                { emoji: '😟', label: '힘들어요' },
                                { emoji: '😢', label: '많이 힘들어요' },
                                { emoji: '😭', label: '힘들어서 도움이 필요해요' },
                            ].map((mood, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.emotionPushModalButton}
                                    onPress={() => handleEmotionSelect(mood)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.emotionPushModalEmoji}>{mood.emoji}</Text>
                                    <Text style={styles.emotionPushModalButtonLabel}>{mood.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default MainPage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 35,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginTop: 10,
        flex: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 15,
    },
    headerIcon: {
        padding: 5,
    },
    settingsIcon: {
        position: 'absolute',
        right: 0,
        padding: 5,
        marginTop: 15,
    },
    outerScheduleContainer: {
        backgroundColor: '#FFC364',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        flex: 1,
        alignSelf: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        justifyContent: 'center',
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    scheduleHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    ttsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    ttsButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    scheduleScrollView: {
        flex: 1,
    },
    scheduleContentContainer: {
        alignItems: 'center',
        minHeight: '100%', 
        justifyContent: 'center', 
    },
    scheduleItem: {
        marginBottom: 12,
        backgroundColor: '#fff',
        padding: 0,
        paddingVertical: 16,
        paddingRight: 16,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
        width: '95%',
    },
    colorBar: {
        width: 10,
        height: '100%',
        backgroundColor: 'transparent',
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        marginRight: 10,
    },
    scheduleContent: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        minWidth: 0,
    },
    scheduleTime: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    scheduleName: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    schedulePlace: {
        fontSize: 20,
        color: '#555',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    anxietyButton: {
        flex: 1,
        backgroundColor: '#79B3F7',
        paddingVertical: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 5,
    },
    simulationButton: {
        flex: 1,
        backgroundColor: '#70DA9F',
        paddingVertical: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#ff6b6b',
        textAlign: 'center',
    },
    noScheduleText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#eee',
        marginBottom: 12,
    },
    profilePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFC364',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    profilePlaceholderText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#000',
    },
    profileName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    scheduleItemChanged: {
        borderWidth: 2,
        borderColor: '#FF6B6B',
        backgroundColor: '#FFF5F5',
    },
    scheduleHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    changedLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FF6B6B',
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 24,
    },
    changeList: {
        maxHeight: 200,
        marginBottom: 20,
    },
    changeItem: {
        padding: 12,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        marginBottom: 8,
    },
    changeField: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    changeValue: {
        fontSize: 13,
        color: '#666',
    },
    changeGroup: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    scheduleInfoHeader: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    scheduleDate: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    scheduleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    modalButton: {
        backgroundColor: '#FFC107',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
    emotionPushModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    emotionPushModalCard: {
        backgroundColor: '#E8E8E8',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 16,
        minHeight: Dimensions.get('window').height * 0.5,
    },
    emotionPushModalCloseButton: {
        alignSelf: 'flex-end',
        padding: 8,
        marginBottom: 8,
    },
    emotionPushModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    emotionPushModalIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFC107',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    emotionPushModalIconText: {
        fontSize: 20,
    },
    emotionPushModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    emotionPushModalQuestion: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginBottom: 24,
        textAlign: 'center',
    },
    emotionPushModalButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    emotionPushModalButton: {
        width: (Dimensions.get('window').width - 72) / 2,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    emotionPushModalEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    emotionPushModalButtonLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
});