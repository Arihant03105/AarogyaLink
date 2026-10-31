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
import { appointmentAPI, referralAPI, patientAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function DoctorHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    patientsCount: 15,
    newRequests: 2,
    pendingConsultations: 1,
    pendingReferrals: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    loadLocalDashboard();
    if (isOnline) {
      fetchServerDashboard();
    }
  }, []);

  const loadLocalDashboard = async () => {
    try {
      const localAppts = await dbAll('SELECT * FROM appointments ORDER BY created_at DESC');
      const localRefs = await dbAll('SELECT * FROM referrals WHERE status = "pending"');
      const localPats = await dbAll('SELECT * FROM patients');

      const requested = (localAppts || []).filter(a => a.status === 'requested');
      const accepted = (localAppts || []).filter(a => a.status === 'accepted');

      setStats({
        patientsCount: (localPats || []).length || 15,
        newRequests: requested.length,
        pendingConsultations: accepted.length,
        pendingReferrals: (localRefs || []).length,
      });
      setRecentRequests(requested.slice(0, 5));
    } catch (e) {
      console.log('Local doctor dashboard error:', e.message);
    }
  };

  const fetchServerDashboard = async () => {
    try {
      const docId = user?._id || user?.id;
      const [apptsRes, refsRes, patsRes] = await Promise.allSettled([
        appointmentAPI.list({ doctorId: docId }),
        referralAPI.list({ toDoctorId: docId, status: 'pending' }),
        patientAPI.list({ doctorId: docId }),
      ]);

      const allAppts = apptsRes.status === 'fulfilled' ? (apptsRes.value.data?.appointments || apptsRes.value.data || []) : [];
      const allRefs = refsRes.status === 'fulfilled' ? (refsRes.value.data?.referrals || refsRes.value.data || []) : [];
      const allPats = patsRes.status === 'fulfilled' ? (patsRes.value.data?.patients || patsRes.value.data || []) : [];

      if (allAppts.length > 0 || allRefs.length > 0 || allPats.length > 0) {
        const requested = allAppts.filter(a => a.status === 'requested');
        const accepted = allAppts.filter(a => a.status === 'accepted');

        setStats({
          patientsCount: allPats.length,
          newRequests: requested.length,
          pendingConsultations: accepted.length,
          pendingReferrals: allRefs.length,
        });
        setRecentRequests(requested.slice(0, 5));
      }
    } catch (e) {
      console.log('Doctor server dashboard error:', e.message);
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
        title={`Dr. ${user?.name || 'Practitioner'}`}
        subtitle="Rural Tele-Consultation & Clinical Triage"
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
        {/* Verification banner if pending */}
        {!isVerified && (
          <View style={styles.verifAlert}>
            <Text style={styles.verifAlertIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifAlertTitle}>Medical License Pending Verification</Text>
              <Text style={styles.verifAlertDesc}>
                Your medical registration is awaiting approval by the Chief Medical Officer (Admin).
                Prescription signing is restricted until credentials are confirmed.
              </Text>
            </View>
          </View>
        )}

        {/* Clinical Statistics Grid */}
        <Text style={styles.sectionTitle}>Consultation Overview</Text>
        <View style={styles.statsRow}>
          <StatCard
            icon="👥"
            label="Assigned Patients"
            value={stats.patientsCount}
            color={Colors.primary}
          />
          <StatCard
            icon="🔔"
            label="New Requests"
            value={stats.newRequests}
            color={Colors.warning}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="🩺"
            label="Pending Visits"
            value={stats.pendingConsultations}
            color={Colors.info}
          />
          <StatCard
            icon="🔗"
            label="Inbound Referrals"
            value={stats.pendingReferrals}
            color={Colors.success}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Clinical Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/doctor/consultations')}
          >
            <Text style={styles.quickIcon}>📅</Text>
            <Text style={styles.quickLabel}>Triage Consultations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/doctor/prescriptions')}
          >
            <Text style={styles.quickIcon}>💊</Text>
            <Text style={styles.quickLabel}>Digital Rx</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/doctor/patients')}
          >
            <Text style={styles.quickIcon}>📂</Text>
            <Text style={styles.quickLabel}>Patient Records</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/(app)/doctor/referrals')}
          >
            <Text style={styles.quickIcon}>🏥</Text>
            <Text style={styles.quickLabel}>Referral Cases</Text>
          </TouchableOpacity>
        </View>

        {/* Inbound Patient Requests */}
        <Card
          title="New Appointment Requests"
          subtitle="Patients and ASHA workers awaiting consultation confirmation"
          headerRight={
            <TouchableOpacity onPress={() => router.push('/(app)/doctor/consultations')}>
              <Text style={styles.seeAllText}>View All →</Text>
            </TouchableOpacity>
          }
        >
          {loading ? (
            <LoadingState message="Fetching pending requests..." />
          ) : recentRequests.length === 0 ? (
            <EmptyState
              icon="☕"
              title="No Pending Requests"
              subtitle="All inbound patient appointment requests have been addressed."
            />
          ) : (
            recentRequests.map((appt, i) => (
              <View key={appt._id || appt.id || i} style={styles.requestItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patName}>{appt.patientName || appt.patient_id?.name || 'Village Patient'}</Text>
                  <Text style={styles.reasonText}>Reason: {appt.notes || 'General consultation requested'}</Text>
                  <Text style={styles.timeText}>
                    Requested: {new Date(appt.createdAt || appt.created_at || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
                <Badge status="requested" />
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
  verifAlertIcon: { fontSize: 24, marginRight: Spacing.sm },
  verifAlertTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: '#92400E' },
  verifAlertDesc: { fontSize: Fonts.sizes.xs, color: '#78350F', marginTop: 2, lineHeight: 16 },
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
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  patName: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.darkText },
  reasonText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  timeText: { fontSize: 10, color: Colors.secondaryText, marginTop: 2 },
});

