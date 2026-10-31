import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii, Spacing, Fonts } from '../../src/theme';

const badgeMap = {
  pending: { bg: Colors.badge.pending, text: Colors.badge.pendingText, label: 'Pending' },
  accepted: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Accepted' },
  rejected: { bg: Colors.badge.error, text: Colors.badge.errorText, label: 'Rejected' },
  completed: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Completed' },
  cancelled: { bg: Colors.badge.error, text: Colors.badge.errorText, label: 'Cancelled' },
  requested: { bg: Colors.badge.info, text: Colors.badge.infoText, label: 'Requested' },
  active: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Active' },
  inactive: { bg: Colors.badge.pending, text: Colors.badge.pendingText, label: 'Inactive' },
  available: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Available' },
  low_stock: { bg: Colors.badge.pending, text: Colors.badge.pendingText, label: 'Low Stock' },
  out_of_stock: { bg: Colors.badge.error, text: Colors.badge.errorText, label: 'Out of Stock' },
  approved: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Approved' },
  unverified: { bg: Colors.badge.pending, text: Colors.badge.pendingText, label: 'Pending' },
  verified: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Verified' },
  synced: { bg: Colors.badge.active, text: Colors.badge.activeText, label: 'Synced' },
  syncing: { bg: Colors.badge.info, text: Colors.badge.infoText, label: 'Syncing' },
  failed: { bg: Colors.badge.error, text: Colors.badge.errorText, label: 'Failed' },
  conflict: { bg: Colors.badge.pending, text: Colors.badge.pendingText, label: 'Conflict' },
  draft: { bg: Colors.badge.info, text: Colors.badge.infoText, label: 'Draft' },
};

export const Badge = ({ status, label, style }) => {
  const config = badgeMap[status] || { bg: Colors.secondary, text: Colors.darkText, label: status || '' };
  const displayLabel = label || config.label;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.text }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

