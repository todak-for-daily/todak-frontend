import React, { useEffect, useState } from 'react';
// React Native 컴포넌트 및 StyleSheet 사용
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// 스티커판의 총 칸 수 (예: 5x4 = 20칸)
const TOTAL_STICKERS = 20;
// 현재 획득한 스티커 수 (이 값은 나중에 AsyncStorage 또는 API로부터 받아와야 합니다)
const INITIAL_STICKER_COUNT = 7;

const { width } = Dimensions.get('window');
// 한 줄에 5개의 스티커를 배치
const STICKERS_PER_ROW = 5;
// 스티커 크기 계산 (화면 너비 - 좌우패딩 - 스티커간격) / 5
const stickerSize = (width - 40 - (STICKERS_PER_ROW - 1) * 10) / STICKERS_PER_ROW; 

const StickerChartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [stickerCount, setStickerCount] = useState(INITIAL_STICKER_COUNT);
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);
  const navigateHomeOnClose: boolean | undefined = route.params?.navigateHomeOnClose;

  useEffect(() => {
    const rewardId: string | undefined = route.params?.rewardId;
    if (rewardId && rewardId !== lastRewardId) {
      setStickerCount((prevCount) => Math.min(TOTAL_STICKERS, prevCount + 1));
      setLastRewardId(rewardId);
    }
  }, [route.params?.rewardId, lastRewardId]);

  const handleClose = () => {
    if (navigateHomeOnClose) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainPage' }],
      });
    } else {
      navigation.goBack();
    }
  };

  const renderStickers = () => {
    const stickers = [];
    for (let i = 0; i < TOTAL_STICKERS; i++) {
      if (i < stickerCount) {
        // 획득한 스티커
        stickers.push(
          <View key={i} style={[styles.stickerSlot, styles.stickerFilled]}>
            <Text style={styles.stickerEmoji}>❤️</Text>
          </View>,
        );
      } else {
        // 빈 칸
        // 빈 스티커를 눌러서 획득하는 기능을 구현할 때 이 View에 onPress를 추가하면 됩니다.
        stickers.push(<View key={i} style={styles.stickerSlot} />);
      }
    }
    return stickers;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>칭찬 스티커판</Text>
      <View style={styles.board}>
        <Text style={styles.boardTitle}>참 잘했어요! ({stickerCount}/{TOTAL_STICKERS})</Text>
        <View style={styles.stickerGrid}>{renderStickers()}</View>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={handleClose}>
        <Text style={styles.addButtonText}>메인 화면으로 돌아가기</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>스티커를 {TOTAL_STICKERS}개 모으면 선물이 있어요!</Text>
    </View>
  );
};

// StyleSheet.create 사용
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1', // 부드러운 노란색 배경
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E65100', // 진한 주황색
    marginTop: 40, // 상단 여백 (SafeArea 고려 필요)
    marginBottom: 20,
  },
  board: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    alignItems: 'center',
  },
  boardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // 왼쪽부터 채우기
    width: '100%',
  },
  stickerSlot: {
    width: stickerSize,
    height: stickerSize,
    backgroundColor: '#E0E0E0', // 빈 칸 색상
    borderRadius: 10,
    margin: 5, // 각 스티커 사이의 간격 (양쪽 5씩, 총 10)
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
  },
  stickerFilled: {
    backgroundColor: '#FFEB3B', // 채워진 칸 배경 (노란색)
    borderColor: '#FBC02D', // 채워진 칸 테두리
    borderStyle: 'solid',
  },
  stickerEmoji: {
    fontSize: stickerSize * 0.6, // 스티커 칸 크기에 비례
  },
  infoText: {
    fontSize: 16,
    color: '#777',
    marginTop: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50', // 초록색 버튼
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  }
});

export default StickerChartScreen;