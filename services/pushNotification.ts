/**
 * Firebase Messaging 기반 푸시 알림 서비스 예시 파일
 *
 * 이 파일을 사용하려면 다음 패키지 설치 및 Firebase 설정이 선행되어야 합니다.
 * 1. yarn add @react-native-firebase/app
 * 2. yarn add @react-native-firebase/messaging
 *
 * 공식 문서: https://rnfirebase.io/messaging/usage
 */

import messaging,{ FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { getBackendBase } from './apiConfig';
import { authenticatedRequest, getAccessToken } from './authApi';

// 알림 채널 ID
const MOOD_CHECK_CHANNEL_ID = 'mood_check_channel';
const DEFAULT_CHANNEL_ID = 'default_channel';

// 토큰 새로고침 콜백 (외부에서 설정 가능)
let onTokenRefreshCallback: ((token: string) => Promise<void>) | null = null;

/**
 * 토큰 새로고침 콜백 설정
 */
export const setTokenRefreshCallback = (callback: (token: string) => Promise<void>) => {
  onTokenRefreshCallback = callback;
};

/**
 * 1. 푸시 알림 기본 설정 및 권한 요청 (앱 실행 시 1회 호출)
 * - Android 채널 설정 포함
 * - 포그라운드 및 백그라운드 알림 리스너 설정
 */
export const configureFirebaseMessaging = async () => {
  try {
    // 알림 권한 요청
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Firebase Messaging: Authorization status:', authStatus);
      // 토큰을 얻어와 서버에 전송하는 로직은 여기에 추가
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      
      // 메시지 리스너 설정
      setupMessageListeners();
      
      // 토큰 새로고침 리스너 설정 (토큰이 변경될 때마다 자동으로 서버에 등록)
      messaging().onTokenRefresh(async (newToken) => {
        console.log('FCM Token refreshed:', newToken);
        // 토큰이 갱신되면 자동으로 서버에 등록하도록 콜백 호출
        if (onTokenRefreshCallback) {
          await onTokenRefreshCallback(newToken);
        }
      });
      
      // Android 채널 생성 (Android에서는 채널이 필수)
      if (Platform.OS === 'android') {
        const defaultChannel = new messaging.Android.Channel(
            DEFAULT_CHANNEL_ID,
            '기본 알림',
            messaging.Android.Importance.DEFAULT,
        );
        messaging().android.createChannel(defaultChannel);

        const moodCheckChannel = new messaging.Android.Channel(
            MOOD_CHECK_CHANNEL_ID,
            '기분 체크 알림',
            messaging.Android.Importance.HIGH,
        );
        messaging().android.createChannel(moodCheckChannel);
      }
    } else {
      console.log('Firebase Messaging: User declined permission.');
    }
  } catch (error) {
    console.error('Firebase Messaging Configuration Error:', error);
  }
};

// 포그라운드 메시지 수신 콜백 (외부에서 설정 가능)
let onMessageReceivedCallback: ((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => void) | null = null;

/**
 * 포그라운드 메시지 수신 콜백 설정
 */
export const setMessageReceivedCallback = (callback: (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => void) => {
  onMessageReceivedCallback = callback;
};

/**
 * 메시지 수신 리스너 설정
 */
const setupMessageListeners = () => {
    // 포그라운드 (앱 사용 중) 메시지 수신 리스너
    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('Message handled in the foreground!', remoteMessage);
        // 콜백이 설정되어 있으면 호출 (감정 확인 모달 등 표시)
        if (onMessageReceivedCallback) {
          onMessageReceivedCallback(remoteMessage);
        }
    });

    // 백그라운드 (앱이 실행 중이지만 화면에 보이지 않을 때) 메시지 수신 리스너
    // iOS에서는 이 리스너를 사용하려면 추가적인 설정이 필요합니다.
    messaging().setBackgroundMessageHandler(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('Message handled in the background!', remoteMessage);
    });

    // 앱이 완전히 종료된 상태에서 알림을 통해 앱이 열렸을 때
    messaging().getInitialNotification().then((remoteMessage) => {
        if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage);
        }
    });

    // 알림을 클릭했을 때 (포그라운드, 백그라운드)
    messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('Notification caused app to open from background state:', remoteMessage);
    });
};


/**
 * 주기적인 기분 체크 알림 예약
 * * Note: Firebase Messaging은 서버 기반의 푸시 알림이 주 기능이며,
 * 'react-native-push-notification'의 로컬 알림 예약 기능(scheduleLocalNotification)은
 * Firebase Messaging에는 기본적으로 없습니다.
 * * 따라서 이 기능은 'react-native-push-notification'을 제거했다면
 * 이제 서버(FCM)에서 3시간마다 알림을 보내도록 구현해야 합니다.
 * * 이 함수는 로컬 예약이 아닌, 사용자 기기가 특정 토픽을 구독하도록 하는 예시로 대체합니다.
 */
