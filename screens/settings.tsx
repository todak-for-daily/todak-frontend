import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Image, Dimensions, Modal, Alert } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin, MemberTrait } from '../contexts/AdminContext';
import ProfilePhotoPicker, { MediaSelection } from '../components/ProfilePhotoPicker';
import TraitEditModal from '../components/TraitEditModal';
import { speakText, stopSpeaking } from '../utils/textToSpeech';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROLE_TEST_PRESETS: Record<
  '일반 사용자' | '관리자' | '기업 재직자',
  { name: string; email: string; organization: string }
> = {
  '일반 사용자': {
    name: '토닥 친구',
    email: 'general.user@todaki.app',
    organization: '',
  },
  '관리자': {
    name: '관리 담당자',
    email: 'admin.manager@todaki.app',
    organization: '토닥이 회사',
  },
  '기업 재직자': {
    name: '회사 친구',
    email: 'employee@todaki.app',
    organization: '토닥이 회사',
  },
};

const Settings = () => {
    const navigation = useNavigation<any>();
    const { userRole, setUserRole, userProfile, updateProfile, logout } = useAuth();
    const { getMemberByEmail, getOrganizationByMemberEmail, organizations, updateMemberStatus, addMemberTrait, updateMemberTrait, deleteMemberTrait } =
        useAdmin();

    const [isSoundPreferred, setIsSoundPreferred] = useState(true);
    const [isVibrationPreferred, setIsVibrationPreferred] = useState(true);
    const [photoModalVisible, setPhotoModalVisible] = useState(false);
    const [traitEditModalVisible, setTraitEditModalVisible] = useState(false);
    const [editingTrait, setEditingTrait] = useState<MemberTrait | null>(null);
    const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
    const [traitToDelete, setTraitToDelete] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [speakingSection, setSpeakingSection] = useState<string | null>(null);

    const memberRecord = useMemo(() => {
        if (!userProfile?.email) return null;
        return getMemberByEmail(userProfile.email);
    }, [getMemberByEmail, userProfile]);

    // 일반 사용자, 기업 재직자, 관리자도 memberRecord가 없으면 자동으로 생성
    useEffect(() => {
        if (userProfile?.email) {
            const existingMember = getMemberByEmail(userProfile.email);
            if (!existingMember) {
                // updateMemberStatus를 호출해서 Member를 생성
                updateMemberStatus(userProfile.email, {
                    email: userProfile.email,
                    name: userProfile.name || userProfile.email.split('@')[0],
                    role: userRole || '일반 사용자',
                    organizationId: null,
                    traits: [],
                    emotionHistory: [],
                });
            }
        }
    }, [userProfile?.email, userProfile?.name, userRole, getMemberByEmail, updateMemberStatus]);

    const showSafetyModalOnWorkTab = useMemo(() => {
        return memberRecord?.showSafetyModalOnWorkTab !== false; // 기본값은 true
    }, [memberRecord]);

    const toggleSafetyModalOnWorkTab = () => {
        const newValue = !showSafetyModalOnWorkTab;
        if (memberRecord?.email) {
            updateMemberStatus(memberRecord.email, { showSafetyModalOnWorkTab: newValue });
        }
    };

    const linkedOrganization = useMemo(() => {
        if (userRole === '관리자') {
            return organizations[0] || null;
        }
        if (userProfile?.email) {
            return getOrganizationByMemberEmail(userProfile.email);
        }
        return null;
    }, [userRole, organizations, userProfile, getOrganizationByMemberEmail]);

    const toggleSoundPreference = () => setIsSoundPreferred(prev => !prev);
    const toggleVibrationPreference = () => setIsVibrationPreferred(prev => !prev);

    // 마지막 알림 상태 계산
    const finalSoundStatus = isSoundPreferred;
    const finalVibrationStatus = isVibrationPreferred;

    const handlePhotoSave = (media: MediaSelection) => {
        const uri = media.uri;
        updateProfile({ avatarUrl: uri });
        if (memberRecord?.email) {
            updateMemberStatus(memberRecord.email, { avatarUrl: uri });
        }
    };

    // 행동 습관 관리 함수들
    const handleAddTrait = () => {
        setEditingTrait(null);
        setTraitEditModalVisible(true);
    };

    const handleEditTrait = (trait: MemberTrait) => {
        setEditingTrait(trait);
        setTraitEditModalVisible(true);
    };

    const handleDeleteTrait = (traitId: string) => {
        setTraitToDelete(traitId);
        setDeleteConfirmModalVisible(true);
    };

    const handleConfirmDelete = () => {
        if (traitToDelete && memberRecord?.email) {
            deleteMemberTrait(memberRecord.email, traitToDelete);
            setDeleteConfirmModalVisible(false);
            setTraitToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirmModalVisible(false);
        setTraitToDelete(null);
    };

    // 관리자도 자신의 행동 습관을 수정할 수 있도록 변경
    const canEditTraits = userRole === '일반 사용자' || userRole === '기업 재직자' || userRole === '관리자';
    const sortedTraits = useMemo(() => {
        if (!memberRecord?.traits) return [];
        return [...memberRecord.traits].sort((a, b) => {
            // 새 형식이면 traitType으로 정렬, 아니면 situation으로 정렬
            if (a.traitType && b.traitType) {
                return a.traitType.localeCompare(b.traitType, 'ko');
            }
            return (a.situation || '').localeCompare(b.situation || '', 'ko');
        });
    }, [memberRecord?.traits]);

    const handleLogout = () => {
        if (isLoggingOut) return;
        Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
            { text: '취소', style: 'cancel' },
            {
                text: '로그아웃',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setIsLoggingOut(true);
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    } catch (error) {
                        console.error('로그아웃 실패:', error);
                        Alert.alert('로그아웃 실패', '다시 시도해 주세요.');
                    } finally {
                        setIsLoggingOut(false);
                    }
                },
            },
        ]);
    };

    return (
        <ScrollView style={styles.scrollViewWrapper}>
            <View style={styles.container}>
                <View style={[styles.card, styles.profileCard]}>
                    <View style={styles.profileRow}>
                        {userProfile?.avatarUrl ? (
                            <Image source={{ uri: userProfile.avatarUrl }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.profilePlaceholder}>
                                <Text style={styles.profilePlaceholderText}>
                                    {userProfile?.name?.charAt(0) ?? '?'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{userProfile?.name || '이름 없음'}</Text>
                            <Text style={styles.profileMeta}>{userProfile?.email || '이메일 없음'}</Text>
                            <Text style={styles.profileMeta}>
                                {linkedOrganization?.name || '소속 정보 없음'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.photoChangeButton}
                            onPress={() => setPhotoModalVisible(true)}
                        >
                            <Text style={styles.photoChangeText}>사진 바꾸기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.headerTitle}>알림 설정</Text>

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.sectionTitle}>소리 / 진동 알림 설정</Text>
                        <View style={styles.cardHeaderActions}>
                            <TouchableOpacity
                                style={styles.ttsButton}
                                onPress={async () => {
                                    if (speakingSection === 'alerts') {
                                        await stopSpeaking();
                                        setSpeakingSection(null);
                                        return;
                                    }
                                    setSpeakingSection('alerts');
                                    await speakText(
                                        `소리 알림은 현재 ${isSoundPreferred ? '켜져 있어요' : '꺼져 있어요'}. ` +
                                        `진동 알림은 ${isVibrationPreferred ? '켜져 있어요' : '꺼져 있어요'}.`
                                    );
                                }}
                                activeOpacity={0.7}
                            >
                                <FeatherIcon
                                    name={speakingSection === 'alerts' ? 'volume-2' : 'volume-1'}
                                    size={16}
                                    color={speakingSection === 'alerts' ? '#FFA000' : '#666'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.description}>
                        소리와 진동을 따로 '켜짐' 또는 '꺼짐'으로 바꿀 수 있어요.
                    </Text>
                    <Text style={styles.description}>
                        소리와 진동을 따로 '켜짐' 또는 '꺼짐'으로 바꿀 수 있어요.
                    </Text>

                    {/* 음성 알림 스위치 */}
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>소리 알림 켜짐/꺼짐</Text>
                        <Switch
                            trackColor={{ false: "#CCCCCC", true: "#FFECB3" }} 
                            thumbColor={isSoundPreferred ? "#FFA000" : "#f4f4f4"} // 주황-노랑
                            onValueChange={toggleSoundPreference}
                            value={isSoundPreferred}
                        />
                    </View>
                    <Text style={styles.switchHelpText}>
                        알림 소리가 듣기 싫거나 너무 커서 놀랄 수 있다면, '꺼짐'으로 해 주세요.
                    </Text>

                    {/* 진동 스위치 */}
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>진동 알림 켜짐/꺼짐</Text>
                        <Switch
                            trackColor={{ false: "#CCCCCC", true: "#FFECB3" }} 
                            thumbColor={isVibrationPreferred ? "#FFA000" : "#f4f4f4"} // 주황-노랑
                            onValueChange={toggleVibrationPreference}
                            value={isVibrationPreferred}
                        />
                    </View>
                    <Text style={[styles.switchHelpText, styles.lastSwitchHelpText]}>
                         몸으로 느껴지는 진동이 불편하게 느껴진다면, '꺼짐'으로 해 주세요.
                    </Text>
                    
                </View>
                
                <View style={[styles.card, styles.summaryCard]}>
                    <Text style={styles.summaryTitle}>현재 알림 상태</Text>
                    <Text style={styles.infoTextSummary}>
                        {`소리: ${finalSoundStatus ? '켜짐' : '꺼짐'} | 진동: ${finalVibrationStatus ? '켜짐' : '꺼짐'}`}
                    </Text>
                </View>

                {/* 안전 수칙 모달 설정 (기업 재직자만) */}
                {userRole === '기업 재직자' && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>안전 수칙 모달 설정</Text>
                        <Text style={styles.description}>
                            일하기 탭을 열 때마다 안전 수칙 모달을 자동으로 표시할지 선택할 수 있어요.
                        </Text>
                        <View style={styles.settingItem}>
                            <Text style={styles.settingText}>일하기 탭 열 때 안전 수칙 모달 표시</Text>
                            <Switch
                                trackColor={{ false: "#CCCCCC", true: "#FFECB3" }} 
                                thumbColor={showSafetyModalOnWorkTab ? "#FFA000" : "#f4f4f4"}
                                onValueChange={toggleSafetyModalOnWorkTab}
                                value={showSafetyModalOnWorkTab}
                            />
                        </View>
                        <Text style={styles.switchHelpText}>
                            {showSafetyModalOnWorkTab 
                                ? '일하기 화면을 열 때마다 안전 수칙이 계속 보여요.'
                                : '내가 안전 수칙을 보기로 정한 때에만 안전 수칙을 볼 수 있어요.'}
                        </Text>
                    </View>
                )}

                {/* 행동 특성 관리 (일반 사용자, 기업 재직자만) */}
                {canEditTraits && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.sectionTitle}>행동 특성 관리</Text>
                            <View style={styles.cardHeaderActions}>
                                <TouchableOpacity
                                    style={styles.ttsButton}
                                    onPress={async () => {
                                        if (speakingSection === 'traits') {
                                            await stopSpeaking();
                                            setSpeakingSection(null);
                                            return;
                                        }
                                        const message = sortedTraits.length
                                            ? '작성된 행동 특성을 읽어 드릴게요.'
                                            : '아직 행동 특성이 없어요. 아래에서 추가해 주세요.';
                                        setSpeakingSection('traits');
                                        await speakText(`행동 특성 관리. ${message}`);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <FeatherIcon
                                        name={speakingSection === 'traits' ? 'volume-2' : 'volume-1'}
                                        size={16}
                                        color={speakingSection === 'traits' ? '#FFA000' : '#666'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleAddTrait} style={styles.addButton}>
                                    <Text style={styles.addButtonText}>+ 추가</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.description}>
                            힘든 순간과 그때 도움이 되는 행동을 기록해요.
                        </Text>
                        {sortedTraits.length > 0 ? (
                            sortedTraits.map((trait) => (
                                <View key={trait.id} style={styles.traitCard}>
                                    <View style={styles.traitContent}>
                                        {trait.traitType ? (
                                            // 새 형식 표시
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
                                                        <Text style={[styles.traitLabel, styles.traitLabelWithMargin]}>힘들 때 어떻게 하면 괜찮아지나요?</Text>
                                                        <Text style={styles.traitValue}>{trait.soothingAction}</Text>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            // 기존 형식 표시 (호환성 유지)
                                            <>
                                                <Text style={styles.traitLabel}>이럴 때</Text>
                                                <Text style={styles.traitValue}>{trait.situation || '기록 없음'}</Text>
                                                <Text style={[styles.traitLabel, styles.traitLabelWithMargin]}>이렇게 해요</Text>
                                                <Text style={styles.traitValue}>{trait.strategy || '기록 없음'}</Text>
                                            </>
                                        )}
                                    </View>
                                    <View style={styles.traitActions}>
                                        <TouchableOpacity
                                            style={styles.traitEditButton}
                                            onPress={() => handleEditTrait(trait)}
                                        >
                                            <Text style={styles.traitEditButtonText}>수정</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.traitDeleteButton}
                                            onPress={() => handleDeleteTrait(trait.id)}
                                        >
                                            <Text style={styles.traitDeleteButtonText}>삭제</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>아직 행동습관이 등록되지 않았습니다.</Text>
                        )}
                    </View>
                )}

                {/* 역할 관리 섹션 (테스트용) */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>역할 관리 (테스트용)</Text>
                    <Text style={styles.description}>
                        {`현재 역할: ${userRole || '없음'}`}
                    </Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleButton, userRole === '일반 사용자' && styles.roleButtonSelected]}
                            onPress={() => {
                                setUserRole('일반 사용자');
                                updateProfile(ROLE_TEST_PRESETS['일반 사용자']);
                            }}
                        >
                            <Text style={[styles.roleButtonText, userRole === '일반 사용자' && styles.roleButtonTextSelected]}>
                                일반 사용자
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleButton, userRole === '관리자' && styles.roleButtonSelected]}
                            onPress={() => {
                                setUserRole('관리자');
                                updateProfile(ROLE_TEST_PRESETS['관리자']);
                            }}
                        >
                            <Text style={[styles.roleButtonText, userRole === '관리자' && styles.roleButtonTextSelected]}>
                                관리자
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleButton, userRole === '기업 재직자' && styles.roleButtonSelected]}
                            onPress={() => {
                                setUserRole('기업 재직자');
                                updateProfile(ROLE_TEST_PRESETS['기업 재직자']);
                            }}
                        >
                            <Text style={[styles.roleButtonText, userRole === '기업 재직자' && styles.roleButtonTextSelected]}>
                                기업 재직자
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.spacer} />
                <TouchableOpacity
                    style={[styles.card, styles.logoutCard]}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                >
                    <Text style={styles.logoutTitle}>로그아웃</Text>
                    <Text style={styles.logoutDescription}>
                        {isLoggingOut ? '로그아웃 중...' : '현재 계정에서 로그아웃합니다.'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ProfilePhotoPicker
                visible={photoModalVisible}
                initialUrl={userProfile?.avatarUrl}
                onClose={() => setPhotoModalVisible(false)}
                onSave={handlePhotoSave}
            />

            {/* 행동습관 편집 모달 */}
            <TraitEditModal
                visible={traitEditModalVisible}
                member={memberRecord}
                editingTrait={editingTrait}
                onClose={() => {
                    setTraitEditModalVisible(false);
                    setEditingTrait(null);
                }}
                onSave={(trait) => {
                    if (!memberRecord?.email) return;
                    if (editingTrait) {
                        updateMemberTrait(memberRecord.email, editingTrait.id, trait);
                    } else {
                        addMemberTrait(memberRecord.email, trait);
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
                        <Text style={styles.modalMessage}>이 행동습관을 지우시겠어요?</Text>
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={styles.modalButtonSecondary}
                                onPress={handleCancelDelete}
                            >
                                <Text style={styles.modalButtonSecondaryText}>아니오</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonPrimary}
                                onPress={handleConfirmDelete}
                            >
                                <Text style={styles.modalButtonPrimaryText}>네</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingTop: SCREEN_HEIGHT * 0.05,
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
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    modeButton: {
        width: '32%',
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
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
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 15,
    },
    roleButton: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    roleButtonSelected: {
        backgroundColor: '#FFC107',
    },
    roleButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333333',
    },
    roleButtonTextSelected: {
        color: '#000000',
        fontWeight: '700',
    },
    logoutCard: {
        backgroundColor: '#FFE8E8',
        borderColor: '#FFB3B3',
    },
    logoutTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#B71C1C',
        marginBottom: 6,
    },
    logoutDescription: {
        fontSize: 14,
        color: '#B71C1C',
    },
    roleText: {
        fontWeight: 'bold',
        color: '#000000',
    },
    profileCard: {
        marginTop: 10,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    profileImage: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EEEEEE',
    },
    profilePlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFC107',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profilePlaceholderText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#000',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    profileMeta: {
        fontSize: 14,
        color: '#666',
    },
    photoChangeButton: {
        backgroundColor: '#FFC107',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    photoChangeText: {
        fontWeight: '700',
        color: '#000',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 8,
    },
    ttsButton: {
        backgroundColor: '#F5F5F5',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
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
        fontSize: 14,
    },
    traitCard: {
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    traitContent: {
        marginBottom: 12,
    },
    traitLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    traitLabelWithMargin: {
        marginTop: 8,
    },
    traitValue: {
        fontSize: 15,
        color: '#333',
        lineHeight: 20,
    },
    traitActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    traitEditButton: {
        backgroundColor: '#FFC107',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    traitEditButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
    },
    traitDeleteButton: {
        backgroundColor: '#FFC107',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    traitDeleteButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingVertical: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButtonPrimary: {
        flex: 1,
        backgroundColor: '#FFC107',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonPrimaryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },
    modalButtonSecondary: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonSecondaryText: {
        color: '#333',
        fontWeight: '700',
        fontSize: 16,
    },
});
