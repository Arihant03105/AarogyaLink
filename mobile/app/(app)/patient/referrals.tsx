import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { referralAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function PatientReferralsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLocalReferrals();
    if (isOnline) {
      fetchServerReferrals();
    }
  }, []);

  const loadLocalReferrals = async () => {
    try {
      const rows = await dbAll('SELECT * FROM referrals ORDER BY created_at DESC');
      if (rows && rows.length > 0) {
        setReferrals(rows);
      }
    } catch (e) {
      console.log('Local referrals error:', e.message);
    }
  };

  const fetchServerReferrals = async () => {
    try {
      const res = await referralAPI.list({ patientId: user?._id || user?.id });
      const serverList = res.data?.referrals || res.data || [];
      if (serverList.length > 0) {
        setReferrals(serverList);
      }
    } catch (e) {
      console.log('Error fetching server referrals:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchReferrals = async () => {
    await loadLocalReferrals();
    if (isOnline) {
      await fetchServerReferrals();
    }
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Referrals & Care Transfers" subtitle="Higher medical facility escalation tracking" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchReferrals(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <Card style={styles.infoBanner}>
          <Text style={styles.bannerTitle}>🏥 District & Specialty Referrals</Text>
          <Text style={styles.bannerDesc}>
            When primary care at the Sub-Centre or PHC requires specialist attention, referrals to CHC/District Hospitals are logged here.
          </Text>
        </Card>

        {loading ? (
          <LoadingState message="Loading referrals..." />
        ) : referrals.length === 0 ? (
          <EmptyState
            icon="🔗"
            title="No Active Referrals"
            subtitle="You currently have no specialist or district hospital transfer orders."
          />
        ) : (
          referrals.map((ref, idx) => (
            <Card key={ref._id || ref.id || idx} style={styles.refCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalName}>
                    {ref.hospitalName || 'District Hospital / Specialist Center'}
                  </Text>
                  <Text style={styles.referredDoctor}>
                    Referred to: {ref.toDoctorName || ref.toDoctorId?.name || 'Assigned Specialist'}
                  </Text>
                </View>
                <Badge status={ref.status || 'pending'} />
              </View>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reason for Referral:</Text>
                  <Text style={styles.detailValue}>{ref.reason || 'General evaluation'}</Text>
                </View>

                {ref.followUpDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Follow-up Target Date:</Text>
                    <Text style={[styles.detailValue, { color: Colors.primary, fontWeight: '700' }]}>
                      {new Date(ref.followUpDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                )}

                {ref.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Physician Instructions:</Text>
                    <Text style={styles.notesValue}>{ref.notes}</Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  infoBanner: { backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  bannerTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primaryDark },
  bannerDesc: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 4, lineHeight: 18 },
  refCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  hospitalName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  referredDoctor: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  detailsBox: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.sm },
  detailRow: { marginVertical: 3 },
  detailLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  detailValue: { fontSize: Fonts.sizes.sm, color: Colors.darkText, marginTop: 1 },
  notesBox: { backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.sm },
  notesLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primaryDark },
  notesValue: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 2 },
});

