import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { SyncProvider } from '../src/store/SyncContext';
import { I18nProvider } from '../src/i18n';
import { initDatabase } from '../src/database';

// Only prevent native splash on native platforms
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function RootLayoutInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      const roleRoutes: Record<string, string> = {
        patient: '/(app)/patient',
        asha: '/(app)/asha',
        doctor: '/(app)/doctor',
        pharmacy: '/(app)/pharmacy',
        admin: '/(app)/admin',
      };
      router.replace((roleRoutes[user?.role] || '/(auth)/welcome') as any);
    }
  }, [user, loading, segments]);

  // On web: show a green spinner instead of null to avoid black screen
  if (loading) {
    if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FBF6' }}>
          <ActivityIndicator size="large" color="#168B68" />
        </View>
      );
    }
    return null;
  }

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
    if (Platform.OS !== 'web') {
      initDatabase().catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (loaded !== false && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
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
