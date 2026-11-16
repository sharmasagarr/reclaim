import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusScreen } from '../screens/Focus/FocusScreen';
import { ScheduleScreen } from '../screens/Schedule/ScheduleScreen';
import { BlocksScreen } from '../screens/Blocks/BlocksScreen';
import { RootTabParamList } from '../types/navigation';
import { FocusIcon, ScheduleIcon, BlocksIcon } from '../components/NavigationIcons';
import AppText from '../components/AppText';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabBarIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const color = focused ? '#22C55E' : '#9CA3AF';
  switch (name) {
    case 'Focus':
      return <FocusIcon color={color} size={22} />;
    case 'Schedule':
      return <ScheduleIcon color={color} size={20} />;
    case 'Blocks':
    default:
      return <BlocksIcon color={color} size={22} />;
  }
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabButton}>
              <View
                style={[
                  styles.pillContainer,
                  isFocused && styles.activePillContainer,
                ]}>
                <TabBarIcon name={route.name} focused={isFocused} />
              </View>
              <AppText
                style={[
                  styles.tabLabel,
                  isFocused ? styles.activeTabLabel : styles.inactiveTabLabel,
                ]}>
                {route.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const renderCustomTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Blocks"
      tabBar={renderCustomTabBar}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen name="Focus" component={FocusScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Blocks" component={BlocksScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#09090B',
    borderTopWidth: 1,
    borderTopColor: '#18181B',
    paddingTop: 6,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 20,
    zIndex: 999,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pillContainer: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  activePillContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#22C55E',
    fontWeight: '600',
  },
  inactiveTabLabel: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
});
