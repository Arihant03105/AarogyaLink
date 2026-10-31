import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../src/theme';
import { Button } from '../../components/ui/Button';
import { GoogleButton } from '../../components/ui/GoogleButton';
import { useI18n, LANGUAGES } from '../../src/i18n';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, changeLanguage, t } = useI18n();
  const [showLang, setShowLang] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header gradient */}
      <View style={styles.heroSection}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      {/* Feature highlights */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.features}>
          {[
            { icon: '👩‍⚕️', text: 'Connect with ASHA workers & Doctors' },
            { icon: '💊', text: 'Find medicines at nearby pharmacies' },
            { icon: '📱', text: 'Works offline in remote areas' },
            { icon: '🔒', text: 'Secure & private health records' },
            { icon: '🌐', text: 'Available in Hindi, English & Assamese' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Language picker */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setShowLang(!showLang)}
        >
          <Text style={styles.langBtnText}>🌐 {t('language')}: {LANGUAGES.find(l => l.code === language)?.label}</Text>
          <Text style={styles.chevron}>{showLang ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showLang && (
          <View style={styles.langDropdown}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langOption, language === lang.code && styles.langOptionActive]}
                onPress={() => { changeLanguage(lang.code); setShowLang(false); }}
              >
                <Text style={[styles.langOptionText, language === lang.code && styles.langOptionTextActive]}>
                  {lang.label}
                </Text>
                {language === lang.code && <Text>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <Button
            title={t('login')}
            onPress={() => router.push('/(auth)/login')}
            fullWidth
            size="lg"
            style={styles.loginBtn}
          />
          <GoogleButton mode="login" />
          <Button
            title={t('signup')}
            variant="outline"
            onPress={() => router.push('/(auth)/signup')}
            fullWidth
            size="lg"
            style={styles.signupBtn}
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            🌿 A Government-supported initiative for rural healthcare accessibility.
            AI assistance is for informational purposes only and does not replace medical consultation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroSection: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoWrapper: {
    width: 200,
    height: 92,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: '#075B41',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoImage: {
    width: 190,
    height: 86,
  },
  tagline: {
    fontSize: Fonts.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
    fontWeight: '500',
  },
  scrollContent: { padding: Spacing.base },
  features: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  featureIcon: { fontSize: 22, marginRight: Spacing.md, width: 36 },
  featureText: { flex: 1, fontSize: Fonts.sizes.base, color: Colors.darkText },
  langBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langBtnText: { fontSize: Fonts.sizes.base, color: Colors.darkText },
  chevron: { color: Colors.secondaryText },
  langDropdown: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  langOptionActive: { backgroundColor: Colors.secondary },
  langOptionText: { fontSize: Fonts.sizes.base, color: Colors.darkText },
  langOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  ctaSection: { marginBottom: Spacing.md },
  loginBtn: { marginBottom: Spacing.md },
  signupBtn: {},
  disclaimer: {
    backgroundColor: Colors.secondary,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primaryDark,
    textAlign: 'center',
    lineHeight: 18,
  },
});

