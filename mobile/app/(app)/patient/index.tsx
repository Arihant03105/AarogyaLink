import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card, StatCard } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { appointmentAPI, patientAPI, prescriptionAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function PatientHomeScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    loadLocalData();
    if (isOnline) {
      fetchServerData();
    }
  }, [isOnline]);

  const loadLocalData = async () => {
    try {
      const [localAppts, localRx, localReminders] = await Promise.all([
        dbAll('SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5'),
        dbAll('SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT 3'),
        dbAll('SELECT * FROM medicine_reminders WHERE active=1 LIMIT 5'),
      ]);
      if (localAppts?.length) setAppointments(localAppts);
      if (localRx?.length) setPrescriptions(localRx);
      if (localReminders?.length) setReminders(localReminders);
    } catch (e) {}
  };

  const fetchServerData = async () => {
    try {
      const patientId = user?._id || user?.id;
      const [apptRes, rxRes] = await Promise.allSettled([
        appointmentAPI.list({ patientId, limit: 3, sort: '-createdAt' }),
        prescriptionAPI.list({ patientId, limit: 3 }),
      ]);
      if (apptRes.status === 'fulfilled') {
        const appts = apptRes.value.data.appointments || apptRes.value.data || [];
        if (appts.length) setAppointments(appts);
      }
      if (rxRes.status === 'fulfilled') {
        const rxs = rxRes.value.data.prescriptions || rxRes.value.data || [];
        if (rxs.length) setPrescriptions(rxs);
      }
    } catch (e) {
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLocalData();
    if (isOnline) {
      fetchServerData();
    } else {
      setRefreshing(false);
    }
  };

  const QuickAction = ({ icon, label, onPress, color = Colors.primary }) => (
    <TouchableOpacity style={[styles.quickAction, { borderColor: color }]} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.quickEmoji}>{icon}</Text>
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={`Hello, ${user?.name?.split(' ')[0] || 'Patient'} 👋`} subtitle="Your health, your priority" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="🩺" label="Symptoms" onPress={() => router.push('/(app)/patient/symptoms')} />
          <QuickAction icon="📅" label="Book Appt" onPress={() => router.push('/(app)/patient/appointments')} />
          <QuickAction icon="💊" label="Medicines" onPress={() => router.push('/(app)/patient/medicines')} color={Colors.success} />
          <QuickAction icon="🗺️" label="Find Pharmacy" onPress={() => router.push('/(app)/patient/find-pharmacy')} color={Colors.info} />
          <QuickAction icon="🔗" label="Referrals" onPress={() => router.push('/(app)/patient/referrals')} color={Colors.warning} />
          <QuickAction icon="🚨" label="Emergency" onPress={() => router.push('/(app)/patient/emergency')} color={Colors.error} />
        </View>

        {/* Upcoming Appointments */}
        <Card
          title="Upcoming Appointments"
          subtitle={`${appointments.length} scheduled`}
          headerRight={
            <TouchableOpacity onPress={() => router.push('/(app)/patient/appointments')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          }
        >
          {appointments.length === 0 ? (
            <EmptyState icon="📅" title="No appointments" subtitle="Book your first consultation" />
          ) : (
            appointments.map((appt, i) => (
              <View key={appt._id || appt.id || i} style={styles.listItem}>
                <View style={styles.listLeft}>
                  <Text style={styles.listTitle}>{appt.doctorName || 'Dr. ' + (appt.doctor_id || 'Unknown')}</Text>
                  <Text style={styles.listSub}>{appt.scheduledAt ? new Date(appt.scheduled_at || appt.scheduledAt).toLocaleDateString() : 'Date TBD'}</Text>
                </View>
                <Badge status={appt.status || 'requested'} />
              </View>
            ))
          )}
        </Card>

        {/* Active Prescriptions */}
        <Card
          title="Active Prescriptions"
          headerRight={
            <TouchableOpacity onPress={() => router.push('/(app)/patient/records')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          }
        >
          {prescriptions.length === 0 ? (
            <EmptyState icon="💊" title="No prescriptions" subtitle="Your prescriptions will appear here" />
          ) : (
            prescriptions.map((rx, i) => {
              const meds = typeof rx.medicines === 'string' ? JSON.parse(rx.medicines || '[]') : rx.medicines || [];
              return (
                <View key={rx._id || rx.id || i} style={styles.listItem}>
                  <View style={styles.listLeft}>
                    <Text style={styles.listTitle}>{meds[0]?.name || 'Prescription'}</Text>
                    <Text style={styles.listSub}>{meds.length} medicine{meds.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <Badge status={rx.is_draft ? 'draft' : 'active'} />
                </View>
              );
            })
          )}
        </Card>

        {/* Medicine Reminders */}
        {reminders.length > 0 && (
          <Card title="Medicine Reminders" subtitle="Today's schedule">
            {reminders.map((r, i) => (
              <View key={r.id || i} style={styles.reminderRow}>
                <Text style={styles.reminderEmoji}>💊</Text>
                <View style={styles.listLeft}>
                  <Text style={styles.listTitle}>{r.medicine_name}</Text>
                  <Text style={styles.listSub}>{r.dosage} — {r.times}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => router.push('/(app)/patient/medicines')} style={styles.reminderBtn}>
              <Text style={styles.reminderBtnText}>Manage Reminders →</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Health Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsRow}>
          <StatCard icon="📅" label="Appointments" value={appointments.length} color={Colors.primary} />
          <StatCard icon="💊" label="Prescriptions" value={prescriptions.length} color={Colors.success} />
          <StatCard icon="⏰" label="Reminders" value={reminders.length} color={Colors.warning} />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  sectionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
    color: Colors.darkText,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAction: {
    width: '30%',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, textAlign: 'center' },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  listLeft: { flex: 1, marginRight: Spacing.sm },
  listTitle: { fontSize: Fonts.sizes.base, fontWeight: '600', color: Colors.darkText },
  listSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  seeAll: { color: Colors.primary, fontSize: Fonts.sizes.sm, fontWeight: '700' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  reminderEmoji: { fontSize: 24, marginRight: Spacing.sm },
  reminderBtn: { marginTop: Spacing.sm, alignItems: 'flex-end' },
  reminderBtnText: { color: Colors.primary, fontSize: Fonts.sizes.sm, fontWeight: '700' },
});

