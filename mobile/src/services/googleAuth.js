import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

// expo-web-browser and expo-auth-session are native-only
// Lazy-load to prevent web bundle crashes
let WebBrowser = null;
let Google = null;

if (Platform.OS !== 'web') {
  try {
    WebBrowser = require('expo-web-browser');
    Google = require('expo-auth-session/providers/google');
    WebBrowser.maybeCompleteAuthSession();
  } catch (e) {}
}

// Check if user has provided real Google Cloud Client IDs in .env
const ENV_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const ENV_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ENV_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const hasConfiguredGoogleOAuth = Boolean(
  ENV_ANDROID_CLIENT_ID || ENV_IOS_CLIENT_ID || ENV_WEB_CLIENT_ID
);

// Fallback dummy client IDs to satisfy Google.useAuthRequest invariantClientId check
const DUMMY_CLIENT_ID = 'aarogya-link-placeholder.apps.googleusercontent.com';

const ANDROID_CLIENT_ID = ENV_ANDROID_CLIENT_ID || DUMMY_CLIENT_ID;
const IOS_CLIENT_ID = ENV_IOS_CLIENT_ID || DUMMY_CLIENT_ID;
const WEB_CLIENT_ID = ENV_WEB_CLIENT_ID || DUMMY_CLIENT_ID;

// Web-safe hook — no native dependencies
const useGoogleAuthWeb = (_onSuccess) => {
  return {
    signIn: async () => ({ isSimulationNeeded: true }),
    loading: false,
    isReady: false,
  };
};

// Native hook — uses expo-auth-session
const useGoogleAuthNative = (onSuccess) => {
  const [loading, setLoading] = useState(false);

  // useAuthRequest requires non-undefined client IDs for the active platform
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    clientId: DUMMY_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      setLoading(false);
      Alert.alert('Google Sign-In Error', response.error?.message || 'Failed to authenticate with Google.');
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  const fetchUserInfo = async (token) => {
    try {
      setLoading(true);
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      if (onSuccess) {
        await onSuccess({
          token,
          googleId: user.sub,
          email: user.email,
          name: user.name,
          photo: user.picture,
        });
      }
    } catch (e) {
      Alert.alert('Google Sign-In', 'Could not retrieve Google profile details.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (preferredRole = 'patient') => {
    if (hasConfiguredGoogleOAuth) {
      setLoading(true);
      try {
        await promptAsync();
      } catch (err) {
        setLoading(false);
        Alert.alert('Google Sign-In', err.message || 'Unable to start Google Sign-In.');
      }
    } else {
      setLoading(false);
      return { isSimulationNeeded: true };
    }
  };

  return { signIn, loading, isReady: !!request };
};

// Platform.OS is a build-time constant, so this branch is safe and consistent
export const useGoogleAuth = Platform.OS === 'web' || !Google
  ? useGoogleAuthWeb
  : useGoogleAuthNative;
