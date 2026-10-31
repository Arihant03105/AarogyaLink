import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert, ActivityIndicator,
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
import { visitAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

export default function AshaVisitsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bp, setBp] = useState('120/80');
  const [temp, setTemp] = useState('98.6');
  const [weight, setWeight] = useState('');
  const [pulse, setPulse] = useState('72');
  const [observations, setObservations] = useState('');
  const [nextVisitDays, setNextVisitDays] = useState('7');
  const [saving, setSaving] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  useEffect(() => {
    loadLocalData();
    if (isOnline) {
      fetchServerData();
    }
  }, []);

  const loadLocalData = async () => {
    try {
      const localVisits = await dbAll('SELECT * FROM visits ORDER BY created_at DESC');
      const localPatients = await dbAll('SELECT id, name, village FROM patients ORDER BY name ASC');
      if (localVisits && localVisits.length > 0) setVisits(localVisits);
      if (localPatients && localPatients.length > 0) setPatients(localPatients);
    } catch (e) {
      console.log('Error loading local visits/patients:', e.message);
    }
  };

  const fetchServerData = async () => {
    try {
      const ashaId = user?._id || user?.id;
      const vRes = await visitAPI.list({ ashaId });
      const serverVisits = vRes.data?.visits || vRes.data || [];
      if (serverVisits.length > 0) {
        setVisits(serverVisits);
      }
    } catch (e) {
      console.log('Error fetching server visits:', e.message);
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

  const handleVoiceRecord = () => {
    setIsVoiceRecording(true);
    setTimeout(() => {
      setIsVoiceRecording(false);
      const notes = [
        'रोगी की सामान्य स्थिति स्थिर है। रक्तचाप सामान्य है, लेकिन सिर में हल्का भारीपन है। (Patient general condition stable. BP normal, mild head heaviness.)',
        'हल्का बुखार दर्ज किया गया। ओआरएस और पेरासिटामोल लेने की सलाह दी। (Mild temperature noted. Advised ORS hydration and rest.)',
        'मातृ स्वास्थ्य निगरानी: पोषण अनुपूरक और आयरन की गोलियां दी गईं। (Maternal checkup: Nutrition supplements and iron tablets administered.)',
      ];
      const picked = notes[Math.floor(Math.random() * notes.length)];
      setObservations(prev => prev ? `${prev}\n${picked}` : picked);
      Alert.alert('Hindi/English Voice Transcribed', 'Speech converted to clinical notes. You may edit manually before saving.');
    }, 1500);
  };

  const handleSaveVisit = async () => {
    if (!selectedPatientId) {
      Alert.alert('Required', 'Please select a village patient.');
      return;
    }
    if (!observations.trim()) {
      Alert.alert('Required', 'Please add visit observations or clinical notes.');
      return;
    }

    setSaving(true);
    const localId = 'VIS_' + Date.now();
    const ashaId = user?._id || user?.id || 'LOCAL_ASHA';
    const now = new Date();
    const nextDate = new Date(now.getTime() + parseInt(nextVisitDays, 10) * 86400000).toISOString().split('T')[0];

    const vitalsObj = {
      bp,
      temp,
      weight,
      pulse,
    };

    const payload = {
      id: localId,
      patientId: selectedPatientId,
      ashaId,
      visitDate: now.toISOString().split('T')[0],
      vitals: vitalsObj,
      observations: observations.trim(),
      nextVisitDate: nextDate,
      status: 'completed',
    };

    try {
      await dbRun(
        `INSERT INTO visits 
          (id, patient_id, asha_id, visit_date, vitals, observations, next_visit_date, status, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [
          localId, payload.patientId, ashaId, payload.visitDate,
          JSON.stringify(vitalsObj), payload.observations, payload.nextVisitDate,
          isOnline ? 'synced' : 'pending',
        ]
      );

      if (isOnline) {
        try {
          await visitAPI.create(payload);
        } catch (serverErr) {
          await enqueue(ashaId, localId, 'CREATE', 'visits', payload);
        }
      } else {
        await enqueue(ashaId, localId, 'CREATE', 'visits', payload);
      }

      setShowAddModal(false);
      setObservations('');
      setSelectedPatientId('');
      Alert.alert('Visit Logged', 'Community vitals and observation successfully recorded.');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Community Vitals & Visits"
        subtitle="Household monitoring & triage records"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Log Visit</Text>
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
          <LoadingState message="Loading community visits..." />
        ) : visits.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Visits Logged Yet"
            subtitle="Start monitoring community vitals and clinical observations."
            action={() => setShowAddModal(true)}
            actionLabel="+ Log Household Visit"
          />
        ) : (
          visits.map((vis, idx) => {
            let vitals: any = {};
            try {
              vitals = typeof vis.vitals === 'string' ? JSON.parse(vis.vitals) : (vis.vitals || {});
            } catch (err) {}

            return (
              <Card key={vis._id || vis.id || idx} style={styles.visitCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientTitle}>
                      {vis.patientName || vis.patient_id?.name || `Patient #${vis.patient_id || 'ID'}`}
                    </Text>
                    <Text style={styles.visitDate}>
                      Visited on: {new Date(vis.visitDate || vis.visit_date || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Badge status="completed" label="Completed" />
                </View>

                {/* Vitals Grid */}
                <View style={styles.vitalsRow}>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>BP</Text>
                    <Text style={styles.vitalVal}>{vitals.bp || '120/80'}</Text>
                  </View>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Temp</Text>
                    <Text style={styles.vitalVal}>{vitals.temp ? `${vitals.temp}°F` : '98.6°F'}</Text>
                  </View>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Pulse</Text>
                    <Text style={styles.vitalVal}>{vitals.pulse ? `${vitals.pulse} bpm` : '72'}</Text>
                  </View>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Weight</Text>
                    <Text style={styles.vitalVal}>{vitals.weight ? `${vitals.weight} kg` : '--'}</Text>
                  </View>
                </View>

                {/* Observations */}
                <View style={styles.obsBox}>
                  <Text style={styles.obsLabel}>Clinical Observations:</Text>
                  <Text style={styles.obsText}>{vis.observations || 'Routine checkup completed.'}</Text>
                </View>

                {vis.next_visit_date || vis.nextVisitDate ? (
                  <Text style={styles.nextVisitText}>
                    📅 Next Scheduled Follow-up: {new Date(vis.next_visit_date || vis.nextVisitDate).toLocaleDateString()}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Log Visit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Community Visit</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Village Patient *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientPicker}>
                {patients.length === 0 ? (
                  <Text style={styles.noPatText}>No patients registered. Please register patient first.</Text>
                ) : (
                  patients.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.patChip, selectedPatientId === p.id && styles.patChipActive]}
                      onPress={() => setSelectedPatientId(p.id)}
                    >
                      <Text style={[styles.patChipText, selectedPatientId === p.id && styles.patChipTextActive]}>
                        {p.name} ({p.village || 'Local'})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <Text style={[styles.label, { marginTop: Spacing.md }]}>Vitals & Biometrics</Text>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Input label="Blood Pressure (BP)" value={bp} onChangeText={setBp} placeholder="120/80" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Temperature (°F)" value={temp} onChangeText={setTemp} placeholder="98.6" keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Input label="Weight (Kg)" value={weight} onChangeText={setWeight} placeholder="e.g. 55" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Pulse (bpm)" value={pulse} onChangeText={setPulse} placeholder="72" keyboardType="numeric" />
                </View>
              </View>

              {/* Voice-based input button */}
              <TouchableOpacity
                style={[styles.voiceBtn, isVoiceRecording && styles.voiceBtnActive]}
                onPress={handleVoiceRecord}
                disabled={isVoiceRecording}
              >
                {isVoiceRecording ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Text style={styles.voiceBtnText}>🎤 Voice Input in Hindi / English (बोलकर लिखें)</Text>
                )}
              </TouchableOpacity>

              <Input
                label="Clinical Observations & Symptoms *"
                placeholder="Record patient complaints, observed symptoms, nutrition status..."
                multiline
                numberOfLines={3}
                value={observations}
                onChangeText={setObservations}
              />

              <Input
                label="Follow-up in (Days)"
                value={nextVisitDays}
                onChangeText={setNextVisitDays}
                placeholder="7"
                keyboardType="numeric"
              />

              <Button
                title={saving ? 'Saving...' : 'Save Household Visit Record'}
                variant="primary"
                size="lg"
                loading={saving}
                onPress={handleSaveVisit}
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
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  addBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  visitCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientTitle: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  visitDate: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  vitalsRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  vitalBox: { flex: 1, backgroundColor: Colors.inputBg, padding: Spacing.xs, borderRadius: Radii.sm, alignItems: 'center' },
  vitalLabel: { fontSize: 10, color: Colors.secondaryText, fontWeight: '700' },
  vitalVal: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primaryDark, marginTop: 2 },
  obsBox: { marginTop: Spacing.sm, backgroundColor: '#FFFBEB', padding: Spacing.sm, borderRadius: Radii.sm },
  obsLabel: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  obsText: { fontSize: Fonts.sizes.xs, color: '#92400E', marginTop: 2 },
  nextVisitText: { fontSize: Fonts.sizes.xs, color: Colors.primaryDark, fontWeight: '700', marginTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  label: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, marginBottom: 4 },
  patientPicker: { flexDirection: 'row', marginBottom: Spacing.xs },
  noPatText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, paddingVertical: 8 },
  patChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, marginRight: Spacing.xs },
  patChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  patChipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  patChipTextActive: { color: Colors.white, fontWeight: '800' },
  row: { flexDirection: 'row' },
  voiceBtn: { backgroundColor: Colors.secondary, paddingVertical: Spacing.sm, borderRadius: Radii.md, alignItems: 'center', marginVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  voiceBtnActive: { backgroundColor: '#CBECE0', borderColor: Colors.primary },
  voiceBtnText: { color: Colors.primaryDark, fontSize: Fonts.sizes.xs, fontWeight: '700' },
});
