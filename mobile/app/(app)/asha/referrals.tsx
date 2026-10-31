import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { referralAPI, doctorAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

export default function AshaReferralsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [referrals, setReferrals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Referral form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [hospitalName, setHospitalName] = useState('Community Health Centre (CHC)');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLocalData();
    if (isOnline) {
      fetchServerData();
    }
  }, []);

  const loadLocalData = async () => {
    try {
      const localRefs = await dbAll('SELECT * FROM referrals ORDER BY created_at DESC');
      const localPatients = await dbAll('SELECT id, name, village FROM patients ORDER BY name ASC');
      if (localRefs && localRefs.length > 0) setReferrals(localRefs);
      if (localPatients && localPatients.length > 0) setPatients(localPatients);
    } catch (e) {
      console.log('Referrals local loading error:', e.message);
    }
  };

  const fetchServerData = async () => {
    try {
      const ashaId = user?._id || user?.id;
      const [refRes, docRes] = await Promise.allSettled([
        referralAPI.list({ ashaId }),
        doctorAPI.list(),
      ]);
      if (refRes.status === 'fulfilled' && refRes.value.data) {
        const list = refRes.value.data?.referrals || refRes.value.data || [];
        if (list.length > 0) setReferrals(list);
      }
      if (docRes.status === 'fulfilled' && docRes.value.data) {
        const docs = docRes.value.data?.doctors || docRes.value.data || [];
        if (docs.length > 0) setDoctors(docs);
      }
    } catch (e) {
      console.log('Referrals server loading error:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadData = async () => {
    await loadLocalData();
    if (isOnline) {
      await fetchServerData();
    }
    setRefreshing(false);
  };

  const handleCreateReferral = async () => {
    if (!selectedPatientId) {
      Alert.alert('Required', 'Please select a patient to refer.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please describe clinical reason for referral.');
      return;
    }

    setSubmitting(true);
    const localId = 'REF_' + Date.now();
    const ashaId = user?._id || user?.id || 'LOCAL_ASHA';

    const payload = {
      id: localId,
      patientId: selectedPatientId,
      fromDoctorId: ashaId,
      toDoctorId: selectedDoctorId || null,
      hospitalName: hospitalName.trim(),
      reason: reason.trim(),
      status: 'pending',
      notes: notes.trim(),
    };

    try {
      await dbRun(
        `INSERT INTO referrals 
          (id, patient_id, from_doctor_id, to_doctor_id, hospital_name, reason, status, notes, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          localId, payload.patientId, ashaId, payload.toDoctorId,
          payload.hospitalName, payload.reason, payload.notes,
          isOnline ? 'synced' : 'pending',
        ]
      );

      if (isOnline) {
        try {
          await referralAPI.create(payload);
        } catch (serverErr) {
          await enqueue(ashaId, localId, 'CREATE', 'referrals', payload);
        }
      } else {
        await enqueue(ashaId, localId, 'CREATE', 'referrals', payload);
      }

      setShowAddModal(false);
      setReason('');
      setNotes('');
      setSelectedPatientId('');
      Alert.alert('Referral Submitted', 'Referral has been escalated to medical doctor.');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Doctor & Hospital Referrals"
        subtitle="Manage specialist case transfers"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ New Referral</Text>
          </TouchableOpacity>
        }
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <LoadingState message="Loading referrals..." />
        ) : referrals.length === 0 ? (
          <EmptyState
            icon="🔗"
            title="No Referrals Found"
            subtitle="Submit referral cases when rural patients require tertiary or specialist intervention."
            action={() => setShowAddModal(true)}
            actionLabel="+ Create Referral"
          />
        ) : (
          referrals.map((ref, idx) => (
            <Card key={ref._id || ref.id || idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {ref.patientName || ref.patient_id?.name || `Patient ID: ${ref.patient_id || 'N/A'}`}
                  </Text>
                  <Text style={styles.hospitalText}>{ref.hospitalName || ref.hospital_name || 'Community Health Centre'}</Text>
                </View>
                <Badge status={ref.status || 'pending'} />
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Referral Reason:</Text>
                <Text style={styles.reasonText}>{ref.reason}</Text>
              </View>

              {ref.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notes / Doctor Advice:</Text>
                  <Text style={styles.notesText}>{ref.notes}</Text>
                </View>
              ) : null}

              <Text style={styles.dateStamp}>
                Submitted: {new Date(ref.createdAt || ref.created_at || Date.now()).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>

      {/* New Referral Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Medical Referral</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Village Patient *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {patients.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, selectedPatientId === p.id && styles.chipActive]}
                    onPress={() => setSelectedPatientId(p.id)}
                  >
                    <Text style={[styles.chipText, selectedPatientId === p.id && styles.chipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Target Hospital / Health Facility *"
                placeholder="e.g. Nagaon Civil Hospital / District CHC"
                value={hospitalName}
                onChangeText={setHospitalName}
              />

              <Input
                label="Clinical Reason for Referral *"
                placeholder="e.g. Persistent high fever with respiratory distress, needs chest X-ray"
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />

              <Input
                label="Additional Observations / Vitals Attached"
                placeholder="BP 140/90, SpO2 93%, previous medication given..."
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
              />

              <Button
                title={submitting ? 'Submitting...' : 'Submit Referral to Doctor'}
                variant="primary"
                size="lg"
                loading={submitting}
                onPress={handleCreateReferral}
                style={{ marginTop: Spacing.md, marginBottom: Spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full },
  addBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  hospitalText: { fontSize: Fonts.sizes.xs, color: Colors.primaryDark, fontWeight: '600', marginTop: 2 },
  reasonBox: { marginTop: Spacing.sm, backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.sm },
  reasonLabel: { fontSize: 10, fontWeight: '700', color: Colors.secondaryText },
  reasonText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 2 },
  notesBox: { marginTop: Spacing.xs, backgroundColor: '#F0FDF4', padding: Spacing.sm, borderRadius: Radii.sm },
  notesLabel: { fontSize: 10, fontWeight: '700', color: '#166534' },
  notesText: { fontSize: Fonts.sizes.xs, color: '#15803D', marginTop: 2 },
  dateStamp: { fontSize: 10, color: Colors.secondaryText, marginTop: Spacing.sm, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  label: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, marginBottom: 4 },
  chipScroll: { flexDirection: 'row', marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, marginRight: Spacing.xs },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  chipTextActive: { color: Colors.white, fontWeight: '800' },
});

