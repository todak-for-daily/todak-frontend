import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSchedule } from '../contexts/ScheduleContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  scheduleId: number | null;
}

const ScheduleDetailModal: React.FC<Props> = ({ visible, onClose, scheduleId }) => {
  const { schedules, deleteSchedule, selectedColor } = useSchedule();

  const schedule = schedules.find(s => s.id === scheduleId);
  if (!schedule) return null;

  const formatTime = (date: Date) =>
    `${date.getHours()}시 ${date.getMinutes().toString().padStart(2, '0')}분`;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{schedule.scheName}</Text>
          <Text>시간: {formatTime(new Date(schedule.scheStartTime))} ~ {formatTime(new Date(schedule.scheEndTime))}</Text>
          <Text>장소: {schedule.schePlace}</Text>
          <Text>낯선 장소 여부: {schedule.schePlace.includes('낯선') ? '예' : '아니오'}</Text>

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: selectedColor || '#FF6B6B' }]}
            onPress={() => {
              deleteSchedule(schedule.id);
              onClose();
            }}
          >
            <Text style={styles.deleteText}>일정 삭제</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ScheduleDetailModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  deleteBtn: {
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: '#4D96FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});