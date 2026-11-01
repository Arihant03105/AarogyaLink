import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    const roleRoutes: Record<string, string> = {
      patient: '/(app)/patient',
      asha: '/(app)/asha',
      doctor: '/(app)/doctor',
      pharmacy: '/(app)/pharmacy',
      admin: '/(app)/admin',
    };
    return <Redirect href={(roleRoutes[user.role] || '/(auth)/welcome') as any} />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
