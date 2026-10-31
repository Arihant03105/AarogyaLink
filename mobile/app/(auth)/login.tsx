import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../src/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GoogleButton } from '../../components/ui/GoogleButton';
import { useAuth } from '../../src/store/AuthContext';
import { useI18n } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { t } = useI18n();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: any = {};
    if (!form.identifier.trim()) e.identifier = 'Mobile or email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login({ identifier: form.identifier, password: form.password });
      const roleRoutes: Record<string, any> = {
        patient: '/(app)/patient',
        asha: '/(app)/asha',
        doctor: '/(app)/doctor',
        pharmacy: '/(app)/pharmacy',
        admin: '/(app)/admin',
      };
      if (user.isOfflineLogin) {
        Alert.alert(
          'Offline Mode Session',
          `Logged in as ${user.name} (${user.role.toUpperCase()}). You can use all features offline. Data will sync when connected.`,
          [{ text: 'Continue', onPress: () => router.replace(roleRoutes[user.role] || '/(auth)/welcome') }]
        );
      } else {
        router.replace(roleRoutes[user.role] || '/(auth)/welcome');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Login failed. Check your credentials.';
      Alert.alert('Login Notice', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>{t('login')}</Text>
          <Text style={styles.heroSub}>Welcome back to AAROGYA LINK</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('mobile') + ' / ' + t('email')}
            value={form.identifier}
            onChangeText={v => setForm(f => ({ ...f, identifier: v }))}
            placeholder="Enter mobile or email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.identifier}
            icon={<Text>📱</Text>}
          />
          <Input
            label={t('password')}
            value={form.password}
            onChangeText={v => setForm(f => ({ ...f, password: v }))}
            placeholder="Enter password"
            secureTextEntry
            error={errors.password}
            icon={<Text>🔒</Text>}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          <Button
            title={loading ? 'Logging in...' : t('login')}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.loginBtn}
          />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <GoogleButton mode="login" />

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.signupLink}>
            <Text style={styles.signupText}>
              Don't have an account? <Text style={styles.signupBold}>{t('signup')}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo hint */}
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo Accounts</Text>
          {[
            { role: 'Patient', mobile: '9000000001', pass: 'patient123' },
            { role: 'ASHA Worker', mobile: '9000000002', pass: 'asha123' },
            { role: 'Doctor', mobile: '9000000003', pass: 'doctor123' },
            { role: 'Pharmacy', mobile: '9000000004', pass: 'pharma123' },
            { role: 'Admin', mobile: '9000000005', pass: 'admin123' },
          ].map(d => (
            <TouchableOpacity
              key={d.role}
              style={styles.demoRow}
              onPress={() => setForm({ identifier: d.mobile, password: d.pass })}
            >
              <Text style={styles.demoRole}>{d.role}</Text>
              <Text style={styles.demoCred}>{d.mobile} / {d.pass}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  backBtn: { marginBottom: Spacing.md },
  backText: { fontSize: Fonts.sizes.base, color: Colors.primary, fontWeight: '600' },
  hero: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  logoWrapper: {
    width: 170,
    height: 78,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: '#075B41',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImage: {
    width: 160,
    height: 72,
  },
  heroTitle: { fontSize: Fonts.sizes.xxl, fontWeight: '900', color: Colors.white },
  heroSub: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: Spacing.xs },
  form: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.md, marginTop: -Spacing.sm },
  forgotText: { color: Colors.primary, fontSize: Fonts.sizes.sm, fontWeight: '600' },
  loginBtn: { marginBottom: Spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.md, color: Colors.secondaryText, fontSize: Fonts.sizes.sm },
  signupLink: { alignItems: 'center' },
  signupText: { fontSize: Fonts.sizes.sm, color: Colors.secondaryText },
  signupBold: { color: Colors.primary, fontWeight: '700' },
  demoBox: {
    backgroundColor: Colors.secondary,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoTitle: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.sm },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  demoRole: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.primary },
  demoCred: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
});

