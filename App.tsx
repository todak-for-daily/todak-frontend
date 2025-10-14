import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import LoginPage from './screens/login';
import MainPage from './screens/main';
import TodaySchePage from './screens/todaySchedule';
import WeekSchePage from './screens/weekSchedule';
import AnxietyRecord from './screens/anxietyRecord';
import PlaceSimulation from './screens/placeSimulation';
import Settings from './screens/settings';
import { ScheduleProvider } from './contexts/ScheduleContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const getIconName = (routeName: string) => {
  if (routeName === 'Week') return 'calendar-month-outline';
  if (routeName === 'Main') return 'home-variant-outline';
  if (routeName === 'Today') return 'check-circle-outline';
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
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator initialRouteName='Main' screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Week"
        component={WeekSchePage}
        options={{ tabBarIcon: renderTabIcon('Week') }}
      />
      <Tab.Screen
        name="Main"
        component={MainStack}
        options={{ tabBarIcon: renderTabIcon('Main') }}
      />
      <Tab.Screen
        name="Today"
        component={TodaySchePage}
        options={{ tabBarIcon: renderTabIcon('Today') }}
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
          </Stack.Navigator>
      </NavigationContainer>
    </ScheduleProvider>
  </SafeAreaProvider>
  );
}

export default App;
