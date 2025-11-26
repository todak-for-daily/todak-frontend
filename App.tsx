import { StatusBar, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import LoginPage from './screens/login';
import MainPage from './screens/main';
//import TodaySchePage from './screens/todaySchedule';
import WeeklySchedule from './screens/weekSchedule';
import AnxietyInputScreen from './screens/anxietyInputScreen';
import StickerChartScreen from './screens/stickerChartScreen';
import PlaceSimulation from './screens/placeSimulation';
import MonthlySchedule from './screens/monthlySchedule';
import RoutinePage from './screens/routineSchedule';
import Settings from './screens/settings';
import WorkScreen from './screens/workScreen';
import WorkOrganizationList from './screens/workOrganizationList';
import AdminInputScreen from './screens/adminInputScreen';
import RoleSelectionScreen from './screens/roleSelectionScreen';
import HabitInputScreen from './screens/habitInputScreen';
import EmployeeScreen from './screens/employeeScreen';
import EmotionReportScreen from './screens/emotionReportScreen';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { WeeklyScheduleProvider } from './contexts/WeeklyScheduleContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import React from 'react';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const WorkStack = createNativeStackNavigator();

const getIconName = (routeName: string) => {
  if (routeName === 'Routine') return 'calendar-month-outline';
  if (routeName === 'Main') return 'home-variant-outline';
  if (routeName === 'Work') return 'briefcase-outline';
  if (routeName === 'Monthly') return 'check-circle-outline';
  if (routeName === 'Employee') return 'account';
  return 'home-variant-outline';
};


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
        name="AnxietyInputScreen" 
        component={AnxietyInputScreen} 
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
        name="AdminInput" 
        component={AdminInputScreen} 
        options={{ headerShown: false }}
      />
       <Stack.Screen 
        name="WeeklySchedule" 
        component={WeeklySchedule} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="StickerChart" 
        component={StickerChartScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EmotionReport" 
        component={EmotionReportScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function WorkStackNavigator() {
  return (
    <WorkStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkStack.Screen name="WorkHome" component={WorkScreen} />
      <WorkStack.Screen name="WorkSettings" component={Settings} />
      <WorkStack.Screen name="WorkManageMembers" component={AdminInputScreen} />
      <WorkStack.Screen name="WorkOrganizationList" component={WorkOrganizationList} />
      <WorkStack.Screen name="EmotionReport" component={EmotionReportScreen} />
    </WorkStack.Navigator>
  );
}

function EmployeeStackNavigator() {
  return (
    <WorkStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkStack.Screen name="EmployeeList" component={EmployeeScreen} />
      <WorkStack.Screen name="EmotionReport" component={EmotionReportScreen} />
    </WorkStack.Navigator>
  );
}

function TabNavigator() {
  const { canAccessWorkTab, isAdmin } = useAuth();
  const initialTab = isAdmin ? (canAccessWorkTab ? 'Work' : 'Employee') : 'Main';

  return (
    <Tab.Navigator initialRouteName={initialTab} screenOptions={{ headerShown: false }}>
      {!isAdmin && (
        <>
      <Tab.Screen
        name="Routine"
        component={RoutinePage}
        options={{
          tabBarLabel: '매주 하는 일',
          tabBarIcon: renderTabIcon('Routine'),
        }}
      />
        <Tab.Screen
          name="Main"
          component={MainStack}
          options={{
            tabBarLabel: '처음으로',
            tabBarIcon: renderTabIcon('Main'),
            }}
          />
        </>
      )}
      {isAdmin && (
        <Tab.Screen
          name="Employee"
          component={EmployeeStackNavigator}
          options={{
            tabBarLabel: '직원',
            tabBarIcon: renderTabIcon('Employee'),
          }}
        />
      )}
      {canAccessWorkTab && (
        <Tab.Screen
          name="Work"
          component={WorkStackNavigator}
          options={{
            tabBarLabel: '일하기',
            tabBarIcon: renderTabIcon('Work'),
          }}
        />
      )}
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

// 인증 상태에 따른 네비게이션 컴포넌트
function AuthNavigator() {
  const { isLoggedIn, isLoading, hasCompletedOnboarding } = useAuth();

  // 로딩 중일 때는 아무것도 렌더링하지 않음 (또는 로딩 화면 표시)
  if (isLoading) {
    return null; // 또는 로딩 스피너 컴포넌트
  }

  // 로그인 상태에 따라 초기 화면 결정
  const getInitialRouteName = () => {
    if (!isLoggedIn) {
      return 'Login';
    }
    if (!hasCompletedOnboarding) {
      return 'RoleSelection';
    }
    return 'Tabs';
  };

  return (
    <Stack.Navigator initialRouteName={getInitialRouteName()}>
      <Stack.Screen
        name="Login"
        component={LoginPage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HabitInput"
        component={HabitInputScreen}
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
  );
}

function App() {
  React.useEffect(() => {
    const requestGalleryPermission = async () => {
      if (Platform.OS !== 'android') {
        return;
      }
      try {
        if (Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          );
        } else {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
        }
      } catch (error) {
        console.warn('갤러리 권한 요청 실패', error);
      }
    };
    requestGalleryPermission();
  }, []);

  return (
  <SafeAreaProvider>
    <AuthProvider>
      <AdminProvider>
        <ScheduleProvider>
          <WeeklyScheduleProvider>
            <NavigationContainer>
            <StatusBar 
              barStyle="light-content" 
              backgroundColor="#000000"
              translucent={false}
            />
              <AuthNavigator />
          </NavigationContainer>
          </WeeklyScheduleProvider>
        </ScheduleProvider>
      </AdminProvider>
    </AuthProvider>
  </SafeAreaProvider>
  );
}

export default App;
