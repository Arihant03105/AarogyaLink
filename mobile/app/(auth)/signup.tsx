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

const ROLES = [
  { value: 'patient', label: '🤒 Patient', desc: 'Access your health records' },
  { value: 'asha', label: '👩‍⚕️ ASHA Worker', desc: 'Manage community health' },
  { value: 'doctor', label: '👨‍⚕️ Doctor', desc: 'Requires verification' },
  { value: 'pharmacy', label: '💊 Pharmacy', desc: 'Requires verification' },
];

const STATES = [
  'Assam', 'Bihar', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh',
  'Jharkhand', 'Odisha', 'Chhattisgarh', 'West Bengal', 'Telangana', 'Other',
];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', mobile: '', email: '',
    password: '', confirmPassword: '',
    role: '', state: '', district: '', village: '',
    consent: false,
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showStateList, setShowStateList] = useState(false);

  const update = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validateStep1 = () => {
    const e: any = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.mobile.trim() || form.mobile.length < 10) e.mobile = 'Valid mobile is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.role) e.role = 'Please select a role';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: any = {};
    if (!form.state) e.state = 'State is required';
    if (!form.district.trim()) e.district = 'District is required';
    if (!form.village.trim()) e.village = 'Village is required';
    if (!form.consent) e.consent = 'Please accept the consent';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const user = await signup(form);
      const roleRoutes: Record<string, any> = {
        patient: '/(app)/patient',
        asha: '/(app)/asha',
        doctor: '/(app)/doctor',
        pharmacy: '/(app)/pharmacy',
      };
      const title = user.isOfflineRegistration ? 'Account Registered (Offline)' : 'Welcome to Aarogya Link!';
      const note = user.isOfflineRegistration
        ? 'Your account was created locally and is ready to use. It will sync automatically when the server is reached.'
        : `Account created. ${user.role === 'doctor' || user.role === 'pharmacy' ? 'Your account is pending verification.' : ''}`;

      Alert.alert(title, note, [
        { text: 'Continue', onPress: () => router.replace(roleRoutes[user.role] || '/(auth)/welcome') },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || 'Signup failed. Please try again.';
      Alert.alert('Signup Notice', msg);
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
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>{t('signup')}</Text>
          <Text style={styles.heroSub}>Step {step} of 2</Text>
          <View style={styles.stepBar}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>
        </View>

        {step === 1 && (
          <View style={styles.form}>
            <GoogleButton mode="signup" defaultRole={form.role || 'patient'} />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR REGISTER WITH MOBILE</Text>
              <View style={styles.line} />
            </View>

            <Input
              label={t('fullName') + ' *'}
              value={form.name}
              onChangeText={v => update('name', v)}
              placeholder="Enter your full name"
              error={errors.name}
              icon={<Text>👤</Text>}
            />
            <Input
              label={t('mobile') + ' *'}
              value={form.mobile}
              onChangeText={v => update('mobile', v)}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              error={errors.mobile}
              icon={<Text>📱</Text>}
              maxLength={10}
            />
            <Input
              label={t('email') + ' (optional)'}
              value={form.email}
              onChangeText={v => update('email', v)}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Text>📧</Text>}
            />
            <Input
              label={t('password') + ' *'}
              value={form.password}
              onChangeText={v => update('password', v)}
              placeholder="At least 6 characters"
              secureTextEntry
              error={errors.password}
              icon={<Text>🔒</Text>}
            />
            <Input
              label={t('confirmPassword') + ' *'}
              value={form.confirmPassword}
              onChangeText={v => update('confirmPassword', v)}
              placeholder="Repeat password"
              secureTextEntry
              error={errors.confirmPassword}
              icon={<Text>🔒</Text>}
            />

            <Text style={styles.sectionLabel}>{t('role')} *</Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleCard, form.role === r.value && styles.roleCardActive]}
                onPress={() => update('role', r.value)}
              >
                <View style={styles.roleLeft}>
                  <Text style={styles.roleLabel}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
                <View style={[styles.radioOuter, form.role === r.value && styles.radioOuterActive]}>
                  {form.role === r.value && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

            <Button
              title="Next →"
              onPress={() => { if (validateStep1()) setStep(2); }}
              fullWidth
              size="lg"
              style={styles.nextBtn}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.sectionLabel}>{t('state')} *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowStateList(!showStateList)}
            >
              <Text style={form.state ? styles.pickerSelected : styles.pickerPlaceholder}>
                {form.state || 'Select state'}
              </Text>
              <Text style={styles.chevron}>{showStateList ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showStateList && (
              <View style={styles.pickerList}>
                {STATES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pickerOption, form.state === s && styles.pickerOptionActive]}
                    onPress={() => { update('state', s); setShowStateList(false); }}
                  >
                    <Text style={form.state === s ? styles.pickerOptionActiveText : styles.pickerOptionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}

            <Input
              label={t('district') + ' *'}
              value={form.district}
              onChangeText={v => update('district', v)}
              placeholder="Your district"
              error={errors.district}
              icon={<Text>📍</Text>}
              style={{ marginTop: Spacing.sm }}
            />
            <Input
              label={t('village') + ' *'}
              value={form.village}
              onChangeText={v => update('village', v)}
              placeholder="Your village / town"
              error={errors.village}
              icon={<Text>🏘️</Text>}
            />

            {/* Consent */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => update('consent', !form.consent)}
            >
              <View style={[styles.checkbox, form.consent && styles.checkboxActive]}>
                {form.consent && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>{t('consent')}</Text>
            </TouchableOpacity>
            {errors.consent && <Text style={styles.errorText}>{errors.consent}</Text>}

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.nextBtn}
            />
          </View>
        )}
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
    paddingVertical: Spacing.xl,
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
  heroSub: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  stepBar: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.4)' },
  stepDotActive: { backgroundColor: Colors.white },
  stepLine: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.white },
  form: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.darkText, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.secondary },
  roleLeft: { flex: 1 },
  roleLabel: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.darkText },
  roleDesc: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  errorText: { fontSize: Fonts.sizes.xs, color: Colors.error, marginBottom: Spacing.sm, marginLeft: 2 },
  nextBtn: { marginTop: Spacing.md },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
    marginBottom: Spacing.sm,
  },
  pickerSelected: { fontSize: Fonts.sizes.base, color: Colors.darkText },
  pickerPlaceholder: { fontSize: Fonts.sizes.base, color: Colors.secondaryText },
  chevron: { color: Colors.secondaryText },
  pickerList: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    maxHeight: 220,
    overflow: 'hidden',
  },
  pickerOption: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  pickerOptionActive: { backgroundColor: Colors.secondary },
  pickerOptionText: { fontSize: Fonts.sizes.base, color: Colors.darkText },
  pickerOptionActiveText: { fontSize: Fonts.sizes.base, color: Colors.primary, fontWeight: '700' },
  consentRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    marginRight: Spacing.sm, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.white, fontWeight: '900', fontSize: 14 },
  consentText: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.darkText },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.sm, color: Colors.secondaryText, fontSize: 11, fontWeight: '700' },
});

