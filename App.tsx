import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import LoginPage from './screens/login';
import MainPage from './screens/main';
//import TodaySchePage from './screens/todaySchedule';
import WeeklySchedule from './screens/weekSchedule';
import AnxietyRecord from './screens/anxietyRecord';
import PlaceSimulation from './screens/placeSimulation';
import MonthlySchedule from './screens/monthlySchedule';
import RoutinePage from './screens/routineSchedule';
import Settings from './screens/settings';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { WEB_CLIENT_ID } from '@env';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getIconName = (routeName: string) => {
  if (routeName === 'Routine') return 'calendar-month-outline';
  if (routeName === 'Main') return 'home-variant-outline';
  if (routeName === 'Monthly') return 'check-circle-outline';
  return 'home-variant-outline';
};

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
});

const renderTabIcon =
  (routeName: string) =>
  ({ color, size }: { color: string; size: number }) => (
    <Icon name={getIconName(routeName)} size={size} color={color} />
  );

// Main 탭 내부의 Stack Navigator
function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainPage" 
        component={MainPage} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AnxietyRecord" 
        component={AnxietyRecord} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PlaceSimulation" 
        component={PlaceSimulation} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Settings" 
        component={Settings} 
        options={{ headerShown: false }}
      />
       <Stack.Screen 
        name="WeeklySchedule" 
        component={WeeklySchedule} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator initialRouteName='Main' screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Routine"
        component={RoutinePage}
        options={{ 
          tabBarLabel: '매주 하는 일',
          tabBarIcon: renderTabIcon('Routine') }}
      />
      <Tab.Screen
        name="Main"
        component={MainStack}
        options={{ 
          tabBarLabel: '처음으로',
          tabBarIcon: renderTabIcon('Main') }}
      />
      <Tab.Screen
        name="Monthly"
        component={MonthlySchedule}
        options={{ 
          tabBarLabel: '이번 달 시간표',
          tabBarIcon: renderTabIcon('Monthly') }}
      />
    </Tab.Navigator>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
  <SafeAreaProvider>
    <ScheduleProvider>
      <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginPage}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Tabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
        <Stack.Screen 
            name="WeeklySchedule" 
            component={WeeklySchedule} 
            options={{ headerShown: false }}
          />
          </Stack.Navigator>
      </NavigationContainer>
    </ScheduleProvider>
  </SafeAreaProvider>
  );
}

export default App;
