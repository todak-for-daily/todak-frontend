import { Text, View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GoogleLoginButton from '../components/googleLoginBtn';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // Firebase 콘솔에서 발급
});

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
  }

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('User Info:', userInfo);
      navigation.replace('Tabs');
    } catch (error) {
      console.error(error);
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