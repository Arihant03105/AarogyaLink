import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { dbAll } from '../../../src/database';

export default function DoctorProfileScreen() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, lastSyncTime, triggerSync, isSyncing } = useSync();
  const insets = useSafeAreaInsets();

  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    checkDrafts();
  }, [pendingCount]);

  const checkDrafts = async () => {
    try {
      const rows = await dbAll('SELECT COUNT(*) as cnt FROM prescriptions WHERE is_draft = 1');
      setDraftCount(rows?.[0]?.cnt || 0);
    } catch (e) {}
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of Doctor Portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const isVerified = user?.isVerified || user?.is_verified;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Practitioner Profile" subtitle="Medical officer credentials & offline cache" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Identity Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👨‍⚕️</Text>
          </View>
          <Text style={styles.userName}>Dr. {user?.name || 'Medical Practitioner'}</Text>
          <Text style={styles.userRole}>
            {user?.profileData?.specialization || 'General Physician / Rural Medical Officer'}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              status={isVerified ? 'verified' : 'unverified'}
              label={isVerified ? 'MCI / STATE VERIFIED' : 'VERIFICATION PENDING'}
            />
            <Badge status="synced" label={isOnline ? 'ONLINE' : 'OFFLINE MODE'} />
          </View>
        </Card>

        {/* Verification Alert Notice */}
        {!isVerified && (
          <Card style={styles.verifCard}>
            <Text style={styles.verifTitle}>⏳ Verification Under Review</Text>
            <Text style={styles.verifDesc}>
              Your medical registration certificate is being reviewed by the Administrative Chief Medical Officer.
              Prescription issuing will be stamped as 'Preliminary / Unverified' until approval is granted.
            </Text>
          </Card>
        )}

        {/* Credentials Details */}
        <Card title="Clinical Credentials">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Medical Council Reg. No.</Text>
            <Text style={styles.infoValue}>{user?.profileData?.regNumber || 'MCI-RUR-88219'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Specialization</Text>
            <Text style={styles.infoValue}>{user?.profileData?.specialization || 'Family & Community Medicine'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Years of Experience</Text>
            <Text style={styles.infoValue}>{user?.profileData?.experience || '8+ Years'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Health Facility</Text>
            <Text style={styles.infoValue}>{user?.village || 'Primary Health Centre (PHC)'}, {user?.district || 'District'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Mobile</Text>
            <Text style={styles.infoValue}>{user?.mobile || 'N/A'}</Text>
          </View>
        </Card>

        {/* Offline Draft Safety Monitor */}
        <Card title="Offline Clinical Safety & Sync">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Local Offline Prescription Drafts</Text>
            <Text style={[styles.infoValue, { color: draftCount > 0 ? Colors.warning : Colors.success }]}>
              {draftCount} drafts held locally
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unsynchronized Queue</Text>
            <Text style={styles.infoValue}>{pendingCount} operations</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Successful Sync</Text>
            <Text style={styles.infoValue}>{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</Text>
          </View>

          <Button
            title={isSyncing ? 'Synchronizing...' : 'Sync Offline Records Now'}
            variant="primary"
            size="md"
            loading={isSyncing}
            onPress={triggerSync}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Logout */}
        <Button
          title="Log Out of Practitioner Portal"
          variant="danger"
          size="lg"
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  profileCard: { alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.md },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  avatarEmoji: { fontSize: 36 },
  userName: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  userRole: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2, marginBottom: Spacing.sm },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs },
  verifCard: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', marginBottom: Spacing.md },
  verifTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: '#92400E', marginBottom: 2 },
  verifDesc: { fontSize: Fonts.sizes.xs, color: '#78350F', lineHeight: 17 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoValue: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, textAlign: 'right', flex: 1, marginLeft: Spacing.sm },
  logoutBtn: { marginVertical: Spacing.md },
});

