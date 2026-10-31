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
import { medicineAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function PharmacyDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 8,
    available: 7,
    lowStock: 1,
    outOfStock: 0,
  });
  const [alertMedicines, setAlertMedicines] = useState([]);

  useEffect(() => {
    loadLocalDashboard();
    if (isOnline) {
      fetchServerDashboard();
    }
  }, []);

  const calculateStats = (meds) => {
    let avail = 0, low = 0, out = 0;
    meds.forEach(m => {
      const stock = m.stock ?? 0;
      const minStock = m.minStock || m.min_stock || 5;
      if (stock === 0) out++;
      else if (stock <= minStock) low++;
      else avail++;
    });

    setStats({
      total: meds.length,
      available: avail,
      lowStock: low,
      outOfStock: out,
    });

    const alerts = meds.filter(m => (m.stock ?? 0) <= (m.minStock || m.min_stock || 5));
    setAlertMedicines(alerts.slice(0, 5));
  };

  const loadLocalDashboard = async () => {
    try {
      const rows = await dbAll('SELECT * FROM medicines ORDER BY stock ASC');
      if (rows && rows.length > 0) {
        calculateStats(rows);
      }
    } catch (e) {
      console.log('Pharmacy local dashboard error:', e.message);
    }
  };

  const fetchServerDashboard = async () => {
    try {
      const pharmaId = user?._id || user?.id;
      const res = await medicineAPI.list({ pharmacyId: pharmaId });
      const meds = res.data?.medicines || res.data || [];
      if (meds.length > 0) {
        calculateStats(meds);
      }
    } catch (e) {
      console.log('Pharmacy server dashboard error:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDashboard = async () => {
    await loadLocalDashboard();
    if (isOnline) {
      await fetchServerDashboard();
    }
    setRefreshing(false);
  };

  const isVerified = user?.isVerified || user?.is_verified;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={user?.name || 'Village Jan Aushadhi'}
        subtitle="Pharmacy Dispensary & Supply Ledger"
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadDashboard(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Verification Alert Banner */}
        {!isVerified && (
          <View style={styles.verifAlert}>
            <Text style={styles.verifIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifTitle}>Pharmacy License Verification Pending</Text>
              <Text style={styles.verifDesc}>
                This dispensary is awaiting digital license authentication by District Drug Administration.
                Until approved, inventory items will be flagged as "Demo / Unverified".
              </Text>
            </View>
          </View>
        )}

        {/* Inventory Metric Cards */}
        <Text style={styles.sectionTitle}>Stock Summary</Text>
        <View style={styles.statsRow}>
          <StatCard
            icon="📦"
            label="Total Drug Items"
            value={stats.total}
            color={Colors.primary}
          />
          <StatCard
            icon="✅"
            label="In Stock"
            value={stats.available}
            color={Colors.success}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="⚠️"
            label="Low Stock Alert"
            value={stats.lowStock}
            color={Colors.warning}
          />
          <StatCard
            icon="❌"
            label="Out of Stock"
            value={stats.outOfStock}
            color={Colors.error}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Inventory Operations</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/pharmacy/inventory')}
          >
            <Text style={styles.quickIcon}>➕</Text>
            <Text style={styles.quickLabel}>Add Medicine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/pharmacy/inventory')}
          >
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={styles.quickLabel}>Full Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/pharmacy/requests')}
          >
            <Text style={styles.quickIcon}>📩</Text>
            <Text style={styles.quickLabel}>Patient Inquiries</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/pharmacy/profile')}
          >
            <Text style={styles.quickIcon}>🏬</Text>
            <Text style={styles.quickLabel}>Store Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Low Stock & Expiry Critical Alerts */}
        <Card
          title="Critical Re-order Alerts"
          subtitle="Medicines requiring immediate supply replenishment"
          headerRight={
            <TouchableOpacity onPress={() => router.push('/(app)/pharmacy/inventory')}>
              <Text style={styles.seeAllText}>Manage →</Text>
            </TouchableOpacity>
          }
        >
          {loading ? (
            <LoadingState message="Checking inventory levels..." />
          ) : alertMedicines.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="Inventory Healthy"
              subtitle="All essential salts and formulations are adequately stocked."
            />
          ) : (
            alertMedicines.map((m, i) => (
              <View key={m._id || m.id || i} style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.stockLevel}>
                    Remaining: <Text style={{ color: Colors.error, fontWeight: '800' }}>{m.stock ?? 0} units</Text> (Min threshold: {m.minStock || m.min_stock || 5})
                  </Text>
                </View>
                <Badge status={(m.stock ?? 0) === 0 ? 'out_of_stock' : 'low_stock'} />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  verifAlert: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  verifIcon: { fontSize: 24, marginRight: Spacing.sm },
  verifTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: '#92400E' },
  verifDesc: { fontSize: Fonts.sizes.xs, color: '#78350F', marginTop: 2, lineHeight: 16 },
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
  seeAllText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primary },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  medName: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.darkText },
  stockLevel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
});

