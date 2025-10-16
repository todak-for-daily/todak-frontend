import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const AnxietyRecord = () => {
  const navigation = useNavigation();

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로가기</Text>
        </TouchableOpacity>
        <Text style={styles.title}>불안기록</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.pageDescription}>
          불안한 감정을 기록하고 관리하는 공간입니다.
        </Text>
        
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>📝 불안 상황 기록</Text>
          <Text style={styles.featureItem}>📊 불안 정도 측정</Text>
          <Text style={styles.featureItem}>📈 불안 패턴 분석</Text>
          <Text style={styles.featureItem}>💡 대처 방법 제안</Text>
        </View>

        <Text style={styles.note}>
          * 이 페이지는 임시 페이지입니다. 실제 기능은 추후 구현 예정입니다.
        </Text>
      </View>
    </View>
  );
};

export default AnxietyRecord;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#79B3F7',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageDescription: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featureList: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    paddingLeft: 10,
  },
  note: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
