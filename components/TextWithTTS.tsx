import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextProps } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import TTS from 'react-native-tts';
import { speakText, stopSpeaking } from '../utils/textToSpeech';

interface TextWithTTSProps extends TextProps {
  children: string;
  showIcon?: boolean;
  iconSize?: number;
  iconColor?: string;
}

// 전역 TTS 상태 관리
let globalSpeakingText: string | null = null;
const speakingCallbacks: Set<(text: string | null) => void> = new Set();

// 전역 리스너는 한 번만 등록
let listenersInitialized = false;

const initializeGlobalListeners = () => {
  if (listenersInitialized) return;
  
  TTS.addEventListener('tts-finish', () => {
    globalSpeakingText = null;
    speakingCallbacks.forEach(cb => cb(null));
  });

  TTS.addEventListener('tts-cancel', () => {
    globalSpeakingText = null;
    speakingCallbacks.forEach(cb => cb(null));
  });

  listenersInitialized = true;
};

const TextWithTTS: React.FC<TextWithTTSProps> = ({
  children,
  style,
  showIcon = true,
  iconSize = 16,
  iconColor = '#666',
  ...textProps
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const callbackRef = useRef<((text: string | null) => void) | undefined>(undefined);

  useEffect(() => {
    initializeGlobalListeners();
    
    // 현재 컴포넌트의 콜백 등록
    callbackRef.current = (speakingText: string | null) => {
      setIsSpeaking(speakingText === children);
    };
    speakingCallbacks.add(callbackRef.current);

    // 현재 재생 중인 텍스트가 이 컴포넌트의 텍스트인지 확인
    if (globalSpeakingText === children) {
      setIsSpeaking(true);
    }

    return () => {
      if (callbackRef.current) {
        speakingCallbacks.delete(callbackRef.current);
      }
    };
  }, [children]);

  const handlePress = async () => {
    if (isSpeaking || globalSpeakingText === children) {
      await stopSpeaking();
      globalSpeakingText = null;
      setIsSpeaking(false);
    } else {
      // 다른 텍스트가 재생 중이면 먼저 중지
      if (globalSpeakingText) {
        await stopSpeaking();
      }
      globalSpeakingText = children;
      setIsSpeaking(true);
      await speakText(children);
    }
  };

  // 텍스트가 없거나 문자열이 아니면 아이콘만 표시하지 않음
  if (!children || typeof children !== 'string' || children.trim() === '') {
    return <Text style={style} {...textProps}>{children || ''}</Text>;
  }

  // 스타일에서 textAlign이 center인지 확인
  const getTextAlign = () => {
    if (!style) return undefined;
    if (Array.isArray(style)) {
      for (const s of style) {
        if (s && typeof s === 'object' && 'textAlign' in s) {
          return (s as any).textAlign;
        }
      }
    } else if (typeof style === 'object' && 'textAlign' in style) {
      return (style as any).textAlign;
    }
    return undefined;
  };
  
  const isCentered = getTextAlign() === 'center';
  
  return (
    <View style={[styles.container, isCentered && styles.centeredContainer]}>
      <View style={styles.textWrapper}>
        <Text style={style} {...textProps} numberOfLines={undefined}>{children}</Text>
      </View>
      {showIcon && (
        <TouchableOpacity
          onPress={handlePress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FeatherIcon
            name={isSpeaking ? 'volume-2' : 'volume-1'}
            size={iconSize}
            color={isSpeaking ? '#FFA000' : iconColor}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  textWrapper: {
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
  },
  iconButton: {
    marginLeft: 6,
    padding: 2,
    flexShrink: 0,
  },
});

export default TextWithTTS;

