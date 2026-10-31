import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Shadows } from '../../src/theme';
import { useSync } from '../../src/store/SyncContext';

export const Header = ({
  title,
  subtitle,
  showBack = false,
  rightElement,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isOnline, pendingCount, isSyncing } = useSync();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }, style]}>
      <View style={styles.topRow}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🏥</Text>
            <Text style={styles.logoText}>आरोग्य LINK</Text>
          </View>
        )}

        <View style={styles.rightSection}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>OFFLINE</Text>
            </View>
          )}
          {isOnline && pendingCount > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncText}>
                {isSyncing ? '🔄' : `⏳ ${pendingCount}`}
              </Text>
            </View>
          )}
          {rightElement}
        </View>
      </View>

      {title && (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    ...Shadows.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoEmoji: { fontSize: 22, marginRight: Spacing.xs },
  logoText: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.white },
  backBtn: { padding: Spacing.sm },
  backIcon: { fontSize: 22, color: Colors.white },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  offlineBadge: {
    backgroundColor: Colors.offline,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  offlineText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  syncBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  syncText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  titleRow: { marginTop: Spacing.xs },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});

