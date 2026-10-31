import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { patientAPI } from '../../../src/services/api';
import { dbRun } from '../../../src/database';

const GENDERS = ['Female', 'Male', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function RegisterPatientScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState(user?.village || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [state, setState] = useState(user?.state || 'Assam');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [consent, setConsent] = useState(true);

  const [saving, setSaving] = useState(false);
  const [registeredCard, setRegisteredCard] = useState(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter patient full name.');
      return;
    }
    if (!age.trim() || isNaN(Number(age))) {
      Alert.alert('Required', 'Please enter a valid age in years.');
      return;
    }
    if (!village.trim()) {
      Alert.alert('Required', 'Village name is required for rural tracking.');
      return;
    }
    if (!consent) {
      Alert.alert('Consent Required', 'Explicit patient consent is required by digital health privacy policy.');
      return;
    }

    setSaving(true);
    const localId = 'PAT_' + Date.now();
    const ashaId = user?._id || user?.id || 'LOCAL_ASHA';
    const patientCode = `AAPL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      id: localId,
      ashaId,
      name: name.trim(),
      age: parseInt(age, 10),
      gender,
      mobile: mobile.trim(),
      village: village.trim(),
      district: district.trim(),
      state: state.trim(),
      bloodGroup,
      allergies: allergies.trim(),
      medicalHistory: medicalHistory.trim(),
      emergencyContact: emergencyContact.trim(),
      emergencyPhone: emergencyPhone.trim(),
      consent: consent ? 1 : 0,
      patientCode,
    };

    try {
      // 1. Save to SQLite offline DB first
      await dbRun(
        `INSERT INTO patients 
          (id, asha_id, name, age, gender, mobile, village, district, state, blood_group, allergies, medical_history, emergency_contact, emergency_phone, consent, patient_code, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          localId, ashaId, payload.name, payload.age, payload.gender, payload.mobile,
          payload.village, payload.district, payload.state, payload.bloodGroup,
          payload.allergies, payload.medicalHistory, payload.emergencyContact,
          payload.emergencyPhone, payload.consent, payload.patientCode,
          isOnline ? 'synced' : 'pending',
        ]
      );

      // 2. If online try server; otherwise enqueue for background synchronization
      if (isOnline) {
        try {
          await patientAPI.create(payload);
        } catch (serverErr) {
          console.log('Server save error, queued offline:', serverErr.message);
          await enqueue(ashaId, localId, 'CREATE', 'patients', payload);
        }
      } else {
        await enqueue(ashaId, localId, 'CREATE', 'patients', payload);
      }

      setRegisteredCard({ ...payload, id: localId });
      Alert.alert(
        'Patient Registered Successfully! 🎉',
        `Unique ID: ${patientCode}\nHealth record created in ${isOnline ? 'Cloud' : 'Offline Local Storage'}.`
      );
    } catch (e) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Patient Intake & Card"
        subtitle="Village household registration form"
        showBack
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {registeredCard ? (
          <Card style={styles.successCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Registration Complete!</Text>
            <Text style={styles.successSubtitle}>Digital health identity successfully created.</Text>

            {/* Stylized QR Card Representation */}
            <View style={styles.qrCardStub}>
              <Text style={styles.qrHeaderTag}>🏥 AAROGYA LINK RURAL HEALTH CARD</Text>
              <Text style={styles.qrName}>{registeredCard.name}</Text>
              <Text style={styles.qrSub}>
                Age: {registeredCard.age} • {registeredCard.gender} • Village: {registeredCard.village}
              </Text>
              <View style={styles.qrCodeMatrixBox}>
                <Text style={styles.qrIconEmoji}>📱</Text>
                <Text style={styles.qrCodeValue}>{registeredCard.patientCode}</Text>
              </View>
              <Text style={styles.qrDisclaimer}>Authorized Rural Tele-triage Identity</Text>
            </View>

            <Button
              title="Register Another Patient"
              variant="outline"
              size="md"
              onPress={() => {
                setRegisteredCard(null);
                setName('');
                setAge('');
                setMobile('');
                setAllergies('');
                setMedicalHistory('');
              }}
              style={{ marginTop: Spacing.md }}
            />
            <Button
              title="Return to Patients List"
              variant="primary"
              size="md"
              onPress={() => router.replace('/(app)/asha/patients')}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        ) : (
          <Card title="Patient Demographic & Health Info">
            <Input
              label="Full Patient Name *"
              placeholder="e.g. Ramesh Chandra Das"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Input
                  label="Age (Years) *"
                  placeholder="e.g. 42"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                <View style={styles.genderRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderChip, gender === g && styles.genderChipActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Input
              label="Mobile Number (Optional)"
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Input
                  label="Village / Ward *"
                  placeholder="Village"
                  value={village}
                  onChangeText={setVillage}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="District"
                  placeholder="District"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>
            </View>

            {/* Blood group selection */}
            <Text style={styles.fieldLabel}>Blood Group</Text>
            <View style={styles.bloodGrid}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodChip, bloodGroup === bg && styles.bloodChipActive]}
                  onPress={() => setBloodGroup(bg)}
                >
                  <Text style={[styles.bloodText, bloodGroup === bg && styles.bloodTextActive]}>
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Known Allergies"
              placeholder="e.g. Sulfa drugs, dust, seasonal"
              value={allergies}
              onChangeText={setAllergies}
              style={{ marginTop: Spacing.sm }}
            />

            <Input
              label="Significant Medical History"
              placeholder="Hypertension, Diabetes, TB history, Previous surgeries"
              multiline
              numberOfLines={3}
              value={medicalHistory}
              onChangeText={setMedicalHistory}
            />

            <Input
              label="Emergency Contact Name"
              placeholder="Relative / Guardian Name"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />

            <Input
              label="Emergency Contact Phone"
              placeholder="Emergency Phone Number"
              keyboardType="phone-pad"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />

            {/* Consent Checkbox */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsent(!consent)}
            >
              <View style={[styles.checkbox, consent && styles.checkboxActive]}>
                {consent && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                Patient has consented to digital health record storage under National Health Mission guidelines.
              </Text>
            </TouchableOpacity>

            <Button
              title={saving ? 'Registering...' : 'Register Patient & Generate Health Card'}
              variant="primary"
              size="lg"
              loading={saving}
              onPress={handleRegister}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  row: { flexDirection: 'row' },
  fieldLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, marginBottom: 4 },
  genderRow: { flexDirection: 'row', gap: 4, height: 46, alignItems: 'center' },
  genderChip: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center' },
  genderChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  genderText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  genderTextActive: { color: Colors.white, fontWeight: '800' },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.sm },
  bloodChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  bloodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bloodText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  bloodTextActive: { color: Colors.white, fontWeight: '700' },
  consentRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 13, fontWeight: '900' },
  consentText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.darkText, lineHeight: 17 },
  successCard: { alignItems: 'center', padding: Spacing.lg },
  successIcon: { fontSize: 48, marginBottom: Spacing.xs },
  successTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  successSubtitle: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2, textAlign: 'center' },
  qrCardStub: {
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginVertical: Spacing.md,
    ...Shadows.sm,
  },
  qrHeaderTag: { fontSize: 10, fontWeight: '800', color: Colors.primaryDark, marginBottom: Spacing.xs },
  qrName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  qrSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  qrCodeMatrixBox: {
    backgroundColor: Colors.inputBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginVertical: Spacing.md,
    alignItems: 'center',
  },
  qrIconEmoji: { fontSize: 32 },
  qrCodeValue: { fontSize: Fonts.sizes.md, fontWeight: '900', color: Colors.darkText, letterSpacing: 1, marginTop: 4 },
  qrDisclaimer: { fontSize: 10, color: Colors.secondaryText, fontStyle: 'italic' },
});

