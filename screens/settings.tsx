import { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';

type NotificationMode = 'sound_vibe' | 'vibration_only' | 'silent';

const NOTIFICATION_OPTIONS: { label: string; mode: NotificationMode }[] = [
    { label: '소리 + 진동', mode: 'sound_vibe' },
    { label: '진동만', mode: 'vibration_only' },
    { label: '모두 끔', mode: 'silent' }, 
];

const Settings = () => {
    // 현재 알림 모드 상태 (기본값: 소리 + 진동)
    const [notificationMode, setNotificationMode] = useState<NotificationMode>('sound_vibe');
    
    const [isSoundPreferred, setIsSoundPreferred] = useState(true);
    const [isVibrationPreferred, setIsVibrationPreferred] = useState(true);

    const toggleSoundPreference = () => setIsSoundPreferred(prev => !prev);
    const toggleVibrationPreference = () => setIsVibrationPreferred(prev => !prev);

    const handleModeSelect = (mode: NotificationMode) => {
        setNotificationMode(mode);
    };

    const renderModeOption = (option: typeof NOTIFICATION_OPTIONS[0]) => {
        const isSelected = notificationMode === option.mode;
        return (
            <TouchableOpacity
                key={option.mode}
                style={[styles.modeButton, isSelected && styles.modeButtonSelected]}
                onPress={() => handleModeSelect(option.mode)}
                activeOpacity={0.7}
            >
                <Text style={[styles.modeButtonText, isSelected && styles.modeButtonTextSelected]}>
                    {option.label}
                </Text>
            </TouchableOpacity>
        );
    };
    
    // 마지막 알림 상태 계산 (선택된 모드와 개별 선호도 결합)
    const finalSoundStatus = notificationMode === 'sound_vibe' && isSoundPreferred;
    const finalVibrationStatus = (notificationMode === 'sound_vibe' || notificationMode === 'vibration_only') && isVibrationPreferred;

    const isSoundSwitchDisabled = notificationMode === 'vibration_only' || notificationMode === 'silent';
    const isVibrationSwitchDisabled = notificationMode === 'silent';


    return (
        <ScrollView style={styles.scrollViewWrapper}>
            <View style={styles.container}>
                <Text style={styles.headerTitle}>알림 설정</Text>

                {/* 알림 모드 설정(간편) */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>1. 알림을 어떤 방법으로 받을까요?</Text>
                    <Text style={styles.description}>
                        소리, 진동 중에서 무엇으로 알려줄지 방법을 골라요.
                    </Text>
                    <View style={styles.modeContainer}>
                        {NOTIFICATION_OPTIONS.map(renderModeOption)}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>2. 소리 / 진동 자세히 바꾸기</Text>
                    <Text style={styles.description}>
                        (위에서 '소리 + 진동'을 골랐을 때만) 소리와 진동을 따로 '켜짐' 또는 '꺼짐'으로 바꿀 수 있어요.
                    </Text>

                    {/* 음성 알림 스위치 */}
                    <View style={[styles.settingItem, isSoundSwitchDisabled && styles.disabledItem]}>
                        <Text style={styles.settingText}>소리 알림 켜짐/꺼짐</Text>
                        <Switch
                            trackColor={{ false: "#CCCCCC", true: "#FFECB3" }} 
                            thumbColor={isSoundPreferred && !isSoundSwitchDisabled ? "#FFA000" : "#f4f4f4"} // 주황-노랑
                            onValueChange={toggleSoundPreference}
                            value={isSoundPreferred}
                            disabled={isSoundSwitchDisabled} // 진동만/무음일 때 비활성화
                        />
                    </View>
                    <Text style={styles.switchHelpText}>
                        🔔 알림 소리가 듣기 싫거나 너무 커서 놀랄 수 있다면, '꺼짐'으로 해 주세요.
                    </Text>

                    {/* 진동 스위치 */}
                    <View style={[styles.settingItem, isVibrationSwitchDisabled && styles.disabledItem]}>
                        <Text style={styles.settingText}>진동 알림 켜짐/꺼짐</Text>
                        <Switch
                            trackColor={{ false: "#CCCCCC", true: "#FFECB3" }} 
                            thumbColor={isVibrationPreferred && !isVibrationSwitchDisabled ? "#FFA000" : "#f4f4f4"} // 주황-노랑
                            onValueChange={toggleVibrationPreference}
                            value={isVibrationPreferred}
                            disabled={isVibrationSwitchDisabled} // 무음일 때 비활성화
                        />
                    </View>
                    <Text style={[styles.switchHelpText, styles.lastSwitchHelpText]}>
                         ⚡ 몸으로 느껴지는 진동이 불편하게 느껴진다면, '꺼짐'으로 해 주세요.
                    </Text>
                    
                </View>
                
                <View style={[styles.card, styles.summaryCard]}>
                    <Text style={styles.summaryTitle}>마지막 알림 상태</Text>
                    <Text style={styles.infoTextSummary}>
                        고른 방법: {NOTIFICATION_OPTIONS.find(o => o.mode === notificationMode)?.label}
                    </Text>
                    <Text style={styles.infoTextSummary}>
                        마지막 알림: 
                        {finalSoundStatus ? '🔔 소리 켜짐' : '❌ 소리 꺼짐'} | 
                        {finalVibrationStatus ? '📳 진동 켜짐' : '❌ 진동 꺼짐'}
                    </Text>
                </View>

                <View style={styles.spacer} />
            </View>
        </ScrollView>
    );
};

export default Settings;

const styles = StyleSheet.create({
    scrollViewWrapper: {
        flex: 1,
        backgroundColor: '#FAFAFA', 
    },
    container: {
        flex: 1,
        paddingTop: 20, 
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '700',
        color: '#333333',
        marginTop:30,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: '#FFFFFF', 
        borderRadius: 12,
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    summaryCard: {
        backgroundColor: '#FFFBEA',
        borderColor: '#FFC107',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#333333', 
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 5,
    },
    description: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 15,
        lineHeight: 20,
        fontWeight: '400',
    },
    modeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    modeButton: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
        minWidth: 90,
    },
    modeButtonSelected: {
        backgroundColor: '#FFC107',
        borderWidth: 1,
        borderColor: '#FFA000',
    },
    modeButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333333',
    },
    modeButtonTextSelected: {
        color: '#333333', 
        fontWeight: '700',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 5,
        opacity: 1,
    },
    disabledItem: {
        opacity: 0.5, 
    },
    settingText: {
        fontSize: 15,
        color: '#333333',
        fontWeight: '500',
    },
    switchHelpText: {
        fontSize: 12,
        color: '#777777',
        paddingLeft: 5,
        marginBottom: 15,
        lineHeight: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
        paddingBottom: 10,
    },

    lastSwitchHelpText: {
        marginBottom: 0,
    },
    infoTextSummary: {
        marginTop: 5,
        fontSize: 14,
        color: '#444444',
        textAlign: 'left',
        fontWeight: '600',
    },

    spacer: {
        height: 50,
    }
});