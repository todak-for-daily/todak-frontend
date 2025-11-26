import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ImageSourcePropType,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';
import { useAdmin, Member, SafetyGuideline, MemberTrait } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import ProfilePhotoPicker, { MediaSelection } from '../components/ProfilePhotoPicker';
import { subscribeToMoodCheckTopic } from '../services/pushNotification';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { ICON_CATALOG, IconKey } from '../constants/iconCatalog';
import { WorkStackParamList } from '../types/workNavigation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReminderMode = 'daily' | 'interval';


const makeGuidelineId = () => `draft-${Math.random().toString(36).slice(2, 8)}`;

const safeIconKey = (key?: IconKey): IconKey => {
  if (!key) return 'sunnyBadge';
  // ICON_CATALOG에 존재하는 키인지 확인
  if (ICON_CATALOG[key]) return key;
  return 'sunnyBadge';
};

const getIconSource = (key?: IconKey): ImageSourcePropType => {
  const safeKey = safeIconKey(key);
  const icon = ICON_CATALOG[safeKey];
  if (!icon || !icon.source) {
    // 최후의 안전장치: 기본 아이콘 사용
    return ICON_CATALOG.sunnyBadge.source;
  }
  return icon.source;
};

const getCompanyImageSource = (companyImageUrl?: string, companyImageKey?: IconKey): ImageSourcePropType => {
  if (companyImageUrl) {
    // URI 문자열인 경우 (로컬 파일 경로)
    if (typeof companyImageUrl === 'string' && companyImageUrl.startsWith('file://')) {
      return { uri: companyImageUrl };
    }
    // require로 가져온 이미지인 경우
    return companyImageUrl as ImageSourcePropType;
  }
  // 기본값: 아이콘 사용
  return getIconSource(companyImageKey);
};

const WorkScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkStackParamList>>();
  const route = useRoute<RouteProp<WorkStackParamList, 'WorkHome'>>();
  const {
    organizations,
    members,
    getOrganizationByMemberEmail,
    updateMemberStatus,
    updateOrganization,
    addMemberTrait,
    updateMemberTrait,
  } = useAdmin();
  const { userRole, userProfile, updateProfile } = useAuth();
  
  // 디버깅: userProfile 변경 시 로그 출력
  useEffect(() => {
    console.log('📱 [WorkScreen] userProfile 업데이트:', JSON.stringify(userProfile, null, 2));
    console.log('📱 [WorkScreen] userRole:', userRole);
  }, [userProfile, userRole]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [orgInfoModalVisible, setOrgInfoModalVisible] = useState(false);
  const [guidelineDrafts, setGuidelineDrafts] = useState<SafetyGuideline[]>([]);
  const [companyPhotoPickerVisible, setCompanyPhotoPickerVisible] = useState(false);
  const [guidelinePhotoPicker, setGuidelinePhotoPicker] = useState<{
    visible: boolean;
    targetId: string | null;
    initialUrl?: string;
    initialType?: 'image' | 'video';
  }>({ visible: false, targetId: null, initialUrl: undefined, initialType: 'image' });
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);
  const [currentGuidelineIndex, setCurrentGuidelineIndex] = useState(0);
  const guidelineFlatListRef = useRef<FlatList>(null);
  const hasShownSafetyModalRef = useRef(false); // 같은 탭 내에서 이미 모달을 보여줬는지 추적
  const hasShownOnFirstMountRef = useRef(false); // 앱 최초 접속 시 모달을 보여줬는지 추적 (토글이 꺼져 있을 때 사용)
  const isModalOpeningRef = useRef(false); // 모달을 여는 중인지 추적 (무한 루프 방지)
  const [reminderDraft, setReminderDraft] = useState<{
    mode: ReminderMode;
    dailyHour: number;
    intervalHours: number;
  }>({
    mode: 'daily',
    dailyHour: 9,
    intervalHours: 4,
  });
  const [_expandedTraitMembers, setExpandedTraitMembers] = useState<{ [key: number]: boolean }>({});
  const [traitEditModalVisible, setTraitEditModalVisible] = useState(false);
  const [selectedTraitMember, setSelectedTraitMember] = useState<Member | null>(null);
  const [editingTrait, setEditingTrait] = useState<MemberTrait | null>(null);
  const [speakingSection, setSpeakingSection] = useState<string | null>(null);
  const profileReminderMode = (userProfile as any)?.reminderMode as ReminderMode | undefined;
  const profileReminderTime = (userProfile as any)?.reminderTime as string | undefined;
  const profileReminderInterval = (userProfile as any)?.reminderIntervalHours as number | undefined;

  const isAdmin = userRole === '관리자';
  const isEmployee = userRole === '기업 재직자';

  const organization = useMemo(() => {
    if (isEmployee && userProfile?.email) {
      return getOrganizationByMemberEmail(userProfile.email) || organizations[0] || null;
    }
    if (isAdmin) {
      const orgId = route.params?.organizationId;
      if (orgId) {
        return organizations.find((org) => org.id === orgId) || organizations[0] || null;
      }
      // 관리자는 첫 번째 조직을 사용하거나, 없으면 null 반환 (나중에 기본값으로 처리)
      return organizations[0] || null;
    }
    return organizations[0] || null;
  }, [
    isAdmin,
    isEmployee,
    userProfile?.email,
    organizations,
    getOrganizationByMemberEmail,
    route.params?.organizationId,
  ]);

  // 관리자와 기업 재직자 모두 safeOrganization이 존재하도록 보장
  const safeOrganization = useMemo(() => {
    if (organization) return organization;
    
    // 관리자: 기본 조직 제공
    if (isAdmin) {
      return {
        id: 0,
        name: userProfile?.organization || '새 조직',
        adminName: userProfile?.name || '관리자',
        adminEmail: userProfile?.email || '',
        companyImageKey: 'hugIcon' as IconKey,
        safetyGuidelines: [],
      };
    }
    
    // 기업 재직자: 첫 번째 조직이 있으면 사용, 없으면 기본 조직 생성
    if (isEmployee && userProfile) {
      if (organizations.length > 0) {
        // 첫 번째 조직 사용
        return organizations[0];
      }
      // 조직이 없으면 기본 조직 생성
      return {
        id: 0,
        name: userProfile.organization || '기본 조직',
        adminName: '관리자',
        adminEmail: '',
        companyImageKey: 'hugIcon' as IconKey,
        safetyGuidelines: [],
      };
    }
    
    return null;
  }, [organization, isAdmin, isEmployee, userProfile, organizations]);

  const normalizedGuidelines = useMemo(() => {
    const org = safeOrganization;
    if (!org) return [];
    const defaultImageKeys: IconKey[] = ['hugIcon', 'hugIcon', 'hugIcon', 'hugIcon'];
    return (org.safetyGuidelines || []).map((rule, index) => {
      if (typeof rule === 'string') {
        return {
          id: `${org.id}-legacy-${index}`,
          text: rule,
          imageKey: defaultImageKeys[index % defaultImageKeys.length],
          imageUrl: undefined,
          mediaType: 'image' as const,
        };
      }
      return {
        ...rule,
        mediaType: rule.mediaType || (rule.imageUrl ? 'image' : 'image'),
      };
    });
  }, [safeOrganization]);

  const currentMember = useMemo<Member | undefined>(() => {
    if (!userProfile?.email) return undefined;
    return members.find((m) => m.email === userProfile.email);
  }, [members, userProfile]);

  const organizationMembers = useMemo(() => {
    const org = safeOrganization;
    if (!org) return [];
    return members.filter(
      (m) =>
        m.organizationId === org.id &&
        m.role === '기업 재직자' &&
        m.email !== org.adminEmail,
    );
  }, [members, safeOrganization]);

  const adminMember = useMemo<Member | undefined>(() => {
    const org = safeOrganization;
    if (!org) return undefined;
    return members.find((m) => m.email === org.adminEmail && m.role === '관리자');
  }, [members, safeOrganization]);

  useEffect(() => {
    setExpandedTraitMembers((prev) => {
      if (!safeOrganization) {
        return prev;
      }
      let changed = false;
      const next = { ...prev };
      organizationMembers.forEach((member) => {
        if (member.traits?.length && typeof next[member.id] === 'undefined') {
          next[member.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [safeOrganization, organizationMembers]);


  useEffect(() => {
    if (safeOrganization) {
      setGuidelineDrafts(normalizedGuidelines.map((rule) => ({ ...rule })));
    }
  }, [safeOrganization, normalizedGuidelines]);

  useEffect(() => {
    const sourceMode = (currentMember?.reminderMode as ReminderMode) ?? profileReminderMode ?? 'daily';
    const timeSource = currentMember?.reminderTime ?? profileReminderTime ?? '09:00';
    const intervalSource = currentMember?.reminderIntervalHours ?? profileReminderInterval ?? 4;
    const parsedHour = timeSource ? parseInt(timeSource.split(':')[0], 10) : 9;

    setReminderDraft({
      mode: sourceMode,
      dailyHour: Number.isNaN(parsedHour) ? 9 : parsedHour,
      intervalHours: intervalSource,
    });
  }, [
    currentMember?.reminderMode,
    currentMember?.reminderTime,
    currentMember?.reminderIntervalHours,
    profileReminderMode,
    profileReminderTime,
    profileReminderInterval,
  ]);

  const isFocused = useIsFocused();

  // 탭에 포커스가 있을 때 모달 표시 로직
  useEffect(() => {
    // 포커스가 없거나 모달이 이미 열려있거나 모달을 여는 중이면 실행하지 않음
    if (!isFocused || !isEmployee || !safeOrganization || !currentMember || safetyModalVisible || isModalOpeningRef.current) {
      return;
    }

    const shouldShowModal = currentMember.showSafetyModalOnWorkTab !== false; // 기본값은 true
    
    if (shouldShowModal) {
      // 토글이 켜져 있으면: 탭에 들어올 때마다 모달 표시 (같은 탭 내에서는 한 번만)
      if (!hasShownSafetyModalRef.current) {
        hasShownSafetyModalRef.current = true;
        isModalOpeningRef.current = true;
        setSafetyModalVisible(true);
        setCurrentGuidelineIndex(0);
        setTimeout(() => {
          guidelineFlatListRef.current?.scrollToIndex({ index: 0, animated: false });
          isModalOpeningRef.current = false;
        }, 100);
      }
    } else {
      // 토글이 꺼져 있으면: 앱 최초 접속 시에만 모달 표시
      if (!hasShownOnFirstMountRef.current) {
        hasShownOnFirstMountRef.current = true;
        isModalOpeningRef.current = true;
        setSafetyModalVisible(true);
        setCurrentGuidelineIndex(0);
        setTimeout(() => {
          guidelineFlatListRef.current?.scrollToIndex({ index: 0, animated: false });
          isModalOpeningRef.current = false;
        }, 100);
      }
    }
  }, [isFocused, isEmployee, safeOrganization, currentMember, safetyModalVisible]);

  // 탭을 벗어났을 때 ref를 리셋하여 다음에 다시 들어올 때 모달이 뜨도록 함
  useEffect(() => {
    if (!isFocused) {
      hasShownSafetyModalRef.current = false;
      isModalOpeningRef.current = false;
    }
  }, [isFocused]);

  useEffect(() => {
    if (isEmployee && userProfile?.email) {
      subscribeToMoodCheckTopic().catch(() => {});
    }
  }, [isEmployee, userProfile?.email]);

  // TTS 완료 이벤트 리스너
  useEffect(() => {
    TTS.addEventListener('tts-finish', () => {
      setSpeakingSection(null);
    });
    TTS.addEventListener('tts-cancel', () => {
      setSpeakingSection(null);
    });
  }, []);

  useEffect(() => {
    if (!isEmployee || !currentMember?.email) {
      return undefined;
    }

    const sendReminder = () => {
      updateMemberStatus(currentMember.email, {
        lastSafetyReminderAt: new Date().toISOString(),
        safetyAcknowledged: false,
      });
    };

    let intervalRef: NodeJS.Timeout | null = null;
    let timeoutRef: NodeJS.Timeout | null = null;

    if (currentMember.reminderMode === 'interval') {
      const hours = Math.max(1, currentMember.reminderIntervalHours || 4);
      intervalRef = setInterval(sendReminder, hours * 60 * 60 * 1000);
    } else {
      const scheduleDailyReminder = () => {
        const hour = currentMember.reminderTime
          ? parseInt(currentMember.reminderTime.split(':')[0], 10)
          : 9;
        const now = new Date();
        const target = new Date();
        target.setHours(Number.isNaN(hour) ? 9 : hour, 0, 0, 0);
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }
        const delay = target.getTime() - now.getTime();
        timeoutRef = setTimeout(() => {
          sendReminder();
          scheduleDailyReminder();
        }, delay);
      };
      scheduleDailyReminder();
    }

    return () => {
      if (intervalRef) clearInterval(intervalRef);
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [
    isEmployee,
    currentMember?.email,
    currentMember?.reminderMode,
    currentMember?.reminderIntervalHours,
    currentMember?.reminderTime,
    updateMemberStatus,
  ]);

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>사용자 정보를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  // 기업 재직자와 관리자 모두 조직이 없어도 기본 화면을 보여줌
  // safeOrganization이 null이면 기본 조직을 생성하므로 이 체크는 필요 없음

  const handleOpenManageMembers = () => {
    navigation.navigate('WorkManageMembers');
  };


  const handlePhotoSave = (media: MediaSelection) => {
    const uri = media.uri;
    updateProfile({ avatarUrl: uri });
    if (currentMember?.email) {
      updateMemberStatus(currentMember.email, { avatarUrl: uri });
    }
  };

  const toggleSafetyAcknowledgement = (value: boolean) => {
    if (currentMember?.email) {
      updateMemberStatus(currentMember.email, {
        safetyAcknowledged: value,
        lastSafetyAckAt: new Date().toISOString(),
      });
    }
  };


  const handleCompanyPhotoSave = (media: MediaSelection) => {
    const org = safeOrganization;
    if (!org) return;
    updateOrganization(org.id, {
      companyImageUrl: media.uri,
    });
    setCompanyPhotoPickerVisible(false);
  };

  const handleOpenGuidelinePhotoPicker = (guideline: SafetyGuideline) => {
    setGuidelinePhotoPicker({
      visible: true,
      targetId: guideline.id,
      initialUrl: guideline.imageUrl,
      initialType: guideline.mediaType || 'image',
    });
  };

  const handleCloseGuidelinePhotoPicker = () =>
    setGuidelinePhotoPicker({ visible: false, targetId: null, initialUrl: undefined, initialType: 'image' });

  const handleGuidelinePhotoSave = (media: MediaSelection) => {
    if (guidelinePhotoPicker.targetId) {
      setGuidelineDrafts((prev) =>
        prev.map((item) =>
          item.id === guidelinePhotoPicker.targetId
            ? { ...item, imageUrl: media.uri, mediaType: media.type }
            : item,
        ),
      );
    }
    handleCloseGuidelinePhotoPicker();
  };

  const handleClearGuidelinePhoto = (id: string) => {
    setGuidelineDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, imageUrl: undefined, mediaType: undefined } : item)),
    );
  };

  const handleOpenMedia = async (uri?: string) => {
    if (!uri) {
      return;
    }
    try {
      const supported = await Linking.canOpenURL(uri);
      if (!supported) {
        throw new Error('unsupported');
      }
      await Linking.openURL(uri);
    } catch (error) {
      console.error('[WorkScreen] 미디어 열기 실패:', error);
      Alert.alert('열 수 없어요', '이 미디어를 열 수 없습니다. 다시 선택해 주세요.');
    }
  };

  const adjustDailyHour = (delta: number) => {
    setReminderDraft((prev) => {
      let nextHour = prev.dailyHour + delta;
      if (nextHour < 0) nextHour = 23;
      if (nextHour > 23) nextHour = 0;
      return { ...prev, dailyHour: nextHour };
    });
  };

  const adjustIntervalHours = (delta: number) => {
    setReminderDraft((prev) => {
      const nextInterval = Math.min(12, Math.max(1, prev.intervalHours + delta));
      return { ...prev, intervalHours: nextInterval };
    });
  };

  const handleReminderSave = () => {
    const hourString = reminderDraft.dailyHour.toString().padStart(2, '0');
    if (reminderDraft.mode === 'daily') {
      if (currentMember?.email) {
        updateMemberStatus(currentMember.email, {
          reminderMode: 'daily',
          reminderTime: `${hourString}:00`,
          reminderIntervalHours: reminderDraft.intervalHours,
        });
      }
      updateProfile({
        reminderMode: 'daily',
        reminderTime: `${hourString}:00`,
        reminderIntervalHours: reminderDraft.intervalHours,
      } as any);
      Alert.alert('저장 완료', `${hourString}시에 알림을 드릴게요.`);
    } else {
      const hours = Math.max(1, reminderDraft.intervalHours);
      if (currentMember?.email) {
        updateMemberStatus(currentMember.email, {
          reminderMode: 'interval',
          reminderIntervalHours: hours,
          reminderTime: undefined,
        });
      }
      updateProfile({
        reminderMode: 'interval',
        reminderIntervalHours: hours,
        reminderTime: undefined,
      } as any);
      Alert.alert('저장 완료', `${hours}시간마다 알림을 드릴게요.`);
    }
  };

  const handleGuidelineTextChange = (id: string, text: string) => {
    setGuidelineDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const handleAddGuideline = () => {
    const defaultImageKeys: IconKey[] = ['hugIcon', 'hugIcon', 'hugIcon', 'hugIcon'];
    setGuidelineDrafts((prev) => [
      ...prev,
      {
        id: makeGuidelineId(),
        text: '',
        imageKey: defaultImageKeys[prev.length % defaultImageKeys.length],
        imageUrl: undefined,
        mediaType: 'image',
      },
    ]);
  };

  const handleRemoveGuideline = (id: string) => {
    setGuidelineDrafts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveGuidelines = () => {
    const org = safeOrganization;
    if (!org) return;
    const cleaned = guidelineDrafts
      .map((item) => ({ 
        ...item, 
        text: item.text.trim(),
      }))
      .filter((item) => item.text.length > 0);
    const nextGuidelines: SafetyGuideline[] =
      cleaned.length > 0
        ? cleaned
        : [
            {
              id: makeGuidelineId(),
              text: '안전 수칙을 입력해 주세요.',
              imageKey: 'hugIcon' as IconKey,
              imageUrl: undefined,
              mediaType: 'image',
            },
          ];

    updateOrganization(org.id, {
      safetyGuidelines: nextGuidelines,
    });
    setOrgInfoModalVisible(false);
  };


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmployee && currentMember && !currentMember.safetyAcknowledged && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>안전 수칙을 꼭 읽어주세요</Text>
            <Text style={styles.warningText}>관리자가 확인할 때까지 이 안내를 유지합니다.</Text>
            <TouchableOpacity style={styles.warningButton} onPress={() => setSafetyModalVisible(true)}>
              <Text style={styles.warningButtonText}>안전 수칙 보기</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>일하기</Text>
            <View style={styles.headerActions}>
            {isAdmin && (
              <>
              <TouchableOpacity style={styles.iconTap} onPress={handleOpenManageMembers}>
                <FeatherIcon name="user-plus" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconTap} onPress={() => navigation.navigate('WorkSettings')}>
                <FeatherIcon name="settings" size={24} color="#000" />
              </TouchableOpacity>
              </>
          )}
          </View>
        </View>

        {/* 관리자 사진 섹션 (기업 재직자에게만 표시) */}
        {safeOrganization && !isAdmin && (
          <View style={styles.adminPhotoSection}>
            <Text style={styles.sectionTitle}>관리자</Text>
            <View style={styles.adminPhotoContainer}>
              {adminMember?.avatarUrl ? (
                <Image source={{ uri: adminMember.avatarUrl }} style={styles.adminPhotoImage} />
              ) : (
                <View style={styles.adminPhotoPlaceholder}>
                  <Text style={styles.adminPhotoPlaceholderText}>
                    {safeOrganization.adminName ? safeOrganization.adminName.charAt(0) : '관'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.adminDescription}>
              {safeOrganization.adminName || '관리자'}님은 우리를 도와주시는 분이에요.{'\n'}
              언제든지 이야기하고 싶은 일이 있으면 알려주세요.
            </Text>
            {isEmployee && (
              <TouchableOpacity
                style={styles.ttsButtonBottom}
                onPress={async () => {
                  if (speakingSection === 'admin') {
                    await stopSpeaking();
                    setSpeakingSection(null);
                    return;
                  }
                  const adminText = `${safeOrganization.adminName || '관리자'}님은 우리를 도와주시는 분이에요. 언제든지 이야기하고 싶은 일이 있으면 알려주세요.`;
                  setSpeakingSection('admin');
                  await speakText(adminText);
                }}
                activeOpacity={0.7}
              >
                <FeatherIcon
                  name={speakingSection === 'admin' ? 'volume-2' : 'volume-1'}
                  size={16}
                  color={speakingSection === 'admin' ? '#FFA000' : '#666'}
                />
                <Text style={styles.ttsButtonText}>
                  {speakingSection === 'admin' ? '읽는 중...' : '전체 읽기'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>프로필</Text>
          <View style={styles.profileInfo}>
            <TouchableOpacity onPress={() => setPhotoModalVisible(true)}>
              {userProfile.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profilePlaceholderText}>{userProfile.name.charAt(0)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileMeta}>{userProfile.email}</Text>
              <Text style={styles.profileMeta}>{safeOrganization?.name || '조직 미지정'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.photoButton} onPress={() => setPhotoModalVisible(true)}>
            <Text style={styles.photoButtonText}>프로필 사진 변경</Text>
          </TouchableOpacity>
          {isEmployee && (
            <TouchableOpacity
              style={styles.ttsButtonBottom}
              onPress={async () => {
                if (speakingSection === 'profile') {
                  await stopSpeaking();
                  setSpeakingSection(null);
                  return;
                }
                const profileText = `${userProfile.name}. ${userProfile.email}. ${safeOrganization?.name || '조직 미지정'}`;
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
              <Text style={styles.ttsButtonText}>
                {speakingSection === 'profile' ? '읽는 중...' : '전체 읽기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {safeOrganization && (
          <View style={styles.companyCard}>
            <Text style={styles.cardTitle}>회사 사진</Text>
            <Image
              source={getCompanyImageSource(safeOrganization.companyImageUrl, safeOrganization.companyImageKey)}
              style={styles.companyImage}
              resizeMode="cover"
            />
            <Text style={styles.companyDescription}>
              이 그림을 보면 내가 속한 회사를 바로 떠올릴 수 있어요.
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.companyEditButton}
                onPress={() => setCompanyPhotoPickerVisible(true)}
              >
                <Text style={styles.companyEditText}>사진 바꾸기</Text>
              </TouchableOpacity>
            )}
            {isEmployee && (
              <TouchableOpacity
                style={styles.ttsButtonBottom}
                onPress={async () => {
                  if (speakingSection === 'company') {
                    await stopSpeaking();
                    setSpeakingSection(null);
                    return;
                  }
                  const companyText = `회사 사진. 이 그림을 보면 내가 속한 회사를 바로 떠올릴 수 있어요.`;
                  setSpeakingSection('company');
                  await speakText(companyText);
                }}
                activeOpacity={0.7}
              >
                <FeatherIcon
                  name={speakingSection === 'company' ? 'volume-2' : 'volume-1'}
                  size={16}
                  color={speakingSection === 'company' ? '#FFA000' : '#666'}
                />
                <Text style={styles.ttsButtonText}>
                  {speakingSection === 'company' ? '읽는 중...' : '전체 읽기'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}


        {isEmployee && (
          <View style={styles.reminderCard}>
            <Text style={styles.cardTitle}>알림 시간 정하기</Text>
            <Text style={styles.reminderDescription}>기분 적기와 안전 수칙 확인 알림을 언제 받을지 골라요.</Text>
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  reminderDraft.mode === 'daily' && styles.modeChipActive,
                ]}
                onPress={() => setReminderDraft((prev) => ({ ...prev, mode: 'daily' }))}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    reminderDraft.mode === 'daily' && styles.modeChipTextActive,
                  ]}
                >
                  매일 같은 시간
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  reminderDraft.mode === 'interval' && styles.modeChipActive,
                ]}
                onPress={() => setReminderDraft((prev) => ({ ...prev, mode: 'interval' }))}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    reminderDraft.mode === 'interval' && styles.modeChipTextActive,
                  ]}
                >
                  몇 시간마다
                </Text>
              </TouchableOpacity>
            </View>
            {/* 저장된 알림 설정 표시 */}
            {(() => {
              // 저장된 알림 설정 가져오기
              const savedMode = (currentMember?.reminderMode as ReminderMode) ?? profileReminderMode ?? 'daily';
              const savedTime = currentMember?.reminderTime ?? profileReminderTime ?? '09:00';
              const savedIntervalHours = currentMember?.reminderIntervalHours ?? profileReminderInterval ?? 4;
              const savedHour = savedTime ? parseInt(savedTime.split(':')[0], 10) : 9;
              
              return (
                <>
            <Text style={styles.reminderHint}>
                    {savedMode === 'daily'
                      ? `지금은 매일 ${savedHour.toString().padStart(2, '0')}:00에 알림이 울려요.`
                      : `지금은 ${savedIntervalHours}시간마다 알림이 울려요.`}
            </Text>
                  {/* 다음 알림 시간 표시 */}
                  {(() => {
                    const now = new Date();
                    let nextNotificationTime: Date;
                    
                    if (savedMode === 'daily') {
                      // 매일 같은 시간: 오늘 해당 시간이 지났으면 내일, 아니면 오늘
                      const targetHour = savedHour;
                      nextNotificationTime = new Date();
                      nextNotificationTime.setHours(targetHour, 0, 0, 0);
                      if (nextNotificationTime <= now) {
                        nextNotificationTime.setDate(nextNotificationTime.getDate() + 1);
                      }
                    } else {
                      // 몇 시간마다: 오전 12시(0시)를 기준으로 계산 (설정한 시각과 무관)
                      // 예: 4시간마다 → 0시, 4시, 8시, 12시(정오), 16시, 20시, 0시(다음날)...
                      const intervalHours = savedIntervalHours;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0); // 오늘 0시
                      
                      // 오늘 0시를 기준으로 시작
                      const baseTime = new Date(today);
                      baseTime.setHours(0, 0, 0, 0);
                      
                      // 현재 시간 이후의 다음 알림 시간 찾기
                      // 0시부터 intervalHours 간격으로 계산 (0시, 4시, 8시, 12시, 16시, 20시...)
                      let nextTime = new Date(baseTime);
                      
                      // 현재 시간보다 큰 첫 번째 알림 시간을 찾기
                      while (nextTime <= now) {
                        nextTime = new Date(nextTime.getTime() + intervalHours * 60 * 60 * 1000);
                        
                        // 하루를 넘어가면 다음 날로 넘어간 것
                        if (nextTime.getDate() !== today.getDate()) {
                          // 다음 날의 첫 알림 시간 계산
                          // 0시 기준이므로 하루를 넘어가면 다음날 0시부터 시작
                          const nextDay = new Date(today);
                          nextDay.setDate(nextDay.getDate() + 1);
                          nextDay.setHours(0, 0, 0, 0);
                          nextTime = nextDay;
                        }
                      }
                      
                      nextNotificationTime = nextTime;
                    }
                    
                    const hours = nextNotificationTime.getHours();
                    const minutes = nextNotificationTime.getMinutes();
                    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    const isToday = nextNotificationTime.toDateString() === now.toDateString();
                    
                    return (
                      <Text style={styles.nextNotificationText}>
                        다음 알림: {isToday ? `오늘 ${timeStr}` : `내일 ${timeStr}`}
                      </Text>
                    );
                  })()}
                </>
              );
            })()}
            {reminderDraft.mode === 'daily' ? (
              <View style={styles.reminderControlRow}>
                <TouchableOpacity style={styles.adjustButton} onPress={() => adjustDailyHour(-1)}>
                  <Text style={styles.adjustButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.reminderValue}>{reminderDraft.dailyHour.toString().padStart(2, '0')}:00</Text>
                <TouchableOpacity style={styles.adjustButton} onPress={() => adjustDailyHour(1)}>
                  <Text style={styles.adjustButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.reminderControlRow}>
                <TouchableOpacity style={styles.adjustButton} onPress={() => adjustIntervalHours(-1)}>
                  <Text style={styles.adjustButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.reminderValue}>{reminderDraft.intervalHours}시간마다</Text>
                <TouchableOpacity style={styles.adjustButton} onPress={() => adjustIntervalHours(1)}>
                  <Text style={styles.adjustButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={handleReminderSave}>
              <Text style={styles.primaryButtonText}>알림 저장하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ttsButtonBottom}
              onPress={async () => {
                if (speakingSection === 'reminder') {
                  await stopSpeaking();
                  setSpeakingSection(null);
                  return;
                }
                const savedMode = (currentMember?.reminderMode as ReminderMode) ?? profileReminderMode ?? 'daily';
                const savedTime = currentMember?.reminderTime ?? profileReminderTime ?? '09:00';
                const savedIntervalHours = currentMember?.reminderIntervalHours ?? profileReminderInterval ?? 4;
                const savedHour = savedTime ? parseInt(savedTime.split(':')[0], 10) : 9;
                const reminderText = `알림 시간 정하기. 기분 적기와 안전 수칙 확인 알림을 언제 받을지 골라요. ${savedMode === 'daily' ? `지금은 매일 ${savedHour.toString().padStart(2, '0')}시에 알림이 울려요.` : `지금은 ${savedIntervalHours}시간마다 알림이 울려요.`}`;
                setSpeakingSection('reminder');
                await speakText(reminderText);
              }}
              activeOpacity={0.7}
            >
              <FeatherIcon
                name={speakingSection === 'reminder' ? 'volume-2' : 'volume-1'}
                size={16}
                color={speakingSection === 'reminder' ? '#FFA000' : '#666'}
              />
              <Text style={styles.ttsButtonText}>
                {speakingSection === 'reminder' ? '읽는 중...' : '전체 읽기'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.guidelinesSection}>
          <View style={styles.guidelineHeader}>
            <Text style={styles.cardTitle}>🏢 우리 회사 안전 수칙</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.linkButton} onPress={() => setOrgInfoModalVisible(true)}>
                <Text style={styles.linkButtonText}>안전 규칙 수정</Text>
              </TouchableOpacity>
            )}
          </View>
          {normalizedGuidelines.map((guideline, idx) => (
            <View key={guideline.id} style={styles.guidelineItem}>
              <View style={styles.guidelineNumber}>
                <Text style={styles.guidelineNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.guidelineContent}>
                <View style={styles.guidelineIconBox}>
                  {guideline.mediaType === 'video' && guideline.imageUrl ? (
                    <TouchableOpacity
                      style={styles.guidelineVideoBadge}
                      onPress={() => handleOpenMedia(guideline.imageUrl)}
                    >
                      <FeatherIcon name="play" size={18} color="#fff" />
                      <Text style={styles.guidelineVideoBadgeText}>영상 보기</Text>
                    </TouchableOpacity>
                  ) : (
                    <Image
                      source={
                        guideline.imageUrl
                          ? typeof guideline.imageUrl === 'string' && guideline.imageUrl.startsWith('file://')
                            ? { uri: guideline.imageUrl }
                            : (guideline.imageUrl as ImageSourcePropType)
                          : getIconSource(guideline.imageKey)
                      }
                      style={styles.guidelineIcon}
                    />
                  )}
                </View>
                <Text style={styles.guidelineText}>{guideline.text}</Text>
              </View>
            </View>
          ))}
          {isEmployee && (
            <TouchableOpacity
              style={styles.ttsButtonBottom}
              onPress={async () => {
                if (speakingSection === 'guidelines') {
                  await stopSpeaking();
                  setSpeakingSection(null);
                  return;
                }
                if (normalizedGuidelines.length === 0) {
                  const emptyText = '안전 수칙. 아직 안전 수칙이 등록되지 않았습니다.';
                  setSpeakingSection('guidelines');
                  await speakText(emptyText);
                  return;
                }
                const guidelinesText = normalizedGuidelines.map((guideline, idx) => 
                  `${idx + 1}번째 수칙. ${guideline.text}`
                ).join('. ');
                const fullText = `우리 회사 안전 수칙. ${guidelinesText}`;
                setSpeakingSection('guidelines');
                await speakText(fullText);
              }}
              activeOpacity={0.7}
            >
              <FeatherIcon
                name={speakingSection === 'guidelines' ? 'volume-2' : 'volume-1'}
                size={16}
                color={speakingSection === 'guidelines' ? '#FFA000' : '#666'}
              />
              <Text style={styles.ttsButtonText}>
                {speakingSection === 'guidelines' ? '읽는 중...' : '전체 읽기'}
              </Text>
            </TouchableOpacity>
          )}
        </View>


      </ScrollView>

      <ProfilePhotoPicker
        visible={photoModalVisible}
        initialUrl={userProfile.avatarUrl}
        onClose={() => setPhotoModalVisible(false)}
        onSave={handlePhotoSave}
      />
      <ProfilePhotoPicker
        visible={companyPhotoPickerVisible}
        initialUrl={safeOrganization?.companyImageUrl}
        onClose={() => setCompanyPhotoPickerVisible(false)}
        onSave={handleCompanyPhotoSave}
      />
      <ProfilePhotoPicker
        visible={guidelinePhotoPicker.visible}
        initialUrl={guidelinePhotoPicker.initialUrl}
        initialType={guidelinePhotoPicker.initialType}
        allowedMediaTypes="mixed"
        onClose={handleCloseGuidelinePhotoPicker}
        onSave={handleGuidelinePhotoSave}
      />
      <Modal
        visible={orgInfoModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOrgInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>안전 규칙 수정</Text>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionLabel}>안전 수칙</Text>
              {guidelineDrafts.map((item, index) => (
                <View key={item.id} style={styles.guidelineInputRow}>
                  <View style={styles.guidelinePhotoColumn}>
                    {item.mediaType === 'video' && item.imageUrl ? (
                      <TouchableOpacity
                        style={styles.guidelineVideoPreview}
                        onPress={() => handleOpenMedia(item.imageUrl)}
                      >
                        <FeatherIcon name="play-circle" size={32} color="#fff" />
                        <Text style={styles.guidelineVideoPreviewText}>선택된 영상 재생</Text>
                      </TouchableOpacity>
                    ) : (
                      <Image
                        source={item.imageUrl ? { uri: item.imageUrl } : getIconSource(item.imageKey)}
                        style={styles.guidelinePreviewImage}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.smallPhotoButton}
                      onPress={() => handleOpenGuidelinePhotoPicker(item)}
                    >
                      <Text style={styles.smallPhotoButtonText}>사진/영상 바꾸기</Text>
                    </TouchableOpacity>
                    {item.imageUrl && (
                      <TouchableOpacity
                        style={styles.clearPhotoButton}
                        onPress={() => handleClearGuidelinePhoto(item.id)}
                      >
                        <Text style={styles.clearPhotoButtonText}>미디어 지우기</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.guidelineTextColumn}>
                    <TextInput
                      style={styles.guidelineInput}
                      value={item.text}
                      onChangeText={(text) => handleGuidelineTextChange(item.id, text)}
                      placeholder={`수칙 ${index + 1}`}
                    />
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveGuideline(item.id)}>
                    <Text style={styles.removeButtonText}>지우기</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={handleAddGuideline}>
                <Text style={styles.addButtonText}>+ 수칙 추가</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setOrgInfoModalVisible(false)}>
                <Text style={styles.secondaryButtonText}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveGuidelines}>
                <Text style={styles.primaryButtonText}>저장하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={safetyModalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.overlayBlock}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTitleRow}>
            <Text style={styles.modalTitle}>안전 수칙을 먼저 읽어주세요</Text>
              {isEmployee && normalizedGuidelines.length > 0 && (
                <TouchableOpacity
                  style={styles.modalTtsButton}
                  onPress={async () => {
                    const speakingKey = 'modal-guidelines';
                    if (speakingSection === speakingKey) {
                      await stopSpeaking();
                      setSpeakingSection(null);
                      return;
                    }
                    const guidelinesText = normalizedGuidelines.map((guideline, idx) => 
                      `${idx + 1}번째 수칙. ${guideline.text}`
                    ).join('. ');
                    const fullText = `안전 수칙을 먼저 읽어주세요. ${guidelinesText}`;
                    setSpeakingSection(speakingKey);
                    await speakText(fullText);
                  }}
                  activeOpacity={0.7}
                >
                  <FeatherIcon
                    name={speakingSection === 'modal-guidelines' ? 'volume-2' : 'volume-1'}
                    size={16}
                    color={speakingSection === 'modal-guidelines' ? '#FFA000' : '#666'}
                  />
                  <Text style={styles.modalTtsButtonText}>
                    {speakingSection === 'modal-guidelines' ? '읽는 중...' : '전체 읽기'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {normalizedGuidelines.length > 0 && (
              <>
                {currentGuidelineIndex < normalizedGuidelines.length - 1 && (
                  <Text style={styles.swipeHint}>
                    👈 왼쪽으로 손가락을 넘겨서 다음 수칙을 보세요
                  </Text>
                )}
                <View style={styles.guidelineFlatListContainer}>
                  <FlatList
                    ref={guidelineFlatListRef}
                    data={normalizedGuidelines}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `modal-${item.id}`}
                    getItemLayout={(_, index) => ({
                      length: SCREEN_WIDTH - 72,
                      offset: (SCREEN_WIDTH - 72) * index,
                      index,
                    })}
                    onScrollToIndexFailed={(info) => {
                      const wait = new Promise((resolve) => setTimeout(resolve, 500));
                      wait.then(() => {
                        guidelineFlatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                      });
                    }}
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(
                        event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width,
                      );
                      setCurrentGuidelineIndex(index);
                    }}
                    renderItem={({ item, index }) => (
                      <View style={styles.guidelineCard}>
                        <View style={styles.guidelineCardImageContainer}>
                          {item.mediaType === 'video' && item.imageUrl ? (
                            <TouchableOpacity
                              style={styles.guidelineCardVideo}
                              onPress={() => handleOpenMedia(item.imageUrl)}
                            >
                              <FeatherIcon name="play-circle" size={48} color="#fff" />
                              <Text style={styles.guidelineCardVideoText}>영상 보기</Text>
                            </TouchableOpacity>
                          ) : (
                            <Image
                              source={
                                item.imageUrl
                                  ? typeof item.imageUrl === 'string' && item.imageUrl.startsWith('file://')
                                    ? { uri: item.imageUrl }
                                    : (item.imageUrl as ImageSourcePropType)
                                  : getIconSource(item.imageKey)
                              }
                              style={styles.guidelineCardImage}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                        <View style={styles.guidelineCardNumber}>
                          <Text style={styles.guidelineCardNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.guidelineCardText}>{item.text}</Text>
                      </View>
                    )}
                  />
                </View>
                <View style={styles.guidelineIndicators}>
                  {normalizedGuidelines.map((_, idx) => (
                    <View
                      key={`indicator-${idx}`}
                      style={[
                        styles.guidelineIndicator,
                        idx === currentGuidelineIndex && styles.guidelineIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
                {currentGuidelineIndex === normalizedGuidelines.length - 1 && (
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.modalConfirmButton]}
                    onPress={() => {
                      toggleSafetyAcknowledgement(true);
                      setSafetyModalVisible(false);
                      setCurrentGuidelineIndex(0);
                      // 모달을 닫았을 때는 ref를 리셋하지 않음 (같은 탭 내에서는 한 번만 보여주기 위해)
                      // cleanup에서만 ref를 리셋하여 탭을 벗어났다가 다시 들어올 때 모달이 뜨도록 함
                    }}
                  >
                    <Text style={styles.primaryButtonText}>알겠어요</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Trait 편집 모달 */}
      <Modal
        visible={traitEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setTraitEditModalVisible(false);
          setSelectedTraitMember(null);
          setEditingTrait(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <TraitEditModal
            member={selectedTraitMember}
            editingTrait={editingTrait}
            onClose={() => {
              setTraitEditModalVisible(false);
              setSelectedTraitMember(null);
              setEditingTrait(null);
            }}
            onSave={(trait) => {
              if (!selectedTraitMember) return;
              if (editingTrait) {
                updateMemberTrait(selectedTraitMember.email, editingTrait.id, trait);
              } else {
                addMemberTrait(selectedTraitMember.email, trait);
              }
              setTraitEditModalVisible(false);
              setSelectedTraitMember(null);
              setEditingTrait(null);
            }}
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// Trait 편집 모달 컴포넌트
interface TraitEditModalProps {
  member: Member | null;
  editingTrait: MemberTrait | null;
  onClose: () => void;
  onSave: (trait: Omit<MemberTrait, 'id' | 'lastUpdatedAt'>) => void;
}

const TraitEditModal: React.FC<TraitEditModalProps> = ({ member, editingTrait, onClose, onSave }) => {
  const [situation, setSituation] = useState(editingTrait?.situation || '');
  const [strategy, setStrategy] = useState(editingTrait?.strategy || '');

  React.useEffect(() => {
    setSituation(editingTrait?.situation || '');
    setStrategy(editingTrait?.strategy || '');
  }, [editingTrait]);

  const handleSave = () => {
    if (!situation.trim() || !strategy.trim()) {
      Alert.alert('내용을 입력해 주세요', '상황과 행동 방법을 모두 입력해 주세요.');
      return;
    }
    onSave({ situation: situation.trim(), strategy: strategy.trim() });
  };

  if (!member) return null;

  return (
    <View style={traitModalStyles.overlay}>
      <ScrollView
        contentContainerStyle={traitModalStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={traitModalStyles.content}>
          <Text style={traitModalStyles.title}>
            {member.name}님의 상황 카드 {editingTrait ? '수정' : '추가'}
          </Text>

          <View style={traitModalStyles.fieldGroup}>
            <Text style={traitModalStyles.fieldLabel}>어떤 때에 힘들어지나요?</Text>
            <TextInput
              style={traitModalStyles.textField}
              placeholder="예: 큰 소리가 나면 깜짝 놀라고 숨이 차요."
              placeholderTextColor="#999"
              value={situation}
              onChangeText={setSituation}
              multiline
            />
          </View>

          <View style={traitModalStyles.fieldGroup}>
            <Text style={traitModalStyles.fieldLabel}>그때 이렇게 하면 좋아요</Text>
            <TextInput
              style={traitModalStyles.textField}
              placeholder="예: 숨을 세 번 쉬고 관리자에게 조용한 곳을 부탁해요."
              placeholderTextColor="#999"
              value={strategy}
              onChangeText={setStrategy}
              multiline
            />
          </View>

          <View style={traitModalStyles.buttonRow}>
            <TouchableOpacity style={traitModalStyles.cancelButton} onPress={onClose}>
              <Text style={traitModalStyles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={traitModalStyles.saveButton} onPress={handleSave}>
              <Text style={traitModalStyles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default WorkScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: SCREEN_HEIGHT * 0.05,
    paddingBottom: SCREEN_HEIGHT * 0.05,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  adminPhotoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  adminPhotoContainer: {
    marginBottom: 16,
  },
  adminPhotoImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#eee',
  },
  adminPhotoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#4D96FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminPhotoPlaceholderText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
  },
  adminDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  adminPhotoButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4D96FF',
  },
  adminPhotoButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconTap: {
    padding: 6,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eee',
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
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  profileMeta: {
    fontSize: 14,
    color: '#666',
  },
  photoButton: {
    marginTop: 16,
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    fontWeight: '700',
    color: '#000',
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  companyImage: {
    width: 120,
    height: 120,
    marginVertical: 12,
  },
  companyDescription: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  companyEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF5DA',
  },
  companyEditText: {
    color: '#9A6C00',
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  reminderDescription: {
    color: '#666',
    marginBottom: 12,
  },
  reminderHint: {
    color: '#8A6D00',
    marginBottom: 8,
    fontSize: 13,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  modeChipActive: {
    backgroundColor: '#FFEAB5',
    borderColor: '#FFC107',
  },
  modeChipText: {
    color: '#666',
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: '#000',
  },
  reminderControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8A6D00',
  },
  nextNotificationText: {
    fontSize: 14,
    color: '#8A6D00',
    fontWeight: '600',
    marginBottom: 12,
  },
  reminderValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  memberInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#1C1C1C',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#555',
    fontWeight: '600',
  },
  guidelinesSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  ttsButton: {
    padding: 6,
    borderRadius: 8,
  },
  ttsButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  ttsButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  guidelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidelineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF5DA',
  },
  linkButtonText: {
    color: '#9A6C00',
    fontWeight: '700',
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  guidelineContent: {
    flex: 1,
    alignItems: 'center',
  },
  guidelineIconBox: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#FFF3CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guidelineIcon: {
    width: 90,
    height: 90,
  },
  guidelineNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4D96FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  guidelineNumberText: {
    color: '#fff',
    fontWeight: '700',
  },
  guidelineText: {
    width: '100%',
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
    fontSize: 15,
  },
  employeeSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  emotionFeedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  feedRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  feedEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  feedMember: {
    fontWeight: '700',
    color: '#333',
  },
  feedText: {
    color: '#555',
  },
  feedTime: {
    color: '#999',
    fontSize: 12,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEEAD',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8A6D00',
    marginBottom: 6,
  },
  warningText: {
    color: '#8A6D00',
    marginBottom: 10,
  },
  warningButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFC107',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  warningButtonText: {
    color: '#000',
    fontWeight: '700',
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
  },
  secondarySmallButton: {
    flex: 1,
    backgroundColor: '#F1F1F1',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondarySmallButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  historySection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
  },
  historyTitle: {
    fontWeight: '700',
    color: '#8A6D00',
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyMood: {
    fontSize: 18,
    width: 32,
    textAlign: 'center',
  },
  historyText: {
    color: '#333',
    marginBottom: 2,
  },
  historyTime: {
    color: '#666',
    fontSize: 12,
  },
  historyEmptyText: {
    marginTop: 8,
    color: '#777',
  },
  traitSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBEA',
  },
  traitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitTitle: {
    fontWeight: '700',
    color: '#8A6D00',
  },
  traitToggleText: {
    color: '#8A6D00',
    fontWeight: '600',
  },
  traitRow: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE7A0',
  },
  traitLabel: {
    fontSize: 12,
    color: '#8A6D00',
    fontWeight: '700',
  },
  traitValue: {
    fontSize: 14,
    color: '#333',
  },
  traitEmptyText: {
    marginTop: 8,
    color: '#777',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  overlayBlock: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    justifyContent: 'flex-start',
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalTtsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  modalTtsButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalScrollContent: {
    paddingBottom: 32,
  },
  modalSectionLabel: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  guidelinePhotoColumn: {
    width: 90,
    alignItems: 'center',
    marginRight: 10,
  },
  guidelineInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  guidelineTextColumn: {
    flex: 1,
    marginRight: 8,
  },
  guidelineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: '#FFE0E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: '#B71C1C',
    fontWeight: '700',
  },
  guidelinePreviewImage: {
    width: 70,
    height: 70,
    borderRadius: 18,
    marginBottom: 6,
    backgroundColor: '#F2F2F2',
  },
  guidelineVideoBadge: {
    width: 70,
    height: 70,
    borderRadius: 18,
    marginBottom: 6,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  guidelineVideoBadgeText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  guidelineVideoPreview: {
    width: 70,
    height: 70,
    borderRadius: 18,
    marginBottom: 6,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  guidelineVideoPreviewText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  smallPhotoButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  smallPhotoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  clearPhotoButton: {
    marginTop: 4,
  },
  clearPhotoButtonText: {
    fontSize: 11,
    color: '#777',
    textDecorationLine: 'underline',
  },
  addButton: {
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#0066CC',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  guidelineCard: {
    width: SCREEN_WIDTH - 72,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  guidelineCardImageContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.3,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 20,
  },
  guidelineCardImage: {
    width: '100%',
    height: '100%',
  },
  guidelineCardVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  guidelineCardVideoText: {
    color: '#fff',
    fontWeight: '700',
  },
  guidelineCardNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guidelineCardNumberText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 18,
  },
  guidelineCardText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
  guidelineIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
    gap: 8,
  },
  guidelineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  guidelineIndicatorActive: {
    backgroundColor: '#FFC107',
    width: 24,
  },
  guidelineFlatListContainer: {
    maxHeight: SCREEN_HEIGHT * 0.6,
    marginBottom: 8,
  },
  swipeHint: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
    fontWeight: '600',
  },
  modalConfirmButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  traitAddButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  traitAddButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  traitToggleButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  traitRowContent: {
    flex: 1,
  },
  traitRowActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  traitEditButton: {
    backgroundColor: '#4D96FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  traitEditButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  traitDeleteButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  traitDeleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});

const traitModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scrollContent: {
    padding: 20,
  },
  content: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    maxWidth: 500,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginBottom: 6,
  },
  textField: {
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 2,
    borderColor: '#FFD54F',
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  profileInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  feedContentContainer: {
    flex: 1,
  },
  modalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
});

