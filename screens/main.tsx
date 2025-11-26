import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import { useSchedule } from '../contexts/ScheduleContext';
import { useWeeklySchedule } from '../contexts/WeeklyScheduleContext';
import { getSchedulesForDate } from '../utils/scheduleMerger';
import { useAuth } from '../contexts/AuthContext';

type MainStackParamList = {
    MainPage: undefined;
    AnxietyInputScreen: undefined;
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
    
    // 디버깅: userProfile 변경 시 로그 출력
    useEffect(() => {
        console.log('📱 [MainPage] userProfile 업데이트:', JSON.stringify(userProfile, null, 2));
        console.log('📱 [MainPage] userRole:', userRole);
    }, [userProfile, userRole]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const { rawSchedules: oneTimeSchedules, loading: loadingOneTime, error: errorOneTime } = useSchedule();
    const { rawWeeklySchedules, loading: loadingWeekly, error: errorWeekly } = useWeeklySchedule();
    
    const loading = loadingOneTime || loadingWeekly;
    const error = errorOneTime || errorWeekly;
    const isEmployee = userRole === '기업 재직자';
    
    // 오늘 날짜의 병합된 스케줄 가져오기
    const todaySchedules = useMemo(() => {
        const today = new Date();
        return getSchedulesForDate(today, rawWeeklySchedules, oneTimeSchedules);
    }, [rawWeeklySchedules, oneTimeSchedules]);

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
                        {todaySchedules.map(schedule => (
                            <View
                                key={schedule.id}
                                style={styles.scheduleItem}
                            >
                                {/* 색상 막대 */}
                                <View style={[styles.colorBar, { backgroundColor: schedule.color }]} />

                                {/* 내용 컨테이너 */}
                                <View style={styles.scheduleContent}>
                                    <Text style={styles.scheduleTime}>
                                        {formatApiTime(schedule.startTime, schedule.endTime)}
                                    </Text>
                                    <Text style={styles.scheduleName}>{schedule.title}</Text> 
                                    <Text style={styles.schedulePlace}>{schedule.location}</Text>
                                </View>
                            </View>
                        ))}
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
});