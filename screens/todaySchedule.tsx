import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const todaySchePage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ TestPage 렌더링 성공!</Text>
    </View>
  );
};

export default todaySchePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 20,
    color: '#333',
  },
});