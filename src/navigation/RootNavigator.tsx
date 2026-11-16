import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { PermissionsScreen } from '../screens/Permissions/PermissionsScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { StatisticsScreen } from '../screens/Statistics/StatisticsScreen';
import { RootStackParamList } from '../types/navigation';
import { useAppStore } from '../store/appStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { theme } = useAppStore();

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{
          title: 'Required Permissions',
          presentation: 'modal',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          title: 'Activity Dashboard',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: 'Detailed Statistics',
        }}
      />
    </Stack.Navigator>
  );
};
