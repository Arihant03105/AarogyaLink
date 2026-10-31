import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useSync } from '../../../src/store/SyncContext';
import { adminAPI } from '../../../src/services/api';

export default function AdminVerificationsScreen() {
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reject modal
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      if (isOnline) {
        const res = await adminAPI.listUsers({ isVerified: false });
        const unverified = (res.data?.users || []).filter(u => u.role === 'doctor' || u.role === 'pharmacy');
        setPendingList(unverified);
      } else {
        setPendingList([
          {
            _id: 'doc_pend_1',
            role: 'doctor',
            name: 'Dr. Debojit Barman',
            mobile: '9864011223',
            village: 'Chhaygaon PHC',
            district: 'Kamrup Rural',
            profileData: {
              regNumber: 'AMC-2018-9941',
              qualification: 'MBBS, MD (General Medicine)',
              experience: '6 Years',
            },
          },
          {
            _id: 'pharma_pend_1',
            role: 'pharmacy',
            name: 'Brahmaputra Care Chemist',
            mobile: '9435012345',
            village: 'Boko Bazar',
            district: 'Kamrup Rural',
            profileData: {
              licenseNumber: 'DL-RUR-2023-4412',
              pharmacistName: 'Pranab Saikia (B.Pharm)',
            },
          },
        ]);
      }
    } catch (e) {
      console.log('Error loading verifications:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (item) => {
    setProcessing(true);
    try {
      if (isOnline) {
        if (item.role === 'doctor') {
          await adminAPI.verifyDoctor(item._id, { isVerified: true, verificationStatus: 'approved' });
        } else {
          await adminAPI.verifyPharmacy(item._id, { isVerified: true, verificationStatus: 'approved' });
        }
      }
      setPendingList(pendingList.filter(p => p._id !== item._id));
      Alert.alert('Approved! ✅', `${item.name} has been verified and granted active provider credentials.`);
    } catch (e) {
      Alert.alert('Approval Failed', e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please explain the reason for rejection.');
      return;
    }

    setProcessing(true);
    try {
      if (isOnline) {
        if (rejectingItem.role === 'doctor') {
          await adminAPI.verifyDoctor(rejectingItem._id, { isVerified: false, verificationStatus: 'rejected', reason: rejectionReason });
        } else {
          await adminAPI.verifyPharmacy(rejectingItem._id, { isVerified: false, verificationStatus: 'rejected', reason: rejectionReason });
        }
      }
      setPendingList(pendingList.filter(p => p._id !== rejectingItem._id));
      Alert.alert('Application Rejected', `The candidate has been notified of the license rejection.`);
      setRejectingItem(null);
      setRejectionReason('');
    } catch (e) {
      Alert.alert('Rejection Failed', e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Provider Verification"
        subtitle="Medical Council & Drug License Authentication Queue"
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadVerifications(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <Card style={styles.guidelineCard}>
          <Text style={styles.guidelineTitle}>🛡️ NHM Regulatory Directives</Text>
          <Text style={styles.guidelineText}>
            Strict regulatory audit: Never approve doctors without confirming State Medical Council register numbers.
            Never verify pharmacies without valid Schedule M/Form 20/21 Drug Controller authorizations.
          </Text>
        </Card>

        {loading ? (
          <LoadingState message="Checking verification requests..." />
        ) : pendingList.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="All Providers Verified"
            subtitle="There are no pending doctor or pharmacy credential approval requests."
          />
        ) : (
          pendingList.map((item, idx) => (
            <Card key={item._id || idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.location}>
                    {item.village}, {item.district}
                  </Text>
                </View>
                <Badge
                  status="pending"
                  label={item.role === 'doctor' ? 'DOCTOR APPLICATION' : 'PHARMACY APPLICATION'}
                />
              </View>

              <View style={styles.credentialBox}>
                {item.role === 'doctor' ? (
                  <>
                    <View style={styles.credRow}>
                      <Text style={styles.credLabel}>MCI / SMC Reg. Number:</Text>
                      <Text style={styles.credVal}>{item.profileData?.regNumber || 'Not specified'}</Text>
                    </View>
                    <View style={styles.credRow}>
                      <Text style={styles.credLabel}>Qualifications:</Text>
                      <Text style={styles.credVal}>{item.profileData?.qualification || 'MBBS'}</Text>
                    </View>
                    <View style={styles.credRow}>
                      <Text style={styles.credLabel}>Clinical Experience:</Text>
                      <Text style={styles.credVal}>{item.profileData?.experience || 'N/A'}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.credRow}>
                      <Text style={styles.credLabel}>Drug License (Form 20/21):</Text>
                      <Text style={styles.credVal}>{item.profileData?.licenseNumber || 'Not specified'}</Text>
                    </View>
                    <View style={styles.credRow}>
                      <Text style={styles.credLabel}>Registered Pharmacist:</Text>
                      <Text style={styles.credVal}>{item.profileData?.pharmacistName || item.name}</Text>
                    </View>
                  </>
                )}
                <View style={styles.credRow}>
                  <Text style={styles.credLabel}>Registered Contact:</Text>
                  <Text style={styles.credVal}>📞 {item.mobile}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button
                  title="✓ Authenticate & Approve"
                  variant="success"
                  size="sm"
                  loading={processing}
                  onPress={() => handleApprove(item)}
                  style={{ flex: 1.2 }}
                />
                <Button
                  title="✕ Reject"
                  variant="outline"
                  size="sm"
                  onPress={() => setRejectingItem(item)}
                  style={{ flex: 0.8 }}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal visible={!!rejectingItem} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Provider Application</Text>
              <TouchableOpacity onPress={() => setRejectingItem(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.rejectNotice}>
              Provide an official regulatory reason why {rejectingItem?.name}'s application is disqualified:
            </Text>

            <Input
              label="Rejection Reason *"
              placeholder="e.g. Expired medical registration certificate / Incomplete pharmacy inspection report..."
              multiline
              numberOfLines={3}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <Button
              title="Confirm Rejection"
              variant="danger"
              size="md"
              loading={processing}
              onPress={handleReject}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  guidelineCard: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', marginBottom: Spacing.md },
  guidelineTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: '#166534' },
  guidelineText: { fontSize: Fonts.sizes.xs, color: '#15803D', marginTop: 2, lineHeight: 17 },
  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  location: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  credentialBox: { backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.md, marginVertical: Spacing.sm },
  credRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  credLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  credVal: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.darkText },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.base },
  modalContent: { backgroundColor: Colors.card, borderRadius: Radii.xl, padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modalTitle: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.error },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  rejectNotice: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginBottom: Spacing.sm, lineHeight: 17 },
});

