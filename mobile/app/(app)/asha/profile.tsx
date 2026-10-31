import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
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
import { useI18n, LANGUAGES } from '../../../src/i18n';
import { dbAll } from '../../../src/database';

export default function AshaProfileScreen() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, lastSyncTime, triggerSync, isSyncing } = useSync();
  const { language, changeLanguage, t } = useI18n();
  const insets = useSafeAreaInsets();

  const [queueItems, setQueueItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [pendingCount, isSyncing]);

  const loadQueue = async () => {
    try {
      const rows = await dbAll('SELECT * FROM sync_queue ORDER BY local_timestamp DESC LIMIT 15');
      setQueueItems(rows || []);
    } catch (e) {
      console.log('Error reading sync queue:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of ASHA Worker portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="ASHA Worker Profile" subtitle="Community Health Worker Workspace" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadQueue(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👩‍⚕️</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Authorized ASHA'}</Text>
          <Text style={styles.userRole}>Accredited Social Health Activist (ASHA)</Text>
          <View style={styles.badgeRow}>
            <Badge status="active" label="GOVERNMENT CERTIFIED" />
            <Badge status="synced" label={isOnline ? 'ONLINE' : 'OFFLINE MODE'} />
          </View>
        </Card>

        {/* Assigned Area Info */}
        <Card title="Assigned Jurisdictional Area">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Village</Text>
            <Text style={styles.infoValue}>{user?.village || 'Panchayat Health Sub-Centre'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District / State</Text>
            <Text style={styles.infoValue}>{user?.district || 'District'}, {user?.state || 'Assam'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoValue}>{user?.mobile || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ASHA ID Token</Text>
            <Text style={styles.infoValue}>ASHA-{user?._id?.slice(-6) || '782001'}</Text>
          </View>
        </Card>

        {/* Offline & Sync Engine Card */}
        <Card title="Offline Sync Engine (Expo SQLite)">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unsynchronized Records</Text>
            <Text style={[styles.infoValue, { color: pendingCount > 0 ? Colors.warning : Colors.success }]}>
              {pendingCount} operations waiting
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Successful Cloud Sync</Text>
            <Text style={styles.infoValue}>
              {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
            </Text>
          </View>

          <Button
            title={isSyncing ? 'Synchronizing...' : 'Sync Pending Data Now'}
            variant="primary"
            size="md"
            loading={isSyncing}
            onPress={triggerSync}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Recent Sync Queue Operations */}
        <Card title={`Pending Sync Operations Queue (${queueItems.length})`}>
          {queueItems.length === 0 ? (
            <Text style={styles.noQueueText}>Sync queue is clean. All records are backed up.</Text>
          ) : (
            queueItems.map((item) => (
              <View key={item.id} style={styles.queueRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueType}>
                    {item.operation_type} ➔ {item.table_name?.toUpperCase()}
                  </Text>
                  <Text style={styles.queueDate}>
                    ID: {item.record_id?.slice(0, 14)} • {new Date(item.local_timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Badge status={item.sync_status || 'pending'} />
              </View>
            ))
          )}
        </Card>

        {/* Language Selection */}
        <Card title="App Language (भाषा / ভাষা)">
          <View style={styles.langList}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, language === l.code && styles.langChipActive]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text style={[styles.langChipText, language === l.code && styles.langChipTextActive]}>
                  {l.label}
                </Text>
                {language === l.code && <Text style={styles.langCheck}> ✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Logout */}
        <Button
          title="Log Out"
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoValue: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, textAlign: 'right', flex: 1, marginLeft: Spacing.sm },
  noQueueText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, fontStyle: 'italic', paddingVertical: 4 },
  queueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  queueType: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.darkText },
  queueDate: { fontSize: 10, color: Colors.secondaryText, marginTop: 1 },
  logoutBtn: { marginVertical: Spacing.md },
  langList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  langChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  langChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langChipText: { fontSize: 12, color: Colors.darkText, fontWeight: '600' },
  langChipTextActive: { color: Colors.white, fontWeight: '800' },
  langCheck: { color: Colors.white, fontSize: 12, fontWeight: '800' },
});

