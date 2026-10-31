import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert,
} from 'react-native';
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
import { prescriptionAPI, patientAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

export default function DoctorPrescriptionsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New prescription form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '500mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After meals' },
  ]);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const docId = user?._id || user?.id;
      if (isOnline) {
        const [rxRes, patRows] = await Promise.allSettled([
          prescriptionAPI.list({ doctorId: docId }),
          dbAll('SELECT id, name, village FROM patients ORDER BY name ASC'),
        ]);
        if (rxRes.status === 'fulfilled') {
          setPrescriptions(rxRes.value.data?.prescriptions || rxRes.value.data || []);
        }
        if (patRows.status === 'fulfilled') {
          setPatients(patRows.value || []);
        }
      } else {
        const localRx = await dbAll('SELECT * FROM prescriptions ORDER BY created_at DESC');
        const localPats = await dbAll('SELECT id, name, village FROM patients ORDER BY name ASC');
        setPrescriptions(localRx || []);
        setPatients(localPats || []);
      }
    } catch (e) {
      console.log('Error loading prescriptions:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '1 Tablet', frequency: 'Once daily', duration: '3 days', instructions: 'After meals' },
    ]);
  };

  const handleUpdateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleSavePrescription = async (asDraft = false) => {
    if (!selectedPatientId) {
      Alert.alert('Required', 'Please select a patient.');
      return;
    }
    const validMeds = medicines.filter(m => m.name.trim().length > 0);
    if (validMeds.length === 0) {
      Alert.alert('Required', 'Please specify at least one medicine name.');
      return;
    }

    setSubmitting(true);
    const localId = 'RX_' + Date.now();
    const docId = user?._id || user?.id || 'LOCAL_DOC';

    // IMPORTANT RULE: When offline, always flag as draft until confirmed synced
    const isDraft = asDraft || !isOnline;

    const payload = {
      id: localId,
      patientId: selectedPatientId,
      doctorId: docId,
      medicines: validMeds,
      instructions: generalInstructions.trim(),
      isDraft,
    };

    try {
      await dbRun(
        `INSERT INTO prescriptions 
          (id, patient_id, doctor_id, medicines, instructions, is_draft, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          localId, payload.patientId, docId,
          JSON.stringify(validMeds), payload.instructions,
          isDraft ? 1 : 0,
          isOnline && !asDraft ? 'synced' : 'pending',
        ]
      );

      if (isOnline && !asDraft) {
        try {
          await prescriptionAPI.create(payload);
        } catch (serverErr) {
          await enqueue(docId, localId, 'CREATE', 'prescriptions', payload);
        }
      } else {
        await enqueue(docId, localId, 'CREATE', 'prescriptions', payload);
      }

      setShowAddModal(false);
      setMedicines([{ name: '', dosage: '500mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After meals' }]);
      setGeneralInstructions('');
      setSelectedPatientId('');

      Alert.alert(
        isDraft ? 'Saved as Draft ⚠️' : 'Prescription Finalized 📋',
        isDraft
          ? 'Prescription saved as a local draft. It will NOT appear as finalized until verified online.'
          : 'Prescription recorded and transmitted to patient health card.'
      );
      loadData();
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Digital Prescriptions"
        subtitle="Clinical pharmacotherapy orders & adherence"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ New Rx</Text>
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
          <LoadingState message="Loading prescriptions..." />
        ) : prescriptions.length === 0 ? (
          <EmptyState
            icon="💊"
            title="No Prescriptions Issued"
            subtitle="Write electronic medical prescriptions for rural consultations."
            action={() => setShowAddModal(true)}
            actionLabel="+ Write Prescription"
          />
        ) : (
          prescriptions.map((rx, idx) => {
            const isDraft = rx.isDraft || rx.is_draft === 1 || rx.is_draft === '1';
            let meds = [];
            try {
              meds = typeof rx.medicines === 'string' ? JSON.parse(rx.medicines) : (rx.medicines || []);
            } catch (err) {}

            return (
              <Card key={rx._id || rx.id || idx} style={styles.rxCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>
                      {rx.patientName || rx.patient_id?.name || `Patient ID: ${rx.patient_id || rx.patientId || 'N/A'}`}
                    </Text>
                    <Text style={styles.dateStamp}>
                      Issued: {new Date(rx.createdAt || rx.created_at || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>
                  {/* Strict rule: draft prescriptions must clearly say draft */}
                  <Badge
                    status={isDraft ? 'draft' : 'active'}
                    label={isDraft ? '⚠️ OFFLINE DRAFT' : 'FINALIZED RX'}
                  />
                </View>

                {/* Medicines List */}
                <View style={styles.medsBox}>
                  {meds.map((m, mIdx) => (
                    <View key={mIdx} style={styles.medItem}>
                      <Text style={styles.medName}>• {m.name}</Text>
                      <Text style={styles.medSub}>
                        {m.dosage} | {m.frequency} | {m.duration} {m.instructions ? `(${m.instructions})` : ''}
                      </Text>
                    </View>
                  ))}
                </View>

                {rx.instructions ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Physician Instructions:</Text>
                    <Text style={styles.notesVal}>{rx.instructions}</Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* New Prescription Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Digital Prescription</Text>
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

              <View style={styles.medsHeaderRow}>
                <Text style={styles.sectionTitle}>Prescribed Pharmaceuticals</Text>
                <TouchableOpacity onPress={handleAddMedicineRow}>
                  <Text style={styles.addMedLink}>+ Add Another Drug</Text>
                </TouchableOpacity>
              </View>

              {medicines.map((med, i) => (
                <View key={i} style={styles.medFormBox}>
                  <View style={styles.medFormHeader}>
                    <Text style={styles.medNum}>Drug #{i + 1}</Text>
                    {medicines.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveMedicine(i)}>
                        <Text style={styles.removeMed}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Input
                    label="Medicine Name *"
                    placeholder="e.g. Paracetamol, Ciprofloxacin"
                    value={med.name}
                    onChangeText={(val) => handleUpdateMedicine(i, 'name', val)}
                  />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: Spacing.xs }}>
                      <Input
                        label="Dosage"
                        placeholder="500mg"
                        value={med.dosage}
                        onChangeText={(val) => handleUpdateMedicine(i, 'dosage', val)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Frequency"
                        placeholder="Twice daily"
                        value={med.frequency}
                        onChangeText={(val) => handleUpdateMedicine(i, 'frequency', val)}
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: Spacing.xs }}>
                      <Input
                        label="Duration"
                        placeholder="5 days"
                        value={med.duration}
                        onChangeText={(val) => handleUpdateMedicine(i, 'duration', val)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Timing"
                        placeholder="After food"
                        value={med.instructions}
                        onChangeText={(val) => handleUpdateMedicine(i, 'instructions', val)}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <Input
                label="General Patient Guidance / Diet Instructions"
                placeholder="Drink plenty of boiled water, avoid strenuous physical activity..."
                multiline
                numberOfLines={2}
                value={generalInstructions}
                onChangeText={setGeneralInstructions}
              />

              <View style={styles.modalBtnRow}>
                <Button
                  title="Save as Draft"
                  variant="outline"
                  size="md"
                  loading={submitting}
                  onPress={() => handleSavePrescription(true)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Finalize & Sign"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  onPress={() => handleSavePrescription(false)}
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
  scroll: { padding: Spacing.base },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full },
  addBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  rxCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  dateStamp: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  medsBox: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.xs },
  medItem: { marginVertical: 3 },
  medName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.darkText },
  medSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  notesBox: { marginTop: Spacing.xs, backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.sm },
  notesLabel: { fontSize: 10, fontWeight: '700', color: Colors.primaryDark },
  notesVal: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  label: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, marginBottom: 4 },
  chipScroll: { flexDirection: 'row', marginBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, marginRight: Spacing.xs },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  chipTextActive: { color: Colors.white, fontWeight: '800' },
  medsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs, marginBottom: Spacing.xs },
  sectionTitle: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primaryDark },
  addMedLink: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primary },
  medFormBox: { backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  medFormHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  medNum: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primaryDark },
  removeMed: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '700' },
  row: { flexDirection: 'row' },
  modalBtnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.lg },
});

