import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, Alert, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { CalendarPicker } from '../../../components/ui/CalendarPicker';
import { LoadingState, EmptyState, ErrorState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { appointmentAPI, doctorAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

export const DEMO_DOCTORS = [
  {
    _id: 'doc_anita_01',
    id: 'doc_anita_01',
    name: 'Dr. Anita Sharma',
    specialization: 'General Physician & Community Medicine',
    category: 'General',
    degree: 'MBBS, MD',
    hospital: 'Kalyanpur Primary Health Centre (PHC)',
    experience: '9 Years Exp',
    rating: '4.9 ★ (120+ reviews)',
    availableDays: 'Mon, Wed, Fri',
    timings: '09:00 AM - 01:00 PM',
    fee: 'Free (Govt. PHC)',
    avatarEmoji: '👩‍⚕️',
  },
  {
    _id: 'doc_debojit_02',
    id: 'doc_debojit_02',
    name: 'Dr. Debojit Barman',
    specialization: 'General Surgeon & Emergency Specialist',
    category: 'Surgery',
    degree: 'MBBS, MS',
    hospital: 'Kamrup District Civil Hospital',
    experience: '12 Years Exp',
    rating: '4.8 ★ (85 reviews)',
    availableDays: 'Tue, Thu, Sat',
    timings: '10:00 AM - 03:00 PM',
    fee: 'Free (Govt. Hospital)',
    avatarEmoji: '👨‍⚕️',
  },
  {
    _id: 'doc_rumi_03',
    id: 'doc_rumi_03',
    name: 'Dr. Rumi Saikia',
    specialization: 'Gynecologist & Women Health Care',
    category: 'Women',
    degree: 'MBBS, DGO',
    hospital: 'Sub-District Hospital Rangia',
    experience: '7 Years Exp',
    rating: '4.9 ★ (150+ reviews)',
    availableDays: 'Mon - Fri',
    timings: '09:30 AM - 01:30 PM',
    fee: 'Free (Maternal Health Mission)',
    avatarEmoji: '👩‍⚕️',
  },
  {
    _id: 'doc_bikash_04',
    id: 'doc_bikash_04',
    name: 'Dr. Bikash Kalita',
    specialization: 'Pediatrician (Child Specialist)',
    category: 'Pediatric',
    degree: 'MBBS, DCH',
    hospital: 'Kalyanpur Community Health Centre (CHC)',
    experience: '10 Years Exp',
    rating: '4.7 ★ (92 reviews)',
    availableDays: 'Daily',
    timings: '08:30 AM - 12:30 PM',
    fee: 'Free (Govt. CHC)',
    avatarEmoji: '👨‍⚕️',
  },
  {
    _id: 'doc_monali_05',
    id: 'doc_monali_05',
    name: 'Dr. Monali Hazarika',
    specialization: 'AYUSH & Integrative Wellness',
    category: 'AYUSH',
    degree: 'BAMS, MD (Ayur)',
    hospital: 'Kalyanpur Health & Wellness Centre',
    experience: '6 Years Exp',
    rating: '4.9 ★ (70 reviews)',
    availableDays: 'Mon, Wed, Thu',
    timings: '10:00 AM - 02:00 PM',
    fee: 'Free (National AYUSH Mission)',
    avatarEmoji: '🌿',
  },
  {
    _id: 'doc_sanjib_06',
    id: 'doc_sanjib_06',
    name: 'Dr. Sanjib Nath',
    specialization: 'Eye Specialist (Ophthalmology)',
    category: 'Eye',
    degree: 'MBBS, DOMS',
    hospital: 'Kamrup District Vision Centre',
    experience: '14 Years Exp',
    rating: '4.8 ★ (110 reviews)',
    availableDays: 'Tue, Fri',
    timings: '10:00 AM - 01:00 PM',
    fee: 'Free (Vision Mission)',
    avatarEmoji: '👁️',
  },
];

const TIME_SLOTS = [
  '09:30 AM', '10:15 AM', '11:00 AM', '11:45 AM',
  '12:30 PM', '02:30 PM', '03:15 PM', '04:00 PM',
];

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Booking modal state
  const [showBooking, setShowBooking] = useState(false);
  const [doctors, setDoctors] = useState(DEMO_DOCTORS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(DEMO_DOCTORS[0]);
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [appointmentTime, setAppointmentTime] = useState('10:15 AM');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [dateError, setDateError] = useState('');
  const [doctorError, setDoctorError] = useState('');

  const patientId = user?._id || user?.id || 'demo_patient_01';

  // Instant SQLite Loading
  useEffect(() => {
    loadLocalAppointments();
    if (isOnline) {
      fetchServerAppointments();
    }
  }, [isOnline, patientId]);

  const loadLocalAppointments = async () => {
    try {
      const rows = await dbAll(
        'SELECT * FROM appointments WHERE patient_id=? ORDER BY created_at DESC',
        [patientId]
      );
      if (rows && rows.length > 0) {
        setAppointments(rows);
      }
    } catch (e) {
      console.log('Local appointments fetch error', e);
    }
  };

  const fetchServerAppointments = async () => {
    try {
      setError(null);
      const res = await appointmentAPI.list({ patientId, sort: '-createdAt' });
      const serverData = res.data.appointments || res.data || [];
      if (Array.isArray(serverData) && serverData.length > 0) {
        setAppointments(serverData);
      }
    } catch (e) {
      console.log('Background appointments sync:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLocalAppointments();
    if (isOnline) {
      fetchServerAppointments();
    } else {
      setRefreshing(false);
    }
  };

  const loadDoctors = async () => {
    // Always start with rich Demo Doctors so user is never blocked
    setDoctors(DEMO_DOCTORS);
    if (isOnline) {
      try {
        const res = await doctorAPI.list({ limit: 50 });
        const remoteDocs = res.data.doctors || res.data || [];
        if (remoteDocs.length > 0) {
          // Merge unique remote doctors with demo list
          const combined = [...remoteDocs, ...DEMO_DOCTORS.filter(d => !remoteDocs.some(r => r.name === d.name))];
          setDoctors(combined);
        }
      } catch (e) {
        console.log('Server doctors fetch fallback to demo:', e.message);
      }
    }
  };

  const openBookingModal = () => {
    if (!selectedDoctor) {
      setSelectedDoctor(DEMO_DOCTORS[0]);
    }
    setDateError('');
    setDoctorError('');
    setShowBooking(true);
    loadDoctors();
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor) {
      setDoctorError('Please select a doctor');
      return;
    }
    if (!appointmentDate) {
      setDateError('Please pick an appointment date');
      return;
    }

    setBookingLoading(true);
    const doctorId = selectedDoctor._id || selectedDoctor.id;
    const doctorName = selectedDoctor.name;
    const scheduledAt = `${appointmentDate}T${appointmentTime || '10:00 AM'}`;
    const localId = `appt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newAppointment = {
      id: localId,
      _id: localId,
      patient_id: patientId,
      patientId,
      doctor_id: doctorId,
      doctorId,
      doctorName,
      status: 'requested',
      scheduled_at: scheduledAt,
      scheduledAt,
      notes: appointmentNotes || 'General consultation request',
      created_at: now,
      sync_status: isOnline ? 'synced' : 'pending',
    };

    try {
      // 1. Save locally to SQLite first
      await dbRun(
        `INSERT INTO appointments 
          (id, patient_id, doctor_id, status, scheduled_at, notes, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
        [localId, patientId, doctorId, scheduledAt, appointmentNotes, isOnline ? 'synced' : 'pending', now, now]
      );

      // 2. If online, send to API
      if (isOnline) {
        try {
          await appointmentAPI.create({
            patientId,
            doctorId,
            scheduledAt,
            notes: appointmentNotes,
          });
        } catch (apiErr) {
          await enqueue(patientId, localId, 'CREATE', 'appointments', newAppointment);
        }
      } else {
        await enqueue(patientId, localId, 'CREATE', 'appointments', newAppointment);
      }

      // 3. Update state immediately
      setAppointments(prev => [newAppointment, ...prev]);
      setShowBooking(false);
      setAppointmentNotes('');

      Alert.alert(
        'Appointment Requested!',
        `Your consultation request with ${doctorName} for ${formatDate(appointmentDate)} at ${appointmentTime} has been registered.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Booking Notice', err.message || 'Saved appointment locally.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = (appt) => {
    const apptId = appt._id || appt.id;
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this consultation request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isOnline) {
                try { await appointmentAPI.cancel(apptId); } catch (_) {}
              }
              await dbRun(
                `UPDATE appointments SET status='cancelled', sync_status=? WHERE id=?`,
                [isOnline ? 'synced' : 'pending', apptId]
              );
              if (!isOnline) {
                await enqueue(patientId, apptId, 'UPDATE', 'appointments', { id: apptId, status: 'cancelled' });
              }
              setAppointments(prev =>
                prev.map(a => (a._id || a.id) === apptId ? { ...a, status: 'cancelled' } : a)
              );
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const filteredDoctors = selectedCategory === 'All'
    ? doctors
    : doctors.filter(d => (d as any).category === selectedCategory || (d as any).specialization?.toLowerCase().includes(selectedCategory.toLowerCase()));

  const categories = ['All', 'General', 'Women', 'Pediatric', 'AYUSH', 'Eye'];

  const AppointmentCard = ({ appt }) => {
    const id = appt._id || appt.id;
    const doctorName = appt.doctorName || appt.doctor?.name || 'Dr. Anita Sharma';
    const status = appt.status || 'requested';

    return (
      <View style={styles.apptCard}>
        <View style={styles.apptHeader}>
          <View style={styles.apptLeft}>
            <Text style={styles.apptDoctor}>{doctorName}</Text>
            <Text style={styles.apptDate}>
              📅 {formatDate(appt.scheduledAt || appt.scheduled_at)}
              {(appt.scheduledAt || appt.scheduled_at) && `  🕐 ${formatTime(appt.scheduledAt || appt.scheduled_at) || appt.scheduledAt?.split('T')[1]?.slice(0, 5) || ''}`}
            </Text>
            {appt.notes ? <Text style={styles.apptNotes} numberOfLines={2}>{appt.notes}</Text> : null}
            {appt.sync_status === 'pending' && (
              <Text style={styles.pendingLabel}>⏳ Saved locally • Pending sync</Text>
            )}
          </View>
          <Badge status={status} />
        </View>

        {['requested', 'pending', 'accepted'].includes(status) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(appt)}>
            <Text style={styles.cancelBtnText}>✕ Cancel Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Appointments"
        subtitle="Consultations & Doctor Booking"
        rightElement={
          <TouchableOpacity style={styles.bookBtn} onPress={openBookingModal} activeOpacity={0.8}>
            <Text style={styles.bookBtnText}>+ Book Doctor</Text>
          </TouchableOpacity>
        }
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick CTA Card if empty */}
        {appointments.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyBigIcon}>🩺</Text>
            <Text style={styles.emptyTitle}>Book a Doctor Consultation</Text>
            <Text style={styles.emptySub}>
              Select from verified specialists and schedule an appointment at your nearby PHC or Civil Hospital.
            </Text>
            <Button
              title="+ Book New Appointment"
              onPress={openBookingModal}
              size="lg"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        ) : (
          <>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Your Scheduled Visits ({appointments.length})</Text>
              <TouchableOpacity onPress={openBookingModal}>
                <Text style={styles.newLink}>+ Book Another</Text>
              </TouchableOpacity>
            </View>

            {appointments.map((appt, i) => (
              <AppointmentCard key={appt._id || appt.id || i} appt={appt} />
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Booking Modal with Doctor Picker & Calendar */}
      <Modal visible={showBooking} animationType="slide" transparent onRequestClose={() => setShowBooking(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Book Consultation</Text>
                <Text style={styles.modalSub}>Select verified doctor & date</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBooking(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Doctor Category Filter Chips */}
              <Text style={styles.sectionHeading}>1. Select Doctor *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Doctor Selection Cards */}
              <View style={styles.doctorList}>
                {filteredDoctors.map(doc => {
                  const docId = doc._id || doc.id;
                  const isSelected = (selectedDoctor?._id || selectedDoctor?.id) === docId;
                  return (
                    <TouchableOpacity
                      key={docId}
                      style={[styles.docCard, isSelected && styles.docCardSelected]}
                      onPress={() => {
                        setSelectedDoctor(doc);
                        setDoctorError('');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.docAvatarCircle}>
                        <Text style={{ fontSize: 24 }}>{(doc as any).avatarEmoji || '👨‍⚕️'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.docName}>{doc.name}</Text>
                          {isSelected && (
                            <View style={styles.checkedCircle}>
                              <Text style={styles.checkMark}>✓</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.docSpec}>{(doc as any).specialization || 'Medical Specialist'}</Text>
                        <Text style={styles.docHospital}>🏥 {(doc as any).hospital || 'PHC Health Centre'}</Text>
                        <View style={styles.docBadgeRow}>
                          <View style={styles.miniTag}>
                            <Text style={styles.miniTagText}>{(doc as any).experience || '7+ Yrs'}</Text>
                          </View>
                          <View style={[styles.miniTag, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={[styles.miniTagText, { color: '#92400E' }]}>{(doc as any).rating || '4.9 ★'}</Text>
                          </View>
                          <View style={[styles.miniTag, { backgroundColor: '#E3F6ED' }]}>
                            <Text style={[styles.miniTagText, { color: '#106E53' }]}>{(doc as any).fee || 'Free PHC'}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {doctorError ? <Text style={styles.fieldError}>{doctorError}</Text> : null}

              {/* Interactive Calendar Date Picker */}
              <Text style={styles.sectionHeading}>2. Select Date (Calendar) *</Text>
              <CalendarPicker
                selectedDate={appointmentDate}
                onSelectDate={(date) => {
                  setAppointmentDate(date);
                  setDateError('');
                }}
              />
              {dateError ? <Text style={styles.fieldError}>{dateError}</Text> : null}

              {/* Preferred Time Slot Chips */}
              <Text style={styles.sectionHeading}>3. Preferred Time Slot</Text>
              <View style={styles.slotGrid}>
                {TIME_SLOTS.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotChip, appointmentTime === slot && styles.slotChipActive]}
                    onPress={() => setAppointmentTime(slot)}
                  >
                    <Text style={[styles.slotText, appointmentTime === slot && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason / Notes */}
              <Text style={styles.sectionHeading}>4. Reason / Symptoms (Optional)</Text>
              <Input
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                placeholder="e.g. Fever for 2 days, headache, BP checkup"
                multiline
                numberOfLines={2}
              />

              {/* Confirm CTA */}
              <Button
                title={bookingLoading ? 'Booking...' : `Confirm with ${selectedDoctor?.name || 'Doctor'}`}
                onPress={handleBookAppointment}
                loading={bookingLoading}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.md }}
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
  bookBtn: {
    backgroundColor: '#106E53',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bookBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.sm },

  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: '800',
    color: Colors.darkText,
  },
  newLink: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  emptyWrap: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  emptyBigIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.darkText, textAlign: 'center' },
  emptySub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },

  apptCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  apptLeft: { flex: 1, paddingRight: Spacing.sm },
  apptDoctor: {
    fontSize: Fonts.sizes.base,
    fontWeight: '800',
    color: Colors.darkText,
    marginBottom: 2,
  },
  apptDate: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginBottom: 4,
  },
  apptNotes: {
    fontSize: Fonts.sizes.xs,
    color: Colors.secondaryText,
    lineHeight: 16,
  },
  pendingLabel: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '700',
    marginTop: 3,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.error,
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 43, 67, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  modalSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  modalCloseBtn: { padding: Spacing.xs },
  modalClose: { fontSize: 20, color: Colors.secondaryText, fontWeight: '800' },

  sectionHeading: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '800',
    color: Colors.darkText,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  catScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  catChip: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catText: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark },
  catTextActive: { color: Colors.white },

  doctorList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  docCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#E3F6ED',
  },
  docAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docName: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.darkText },
  docSpec: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 1 },
  docHospital: { fontSize: 10, color: Colors.secondaryText, marginTop: 1 },
  docBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  miniTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniTagText: { fontSize: 9, fontWeight: '700', color: Colors.secondaryText },
  checkedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: 12, fontWeight: '900' },

  fieldError: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },

  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  slotChip: {
    width: '23%',
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  slotChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.darkText,
  },
  slotTextActive: {
    color: '#FFFFFF',
  },
});
