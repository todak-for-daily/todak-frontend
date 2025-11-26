import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import TextWithTTS from './TextWithTTS';
import { Member, MemberTrait } from '../contexts/AdminContext';

interface TraitEditModalProps {
  visible: boolean;
  member: Member | null;
  editingTrait: MemberTrait | null;
  onClose: () => void;
  onSave: (trait: Omit<MemberTrait, 'id' | 'lastUpdatedAt'>) => void;
}

const TraitEditModal: React.FC<TraitEditModalProps> = ({
  visible,
  member,
  editingTrait,
  onClose,
  onSave,
}) => {
  const [traitType, setTraitType] = useState<'감각' | '인지' | ''>(editingTrait?.traitType || '');
  const [sense, setSense] = useState<
    '시각' | '청각' | '미각' | '후각' | '촉각' | '운동감각' | ''
  >(editingTrait?.sense || '');
  const [time, setTime] = useState(editingTrait?.time || '');
  const [place, setPlace] = useState(editingTrait?.place || '');
  const [target, setTarget] = useState(editingTrait?.target || '');
  const [trigger, setTrigger] = useState(editingTrait?.trigger || '');
  const [description, setDescription] = useState(editingTrait?.description || '');
  const [soothingAction, setSoothingAction] = useState(editingTrait?.soothingAction || '');
  const [situation, setSituation] = useState(editingTrait?.situation || '');
  const [strategy, setStrategy] = useState(editingTrait?.strategy || '');

  useEffect(() => {
    setTraitType(editingTrait?.traitType || '');
    setSense(editingTrait?.sense || '');
    setTime(editingTrait?.time || '');
    setPlace(editingTrait?.place || '');
    setTarget(editingTrait?.target || '');
    setTrigger(editingTrait?.trigger || '');
    setDescription(editingTrait?.description || '');
    setSoothingAction(editingTrait?.soothingAction || '');
    setSituation(editingTrait?.situation || '');
    setStrategy(editingTrait?.strategy || '');
  }, [editingTrait]);

  const handleSave = () => {
    const trimmedDescription = description.trim();

    if (traitType) {
      if (!trimmedDescription) {
        Alert.alert?.('내용을 입력해 주세요', '"이 상황에서 어떻게 행동하나요?"를 입력해 주세요.');
        return;
      }

      onSave({
        traitType: traitType as '감각' | '인지',
        sense: sense || undefined,
        time: time.trim() || undefined,
        place: place.trim() || undefined,
        target: target.trim() || undefined,
        trigger: trigger.trim() || undefined,
        description: trimmedDescription,
        soothingAction: soothingAction.trim() || undefined,
        situation: '',
        strategy: '',
      });
    } else {
      if (!situation.trim() || !strategy.trim()) {
        Alert.alert?.('내용을 입력해 주세요', '상황과 행동 방법을 모두 입력해 주세요.');
        return;
      }
      onSave({ situation: situation.trim(), strategy: strategy.trim() });
    }
  };

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={traitModalStyles.keyboardAvoidingView}
      >
        <View style={traitModalStyles.overlay}>
          <View style={traitModalStyles.content}>
            <View style={traitModalStyles.titleRow}>
              <Text style={traitModalStyles.title}>
                {member.name}님의 행동 특성 카드 {editingTrait ? '수정' : '추가'}
              </Text>
              <TouchableOpacity style={traitModalStyles.closeButton} onPress={onClose}>
                <Text style={traitModalStyles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={traitModalStyles.scrollView}
              contentContainerStyle={traitModalStyles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={traitModalStyles.fieldGroup}>
                <TextWithTTS style={traitModalStyles.fieldLabel}>어떤 종류를 적을까요?</TextWithTTS>
                <View style={traitModalStyles.pickerWrapper}>
                  <Picker
                    selectedValue={traitType || ''}
                    onValueChange={(value) => {
                      setTraitType((value || '') as '' | '감각' | '인지');
                      if (value === '감각') {
                        setTime('');
                        setPlace('');
                        setTarget('');
                      } else if (value === '인지') {
                        setSense('');
                      }
                    }}
                    style={traitModalStyles.picker}
                  >
                    <Picker.Item label="선택해주세요" value="" />
                    <Picker.Item label="감각" value="감각" />
                    <Picker.Item label="인지" value="인지" />
                  </Picker>
                </View>
              </View>

              {traitType === '감각' && (
                <>
                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>어떤 감각과 관련이 있나요?</TextWithTTS>
                    <View style={traitModalStyles.pickerWrapper}>
                      <Picker
                        selectedValue={sense || ''}
                        onValueChange={(value) => setSense((value || '') as typeof sense)}
                        style={traitModalStyles.picker}
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

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>어떤 상황에서 나타나나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 시끄러울 때"
                      placeholderTextColor="#999"
                      value={trigger}
                      onChangeText={setTrigger}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>이 상황에서 어떻게 행동하나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 귀를 막고 심하면 울음"
                      placeholderTextColor="#999"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>힘들 때 무엇을 하면 괜찮아지나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 조용한 곳으로 자리를 이동하면 괜찮아짐"
                      placeholderTextColor="#999"
                      value={soothingAction}
                      onChangeText={setSoothingAction}
                      multiline
                    />
                  </View>
                </>
              )}

              {traitType === '인지' && (
                <>
                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>언제 나타나나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 출근 준비할 때, 오전 9시"
                      placeholderTextColor="#999"
                      value={time}
                      onChangeText={setTime}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>주로 어디에서 일어나나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 집, 버스, 회사, 식당, 회사 복도"
                      placeholderTextColor="#999"
                      value={place}
                      onChangeText={setPlace}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>누구와 있을 때 나타나나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 혼자, 가족, 동료, 상사, 모르는 사람, 여러 사람"
                      placeholderTextColor="#999"
                      value={target}
                      onChangeText={setTarget}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>어떤 상황에서 나타나나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 옷 갈아입을 때"
                      placeholderTextColor="#999"
                      value={trigger}
                      onChangeText={setTrigger}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>이 상황에서 어떻게 행동하나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder='예: 전 날 밤에 준비한 옷으로 갈아입어야 기분이 좋아요'
                      placeholderTextColor="#999"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>힘들 때 무엇을 하면 괜찮아지나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 옷을 안 갈아입어도 된다고 하면 괜찮아짐"
                      placeholderTextColor="#999"
                      value={soothingAction}
                      onChangeText={setSoothingAction}
                      multiline
                    />
                  </View>
                </>
              )}

              {!traitType && (
                <>
                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>어떤 때에 힘들어지나요?</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 큰 소리가 나면 깜짝 놀라요."
                      placeholderTextColor="#999"
                      value={situation}
                      onChangeText={setSituation}
                      multiline
                    />
                  </View>

                  <View style={traitModalStyles.fieldGroup}>
                    <TextWithTTS style={traitModalStyles.fieldLabel}>그때 이렇게 하면 좋아요</TextWithTTS>
                    <TextInput
                      style={traitModalStyles.textField}
                      placeholder="예: 숨을 세 번 쉬고 관리자에게 조용한 곳을 부탁해요."
                      placeholderTextColor="#999"
                      value={strategy}
                      onChangeText={setStrategy}
                      multiline
                    />
                  </View>
                </>
              )}

              <View style={traitModalStyles.buttonRow}>
                <TouchableOpacity style={traitModalStyles.cancelButton} onPress={onClose}>
                  <Text style={traitModalStyles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={traitModalStyles.saveButton} onPress={handleSave}>
                  <Text style={traitModalStyles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TraitEditModal;

const traitModalStyles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
    flexGrow: 1,
  },
  content: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    maxWidth: 500,
    height: Dimensions.get('window').height * 0.85,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  textField: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: '#333',
    minHeight: 50,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    marginTop: 6,
  },
  picker: {
    height: 50,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFC107',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});

