import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Image,
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
import { adminAPI } from '../../../src/services/api';
import { dbRun, dbAll } from '../../../src/database';

export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      if (isOnline) {
        const res = await adminAPI.getAuditLogs({ limit: 10 });
        setAuditLogs(res.data?.logs || res.data || []);
      } else {
        setAuditLogs([
          { _id: '1', action: 'PROVIDER_VERIFICATION', user: 'Admin', details: 'Dr. Anita Sharma approved', createdAt: new Date().toISOString() },
          { _id: '2', action: 'SYNC_TRANSMISSION', user: 'ASHA Manju Devi', details: 'Uploaded 4 offline visits', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { _id: '3', action: 'PRESCRIPTION_SIGNED', user: 'Dr. Debojit', details: 'Issued digital Rx for patient Ramesh', createdAt: new Date(Date.now() - 7200000).toISOString() },
        ]);
      }
    } catch (e) {
      console.log('Audit logs error:', e.message);
    } finally {
      setLoadingLogs(false);
      setRefreshing(false);
    }
  };

  const handleClearSyncedQueue = async () => {
    Alert.alert(
      'Clean Local Cache',
      'Remove completed sync records from local SQLite queue? (Pending records will be kept)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Cache',
          onPress: async () => {
            try {
              await dbRun(`DELETE FROM sync_queue WHERE sync_status = 'synced'`);
              Alert.alert('Cache Cleaned', 'Successfully purged historical completed sync logs.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to exit the Administrative Console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Settings & Audit"
        subtitle="System configurations, regulatory trails & cache"
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAuditLogs(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* App & Infrastructure Configuration */}
        <Card title="Infrastructure Configuration">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Application Version</Text>
            <Text style={styles.infoVal}>AAROGYA LINK v1.0.0 (Expo SDK 58)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Backend Gateway Endpoint</Text>
            <Text style={styles.infoVal}>{process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Offline Database</Text>
            <Text style={styles.infoVal}>Expo SQLite (aarogya_link.db)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sync Status</Text>
            <Badge status={pendingCount > 0 ? 'pending' : 'synced'} label={`${pendingCount} Pending Ops`} />
          </View>

          <Button
            title="Clean Synced Local Cache"
            variant="outline"
            size="sm"
            onPress={handleClearSyncedQueue}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Regulatory Audit Trails */}
        <Card title="Administrative & Clinical Audit Trails">
          {loadingLogs ? (
            <Text style={styles.loadingNote}>Loading audit trails...</Text>
          ) : auditLogs.length === 0 ? (
            <Text style={styles.loadingNote}>No audit trails registered yet.</Text>
          ) : (
            auditLogs.map((log, idx) => (
              <View key={log._id || idx} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logTime}>
                    {new Date(log.createdAt || Date.now()).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.logUser}>By: {log.user || 'Authorized System User'}</Text>
                <Text style={styles.logDetails}>{log.details}</Text>
              </View>
            ))
          )}
        </Card>

        {/* About Initiative */}
        <Card title="About AAROGYA LINK">
          <View style={styles.logoCenter}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.aboutText}>
            AAROGYA LINK bridges the rural diagnosis-to-care gap by providing an offline-first integrated workflow for Patients, ASHA Community Health Workers, Doctors, Pharmacies and Healthcare Administrators.
          </Text>
        </Card>

        {/* Logout */}
        <Button
          title="Log Out of Admin System"
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoVal: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, flex: 1, textAlign: 'right', marginLeft: Spacing.sm },
  loadingNote: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, fontStyle: 'italic', paddingVertical: 4 },
  logItem: { paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  logAction: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark },
  logTime: { fontSize: 10, color: Colors.secondaryText },
  logUser: { fontSize: 10, color: Colors.secondaryText, marginTop: 1 },
  logDetails: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 2 },
  aboutText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, lineHeight: 18 },
  logoCenter: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoWrapper: {
    width: 170,
    height: 78,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: '#075B41',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  logoImage: {
    width: 160,
    height: 72,
  },
  logoutBtn: { marginVertical: Spacing.md },
});

