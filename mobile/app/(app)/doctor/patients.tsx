import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { patientAPI, prescriptionAPI, symptomAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function DoctorPatientsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected patient details modal
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState({ prescriptions: [], symptoms: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      if (isOnline) {
        const res = await patientAPI.list();
        setPatients(res.data?.patients || res.data || []);
      } else {
        const rows = await dbAll('SELECT * FROM patients ORDER BY name ASC');
        setPatients(rows || []);
      }
    } catch (e) {
      console.log('Error loading doctor patients:', e.message);
      const rows = await dbAll('SELECT * FROM patients ORDER BY name ASC');
      setPatients(rows || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenPatient = async (pat) => {
    setSelectedPatient(pat);
    setLoadingDetails(true);
    try {
      const pId = pat._id || pat.id;
      if (isOnline) {
        const [rxRes, symRes] = await Promise.allSettled([
          prescriptionAPI.list({ patientId: pId }),
          symptomAPI.list({ patientId: pId }),
        ]);
        setPatientHistory({
          prescriptions: rxRes.status === 'fulfilled' ? (rxRes.value.data?.prescriptions || rxRes.value.data || []) : [],
          symptoms: symRes.status === 'fulfilled' ? (symRes.value.data?.symptoms || symRes.value.data || []) : [],
        });
      } else {
        const localRx = await dbAll('SELECT * FROM prescriptions WHERE patient_id = ?', [pId]);
        const localSym = await dbAll('SELECT * FROM symptoms WHERE patient_id = ?', [pId]);
        setPatientHistory({
          prescriptions: localRx || [],
          symptoms: localSym || [],
        });
      }
    } catch (e) {
      console.log('Patient detail error:', e.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filtered = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.village && p.village.toLowerCase().includes(term)) ||
      (p.mobile && p.mobile.includes(term))
    );
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Clinical Patient Directory" subtitle="Electronic medical records & village case files" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by name, village or mobile..."
          placeholderTextColor={Colors.secondaryText}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPatients(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <LoadingState message="Loading medical records..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Patients Found"
            subtitle={searchTerm ? `No matching clinical files for "${searchTerm}"` : "No registered patients found."}
          />
        ) : (
          filtered.map((pat, idx) => (
            <Card key={pat._id || pat.id || idx} style={styles.patientCard}>
              <TouchableOpacity onPress={() => handleOpenPatient(pat)}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{pat.name}</Text>
                    <Text style={styles.sub}>
                      {pat.age ? `${pat.age} yrs` : 'Age N/A'} • {pat.gender || 'Gender N/A'} • Village: {pat.village || 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.viewLink}>View File ➔</Text>
                </View>

                <View style={styles.demographicsRow}>
                  <Text style={styles.demographicText}>Blood: {pat.blood_group || pat.bloodGroup || 'Not Tested'}</Text>
                  <Text style={styles.demographicText}>Phone: {pat.mobile || 'None'}</Text>
                </View>

                {pat.medical_history || pat.medicalHistory ? (
                  <View style={styles.historyBox}>
                    <Text style={styles.historyLabel}>Known Conditions:</Text>
                    <Text style={styles.historyVal}>{pat.medical_history || pat.medicalHistory}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Patient Detailed Modal */}
      <Modal visible={!!selectedPatient} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedPatient?.name}</Text>
                <Text style={styles.modalSub}>
                  {selectedPatient?.age} yrs • {selectedPatient?.gender} • Village: {selectedPatient?.village}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingDetails ? (
                <LoadingState message="Fetching medical history..." />
              ) : (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Medical Profile</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Blood Group</Text>
                      <Text style={styles.infoVal}>{selectedPatient?.blood_group || selectedPatient?.bloodGroup || 'Unknown'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Known Allergies</Text>
                      <Text style={styles.infoVal}>{selectedPatient?.allergies || 'None reported'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Emergency Contact</Text>
                      <Text style={styles.infoVal}>
                        {selectedPatient?.emergency_contact || selectedPatient?.emergencyContact || 'N/A'} ({selectedPatient?.emergency_phone || selectedPatient?.emergencyPhone || ''})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Recent Symptoms & Triage ({patientHistory.symptoms.length})</Text>
                    {patientHistory.symptoms.length === 0 ? (
                      <Text style={styles.emptyNote}>No symptom intakes recorded.</Text>
                    ) : (
                      patientHistory.symptoms.map((s, i) => (
                        <View key={i} style={styles.itemBox}>
                          <Text style={styles.itemText}>{s.symptoms}</Text>
                          <Text style={styles.itemSub}>Duration: {s.duration || 'N/A'}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Past Prescriptions Issued ({patientHistory.prescriptions.length})</Text>
                    {patientHistory.prescriptions.length === 0 ? (
                      <Text style={styles.emptyNote}>No previous prescriptions on file.</Text>
                    ) : (
                      patientHistory.prescriptions.map((rx, i) => {
                        const meds = typeof rx.medicines === 'string' ? JSON.parse(rx.medicines || '[]') : (rx.medicines || []);
                        return (
                          <View key={i} style={styles.itemBox}>
                            <Text style={styles.itemDate}>{new Date(rx.createdAt || rx.created_at || Date.now()).toLocaleDateString()}</Text>
                            {meds.map((m, mIdx) => (
                              <Text key={mIdx} style={styles.itemMed}>
                                • {m.name} ({m.dosage} - {m.frequency})
                              </Text>
                            ))}
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.darkText },
  clearBtn: { fontSize: 16, color: Colors.secondaryText, padding: 4 },
  scroll: { padding: Spacing.base },
  patientCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  sub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  viewLink: { fontSize: Fonts.sizes.xs, color: Colors.primary, fontWeight: '800' },
  demographicsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  demographicText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  historyBox: { marginTop: Spacing.xs, backgroundColor: Colors.inputBg, padding: Spacing.xs, borderRadius: Radii.sm },
  historyLabel: { fontSize: 10, fontWeight: '700', color: Colors.secondaryText },
  historyVal: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  modalSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  detailSection: { marginBottom: Spacing.md },
  sectionHeader: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primaryDark, marginBottom: Spacing.xs },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoVal: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText },
  emptyNote: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, fontStyle: 'italic' },
  itemBox: { backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.md, marginBottom: Spacing.xs },
  itemText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText },
  itemSub: { fontSize: 10, color: Colors.secondaryText, marginTop: 2 },
  itemDate: { fontSize: 10, color: Colors.primaryDark, fontWeight: '700', marginBottom: 2 },
  itemMed: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginLeft: 4 },
});

