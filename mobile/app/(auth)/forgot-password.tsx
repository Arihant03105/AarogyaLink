import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../src/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authAPI } from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!mobile.trim() || mobile.length < 10) {
      Alert.alert('Error', 'Enter a valid mobile number');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword({ mobile });
      setSent(true);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.card}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your registered mobile number to receive a reset link.</Text>
          {!sent ? (
            <>
              <Input
                label="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                icon={<Text>📱</Text>}
              />
              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                size="lg"
              />
            </>
          ) : (
            <View style={styles.success}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successText}>Reset link sent! Check your SMS.</Text>
              <Button title="Back to Login" onPress={() => router.replace('/(auth)/login')} fullWidth size="lg" style={{ marginTop: Spacing.lg }} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  backBtn: { marginBottom: Spacing.md },
  backText: { fontSize: Fonts.sizes.base, color: Colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  icon: { fontSize: 56, marginBottom: Spacing.md },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.darkText, marginBottom: Spacing.sm },
  subtitle: { fontSize: Fonts.sizes.sm, color: Colors.secondaryText, textAlign: 'center', marginBottom: Spacing.xl },
  success: { alignItems: 'center', width: '100%' },
  successIcon: { fontSize: 48, marginBottom: Spacing.md },
  successText: { fontSize: Fonts.sizes.base, color: Colors.success, fontWeight: '600', textAlign: 'center' },
});

