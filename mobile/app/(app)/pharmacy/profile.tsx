import React, { useState } from 'react';
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

export default function PharmacyProfileScreen() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, lastSyncTime, triggerSync, isSyncing } = useSync();
  const insets = useSafeAreaInsets();

  const isVerified = user?.isVerified || user?.is_verified;

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of Pharmacy portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Dispensary Profile" subtitle="Retail license credentials & connectivity" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🏪</Text>
          </View>
          <Text style={styles.storeName}>{user?.name || 'Jan Aushadhi Dispensary'}</Text>
          <Text style={styles.storeType}>Authorized Rural Pharmacy Provider</Text>
          <View style={styles.badgeRow}>
            <Badge
              status={isVerified ? 'verified' : 'unverified'}
              label={isVerified ? 'STATE DRUG LICENSED' : 'VERIFICATION PENDING'}
            />
            <Badge status="synced" label={isOnline ? 'ONLINE' : 'OFFLINE MODE'} />
          </View>
        </Card>

        {/* Verification Status Banner */}
        <Card style={[styles.verifCard, { backgroundColor: isVerified ? '#F0FDF4' : '#FEF3C7', borderColor: isVerified ? '#BBF7D0' : '#FDE68A' }]}>
          <Text style={[styles.verifTitle, { color: isVerified ? '#166534' : '#92400E' }]}>
            {isVerified ? '✓ Verified Rural Pharmacy Provider' : '⏳ Awaiting State Drug Inspector Approval'}
          </Text>
          <Text style={[styles.verifDesc, { color: isVerified ? '#15803D' : '#78350F' }]}>
            {isVerified
              ? 'Your pharmacy is marked as a verified, real-time medicine inventory provider in the public patient finder.'
              : 'Only authenticated pharmacies with validated drug trade certificates are displayed as verified stores to patients.'}
          </Text>
        </Card>

        {/* Store Information */}
        <Card title="Dispensary Information">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Drug Trade License</Text>
            <Text style={styles.infoVal}>{user?.profileData?.licenseNumber || 'DL-AS-2024-8991'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dispensary Address</Text>
            <Text style={styles.infoVal}>{user?.village || 'Market Road'}, {user?.district || 'District'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operating Hours</Text>
            <Text style={styles.infoVal}>Mon - Sat: 8:00 AM - 9:00 PM</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pharmacist In-charge</Text>
            <Text style={styles.infoVal}>{user?.profileData?.pharmacistName || user?.name || 'Registered Pharmacist'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Helpline Mobile</Text>
            <Text style={styles.infoVal}>{user?.mobile || 'N/A'}</Text>
          </View>
        </Card>

        {/* Offline & Queue Status */}
        <Card title="Offline Inventory Ledger & Sync">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Stock Edits</Text>
            <Text style={[styles.infoVal, { color: pendingCount > 0 ? Colors.warning : Colors.success }]}>
              {pendingCount} inventory operations
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Successful Sync</Text>
            <Text style={styles.infoVal}>{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</Text>
          </View>

          <Button
            title={isSyncing ? 'Syncing...' : 'Sync Stock Updates Now'}
            variant="primary"
            size="md"
            loading={isSyncing}
            onPress={triggerSync}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Logout */}
        <Button
          title="Log Out of Pharmacy Portal"
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
  storeName: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  storeType: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2, marginBottom: Spacing.sm },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs },
  verifCard: { borderWidth: 1, marginBottom: Spacing.md },
  verifTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', marginBottom: 2 },
  verifDesc: { fontSize: Fonts.sizes.xs, lineHeight: 17 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoVal: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, textAlign: 'right', flex: 1, marginLeft: Spacing.sm },
  logoutBtn: { marginVertical: Spacing.md },
});