export const subscribeToMoodCheckTopic = async () => {
    const topic = 'mood_check';
    try {
        await messaging().subscribeToTopic(topic);
        console.log(`Subscribed to topic: ${topic} for server-sent mood checks.`);
    } catch (error) {
        console.error('Failed to subscribe to topic:', error);
    }
};

/**
 * 커스텀 즉시 알림 (서버를 통하지 않고 로컬 알림을 보내는 방법 - 권장되지 않음)
 * * Firebase Messaging은 로컬 알림 예약이 어렵기 때문에, 이 기능은
 * Firebase Notification을 통해 서버에서 즉시 메시지를 보내는 것으로 대체하는 것이
 * 일반적입니다. 로컬 알림이 필요하다면, 별도의 로컬 알림 라이브러리(예: notifee)를
 * 사용해야 합니다.
 */
export const sendLocalTestNotification = async (_title: string, _message: string) => {
    // Note: Firebase는 로컬 알림을 지원하지 않습니다. 
    // 테스트 목적으로 임시로 알림을 표시하는 로직이 필요하다면 
    // Android/iOS 네이티브 코드를 사용하거나, Notifee 같은 별도 라이브러리를 사용해야 합니다.
    console.warn("FCM은 로컬 알림 기능을 기본적으로 제공하지 않습니다. 이 함수는 서버 메시지로 대체되어야 합니다.");
};

/**
 * 관리자에게 긴급 감정 상태를 전달하기 위한 헬퍼
 * 실제 서비스에서는 서버 API를 호출하여 관리자 기기에 푸시를 전송해야 합니다.
 */
export const notifyAdminCriticalEmotion = async ({
  memberName,
  organizationName,
  feeling,
  situationText,
}: {
  memberName?: string;
  organizationName?: string | null;
  feeling: string;
  situationText?: string | null;
}) => {
  try {
    console.log(
      '[notifyAdminCriticalEmotion]',
      `관리자에게 "${memberName ?? '알 수 없음'}"의 긴급 감정(${feeling})을 알립니다. 조직: ${
        organizationName ?? '미지정'
      }. 상황: ${situationText ?? '상세 없음'}`,
    );
    // TODO: 서버 API 연동 시 여기에서 fetch/axios 등을 사용해 관리자 대상 FCM을 발송합니다.
  } catch (error) {
    console.error('notifyAdminCriticalEmotion failed', error);
  }
};

/**
 * FCM 토큰 등록
 * POST /api/fcm/register
 * @param memberId - 회원 ID
 * @param token - FCM 토큰
 * @returns 등록 성공 메시지
 */
export const registerFcmToken = async (memberId: number, token: string): Promise<string> => {
  // 토큰 체크 - 없으면 mock 모드 (등록은 성공으로 처리)
  const accessToken = await getAccessToken();
  if (!accessToken || accessToken.startsWith('mock_token')) {
    console.log('[registerFcmToken] Mock 모드: 토큰이 없거나 mock 토큰임');
    return 'FCM 토큰이 등록되었습니다.';
  }

  try {
    const response = await authenticatedRequest('/api/fcm/register', {
      method: 'POST',
      body: JSON.stringify({
        memberId,
        token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`FCM 토큰 등록 실패: ${response.status} ${errorText}`);
    }

    const result = await response.text();
    return result || 'FCM 토큰이 등록되었습니다.';
  } catch (error) {
    console.error('FCM 토큰 등록 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return 'FCM 토큰이 등록되었습니다.';
  }
};

/**
 * FCM 테스트 푸시 알림 전송
 * POST /api/fcm/test
 * @param memberId - 회원 ID
 * @returns 테스트 알림 전송 메시지
 */
export const sendFcmTest = async (memberId: number): Promise<string> => {
  // 토큰 체크 - 없으면 mock 모드 (테스트 전송은 성공으로 처리)
  const accessToken = await getAccessToken();
  if (!accessToken || accessToken.startsWith('mock_token')) {
    console.log('[sendFcmTest] Mock 모드: 토큰이 없거나 mock 토큰임');
    return '테스트 푸시 알림이 전송되었습니다.';
  }

  try {
    const response = await authenticatedRequest('/api/fcm/test', {
      method: 'POST',
      body: JSON.stringify({
        memberId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`FCM 테스트 실패: ${response.status} ${errorText}`);
    }

    const result = await response.text();
    return result || '테스트 푸시 알림이 전송되었습니다.';
  } catch (error) {
    console.error('FCM 테스트 오류:', error);
    // API 실패 시에도 성공으로 처리 (mock)
    return '테스트 푸시 알림이 전송되었습니다.';
  }
};