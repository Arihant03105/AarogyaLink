import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card, StatCard } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { adminAPI } from '../../../src/services/api';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalUsers: 24,
    patients: 15,
    ashas: 4,
    doctors: 3,
    pharmacies: 2,
    pendingVerifications: 2,
    totalConsultations: 38,
    syncedRecords: 142,
  });

  useEffect(() => {
    if (isOnline) {
      loadAnalytics();
    }
  }, []);

  const loadAnalytics = async () => {
    try {
      if (isOnline) {
        const res = await adminAPI.getAnalytics();
        if (res.data?.analytics) {
          setAnalytics(res.data.analytics);
        }
      }
    } catch (e) {
      console.log('Analytics load fallback:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Admin Control Hub"
        subtitle="Platform governance, verification & sync analytics"
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAnalytics(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Critical Attention Alert: Pending Verifications */}
        {analytics.pendingVerifications > 0 && (
          <TouchableOpacity
            style={styles.attentionCard}
            onPress={() => router.push('/(app)/admin/verifications')}
          >
            <Text style={styles.attentionIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.attentionTitle}>
                {analytics.pendingVerifications} Healthcare Provider Approvals Pending
              </Text>
              <Text style={styles.attentionDesc}>
                Doctors & Pharmacies awaiting license verification before live public directory listing.
              </Text>
            </View>
            <Text style={styles.reviewLink}>Review ➔</Text>
          </TouchableOpacity>
        )}

        {/* Global User Metric Cards */}
        <Text style={styles.sectionTitle}>Platform Stakeholders</Text>
        <View style={styles.statsRow}>
          <StatCard
            icon="👥"
            label="Total Accounts"
            value={analytics.totalUsers}
            color={Colors.primary}
          />
          <StatCard
            icon="🤒"
            label="Rural Patients"
            value={analytics.patients}
            color={Colors.info}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="👩‍⚕️"
            label="ASHA Workers"
            value={analytics.ashas}
            color={Colors.warning}
          />
          <StatCard
            icon="👨‍⚕️"
            label="Verified Doctors"
            value={analytics.doctors}
            color={Colors.success}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="🏪"
            label="Pharmacies"
            value={analytics.pharmacies}
            color={Colors.primaryDark}
          />
          <StatCard
            icon="🔄"
            label="Synced Records"
            value={analytics.syncedRecords}
            color={Colors.success}
          />
        </View>

        {/* Quick Governance Links */}
        <Text style={styles.sectionTitle}>Governance & Operations</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/admin/verifications')}
          >
            <Text style={styles.quickIcon}>🛡️</Text>
            <Text style={styles.quickLabel}>License Approvals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/admin/users')}
          >
            <Text style={styles.quickIcon}>👤</Text>
            <Text style={styles.quickLabel}>User Management</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/admin/analytics')}
          >
            <Text style={styles.quickIcon}>📈</Text>
            <Text style={styles.quickLabel}>Care Gap Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/admin/settings')}
          >
            <Text style={styles.quickIcon}>📜</Text>
            <Text style={styles.quickLabel}>Audit Trails</Text>
          </TouchableOpacity>
        </View>

        {/* System Health Card */}
        <Card title="System Telemetry & Offline Reliability">
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Cloud Database (MongoDB)</Text>
            <Badge status="active" label="OPERATIONAL" />
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Local Edge Engine (Expo SQLite)</Text>
            <Badge status="active" label="ACTIVE" />
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Conflict Resolution Strategy</Text>
            <Badge status="info" label="TIMESTAMP / MERGE" />
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Role-Based Access Control</Text>
            <Badge status="active" label="ENFORCED" />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  attentionIcon: { fontSize: 28, marginRight: Spacing.sm },
  attentionTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: '#92400E' },
  attentionDesc: { fontSize: Fonts.sizes.xs, color: '#78350F', marginTop: 2, lineHeight: 16 },
  reviewLink: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primaryDark, marginLeft: Spacing.xs },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.darkText, marginVertical: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.xs },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  quickCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  quickIcon: { fontSize: 26, marginBottom: 4 },
  quickLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  healthLabel: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600' },
});

