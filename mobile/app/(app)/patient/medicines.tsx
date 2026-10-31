import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { dbAll, dbRun } from '../../../src/database';

export default function MedicinesScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedTimes, setSelectedTimes] = useState([]); // ['Morning', 'Afternoon', 'Night']

  const TIME_SLOTS = ['Morning (8 AM)', 'Afternoon (1 PM)', 'Evening (6 PM)', 'Night (9 PM)'];

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const rows = await dbAll('SELECT * FROM medicine_reminders WHERE active = 1 ORDER BY created_at DESC');
      setReminders(rows || []);
    } catch (e) {
      console.log('Error loading reminders:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleTimeSlot = (slot) => {
    if (selectedTimes.includes(slot)) {
      setSelectedTimes(selectedTimes.filter(t => t !== slot));
    } else {
      setSelectedTimes([...selectedTimes, slot]);
    }
  };

  const handleCreateReminder = async () => {
    if (!medName.trim()) {
      Alert.alert('Required', 'Please enter medicine name');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Required', 'Please enter dosage (e.g. 500mg, 1 tablet)');
      return;
    }
    if (selectedTimes.length === 0) {
      Alert.alert('Required', 'Please select at least one time slot');
      return;
    }

    try {
      const id = 'REM_' + Date.now();
      const patientId = user?._id || user?.id || 'LOCAL_PAT';
      const timesStr = selectedTimes.join(', ');

      await dbRun(
        `INSERT INTO medicine_reminders (id, patient_id, medicine_name, dosage, times, taken_log, active)
         VALUES (?, ?, ?, ?, ?, '[]', 1)`,
        [id, patientId, medName.trim(), dosage.trim(), timesStr]
      );

      setMedName('');
      setDosage('');
      setSelectedTimes([]);
      setShowAddModal(false);
      loadReminders();
    } catch (e) {
      Alert.alert('Error', 'Failed to save reminder: ' + e.message);
    }
  };

  const handleMarkTaken = async (reminder) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let log = [];
      try {
        log = JSON.parse(reminder.taken_log || '[]');
      } catch (err) {
        log = [];
      }

      if (log.includes(today)) {
        Alert.alert('Already Taken', 'You have already recorded taking this medicine today!');
        return;
      }

      log.push(today);
      await dbRun(
        `UPDATE medicine_reminders SET taken_log = ? WHERE id = ?`,
        [JSON.stringify(log), reminder.id]
      );

      Alert.alert('Great Job! 🎉', `Marked ${reminder.medicine_name} as taken for today.`);
      loadReminders();
    } catch (e) {
      Alert.alert('Error', 'Failed to update: ' + e.message);
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await dbRun(`UPDATE medicine_reminders SET active = 0 WHERE id = ?`, [id]);
      loadReminders();
    } catch (e) {
      Alert.alert('Error', 'Failed to remove');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Medicine Tracker"
        subtitle="Daily reminders and adherence schedule"
        rightElement={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Add Reminder</Text>
          </TouchableOpacity>
        }
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadReminders(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Adherence Card Banner */}
        <Card style={styles.adherenceCard}>
          <View style={styles.adherenceRow}>
            <Text style={styles.adherenceIcon}>⏰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.adherenceTitle}>Today's Adherence</Text>
              <Text style={styles.adherenceSubtitle}>
                Take all medicines on time as prescribed by your rural healthcare provider.
              </Text>
            </View>
          </View>
        </Card>

        {/* Reminders List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Medicine Schedules ({reminders.length})</Text>
        </View>

        {loading ? (
          <LoadingState message="Loading your medicines..." />
        ) : reminders.length === 0 ? (
          <EmptyState
            icon="💊"
            title="No Reminders Set"
            subtitle="Add prescribed medicines so you never miss a dose."
            action={() => setShowAddModal(true)}
            actionLabel="+ Set Reminder"
          />
        ) : (
          reminders.map((rem) => {
            let log = [];
            try { log = JSON.parse(rem.taken_log || '[]'); } catch (err) {}
            const isTakenToday = log.includes(todayStr);

            return (
              <Card key={rem.id} style={styles.medCard}>
                <View style={styles.medCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medicineName}>{rem.medicine_name}</Text>
                    <Text style={styles.dosageBadge}>Dosage: {rem.dosage}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteReminder(rem.id)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timesContainer}>
                  <Text style={styles.timesLabel}>Schedule:</Text>
                  <Text style={styles.timesValue}>🕒 {rem.times}</Text>
                </View>

                <View style={styles.actionRow}>
                  {isTakenToday ? (
                    <View style={styles.takenBadge}>
                      <Text style={styles.takenText}>✓ Taken Today</Text>
                    </View>
                  ) : (
                    <Button
                      title="Mark as Taken Today"
                      variant="primary"
                      size="sm"
                      onPress={() => handleMarkTaken(rem)}
                    />
                  )}
                  <Text style={styles.streakText}>
                    Total doses logged: {log.length}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medicine Reminder</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Input
                label="Medicine Name *"
                placeholder="e.g. Paracetamol, Amoxicillin"
                value={medName}
                onChangeText={setMedName}
              />
              <Input
                label="Dosage *"
                placeholder="e.g. 500mg, 1 Tablet after food"
                value={dosage}
                onChangeText={setDosage}
              />

              <Text style={styles.slotHeader}>Select Daily Timings *</Text>
              <View style={styles.slotsGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTimes.includes(slot);
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotChip, isSelected && styles.slotChipActive]}
                      onPress={() => toggleTimeSlot(slot)}
                    >
                      <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>
                        {isSelected ? '✓ ' : ''}{slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title="Save Medicine Reminder"
                variant="primary"
                size="md"
                onPress={handleCreateReminder}
                style={{ marginTop: Spacing.lg }}
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
  addBtnHeader: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  addBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  adherenceCard: { backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  adherenceRow: { flexDirection: 'row', alignItems: 'center' },
  adherenceIcon: { fontSize: 32, marginRight: Spacing.md },
  adherenceTitle: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.primaryDark },
  adherenceSubtitle: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 2 },
  sectionHeader: { marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.darkText },
  medCard: { marginBottom: Spacing.md },
  medCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  medicineName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  dosageBadge: { fontSize: Fonts.sizes.xs, color: Colors.primaryDark, fontWeight: '600', marginTop: 2 },
  deleteBtn: { fontSize: 18, color: Colors.secondaryText, padding: 4 },
  timesContainer: { marginTop: Spacing.sm, backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.sm },
  timesLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, fontWeight: '700' },
  timesValue: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600', marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  takenBadge: { backgroundColor: Colors.badge.active, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full },
  takenText: { color: Colors.badge.activeText, fontSize: Fonts.sizes.xs, fontWeight: '800' },
  streakText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  slotHeader: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.darkText, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  slotChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  slotChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotChipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600' },
  slotChipTextActive: { color: Colors.white, fontWeight: '700' },
});

