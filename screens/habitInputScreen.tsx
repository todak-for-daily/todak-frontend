import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, UserRole } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfilePhotoPicker, { MediaSelection } from '../components/ProfilePhotoPicker';
import { useAdmin, MemberTrait } from '../contexts/AdminContext';
import { Picker } from '@react-native-picker/picker';
import { getHabits, createHabit, updateHabit, deleteHabit } from '../services/habitsApi';

type RootStackParamList = {
  RoleSelection: undefined;
  HabitInput: undefined;
  Tabs: undefined;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TraitBlock {
  id: string;
  situation: string; // 기존 호환성 유지
  strategy: string; // 기존 호환성 유지
  traitType?: '감각' | '인지';
  sense?: '시각' | '청각' | '미각' | '후각' | '촉각' | '운동감각';
  time?: string;
  place?: string;
  target?: string;
  trigger?: string;
  description?: string;
  soothingAction?: string;
}

const HabitInputScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const { completeOnboarding, userProfile, updateProfile, userRole } = useAuth();
  const { updateMemberStatus, getMemberByEmail, addMemberTrait, updateMemberTrait, deleteMemberTrait, assignMemberToOrganization } = useAdmin();
  const [traitBlocks, setTraitBlocks] = useState<TraitBlock[]>([
    { id: '1', situation: '', strategy: '', traitType: undefined },
  ]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | undefined>(userProfile?.avatarUrl);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [traitToDelete, setTraitToDelete] = useState<string | null>(null);

  const currentMember = useMemo(() => {
    if (!userProfile?.email) return null;
    return getMemberByEmail(userProfile.email);
  }, [getMemberByEmail, userProfile?.email]);

  // 행동 특성 데이터 로드 (API에서 가져오기)
  useEffect(() => {
    const loadHabits = async () => {
      try {
        const habits = await getHabits();
        if (habits && habits.length > 0) {
          setTraitBlocks(
            habits.map((trait) => ({
              id: trait.id,
              situation: trait.situation || '',
              strategy: trait.strategy || '',
              traitType: trait.traitType,
              sense: trait.sense,
              time: trait.time,
              place: trait.place,
              target: trait.target,
              trigger: trait.trigger,
              description: trait.description,
              soothingAction: trait.soothingAction,
            })),
          );
        } else {
          // 데이터가 없으면 기본 블록 하나 유지
          setTraitBlocks([{ id: '1', situation: '', strategy: '', traitType: undefined }]);
        }
      } catch (error) {
        console.error('행동 특성 로드 오류:', error);
        // 에러가 발생해도 기본 블록은 유지
        if (traitBlocks.length === 0) {
          setTraitBlocks([{ id: '1', situation: '', strategy: '', traitType: undefined }]);
        }
      }
    };

    loadHabits();
  }, []); // 초기 로드만 수행

  useEffect(() => {
    setSelectedPhoto(userProfile?.avatarUrl);
  }, [userProfile?.avatarUrl]);

  const handleAddBlock = () => {
    const newBlock: TraitBlock = {
      id: Date.now().toString(),
      situation: '',
      strategy: '',
      traitType: undefined,
    };
    setTraitBlocks([...traitBlocks, newBlock]);
  };

  const handleDeleteBlock = (id: string) => {
    if (traitBlocks.length === 1) {
      Alert.alert('알림', '하나 이상은 남겨야 해요.');
      return;
    }
    setTraitToDelete(id);
    setDeleteConfirmModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!traitToDelete) return;
    
    const blockToDelete = traitBlocks.find((b) => b.id === traitToDelete);
    if (blockToDelete) {
      // 숫자 ID인 경우 (백엔드에서 온 데이터)
      const habitId = parseInt(traitToDelete, 10);
      if (!isNaN(habitId)) {
        try {
          await deleteHabit(habitId);
          // 성공하면 로컬 상태에서 제거
          setTraitBlocks(traitBlocks.filter((block) => block.id !== traitToDelete));
        } catch (error) {
          console.error('행동 특성 삭제 오류:', error);
          Alert.alert('오류', '행동 특성 삭제에 실패했습니다.');
          return;
        }
      } else {
        // 임시 ID인 경우 (아직 저장되지 않은 데이터) - 로컬에서만 제거
        setTraitBlocks(traitBlocks.filter((block) => block.id !== traitToDelete));
      }
    }
    
    setDeleteConfirmModalVisible(false);
    setTraitToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModalVisible(false);
    setTraitToDelete(null);
  };
  const handleTraitChange = (id: string, field: keyof TraitBlock, value: string | undefined) => {
    setTraitBlocks((prev) =>
      prev.map((block) => {
        if (block.id === id) {
          const updated = { ...block, [field]: value };
          // traitType이 변경되면 관련 필드 초기화
          if (field === 'traitType') {
            if (value === '감각') {
              updated.time = undefined;
              updated.place = undefined;
              updated.target = undefined;
            } else if (value === '인지') {
              updated.sense = undefined;
            }
          }
          return updated;
        }
        return block;
      }),
    );
  };

  const handleEditTrait = (trait: MemberTrait) => {
    setTraitBlocks((prev) => {
      const remaining = prev.filter((block) => block.id !== trait.id);
      return [{
        id: trait.id,
        situation: trait.situation || '',
        strategy: trait.strategy || '',
        traitType: trait.traitType,
        sense: trait.sense,
        time: trait.time,
        place: trait.place,
        target: trait.target,
        trigger: trait.trigger,
        description: trait.description,
        soothingAction: trait.soothingAction,
      }, ...remaining];
    });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSkip = async () => {
    // 온보딩 완료 처리
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    completeOnboarding();
    navigation.replace('Tabs');
  };

  const handleComplete = async () => {
    if (!userProfile?.email) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없어요.');
      return;
    }

    // 유효한 블록 필터링 (새 형식 또는 기존 형식 모두 허용)
    const validBlocks = traitBlocks.filter((block) => {
      // 새 형식 검증
      if (block.traitType) {
        if (block.traitType === '감각') {
          return block.sense && block.trigger?.trim() && block.description?.trim() && block.soothingAction?.trim();
        } else if (block.traitType === '인지') {
          return block.time?.trim() && block.place?.trim() && block.target?.trim() && block.trigger?.trim() && block.description?.trim() && block.soothingAction?.trim();
        }
      }
      // 기존 형식 검증 (호환성 유지)
      return block.situation.trim() && block.strategy.trim();
    });

    try {
      // 기존 habits 가져오기
      const existingHabits = await getHabits();
      
      // 삭제할 habits 찾기 (기존에 있던 것 중 현재 없는 것)
      for (const existingHabit of existingHabits) {
        const stillExists = validBlocks.some((block) => {
          const blockId = parseInt(block.id, 10);
          return !isNaN(blockId) && blockId === existingHabit.id;
        });
        if (!stillExists) {
          try {
            await deleteHabit(existingHabit.id);
          } catch (error) {
            console.error(`행동 특성 삭제 실패 (ID: ${existingHabit.id}):`, error);
          }
        }
      }

      // 추가/업데이트할 habits 처리
      for (const block of validBlocks) {
        const blockId = parseInt(block.id, 10);
        const isExisting = !isNaN(blockId);
        
        const traitData: Partial<Omit<MemberTrait, 'id' | 'lastUpdatedAt'>> = {
          situation: block.situation.trim() || '',
          strategy: block.strategy.trim() || '',
          traitType: block.traitType,
          sense: block.sense,
          time: block.time?.trim(),
          place: block.place?.trim(),
          target: block.target?.trim(),
          trigger: block.trigger?.trim(),
          description: block.description?.trim(),
          soothingAction: block.soothingAction?.trim(),
        };
        
        try {
          if (isExisting) {
            // 업데이트
            await updateHabit(blockId, traitData);
          } else {
            // 추가
            await createHabit(traitData);
          }
        } catch (error) {
          console.error(`행동 특성 ${isExisting ? '수정' : '생성'} 실패:`, error);
          Alert.alert('오류', `행동 특성 ${isExisting ? '수정' : '생성'}에 실패했습니다.`);
          return;
        }
      }

      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      completeOnboarding();
      navigation.replace('Tabs');
    } catch (error) {
      console.error('행동 특성 저장 오류:', error);
      Alert.alert('오류', '행동 특성 저장에 실패했습니다.');
    }
  };

  const handlePhotoSave = (media: MediaSelection) => {
    const uri = media.uri;
    setSelectedPhoto(uri);
    updateProfile({ avatarUrl: uri });
    if (userProfile?.email && userRole !== '일반 사용자') {
      updateMemberStatus(userProfile.email, { avatarUrl: uri });
    }
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>언제 힘들고 어떻게 하면 편해질까요?</Text>
          <Text style={styles.subtitle}>
            힘든 순간을 알려주고, 스스로 도움이 되는 행동을 적어주세요. 관리자가 함께 보고 도와드려요.
          </Text>
        </View>

        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>내 얼굴 사진 넣기</Text>
          <Text style={styles.photoSubtitle}>사진이 있으면 관리자와 동료가 나를 더 빨리 알아봐요.</Text>
          <View style={styles.photoRow}>
            {selectedPhoto ? (
              <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>?</Text>
              </View>
            )}
            <TouchableOpacity style={styles.photoButton} onPress={() => setPhotoModalVisible(true)}>
              <Text style={styles.photoButtonText}>갤러리에서 고르기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.blocksContainer}>
          {traitBlocks.map((block, index) => (
            <View key={block.id} style={styles.habitBlock}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockNumber}>상황 카드 {index + 1}</Text>
                {traitBlocks.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBlock(block.id)}
                  >
                    <Text style={styles.deleteButtonText}>지우기</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 특성 종류 선택 */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>어떤 종류를 적을까요?</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={block.traitType || ''}
                    onValueChange={(value) => handleTraitChange(block.id, 'traitType', value || undefined)}
                    style={styles.picker}
                  >
                    <Picker.Item label="선택해주세요" value="" />
                    <Picker.Item label="감각" value="감각" />
                    <Picker.Item label="인지" value="인지" />
                  </Picker>
                </View>
              </View>

              {/* 감각 선택 시 */}
              {block.traitType === '감각' && (
                <>
                  {/* 감각 종류 선택 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>어떤 감각과 관련이 있나요?</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={block.sense || ''}
                        onValueChange={(value) => handleTraitChange(block.id, 'sense', value || undefined)}
                        style={styles.picker}
                      >
                        <Picker.Item label="선택해주세요" value="" />
                        <Picker.Item label="시각" value="시각" />
                        <Picker.Item label="청각" value="청각" />
                        <Picker.Item label="미각" value="미각" />
                        <Picker.Item label="후각" value="후각" />
                        <Picker.Item label="촉각" value="촉각" />
                        <Picker.Item label="운동감각" value="운동감각" />
                      </Picker>
                    </View>
                  </View>

                  {/* 어떤 상황에서 나타나나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>어떤 상황에서 나타나나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 시끄러울 때"
                      placeholderTextColor="#999"
                      value={block.trigger || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'trigger', text)}
                      multiline
                    />
                  </View>

                  {/* 이 상황에서 어떻게 행동하나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>이 상황에서 어떻게 행동하나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 귀를 막고 심하면 울음"
                      placeholderTextColor="#999"
                      value={block.description || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'description', text)}
                      multiline
                    />
                  </View>

                  {/* 불안할 때 무엇을 하면 괜찮아지나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>힘들 때 무엇을 하면 괜찮아지나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 조용한 곳으로 자리를 이동하면 괜찮아짐"
                      placeholderTextColor="#999"
                      value={block.soothingAction || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'soothingAction', text)}
                      multiline
                    />
                  </View>
                </>
              )}

              {/* 인지 선택 시 */}
              {block.traitType === '인지' && (
                <>
                  {/* 언제 나타나나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>언제 나타나나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 출근 준비할 때, 오전 9시"
                      placeholderTextColor="#999"
                      value={block.time || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'time', text)}
                      multiline
                    />
                  </View>

                  {/* 주로 어디에서 일어나나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>주로 어디에서 일어나나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 집, 버스, 회사, 식당, 회사 복도"
                      placeholderTextColor="#999"
                      value={block.place || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'place', text)}
                      multiline
                    />
                  </View>

                  {/* 누구와 있을 때 나타나나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>누구와 있을 때 나타나나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 혼자, 가족, 동료, 상사, 모르는 사람, 여러 사람"
                      placeholderTextColor="#999"
                      value={block.target || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'target', text)}
                      multiline
                    />
                  </View>

                  {/* 어떤 상황에서 나타나나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>어떤 상황에서 나타나나요?</Text>
                    <TextInput
                      style={styles.textField}
                      placeholder="예: 옷 갈아입을 때"
                      placeholderTextColor="#999"
                      value={block.trigger || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'trigger', text)}
                      multiline
                    />
                  </View>

                  {/* 이 상황에서 어떻게 행동하나요 */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>이 상황에서 어떻게 행동하나요?</Text>
                <TextInput
                  style={styles.textField}
                      placeholder="예: 전 날 밤에 준비해 놓은 옷으로 갈아입어야 기분이 좋음. 아침에 갑자기 다른 옷을 입으라고 하면 기분이 안 좋아짐"
                  placeholderTextColor="#999"
                      value={block.description || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'description', text)}
                  multiline
                />
              </View>

                  {/* 불안할 때 무엇을 하면 괜찮아지나요 */}
              <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>힘들 때 무엇을 하면 괜찮아지나요?</Text>
                <TextInput
                  style={styles.textField}
                      placeholder="예: 옷을 안 갈아입어도 된다고 하면 괜찮아짐"
                  placeholderTextColor="#999"
                      value={block.soothingAction || ''}
                      onChangeText={(text) => handleTraitChange(block.id, 'soothingAction', text)}
                  multiline
                />
              </View>
                </>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
          <Text style={styles.addButtonText}>+ 카드 하나 더 만들기</Text>
        </TouchableOpacity>

        <View style={styles.savedCard}>
          <Text style={styles.savedTitle}>저장된 카드 (관리자가 함께 봐요)</Text>
          {traitBlocks.length > 0 ? (
            traitBlocks.map((trait) => (
              <View key={trait.id} style={styles.savedTraitRow}>
                <View style={styles.savedTraitContent}>
                  {trait.traitType ? (
                    // 새 형식 표시
                    <>
                      <Text style={styles.savedLabel}>특성 종류: {trait.traitType}</Text>
                      {trait.traitType === '감각' && trait.sense && (
                        <Text style={styles.savedValue}>감각: {trait.sense}</Text>
                      )}
                      {trait.traitType === '인지' && (
                        <>
                          {trait.time && <Text style={styles.savedValue}>시간: {trait.time}</Text>}
                          {trait.place && <Text style={styles.savedValue}>장소: {trait.place}</Text>}
                          {trait.target && <Text style={styles.savedValue}>대상: {trait.target}</Text>}
                        </>
                      )}
                      {trait.trigger && (
                        <>
                          <Text style={[styles.savedLabel, styles.savedLabelWithMargin]}>어떤 상황인가요?</Text>
                          <Text style={styles.savedValue}>{trait.trigger}</Text>
                        </>
                      )}
                      {trait.description && (
                        <>
                          <Text style={[styles.savedLabel, styles.savedLabelWithMargin]}>어떻게 행동하나요?</Text>
                          <Text style={styles.savedValue}>{trait.description}</Text>
                        </>
                      )}
                      {trait.soothingAction && (
                        <>
                          <Text style={[styles.savedLabel, styles.savedLabelWithMargin]}>힘들 때 어떻게 하면 괜찮아지나요?</Text>
                          <Text style={styles.savedValue}>{trait.soothingAction}</Text>
                        </>
                      )}
                    </>
                  ) : (
                    // 기존 형식 표시 (호환성 유지)
                    <>
                      <Text style={styles.savedLabel}>힘든 상황</Text>
                      <Text style={styles.savedValue}>{trait.situation}</Text>
                      <Text style={[styles.savedLabel, styles.savedLabelWithMargin]}>이렇게 하면 괜찮아요</Text>
                      <Text style={styles.savedValue}>{trait.strategy}</Text>
                    </>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.savedEditButton}
                  onPress={() => {
                    // trait를 MemberTrait 형식으로 변환하여 수정
                    const memberTrait: MemberTrait = {
                      id: trait.id,
                      situation: trait.situation || '',
                      strategy: trait.strategy || '',
                      lastUpdatedAt: new Date().toISOString(),
                      traitType: trait.traitType,
                      sense: trait.sense,
                      time: trait.time,
                      place: trait.place,
                      target: trait.target,
                      trigger: trait.trigger,
                      description: trait.description,
                      soothingAction: trait.soothingAction,
                    };
                    handleEditTrait(memberTrait);
                  }}
                >
                  <Text style={styles.savedEditText}>수정하기</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.savedEmptyText}>아직 저장된 카드가 없어요. 위에서 내용을 적어주세요.</Text>
          )}
        </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>안 할래요</Text>
        </TouchableOpacity>

          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>저장하고 넘어가기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ProfilePhotoPicker
        visible={photoModalVisible}
        initialUrl={selectedPhoto}
        onClose={() => setPhotoModalVisible(false)}
        onSave={handlePhotoSave}
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
            <Text style={styles.modalTitle}>이 카드를 지울까요?</Text>
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
    </>
  );
};

export default HabitInputScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: SCREEN_HEIGHT * 0.05,
    paddingBottom: SCREEN_HEIGHT * 0.1,
  },
  header: {
    marginBottom: SCREEN_HEIGHT * 0.04,
    alignItems: 'center',
  },
  title: {
    fontSize: SCREEN_WIDTH * 0.07,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SCREEN_HEIGHT * 0.015,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#666',
    textAlign: 'center',
    lineHeight: SCREEN_HEIGHT * 0.025,
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SCREEN_WIDTH * 0.045,
    marginBottom: SCREEN_HEIGHT * 0.03,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  photoTitle: {
    fontSize: SCREEN_WIDTH * 0.05,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  photoSubtitle: {
    color: '#666',
    marginBottom: 14,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SCREEN_WIDTH * 0.04,
  },
  photoPreview: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    borderRadius: SCREEN_WIDTH * 0.1,
    backgroundColor: '#EEE',
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    borderRadius: SCREEN_WIDTH * 0.1,
    backgroundColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: SCREEN_WIDTH * 0.08,
    fontWeight: 'bold',
    color: '#000',
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: SCREEN_WIDTH * 0.04,
    textAlign: 'center',
  },
  blocksContainer: {
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  habitBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SCREEN_WIDTH * 0.05,
    marginBottom: SCREEN_HEIGHT * 0.025,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  blockNumber: {
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    backgroundColor: '#FFE8E8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#B71C1C',
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
    marginBottom: 6,
  },
  textField: {
    backgroundColor: '#FFFDF5',
    borderRadius: 12,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    fontSize: SCREEN_WIDTH * 0.04,
    borderWidth: 2,
    borderColor: '#FFD54F',
    color: '#333',
    textAlignVertical: 'top',
    minHeight: SCREEN_HEIGHT * 0.11,
  },
  addButton: {
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#000',
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SCREEN_WIDTH * 0.03,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#000',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  savedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SCREEN_WIDTH * 0.045,
    marginBottom: SCREEN_HEIGHT * 0.03,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  savedTitle: {
    fontSize: SCREEN_WIDTH * 0.05,
    fontWeight: '700',
    color: '#333',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  savedTraitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: SCREEN_HEIGHT * 0.02,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  savedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  savedValue: {
    fontSize: 15,
    color: '#333',
  },
  savedEditButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  savedEditText: {
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  savedEmptyText: {
    color: '#777',
  },
  savedTraitContent: {
    flex: 1,
  },
  savedLabelWithMargin: {
    marginTop: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#FFD54F',
    borderRadius: 12,
    backgroundColor: '#FFFDF5',
    marginTop: 6,
  },
  picker: {
    height: 50,
    color: '#333',
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
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
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});

