import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, Spacing, Radii } from '../../src/theme';

export const LoadingState = ({ message = 'Loading...' }) => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

export const EmptyState = ({ icon = '📋', title = 'No data', subtitle, action, actionLabel }) => (
  <View style={styles.center}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && (
      <TouchableOpacity style={styles.actionBtn} onPress={action}>
        <Text style={styles.actionText}>{actionLabel || 'Add'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <View style={styles.center}>
    <Text style={styles.emptyIcon}>⚠️</Text>
    <Text style={styles.errorTitle}>Error</Text>
    <Text style={styles.emptySubtitle}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.actionBtn} onPress={onRetry}>
        <Text style={styles.actionText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const OfflineBanner = ({ pendingCount }) => (
  <View style={styles.offlineBanner}>
    <Text style={styles.offlineText}>
      📡 You are offline{pendingCount > 0 ? ` — ${pendingCount} pending sync` : ''}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Fonts.sizes.base,
    color: Colors.secondaryText,
  },
  emptyIcon: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.darkText,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.error,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  actionBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  actionText: { color: Colors.white, fontWeight: '700' },
  offlineBanner: {
    backgroundColor: Colors.offline,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  offlineText: { color: Colors.white, fontSize: Fonts.sizes.sm, fontWeight: '600' },
});

