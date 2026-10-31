import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { SyncProvider } from '../src/store/SyncContext';
import { I18nProvider } from '../src/i18n';
import { initDatabase } from '../src/database';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Route based on role
      const roleRoutes = {
        patient: '/(app)/patient',
        asha: '/(app)/asha',
        doctor: '/(app)/doctor',
        pharmacy: '/(app)/pharmacy',
        admin: '/(app)/admin',
      };
      router.replace((roleRoutes as any)[user?.role] || '/(auth)/welcome');
    }
  }, [user, loading, segments]);

  if (loading) return null;

  return (
    <Stack id="root-stack" screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  useEffect(() => {
    if (loaded !== false) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <SyncProvider>
            <StatusBar style="light" />
            <RootLayoutInner />
          </SyncProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
