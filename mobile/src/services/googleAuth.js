import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

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

export const useGoogleAuth = (onSuccess) => {
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
    // If real Google Cloud client IDs are configured in .env, trigger the OAuth web browser flow
    if (hasConfiguredGoogleOAuth) {
      setLoading(true);
      try {
        await promptAsync();
      } catch (err) {
        setLoading(false);
        Alert.alert('Google Sign-In', err.message || 'Unable to start Google Sign-In.');
      }
    } else {
      // In development when Google Cloud credentials are not configured yet,
      // return simulation flag so GoogleButton opens the account & role picker dialog
      setLoading(false);
      return { isSimulationNeeded: true };
    }
  };

  return { signIn, loading, isReady: !!request };
};
