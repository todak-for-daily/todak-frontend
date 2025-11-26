// 환경 변수에서 백엔드 주소 가져오기
// @env에서 가져올 수 있도록 설정 필요

import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

const API_BASE_URL: string | undefined = ENV_API_BASE_URL;

if (API_BASE_URL) {
  console.log('[apiConfig] ✅ 환경 변수 로드 성공 - API_BASE_URL:', API_BASE_URL);
} else {
  console.warn('[apiConfig] ⚠️ 환경 변수 API_BASE_URL이 설정되지 않았습니다.');
  console.warn('[apiConfig] .env 파일에 API_BASE_URL을 추가해주세요.');
}

// 프로덕션 서버 주소 (기본값 - .env에 없을 때만 사용)
const PRODUCTION_SERVER_URL = 'https://backend';

/**
 * 백엔드 API 기본 주소 반환
 * 
 * 우선순위:
 * - 환경 변수 API_BASE_URL
 * - 프로덕션 서버 주소 
 * - 플랫폼별 개발 환경 기본값 (개발 시에만 사용)
 */
export const getBackendBase = (): string => {
  // 환경 변수가 설정되어 있으면 해당 값을 그대로 사용
  if (API_BASE_URL) {
    console.log('[apiConfig] 백엔드 주소 (환경 변수):', API_BASE_URL);
    return API_BASE_URL;
  }

  // 환경 변수가 없으면 프로덕션 서버 주소 사용
  console.warn('[apiConfig] ⚠️ 환경 변수 없음, 프로덕션 서버 주소 사용:', PRODUCTION_SERVER_URL);
  return PRODUCTION_SERVER_URL;

  // 주석 처리: 개발 환경에서만 로컬호스트 사용하려면 아래 코드 사용
  // return Platform.OS === 'android'
  //   ? 'http://10.0.2.2:8080'  // Android 에뮬레이터
  //   : 'http://127.0.0.1:8080'; // iOS 시뮬레이터
};

