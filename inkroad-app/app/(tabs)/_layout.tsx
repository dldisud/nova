import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { mockProfile } from '../../src/mobile/data/mockInkroad';
import { useAuthSession } from '../../src/mobile/hooks/useAuthSession';
import { inkroadTheme } from '../../src/mobile/theme';

export default function TabLayout() {
  const { session, isLoadingSession } = useAuthSession();
  const canShowAuthorTab =
    !isLoadingSession &&
    Boolean(session?.user) &&
    mockProfile.isCreator;

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: inkroadTheme.colors.background,
          borderTopColor: inkroadTheme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: inkroadTheme.colors.inkGold,
        tabBarInactiveTintColor: inkroadTheme.colors.fg3,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '탐색',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="search" size={24} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '서재',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="menu-book" size={24} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="author"
        options={{
          href: canShowAuthorTab ? undefined : null,
          title: '작가',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="edit" size={24} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'MY',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
