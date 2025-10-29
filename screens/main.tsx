import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSchedule } from '../contexts/ScheduleContext';

// Context에서 사용하는 데이터 타입 정의 (참고용)
interface ApiSchedule {
    id: number;
    date: string;
    startTime: string; // HH:mm:ss 형식
    endTime: string;    // HH:mm:ss 형식
    title: string;
    color: string; // Hex 코드 또는 유효한 색상 문자열
    location: string;
}

type MainStackParamList = {
    MainPage: undefined;
    AnxietyRecord: undefined;
    PlaceSimulation: undefined;
    Settings: undefined;
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
    
    const { schedules, loading, error } = useSchedule();
    const currentDayIndex = new Date().getDay();
    const todayDateStr = new Date().toISOString().split('T')[0];
    const todaySchedules: ApiSchedule[] = (schedules[currentDayIndex] || []).filter(
        schedule => schedule.date === todayDateStr
    );


    const handleAnxietyRecord = () => {
        navigation.navigate('AnxietyRecord');
    };

    const handlePlaceSimulation = () => {
        navigation.navigate('PlaceSimulation');
    };

    return (
        <View style={styles.container}>
            
            {/* 제목과 설정 아이콘 */}
            <View style={styles.header}>
                <Text style={styles.title}>오늘의 시간표</Text>
                <TouchableOpacity style={styles.settingsIcon} onPress={() => navigation.navigate('Settings')}>
                    <Text style={styles.settingsIconText}>⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* 일정 정보 영역 */}
            <View style={styles.outerScheduleContainer}>
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
                                {/* 1. 색상 막대 추가 */}
                                <View style={[styles.colorBar, { backgroundColor: schedule.color }]} />

                                {/* 2. 내용 컨테이너 추가 */}
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
                    <Text style={styles.buttonText}>불안한가요?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.simulationButton} 
                    onPress={handlePlaceSimulation}
                >
                    <Text style={styles.buttonText}>오늘의 일 체험해보기</Text>
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
        justifyContent: 'flex-start',
        paddingTop: 8,
        marginBottom: 16,
        position: 'relative',
    },
    title: {
        fontSize: 35,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
        marginTop: 10,
    },
    settingsIcon: {
        position: 'absolute',
        right: 0,
        padding: 5,
        marginTop: 15,
    },
    settingsIconText: {
        fontSize: 30,
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
});