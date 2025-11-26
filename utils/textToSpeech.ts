import TTS from 'react-native-tts';

// TTS 초기화
let isInitialized = false;

export const initializeTTS = async () => {
  if (isInitialized) return;
  
  try {
    await TTS.setDefaultLanguage('ko-KR');
    await TTS.setDefaultRate(0.5);
    await TTS.setDefaultPitch(1.0);
    isInitialized = true;
  } catch (error) {
    console.error('TTS 초기화 오류:', error);
  }
};

// 텍스트 읽기
export const speakText = async (text: string) => {
  try {
    await initializeTTS();
    await TTS.stop(); // 이전 재생 중지
    await TTS.speak(text);
  } catch (error) {
    console.error('TTS 재생 오류:', error);
  }
};

// TTS 중지
export const stopSpeaking = async () => {
  try {
    await TTS.stop();
  } catch (error) {
    console.error('TTS 중지 오류:', error);
  }
};

// TTS 정리
export const cleanupTTS = () => {
  TTS.stop();
};



