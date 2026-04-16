import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '탐색',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '서재',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'MY',
        }}
      />
    </Tabs>
  );
}
