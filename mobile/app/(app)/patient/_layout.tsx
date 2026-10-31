import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../../src/theme';

export default function PatientLayout() {
  return (
    <Tabs
      id="patient-tabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.secondaryText,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Appointments', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📅</Text> }} />
      <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text> }} />
      <Tabs.Screen name="medicines" options={{ title: 'Medicines', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💊</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text> }} />
    </Tabs>
  );
}
