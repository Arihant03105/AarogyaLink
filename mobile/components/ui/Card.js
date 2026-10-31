import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii, Spacing, Fonts, Shadows } from '../../src/theme';

export const Card = ({ children, style, title, subtitle, headerRight }) => (
  <View style={[styles.card, style]}>
    {(title || headerRight) && (
      <View style={styles.header}>
        <View style={styles.headerText}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {headerRight && <View>{headerRight}</View>}
      </View>
    )}
    {children}
  </View>
);

export const StatCard = ({ icon, label, value, color = Colors.primary, style }) => (
  <View style={[styles.statCard, { borderLeftColor: color }, style]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.darkText,
  },
  subtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
    flex: 1,
    margin: Spacing.xs,
    ...Shadows.sm,
  },
  statIcon: { fontSize: 24, marginBottom: Spacing.xs },
  statValue: { fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, textAlign: 'center', marginTop: 2 },
});

