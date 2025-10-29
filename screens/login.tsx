import { Text, View, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native'; // 1. Alert 추가
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GoogleLoginButton from '../components/googleLoginBtn';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// 어플을 껐다 키더라도 로그인 상태를 유지하도록, 이후 react-native-keychain을 이용하여 보안 강화
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  Main: undefined;
  Today: undefined;
  Week: undefined;
};

const LoginPage = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const goToMain = () => {
    navigation.replace('Tabs');
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      
      const tokens = await GoogleSignin.getTokens();
      const googleIdToken: string | null = tokens.idToken;
      console.log('Google ID Token:', googleIdToken);

      if (googleIdToken) {
        // --- 4. 백엔드 서버로 ID 토큰 전송 (제일 중요한 부분) ---
        try {
          // [!] 백엔드 개발자에게 받은 실제 API 주소로 변경하세요.
          const response = await fetch('localhost:8080/oauth2/authorization/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: googleIdToken }),
          });

          if (!response.ok) {
            throw new Error(`백엔드 로그인 실패: ${response.status}`);
          }

          const data = await response.json();
          const appAccessToken = data.accessToken;

          if (appAccessToken) {
            await AsyncStorage.setItem('userToken', appAccessToken);
            console.log('앱 토큰 저장 성공:', appAccessToken);
            navigation.replace('Tabs');
          } else {
            Alert.alert('로그인 실패', '백엔드에서 토큰을 받지 못했습니다.');
          }

        } catch (apiError) {
          console.error('백엔드 API 에러:', apiError);
          Alert.alert('로그인 실패', '서버와 통신 중 오류가 발생했습니다.');
        }

      } else {
        Alert.alert('로그인 실패', '구글 ID 토큰을 가져오지 못했습니다.');
      }

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Google Sign-in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Google Sign-in in progress');
      } else {
        console.error(error);
        Alert.alert('로그인 실패', '구글 로그인 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>토닥</Text>

      <TouchableOpacity onPress={goToMain}>
        <Image source={require('../assets/icons/btnD_com.png')} style={styles.imageButton} />
      </TouchableOpacity>
      <TouchableOpacity onPress={goToMain}>
        <Image source={require('../assets/icons/kakao_login_medium_narrow.png')} style={styles.imageButton} />
      </TouchableOpacity>
      <GoogleLoginButton
        onPress={handleGoogleLogin}
        style={styles.googleButton}
      />
    </View>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 250,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  imageButton: {
    width: 200,
    height: 60,
    marginVertical: 10,
    resizeMode: 'contain',
  },
  htmlButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  htmlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    width: 200,
    height: 50,
    marginVertical: 10,
  },
});