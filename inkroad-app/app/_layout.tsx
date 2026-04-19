import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="author/work/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="author/episode/[novelId]" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="format-studio" options={{ headerShown: false }} />
      <Stack.Screen name="novel/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="viewer/[id]" options={{ headerShown: false }} />
      <Stack.Screen 
        name="auth" 
        options={{ 
          presentation: 'modal', 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
