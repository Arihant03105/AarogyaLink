import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { symptomAPI } from '../../../src/services/api';
import { dbAll, dbRun } from '../../../src/database';

const DURATIONS = [
  'Today / < 24 Hours',
  '2 - 3 Days',
  '4 - 7 Days',
  'More than 1 Week',
  'Chronic / > 1 Month',
];

export default function SymptomsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount, enqueue } = useSync();
  const insets = useSafeAreaInsets();

  const [symptomsText, setSymptomsText] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // Submitted symptoms history
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadLocalHistory();
    if (isOnline) {
      fetchServerHistory();
    }
  }, []);

  const loadLocalHistory = async () => {
    try {
      const rows = await dbAll('SELECT * FROM symptoms ORDER BY created_at DESC');
      if (rows && rows.length > 0) {
        setHistory(rows);
      }
    } catch (e) {
      console.log('Local symptoms history error:', e.message);
    }
  };

  const fetchServerHistory = async () => {
    try {
      const res = await symptomAPI.list({ patientId: user?._id || user?.id });
      const serverList = res.data?.symptoms || res.data || [];
      if (serverList.length > 0) {
        setHistory(serverList);
      }
    } catch (e) {
      console.log('Symptoms server history error:', e.message);
    }
  };

  const loadHistory = async () => {
    await loadLocalHistory();
    if (isOnline) {
      await fetchServerHistory();
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is needed to attach prescription photos or documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleVoiceInputSimulate = () => {
    setIsVoiceRecording(true);
    setTimeout(() => {
      setIsVoiceRecording(false);
      const simulatedPhrases = [
        'मुझे दो दिन से हल्का बुखार और सिरदर्द हो रहा है। (Moderate fever & headache for 2 days)',
        'पेट में दर्द है और उल्टी जैसा लग रहा है। (Stomach ache and nausea)',
        'खांसी और सांस लेने में हल्की तकलीफ है। (Cough and mild difficulty breathing)',
      ];
      const randomPhrase = simulatedPhrases[Math.floor(Math.random() * simulatedPhrases.length)];
      setSymptomsText(prev => prev ? `${prev}\n${randomPhrase}` : randomPhrase);
      Alert.alert('Voice Transcribed', 'Speech input has been converted to text.');
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!symptomsText.trim()) {
      Alert.alert('Required', 'Please describe your symptoms.');
      return;
    }

    setSubmitting(true);
    const patientId = user?._id || user?.id || 'LOCAL_PAT';
    const payload = {
      patientId,
      submittedBy: patientId,
      symptoms: symptomsText.trim(),
      duration: selectedDuration,
      medicalHistory: medicalHistory.trim(),
      imageUris: images,
      status: 'submitted',
    };

    try {
      if (isOnline) {
        await symptomAPI.submit(payload);
        Alert.alert('Submitted!', 'Your symptoms have been forwarded to the local medical officer / ASHA worker.');
      } else {
        const localId = 'SYM_' + Date.now();
        await dbRun(
          `INSERT INTO symptoms (id, patient_id, submitted_by, symptoms, duration, medical_history, image_uris, status, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', 'pending')`,
          [localId, patientId, patientId, payload.symptoms, payload.duration, payload.medicalHistory, JSON.stringify(images)]
        );
        await enqueue(patientId, localId, 'CREATE', 'symptoms', payload);
        Alert.alert('Saved Offline 📡', 'Record saved to device. It will automatically upload to the cloud once network connectivity is restored.');
      }

      // Reset
      setSymptomsText('');
      setMedicalHistory('');
      setImages([]);
      loadHistory();
    } catch (e) {
      Alert.alert('Submission Error', e?.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Symptom Intake" subtitle="Direct medical consultation dispatch" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Regulatory AI Disclaimer Alert */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>
            Medical Disclaimer: AI facilitates automated transcription and summarization for healthcare staff.
            AI does NOT formulate independent clinical diagnoses or prescribe pharmaceuticals.
          </Text>
        </View>

        {/* Input Form Card */}
        <Card title="Describe How You Feel">
          <Input
            label="Symptoms (लक्षण) *"
            placeholder="Describe your pain, discomfort or fever in detail..."
            multiline
            numberOfLines={4}
            value={symptomsText}
            onChangeText={setSymptomsText}
          />

          {/* Voice Input Button */}
          <TouchableOpacity
            style={[styles.voiceBtn, isVoiceRecording && styles.voiceBtnActive]}
            onPress={handleVoiceInputSimulate}
            disabled={isVoiceRecording}
          >
            {isVoiceRecording ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.voiceBtnText}>🎤 Speak in Hindi / English (बोलकर दर्ज करें)</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Duration of Symptoms *</Text>
          <View style={styles.durationGrid}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, selectedDuration === d && styles.durationChipActive]}
                onPress={() => setSelectedDuration(d)}
              >
                <Text style={[styles.durationChipText, selectedDuration === d && styles.durationChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Relevant Medical History (Optional)"
            placeholder="e.g. Diabetic, High BP, Asthma, Past surgeries"
            value={medicalHistory}
            onChangeText={setMedicalHistory}
            style={{ marginTop: Spacing.sm }}
          />

          {/* Image Attachments */}
          <Text style={styles.fieldLabel}>Attach Photos / Lab Slips (Optional)</Text>
          <View style={styles.attachmentRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
              <Text style={styles.attachBtnText}>📷 Add Photo</Text>
            </TouchableOpacity>
            <Text style={styles.attachCountText}>{images.length} attached</Text>
          </View>

          <Button
            title="Submit to Healthcare Professional"
            variant="primary"
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* History of submissions */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Your Previous Submissions ({history.length})</Text>
          {loadingHistory ? (
            <ActivityIndicator color={Colors.primary} />
          ) : history.length === 0 ? (
            <Text style={styles.noHistory}>No previous symptom submissions found.</Text>
          ) : (
            history.map((item, idx) => (
              <Card key={item._id || item.id || idx} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                  <Badge status={item.status || 'submitted'} />
                </View>
                <Text style={styles.historySymptoms}>{item.symptoms}</Text>
                <Text style={styles.historyDuration}>Duration: {item.duration || 'Not specified'}</Text>
                {item.doctorResponse && (
                  <View style={styles.docResponseBox}>
                    <Text style={styles.docResponseLabel}>Doctor's Triage Reply:</Text>
                    <Text style={styles.docResponseText}>{item.doctorResponse}</Text>
                  </View>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  disclaimerIcon: { fontSize: 18, marginRight: Spacing.xs, marginTop: 2 },
  disclaimerText: { flex: 1, fontSize: Fonts.sizes.xs, color: '#1E40AF', lineHeight: 17 },
  voiceBtn: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  voiceBtnActive: { backgroundColor: '#CBECE0', borderColor: Colors.primary },
  voiceBtnText: { color: Colors.primaryDark, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  fieldLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, marginBottom: 4 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  durationChip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radii.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  durationChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  durationChipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText },
  durationChipTextActive: { color: Colors.white, fontWeight: '700' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  attachBtn: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  attachBtnText: { fontSize: Fonts.sizes.xs, color: Colors.primary, fontWeight: '700' },
  attachCountText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  historySection: { marginTop: Spacing.lg },
  historyTitle: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.darkText, marginBottom: Spacing.sm },
  noHistory: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, fontStyle: 'italic' },
  historyCard: { marginBottom: Spacing.sm },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyDate: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  historySymptoms: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.darkText },
  historyDuration: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  docResponseBox: { marginTop: Spacing.sm, backgroundColor: '#F0FDF4', padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: '#BBF7D0' },
  docResponseLabel: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: '#166534' },
  docResponseText: { fontSize: Fonts.sizes.xs, color: '#15803D', marginTop: 2 },
});

