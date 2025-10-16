import React, { useState,useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSchedule } from '../contexts/ScheduleContext';
import { scheduleColors } from '../types/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const ScheduleModal: React.FC<Props> = ({ visible, onClose }) => {
  const { addSchedule } = useSchedule();

  const [scheName, setScheName] = useState('');
  const [schePlace, setSchePlace] = useState('');
  const [hour, setHour] = useState<number>(0); 
  const [minute, setMinute] = useState<number>(0);
  const [isUnfamiliar, setIsUnfamiliar] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);


const [hasAddedTestSchedule, setHasAddedTestSchedule] = useState(false);

useEffect(() => {
  if (__DEV__ && visible && !hasAddedTestSchedule) {
    const now = new Date();
    now.setHours(15);
    now.setMinutes(0);

    addSchedule({
      scheName: '모달 테스트 일정',
      scheStartTime: now,
      scheEndTime: new Date(now.getTime() + 60 * 60 * 1000),
      schePlace: '모달 내부',
      date: now.toISOString().split('T')[0],
      isUnfamiliar: false,
      color: '#FF6B6B',
    });

    console.log("넹");
    setHasAddedTestSchedule(true); // ✅ 한 번만 실행되도록 막음
  }
}, [visible, addSchedule, hasAddedTestSchedule]);


  useEffect(() => {
  if (visible) {
    setScheName('');
    setSchePlace('');
    setHour(0);
    setMinute(0);
    setIsUnfamiliar(false);
    setSelectedColor(undefined);
  }
  }, [visible]);

  const handleAdd = () => {
    const now = new Date();
    const start = new Date();
    start.setHours(hour);
    start.setMinutes(minute);

    const newSchedule = {
      scheName,
      scheStartTime: start,
      scheEndTime: new Date(start.getTime() + 60 * 60 * 1000),
      schePlace,
      date: now.toISOString().split('T')[0],
      isUnfamiliar,
      color: selectedColor,
    };

    addSchedule(newSchedule);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>일정 추가</Text>

        <TextInput
          style={styles.input}
          placeholder="추가할 일정"
          value={scheName}
          onChangeText={setScheName}
        />

        <View style={styles.row}>
          <Text style={styles.label}>시간</Text>
          <Picker
            selectedValue={hour}
            style={styles.picker}
            onValueChange={(value: number) => setHour(value)}
          >
            <Picker.Item label="오전 12시" value={0} />
            <Picker.Item label="오전 1시" value={1} />
            <Picker.Item label="오전 2시" value={2} />
            <Picker.Item label="오전 3시" value={3} />
            <Picker.Item label="오전 4시" value={4} />
            <Picker.Item label="오전 5시" value={5} />
            <Picker.Item label="오전 6시" value={6} />
            <Picker.Item label="오전 7시" value={7} />
            <Picker.Item label="오전 8시" value={8} />
            <Picker.Item label="오전 9시" value={9} />
            <Picker.Item label="오전 10시" value={10} />
            <Picker.Item label="오전 11시" value={11} />
            <Picker.Item label="오후 12시" value={12} />
            <Picker.Item label="오후 1시" value={13} />
            <Picker.Item label="오후 2시" value={14} />
            <Picker.Item label="오후 3시" value={15} />
            <Picker.Item label="오후 4시" value={16} />
            <Picker.Item label="오후 5시" value={17} />
            <Picker.Item label="오후 6시" value={18} />
            <Picker.Item label="오후 7시" value={19} />
            <Picker.Item label="오후 8시" value={20} />
            <Picker.Item label="오후 9시" value={21} />
            <Picker.Item label="오후 10시" value={22} />
            <Picker.Item label="오후 11시" value={23} />
          </Picker>
          <Picker
            selectedValue={minute}
            style={styles.picker}
            onValueChange={(value) => setMinute(value)}
          >
            <Picker.Item label="00분" value={0} />
            <Picker.Item label="10분" value={10} />
            <Picker.Item label="20분" value={20} />
            <Picker.Item label="30분" value={30} />
            <Picker.Item label="40분" value={40} />
            <Picker.Item label="50분" value={50} />
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="장소"
          value={schePlace}
          onChangeText={setSchePlace}
        />

        <Text style={styles.label}>낯선 장소/상황인가요?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, isUnfamiliar && styles.active]}
            onPress={() => setIsUnfamiliar(true)}
          >
            <Text>예</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !isUnfamiliar && styles.active]}
            onPress={() => setIsUnfamiliar(false)}
          >
            <Text>아니오</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>색상 선택</Text>
        <View style={styles.colorGrid}>
          {scheduleColors.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                selectedColor === color && styles.selectedCircle,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addText}>일정 추가</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};

export default ScheduleModal;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  active: {
    backgroundColor: '#e0e0e0',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#333',
  },
  addBtn: {
    backgroundColor: '#4D96FF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  picker: {
    width: 120,
    height: 44,
    marginHorizontal: 8,
  },
});