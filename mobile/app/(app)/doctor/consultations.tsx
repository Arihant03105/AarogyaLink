import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { appointmentAPI, symptomAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

export default function DoctorConsultationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('requested'); // 'requested' | 'accepted' | 'completed'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Consultation case review modal
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [patientSymptoms, setPatientSymptoms] = useState([]);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadLocalAppointments();
    if (isOnline) {
      fetchServerAppointments();
    }
  }, []);

  const loadLocalAppointments = async () => {
    try {
      const rows = await dbAll('SELECT * FROM appointments ORDER BY created_at DESC');
      if (rows && rows.length > 0) {
        setAppointments(rows);
      }
    } catch (e) {
      console.log('Error reading local consultations:', e.message);
    }
  };

  const fetchServerAppointments = async () => {
    try {
      const docId = user?._id || user?.id;
      const res = await appointmentAPI.list({ doctorId: docId });
      const fetched = res.data?.appointments || res.data || [];
      if (fetched.length > 0) {
        setAppointments(fetched);
      }
    } catch (e) {
      console.log('Error fetching server consultations:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadAppointments = async () => {
    await loadLocalAppointments();
    if (isOnline) {
      await fetchServerAppointments();
    }
    setRefreshing(false);
  };

  const handleUpdateStatus = async (appt, newStatus) => {
    try {
      const apptId = appt._id || appt.id;
      if (isOnline) {
        await appointmentAPI.update(apptId, { status: newStatus });
      } else {
        await dbRun('UPDATE appointments SET status = ? WHERE id = ?', [newStatus, apptId]);
        await enqueue(user?._id || user?.id, apptId, 'UPDATE', 'appointments', { status: newStatus });
      }
      Alert.alert('Status Updated', `Appointment marked as ${newStatus}.`);
      loadAppointments();
    } catch (e) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleStartConsultation = async (appt) => {
    setSelectedAppt(appt);
    setClinicalNotes(appt.consultationNotes || appt.consultation_notes || '');
    try {
      const pId = appt.patientId || appt.patient_id;
      if (isOnline) {
        const res = await symptomAPI.list({ patientId: pId });
        setPatientSymptoms(res.data?.symptoms || res.data || []);
      } else {
        const rows = await dbAll('SELECT * FROM symptoms WHERE patient_id = ?', [pId]);
        setPatientSymptoms(rows || []);
      }
    } catch (err) {
      setPatientSymptoms([]);
    }
  };

  const handleSaveNotes = async (markComplete = false) => {
    if (!clinicalNotes.trim()) {
      Alert.alert('Required', 'Please add clinical examination notes.');
      return;
    }

    setSavingNotes(true);
    const apptId = selectedAppt._id || selectedAppt.id;
    const newStatus = markComplete ? 'completed' : 'accepted';
    const payload = {
      consultationNotes: clinicalNotes.trim(),
      status: newStatus,
    };

    try {
      if (isOnline) {
        await appointmentAPI.update(apptId, payload);
      } else {
        await dbRun(
          'UPDATE appointments SET consultation_notes = ?, status = ? WHERE id = ?',
          [clinicalNotes.trim(), newStatus, apptId]
        );
        await enqueue(user?._id || user?.id, apptId, 'UPDATE', 'appointments', payload);
      }

      Alert.alert(
        markComplete ? 'Consultation Concluded' : 'Draft Notes Saved',
        isOnline ? 'Saved to cloud registry.' : 'Saved locally in SQLite. Will sync when online.'
      );
      setSelectedAppt(null);
      loadAppointments();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const filteredAppts = appointments.filter(a => a.status === activeTab);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Consultation Triage" subtitle="Manage scheduled village visits & tele-health" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Segmented Filter */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'requested' && styles.tabItemActive]}
          onPress={() => setActiveTab('requested')}
        >
          <Text style={[styles.tabText, activeTab === 'requested' && styles.tabTextActive]}>
            Requests ({appointments.filter(a => a.status === 'requested').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'accepted' && styles.tabItemActive]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.tabTextActive]}>
            Scheduled ({appointments.filter(a => a.status === 'accepted').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'completed' && styles.tabItemActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Concluded ({appointments.filter(a => a.status === 'completed').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAppointments(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <LoadingState message="Loading consultations..." />
        ) : filteredAppts.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No Consultations Here"
            subtitle={`There are no appointments under the "${activeTab}" category.`}
          />
        ) : (
          filteredAppts.map((appt, idx) => (
            <Card key={appt._id || appt.id || idx} style={styles.apptCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {appt.patientName || appt.patient_id?.name || 'Village Patient'}
                  </Text>
                  <Text style={styles.dateSub}>
                    Scheduled for: {appt.scheduledAt || appt.scheduled_at ? new Date(appt.scheduledAt || appt.scheduled_at).toLocaleDateString() : 'Date TBD'}
                  </Text>
                </View>
                <Badge status={appt.status} />
              </View>

              <Text style={styles.reasonText}>Complaint: {appt.notes || 'Routine checkup requested'}</Text>

              {appt.consultationNotes || appt.consultation_notes ? (
                <View style={styles.notesPreview}>
                  <Text style={styles.notesPreviewLabel}>Doctor Notes:</Text>
                  <Text style={styles.notesPreviewText}>{appt.consultationNotes || appt.consultation_notes}</Text>
                </View>
              ) : null}

              {/* Action Buttons depending on status */}
              <View style={styles.actionRow}>
                {appt.status === 'requested' && (
                  <>
                    <Button
                      title="Accept Appointment"
                      variant="primary"
                      size="sm"
                      onPress={() => handleUpdateStatus(appt, 'accepted')}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Decline"
                      variant="outline"
                      size="sm"
                      onPress={() => handleUpdateStatus(appt, 'rejected')}
                      style={{ flex: 1 }}
                    />
                  </>
                )}

                {appt.status === 'accepted' && (
                  <Button
                    title="🩺 Review Symptoms & Consult"
                    variant="primary"
                    size="md"
                    fullWidth
                    onPress={() => handleStartConsultation(appt)}
                  />
                )}

                {appt.status === 'completed' && (
                  <Button
                    title="💊 Issue / View Prescription"
                    variant="outline"
                    size="sm"
                    fullWidth
                    onPress={() => router.push('/(app)/doctor/prescriptions')}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Consultation Review & Clinical Notes Modal */}
      <Modal visible={!!selectedAppt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Clinical Examination</Text>
                <Text style={styles.modalSub}>{selectedAppt?.patientName || 'Patient'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAppt(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Patient reported symptoms */}
              <Text style={styles.sectionTitle}>Reported Symptoms & Vitals</Text>
              {patientSymptoms.length === 0 ? (
                <Text style={styles.emptyNote}>No preliminary intake notes attached.</Text>
              ) : (
                patientSymptoms.map((s, i) => (
                  <View key={i} style={styles.symptomBox}>
                    <Text style={styles.symptomText}>• {s.symptoms}</Text>
                    <Text style={styles.symptomDuration}>Duration: {s.duration || 'N/A'}</Text>
                  </View>
                ))
              )}

              <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Doctor Clinical Findings *</Text>
              <Input
                label="Diagnosis & Clinical Notes"
                placeholder="Enter physical observations, preliminary diagnosis, dietary instructions..."
                multiline
                numberOfLines={4}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
              />

              <View style={styles.modalActionRow}>
                <Button
                  title={savingNotes ? 'Saving...' : 'Save Draft Note'}
                  variant="outline"
                  size="md"
                  loading={savingNotes}
                  onPress={() => handleSaveNotes(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Conclude Visit"
                  variant="primary"
                  size="md"
                  loading={savingNotes}
                  onPress={() => handleSaveNotes(true)}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    borderRadius: Radii.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabItem: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radii.md },
  tabItemActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.secondaryText },
  tabTextActive: { color: Colors.white },
  scroll: { padding: Spacing.base },
  apptCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  dateSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  reasonText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: Spacing.sm },
  notesPreview: { backgroundColor: '#F0FDF4', padding: Spacing.xs + 2, borderRadius: Radii.sm, marginTop: Spacing.xs },
  notesPreviewLabel: { fontSize: 10, fontWeight: '800', color: '#166534' },
  notesPreviewText: { fontSize: Fonts.sizes.xs, color: '#15803D', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.divider },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  modalSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  sectionTitle: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primaryDark, marginBottom: 4 },
  emptyNote: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, fontStyle: 'italic', marginBottom: Spacing.xs },
  symptomBox: { backgroundColor: Colors.inputBg, padding: Spacing.xs + 2, borderRadius: Radii.sm, marginBottom: 4 },
  symptomText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600' },
  symptomDuration: { fontSize: 10, color: Colors.secondaryText, marginTop: 1 },
  modalActionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.lg },
});

