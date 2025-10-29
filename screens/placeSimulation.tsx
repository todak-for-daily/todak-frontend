import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceSimulation = () => {

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>낯선 장소 시뮬레이션</Text>
      </View>

      <View style={styles.content}>

        <Text style={styles.note}>
          * 이 페이지는 임시 페이지입니다. 실제 기능은 추후 구현 예정입니다.
        </Text>
      </View>
    </View>
  );
};

export default PlaceSimulation;

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
    color: '#70DA9F',
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
  simulationButton: {
    backgroundColor: '#70DA9F',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 30,
  },
  simulationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
