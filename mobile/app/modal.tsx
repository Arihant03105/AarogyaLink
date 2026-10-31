import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Fonts, Radii } from '../src/theme';
import { Card } from '../components/ui';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>About Aarogya Link</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoCenter}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.versionTitle}>AAROGYA LINK v1.0.0</Text>
          <Text style={styles.subtitle}>Closing the Rural Diagnosis-to-Care Gap</Text>
          <Text style={styles.body}>
            An integrated, offline-first mobile healthcare platform designed for rural communities,
            connecting patients, ASHA workers, doctors, pharmacies, and healthcare administrators.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>Key Highlights</Text>
          <Text style={styles.bullet}>• Offline-first SQLite persistence & auto-sync</Text>
          <Text style={styles.bullet}>• Multilingual: English, Hindi, Assamese</Text>
          <Text style={styles.bullet}>• Voice-assisted symptom logging for field workers</Text>
          <Text style={styles.bullet}>• Digital prescriptions with draft safeguard</Text>
          <Text style={styles.bullet}>• Verified pharmacy directory and emergency support</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.darkText,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  closeText: {
    fontSize: 18,
    color: Colors.secondaryText,
    fontWeight: 'bold',
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  logoCenter: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  logoWrapper: {
    width: 200,
    height: 92,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: '#075B41',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  logoImage: {
    width: 190,
    height: 84,
  },
  card: {
    padding: Spacing.base,
  },
  versionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.secondaryText,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Fonts.sizes.sm,
    color: Colors.darkText,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: Fonts.sizes.base,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: Spacing.sm,
  },
  bullet: {
    fontSize: Fonts.sizes.sm,
    color: Colors.darkText,
    lineHeight: 22,
  },
});
