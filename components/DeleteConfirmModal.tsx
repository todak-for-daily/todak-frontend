import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// 실제 프로젝트에서는 '../contexts/ScheduleContext'에서 Schedule 타입을 임포트
// 현재 환경의 제약사항으로 인해 임시적으로 Schedule 타입을 파일 내에 정의
/**
 * @typedef {Object} Schedule
 * @property {number | string} id - 일정 고유 ID
 * @property {string} title - 일정 제목 (ApiSchedule 타입과의 호환성을 위해 'title'로 변경)
 * @property {string} date - 날짜 (YYYY-MM-DD)
 * @property {string} startTime - 시작 시간 (HH:MM)
 * @property {string} endTime - 종료 시간 (HH:MM)
 */
interface Schedule {
  id: number | string;
  title: string; // 'scheName' -> 'title'로 변경하여 ApiSchedule 타입과 일치
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface DeleteConfirmModalProps {
  visible: boolean;
  target: Schedule | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  target,
  onConfirm,
  onCancel,
}) => {

  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>정말 삭제하시겠어요?</Text>
          <Text style={styles.modalSubText}>
            "{target.title}" 일정을 지우면 되돌릴 수 없어요.
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DeleteConfirmModal;


const styles = StyleSheet.create({

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: '85%', 
    maxWidth: 350, 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 24, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  modalSubText: {
    fontSize: 16,
    color: '#4b5563', 
    textAlign: 'center',
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12, 
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db', 
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151', 
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#ec4899',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f472b6', 
    shadowColor: '#f472b6', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
