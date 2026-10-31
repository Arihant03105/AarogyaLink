import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { referralAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

export default function DoctorReferralsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [referrals, setReferrals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New referral form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [hospitalName, setHospitalName] = useState('Guwahati Medical College & Hospital (GMCH)');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const docId = user?._id || user?.id;
      if (isOnline) {
        const [refRes, patRows] = await Promise.allSettled([
          referralAPI.list(),
          dbAll('SELECT id, name, village FROM patients ORDER BY name ASC'),
        ]);
        if (refRes.status === 'fulfilled') {
          setReferrals(refRes.value.data?.referrals || refRes.value.data || []);
        }
        if (patRows.status === 'fulfilled') {
          setPatients(patRows.value || []);
        }
      } else {
        const localRefs = await dbAll('SELECT * FROM referrals ORDER BY created_at DESC');
        const localPatients = await dbAll('SELECT id, name, village FROM patients ORDER BY name ASC');
        setReferrals(localRefs || []);
        setPatients(localPatients || []);
      }
    } catch (e) {
      console.log('Error loading doctor referrals:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (refItem, newStatus) => {
    const refId = refItem._id || refItem.id;
    try {
      if (isOnline) {
        await referralAPI.update(refId, { status: newStatus });
      } else {
        await dbRun('UPDATE referrals SET status = ? WHERE id = ?', [newStatus, refId]);
        await enqueue(user?._id || user?.id, refId, 'UPDATE', 'referrals', { status: newStatus });
      }
      Alert.alert('Status Updated', `Referral case marked as ${newStatus}.`);
      loadData();
    } catch (e) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleCreateReferral = async () => {
    if (!selectedPatientId) {
      Alert.alert('Required', 'Please select a patient.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide clinical indication for referral.');
      return;
    }

    setSubmitting(true);
    const localId = 'REF_' + Date.now();
    const docId = user?._id || user?.id || 'LOCAL_DOC';

    const payload = {
      id: localId,
      patientId: selectedPatientId,
      fromDoctorId: docId,
      hospitalName: hospitalName.trim(),
      reason: reason.trim(),
      notes: notes.trim(),
      status: 'pending',
    };

    try {
      await dbRun(
        `INSERT INTO referrals 
          (id, patient_id, from_doctor_id, hospital_name, reason, status, notes, sync_status)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          localId, payload.patientId, docId, payload.hospitalName,
          payload.reason, payload.notes, isOnline ? 'synced' : 'pending',
        ]
      );

      if (isOnline) {
        try {
          await referralAPI.create(payload);
        } catch (serverErr) {
          await enqueue(docId, localId, 'CREATE', 'referrals', payload);
        }
      } else {
        await enqueue(docId, localId, 'CREATE', 'referrals', payload);
      }

      setShowAddModal(false);
      setReason('');
      setNotes('');
      setSelectedPatientId('');
      Alert.alert('Referral Escalated', 'Referral packet saved and transmitted.');
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
        title="Specialist Referrals"
        subtitle="Tertiary hospital transfers & specialist linkage"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Refer Specialist</Text>
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
            title="No Active Referrals"
            subtitle="Referral requests and transfer cases will appear here."
            action={() => setShowAddModal(true)}
            actionLabel="+ Initiate Referral"
          />
        ) : (
          referrals.map((ref, idx) => (
            <Card key={ref._id || ref.id || idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {ref.patientName || ref.patient_id?.name || `Patient #${ref.patient_id || 'ID'}`}
                  </Text>
                  <Text style={styles.hospitalText}>Target: {ref.hospitalName || ref.hospital_name || 'District Hospital'}</Text>
                </View>
                <Badge status={ref.status || 'pending'} />
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Clinical Indication:</Text>
                <Text style={styles.reasonText}>{ref.reason}</Text>
              </View>

              {ref.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Doctor Observations:</Text>
                  <Text style={styles.notesText}>{ref.notes}</Text>
                </View>
              ) : null}

              {/* Status Actions */}
              {ref.status === 'pending' && (
                <View style={styles.actionRow}>
                  <Button
                    title="Accept Case"
                    variant="primary"
                    size="sm"
                    onPress={() => handleUpdateStatus(ref, 'accepted')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Reject"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdateStatus(ref, 'rejected')}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Refer Specialist Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initiate Tertiary Referral</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Patient *</Text>
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
                label="Target Hospital / Specialty Department *"
                value={hospitalName}
                onChangeText={setHospitalName}
                placeholder="District Hospital / Medical College"
              />

              <Input
                label="Clinical Reason for Referral *"
                placeholder="Suspected acute appendicitis / severe cardiac arrhythmia..."
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />

              <Input
                label="Clinical Findings & Pre-referral Treatment"
                placeholder="IV fluids started, preliminary vitals..."
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
              />

              <Button
                title={submitting ? 'Escalating...' : 'Submit Referral Transfer'}
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
  hospitalText: { fontSize: Fonts.sizes.xs, color: Colors.primaryDark, fontWeight: '700', marginTop: 2 },
  reasonBox: { marginTop: Spacing.sm, backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.sm },
  reasonLabel: { fontSize: 10, fontWeight: '700', color: Colors.secondaryText },
  reasonText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 2 },
  notesBox: { marginTop: Spacing.xs, backgroundColor: '#F0FDF4', padding: Spacing.sm, borderRadius: Radii.sm },
  notesLabel: { fontSize: 10, fontWeight: '700', color: '#166534' },
  notesText: { fontSize: Fonts.sizes.xs, color: '#15803D', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.divider },
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

