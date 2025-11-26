import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin, EmotionLog } from '../contexts/AdminContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

type EmotionReportStackParamList = {
  EmotionReport: { employeeEmail?: string; employeeName?: string };
  MainPage: undefined;
  Employee: undefined;
};

const formatDateTime = (value: string) => {
  try {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch {
    return '날짜 없음';
  }
};

interface EmotionReportScreenProps {
  route?: {
    params?: {
      employeeEmail?: string;
      employeeName?: string;
    };
  };
}

const EmotionReportScreen: React.FC<EmotionReportScreenProps> = ({ route }) => {
  const navigation = useNavigation<NativeStackNavigationProp<EmotionReportStackParamList>>();
  const { userProfile, userRole } = useAuth();
  const { getMemberByEmail } = useAdmin();

  const employeeEmail = route?.params?.employeeEmail;
  const employeeName = route?.params?.employeeName;

  // 관리자 모드: 특정 직원의 감정 기록
  // 일반 사용자/기업 재직자 모드: 자신의 감정 기록
  const targetEmail = employeeEmail || userProfile?.email;
  const targetName = employeeName || userProfile?.name;

  const member = useMemo(() => {
    if (!targetEmail) return null;
    return getMemberByEmail(targetEmail);
  }, [targetEmail, getMemberByEmail]);

  const emotionHistory = useMemo(() => {
    if (!member?.emotionHistory) return [];
    // 시간순 정렬 (오래된 것부터)
    return [...member.emotionHistory].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [member?.emotionHistory]);

  // 감정을 숫자로 변환
  const getEmotionLevel = (emoji: string | null | undefined): number => {
    if (!emoji) return 0;
    const moodMap: { [key: string]: number } = {
      '😊': 5,
      '😐': 4,
      '😟': 3,
      '😢': 2,
      '😭': 1,
    };
    return moodMap[emoji] || 0;
  };

  // 그래프 데이터 준비
  const chartData = useMemo(() => {
    if (emotionHistory.length === 0) return null;

    const svgWidth = CHART_WIDTH - 50; // Y축 레이블 공간 제외
    const graphWidth = svgWidth - CHART_PADDING * 2; // 실제 그래프 영역
    const graphHeight = CHART_HEIGHT - CHART_PADDING * 2;
    const minLevel = 1;
    const maxLevel = 5;
    const levelRange = maxLevel - minLevel;

    // 초기 기분과 최종 기분 데이터 포인트 생성
    const initialPoints: string[] = [];
    const finalPoints: string[] = [];
    const xPositions: number[] = [];
    const timeLabels: string[] = [];

    emotionHistory.forEach((log, index) => {
      // SVG 내부 기준 X 위치 (CHART_PADDING부터 시작)
      const xInSvg = CHART_PADDING + (index / (emotionHistory.length - 1 || 1)) * graphWidth;
      // 전체 컨테이너 기준 X 위치 (Y축 레이블 30px + SVG 내부 위치)
      const xInContainer = 30 + xInSvg;
      xPositions.push(xInContainer);

      const initialLevel = getEmotionLevel(log.initialMood || log.feeling);
      const finalLevel = getEmotionLevel(log.feeling);

      // Y축은 위에서 아래로 (5가 위, 1이 아래)
      const initialY = CHART_HEIGHT - CHART_PADDING - ((initialLevel - minLevel) / levelRange) * graphHeight;
      const finalY = CHART_HEIGHT - CHART_PADDING - ((finalLevel - minLevel) / levelRange) * graphHeight;

      initialPoints.push(`${xInSvg},${initialY}`);
      finalPoints.push(`${xInSvg},${finalY}`);

      // 시간 레이블 (간단하게)
      const date = new Date(log.createdAt);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const isAM = hours < 12;
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      timeLabels.push(`${isAM ? '오전' : '오후'} ${displayHours}:${String(minutes).padStart(2, '0')}`);
    });

    return {
      initialPoints: initialPoints.join(' '),
      finalPoints: finalPoints.join(' '),
      xPositions,
      timeLabels,
      initialLevels: emotionHistory.map(log => getEmotionLevel(log.initialMood || log.feeling)),
      finalLevels: emotionHistory.map(log => getEmotionLevel(log.feeling)),
    };
  }, [emotionHistory]);

  const isAdminView = userRole === '관리자' && employeeEmail;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (isAdminView) {
              navigation.navigate('Employee');
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
        >
          <FeatherIcon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAdminView ? `${targetName}님의 감정 기록` : '내 감정 기록'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {emotionHistory.length > 0 ? (
          <>
            {/* 감정 변화 그래프 */}
            {chartData && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>감정 변화 그래프</Text>
                <View style={styles.chartWrapper}>
                  {/* Y축 레이블 */}
                  <View style={styles.yAxisLabels}>
                    {[5, 4, 3, 2, 1].map((level) => {
                      const emojiMap: { [key: number]: string } = { 1: '😭', 2: '😢', 3: '😟', 4: '😐', 5: '😊' };
                      return (
                        <Text key={`label-${level}`} style={styles.yAxisLabel}>
                          {emojiMap[level]}
                        </Text>
                      );
                    })}
                  </View>
                  <View style={styles.chartInner}>
                    <Svg width={CHART_WIDTH - 50} height={CHART_HEIGHT}>
                      {/* Y축 그리드 라인 */}
                      {[1, 2, 3, 4, 5].map((level) => {
                        const y = CHART_HEIGHT - CHART_PADDING - ((level - 1) / 4) * (CHART_HEIGHT - CHART_PADDING * 2);
                        return (
                          <Line
                            key={`grid-${level}`}
                            x1={0}
                            y1={y}
                            x2={CHART_WIDTH - 50}
                            y2={y}
                            stroke="#E0E0E0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                        );
                      })}

                      {/* 초기 기분 라인 */}
                      {chartData.initialPoints && (
                        <Polyline
                          points={chartData.initialPoints}
                          fill="none"
                          stroke="#4FC3F7"
                          strokeWidth="2"
                        />
                      )}

                      {/* 최종 기분 라인 */}
                      {chartData.finalPoints && (
                        <Polyline
                          points={chartData.finalPoints}
                          fill="none"
                          stroke="#66BB6A"
                          strokeWidth="2"
                        />
                      )}

                      {/* 초기 기분 포인트 */}
                      {chartData.xPositions.map((x, index) => {
                        const level = chartData.initialLevels[index];
                        const graphHeight = CHART_HEIGHT - CHART_PADDING * 2;
                        const y = CHART_HEIGHT - CHART_PADDING - ((level - 1) / 4) * graphHeight;
                        // SVG 내부 기준 X 위치 (컨테이너 기준 x에서 Y축 레이블 30px 빼기)
                        const xInSvg = x - 30;
                        return (
                          <Circle
                            key={`initial-${index}`}
                            cx={xInSvg}
                            cy={y}
                            r="4"
                            fill="#4FC3F7"
                          />
                        );
                      })}

                      {/* 최종 기분 포인트 */}
                      {chartData.xPositions.map((x, index) => {
                        const level = chartData.finalLevels[index];
                        const graphHeight = CHART_HEIGHT - CHART_PADDING * 2;
                        const y = CHART_HEIGHT - CHART_PADDING - ((level - 1) / 4) * graphHeight;
                        // SVG 내부 기준 X 위치 (컨테이너 기준 x에서 Y축 레이블 30px 빼기)
                        const xInSvg = x - 30;
                        return (
                          <Circle
                            key={`final-${index}`}
                            cx={xInSvg}
                            cy={y}
                            r="4"
                            fill="#66BB6A"
                          />
                        );
                      })}
                    </Svg>
                    {/* X축 시간 레이블 */}
                    <View style={styles.xAxisLabels}>
                      {chartData.xPositions.map((x, index) => {
                        if (index % Math.ceil(emotionHistory.length / 5) === 0 || index === emotionHistory.length - 1) {
                          return (
                            <Text
                              key={`time-${index}`}
                              style={[styles.xAxisLabel, { left: x - 30 }]}
                            >
                              {chartData.timeLabels[index]}
                            </Text>
                          );
                        }
                        return null;
                      })}
                    </View>
                  </View>
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#4FC3F7' }]} />
                    <Text style={styles.legendText}>초기 기분</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#66BB6A' }]} />
                    <Text style={styles.legendText}>최종 기분</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 상세 기록 카드들 */}
            {emotionHistory.map((log: EmotionLog) => (
            <View key={log.id} style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.emotionEmoji}>{log.feeling}</Text>
                <Text style={styles.dateTime}>{formatDateTime(log.createdAt)}</Text>
              </View>

              {log.categoryLabel && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>감정 카테고리:</Text>
                  <Text style={styles.infoValue}>{log.categoryLabel}</Text>
                </View>
              )}

              {log.situationText && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>상황:</Text>
                  <Text style={styles.infoValue}>{log.situationText}</Text>
                </View>
              )}

              {log.action && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>선택한 행동:</Text>
                  <Text style={styles.infoValue}>
                    {log.actionEmojis ? `${log.actionEmojis} ` : ''}{log.action}
                  </Text>
                </View>
              )}

              {log.feedback && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>피드백:</Text>
                  <Text style={styles.infoValue}>{log.feedback}</Text>
                </View>
              )}
            </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 감정 기록이 없습니다.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EmotionReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    padding: 8,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  emotionEmoji: {
    fontSize: 32,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingTop: CHART_PADDING - 8,
    paddingBottom: CHART_PADDING - 8,
    width: 30,
    height: CHART_HEIGHT,
  },
  yAxisLabel: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  chartInner: {
    flex: 1,
    position: 'relative',
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: -25,
    left: 0,
    right: 0,
    height: 30,
    flexDirection: 'row',
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    width: 60,
    marginLeft: -30,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});

