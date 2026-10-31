import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Share, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { patientAPI, prescriptionAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function RecordsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions' | 'records' | 'qr'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadLocalRecords();
    if (isOnline) {
      fetchServerRecords();
    }
  }, []);

  const loadLocalRecords = async () => {
    try {
      const localRx = await dbAll('SELECT * FROM prescriptions ORDER BY created_at DESC');
      const localRec = await dbAll('SELECT * FROM health_records ORDER BY created_at DESC');
      if (localRx && localRx.length > 0) setPrescriptions(localRx);
      if (localRec && localRec.length > 0) setRecords(localRec);
    } catch (e) {
      console.log('Error reading local records:', e.message);
    }
  };

  const fetchServerRecords = async () => {
    try {
      const pId = user?._id || user?.id;
      const [rxRes, recRes] = await Promise.allSettled([
        prescriptionAPI.list({ patientId: pId }),
        patientAPI.getHealthRecords(pId),
      ]);
      if (rxRes.status === 'fulfilled' && rxRes.value.data) {
        setPrescriptions(rxRes.value.data?.prescriptions || rxRes.value.data || []);
      }
      if (recRes.status === 'fulfilled' && recRes.value.data) {
        setRecords(recRes.value.data?.records || recRes.value.data || []);
      }
    } catch (e) {
      console.log('Error fetching server records in background:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchData = async () => {
    await loadLocalRecords();
    if (isOnline) {
      await fetchServerRecords();
    }
    setRefreshing(false);
  };

  const patientId = user?.patientCode || user?._id || user?.id || 'AAPL-PAT-001';

  const handleShareCard = async () => {
    try {
      await Share.share({
        message: `AAROGYA LINK Digital Health Card\nPatient Name: ${user?.name}\nID: ${patientId}\nVillage: ${user?.village || 'N/A'}\nBlood Group: ${user?.bloodGroup || 'N/A'}`,
      });
    } catch (e) {
      console.log('Share error', e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Health Records" subtitle="Your verified digital medical history" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Segmented Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'prescriptions' && styles.tabItemActive]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.tabTextActive]}>
            Prescriptions ({prescriptions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'records' && styles.tabItemActive]}
          onPress={() => setActiveTab('records')}
        >
          <Text style={[styles.tabText, activeTab === 'records' && styles.tabTextActive]}>
            Reports & Notes ({records.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'qr' && styles.tabItemActive]}
          onPress={() => setActiveTab('qr')}
        >
          <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
            QR Card
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {activeTab === 'prescriptions' && (
          <View>
            {prescriptions.length === 0 ? (
              <EmptyState
                icon="💊"
                title="No Prescriptions Yet"
                subtitle="Prescriptions provided by verified doctors will appear here."
              />
            ) : (
              prescriptions.map((rx, idx) => {
                const meds = typeof rx.medicines === 'string'
                  ? JSON.parse(rx.medicines || '[]')
                  : (rx.medicines || []);
                return (
                  <Card key={rx._id || rx.id || idx} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.doctorName}>
                          {rx.doctorName || (rx.doctorId?.name ? `Dr. ${rx.doctorId.name}` : 'Consulting Doctor')}
                        </Text>
                        <Text style={styles.dateText}>
                          {new Date(rx.createdAt || rx.created_at || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <Badge status={rx.isDraft || rx.is_draft ? 'draft' : 'active'} />
                    </View>

                    <View style={styles.medsContainer}>
                      <Text style={styles.medsTitle}>Prescribed Medicines:</Text>
                      {meds.map((m, mIdx) => (
                        <View key={mIdx} style={styles.medRow}>
                          <Text style={styles.bullet}>•</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.medName}>{m.name || 'Medicine'}</Text>
                            <Text style={styles.medDetail}>
                              {m.dosage} | {m.frequency} | {m.duration}
                            </Text>
                            {m.instructions && (
                              <Text style={styles.medInstructions}>Note: {m.instructions}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>

                    {rx.instructions && (
                      <View style={styles.doctorNotes}>
                        <Text style={styles.notesLabel}>Doctor's Advice:</Text>
                        <Text style={styles.notesText}>{rx.instructions}</Text>
                      </View>
                    )}
                  </Card>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'records' && (
          <View>
            {records.length === 0 ? (
              <EmptyState
                icon="📑"
                title="No Reports or Records"
                subtitle="Clinical observations and lab reports will be stored here."
              />
            ) : (
              records.map((rec, idx) => (
                <Card key={rec._id || rec.id || idx} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.doctorName}>{rec.title || 'Clinical Document'}</Text>
                    <Badge status="completed" label={rec.recordType || 'Report'} />
                  </View>
                  <Text style={styles.dateText}>
                    Date: {new Date(rec.createdAt || rec.created_at || Date.now()).toLocaleDateString()}
                  </Text>
                  {rec.description && (
                    <Text style={styles.recordDesc}>{rec.description}</Text>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'qr' && (
          <Card style={styles.qrCard}>
            <View style={styles.qrBadgeHeader}>
              <Text style={styles.qrHospitalTag}>🏥 AAROGYA LINK HEALTH CARD</Text>
            </View>

            {/* Stylized QR Visual Matrix Box */}
            <View style={styles.qrVisualBox}>
              <View style={styles.qrCornerTL} />
              <View style={styles.qrCornerTR} />
              <View style={styles.qrCornerBL} />
              <View style={styles.qrCornerBR} />
              <Text style={styles.qrIconEmoji}>📱</Text>
              <Text style={styles.qrCodeText}>{patientId}</Text>
              <Text style={styles.qrScanHint}>Scan at any PHC, Clinic or Pharmacy</Text>
            </View>

            <View style={styles.qrDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Patient Name</Text>
                <Text style={styles.detailVal}>{user?.name || 'Authorized Patient'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mobile</Text>
                <Text style={styles.detailVal}>{user?.mobile || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Village / District</Text>
                <Text style={styles.detailVal}>{user?.village || 'Rural Health Unit'}, {user?.district || ''}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Blood Group</Text>
                <Text style={styles.detailVal}>{user?.bloodGroup || 'Not Recorded'}</Text>
              </View>
            </View>

            <Button
              title="Share Health Card"
              variant="primary"
              onPress={handleShareCard}
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
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  tabItemActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  tabTextActive: {
    color: Colors.white,
  },
  scroll: { padding: Spacing.base },
  card: { marginBottom: Spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  doctorName: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.darkText },
  dateText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  medsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  medsTitle: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.xs },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3 },
  bullet: { fontSize: 16, color: Colors.primary, marginRight: Spacing.xs },
  medName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.darkText },
  medDetail: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  medInstructions: { fontSize: Fonts.sizes.xs, color: Colors.info, fontStyle: 'italic', marginTop: 2 },
  doctorNotes: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.inputBg,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  notesLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText },
  notesText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  recordDesc: { fontSize: Fonts.sizes.sm, color: Colors.darkText, marginTop: Spacing.sm },
  qrCard: { alignItems: 'center', padding: Spacing.lg },
  qrBadgeHeader: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.full,
    marginBottom: Spacing.md,
  },
  qrHospitalTag: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primaryDark },
  qrVisualBox: {
    width: 220,
    height: 220,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: Spacing.md,
    ...Shadows.md,
  },
  qrCornerTL: { position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderTopWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary },
  qrCornerTR: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderTopWidth: 3, borderRightWidth: 3, borderColor: Colors.primary },
  qrCornerBL: { position: 'absolute', bottom: 8, left: 8, width: 20, height: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary },
  qrCornerBR: { position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderBottomWidth: 3, borderRightWidth: 3, borderColor: Colors.primary },
  qrIconEmoji: { fontSize: 44, marginBottom: Spacing.xs },
  qrCodeText: { fontSize: Fonts.sizes.md, fontWeight: '900', color: Colors.darkText, letterSpacing: 1 },
  qrScanHint: { fontSize: 10, color: Colors.secondaryText, marginTop: Spacing.xs, textAlign: 'center' },
  qrDetails: { width: '100%', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  detailVal: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText },
});

