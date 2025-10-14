
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSchedule } from '../contexts/ScheduleContext';

type MainStackParamList = {
  MainPage: undefined;
  AnxietyRecord: undefined;
  PlaceSimulation: undefined;
  Settings: undefined;
};

const MainPage = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { todaySchedule, loading, error } = useSchedule();

  // 시간 포맷팅 함수
  const formatTime = (startTime: Date, endTime: Date) => {
    const formatTimeOnly = (date: Date) => {
      return date.toTimeString().slice(0, 5); // HH:MM 형태로 변환
    };
    return `${formatTimeOnly(startTime)} ~ ${formatTimeOnly(endTime)}`;
  };

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
      <View style={styles.scheduleContainer}>
        {loading ? (
          <Text style={styles.loadingText}>일정을 불러오는 중...</Text>
        ) : error ? (
          <Text style={styles.errorText}>일정을 불러올 수 없습니다.</Text>
        ) : todaySchedule ? (
          <>
            <Text style={styles.scheduleTime}>
              {formatTime(todaySchedule.scheStartTime, todaySchedule.scheEndTime)}
            </Text>
            <Text style={styles.scheduleName}>{todaySchedule.scheName}</Text>
            <Text style={styles.schedulePlace}>{todaySchedule.schePlace}</Text>
          </>
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
  scheduleContainer: {
    backgroundColor: '#FFC364',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    alignSelf: 'stretch',
    // shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    // shadow (Android)
    elevation: 4,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  schedulePlace: {
    fontSize: 16,
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
    // shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    // shadow (Android)
    elevation: 5,
  },
  simulationButton: {
    flex: 1,
    backgroundColor: '#70DA9F',
    paddingVertical: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    // shadow (Android)
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