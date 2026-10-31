import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack id="app-stack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="patient" />
      <Stack.Screen name="asha" />
      <Stack.Screen name="doctor" />
      <Stack.Screen name="pharmacy" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

