import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useSync } from '../../../src/store/SyncContext';
import { adminAPI } from '../../../src/services/api';

const ROLES_FILTER = ['all', 'patient', 'asha', 'doctor', 'pharmacy', 'admin'];

export default function AdminUsersScreen() {
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      if (isOnline) {
        const res = await adminAPI.listUsers();
        setUsers(res.data?.users || res.data || []);
      } else {
        setUsers([
          { _id: 'u1', name: 'Ramesh Das', role: 'patient', mobile: '9000000001', village: 'Kalyanpur', isActive: true, isVerified: true },
          { _id: 'u2', name: 'Manju Devi', role: 'asha', mobile: '9000000002', village: 'Kalyanpur', isActive: true, isVerified: true },
          { _id: 'u3', name: 'Dr. Anita Sharma', role: 'doctor', mobile: '9000000003', village: 'PHC Centre', isActive: true, isVerified: true },
          { _id: 'u4', name: 'Kalyan Jan Aushadhi', role: 'pharmacy', mobile: '9000000004', village: 'Market Road', isActive: true, isVerified: false },
          { _id: 'u5', name: 'System Administrator', role: 'admin', mobile: '9000000005', village: 'District HQ', isActive: true, isVerified: true },
        ]);
      }
    } catch (e) {
      console.log('Error loading users:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const updatedStatus = !targetUser.isActive;
    try {
      if (isOnline) {
        await adminAPI.updateUser(targetUser._id, { isActive: updatedStatus });
      }
      setUsers(users.map(u => u._id === targetUser._id ? { ...u, isActive: updatedStatus } : u));
      if (selectedUser && selectedUser._id === targetUser._id) {
        setSelectedUser({ ...selectedUser, isActive: updatedStatus });
      }
      Alert.alert('Status Updated', `User account ${updatedStatus ? 'Activated' : 'Suspended'}.`);
    } catch (e) {
      Alert.alert('Action Failed', e.message);
    }
  };

  const filtered = users.filter(u => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.mobile && u.mobile.includes(term)) ||
      (u.village && u.village.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="User & Access Directory"
        subtitle="Role-based access permissions & identity management"
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, role or mobile..."
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

      {/* Role Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ROLES_FILTER.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, filterRole === r && styles.filterChipActive]}
              onPress={() => setFilterRole(r)}
            >
              <Text style={[styles.filterChipText, filterRole === r && styles.filterChipTextActive]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadUsers(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <LoadingState message="Loading directory..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Users Found"
            subtitle="No user accounts match current search and role criteria."
          />
        ) : (
          filtered.map((u, idx) => (
            <Card key={u._id || idx} style={styles.userCard}>
              <TouchableOpacity onPress={() => setSelectedUser(u)}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userVillage}>Location: {u.village || 'N/A'}, {u.district || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge status="active" label={u.role?.toUpperCase()} />
                    <Badge
                      status={u.isActive ? 'active' : 'inactive'}
                      label={u.isActive ? 'Active' : 'Suspended'}
                    />
                  </View>
                </View>

                <View style={styles.contactRow}>
                  <Text style={styles.phoneText}>📞 {u.mobile || 'No Phone'}</Text>
                  {u.role === 'doctor' || u.role === 'pharmacy' ? (
                    <Text style={[styles.verifText, { color: u.isVerified ? Colors.success : Colors.warning }]}>
                      {u.isVerified ? '✓ Verified Provider' : '● Unverified License'}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* User Details Modal */}
      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedUser?.name}</Text>
                <Text style={styles.modalSub}>Role: {selectedUser?.role?.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text style={[styles.infoVal, { color: selectedUser?.isActive ? Colors.success : Colors.error }]}>
                {selectedUser?.isActive ? 'Active' : 'Suspended / Deactivated'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoVal}>{selectedUser?.mobile || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jurisdiction</Text>
              <Text style={styles.infoVal}>{selectedUser?.village}, {selectedUser?.district}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Authentication</Text>
              <Text style={styles.infoVal}>{selectedUser?.isVerified ? 'Verified' : 'Pending Verification'}</Text>
            </View>

            <View style={{ marginTop: Spacing.lg }}>
              <Button
                title={selectedUser?.isActive ? 'Deactivate / Suspend Account' : 'Reactivate User Account'}
                variant={selectedUser?.isActive ? 'danger' : 'success'}
                size="md"
                onPress={() => handleToggleStatus(selectedUser)}
              />
            </View>
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
  filterRow: { paddingHorizontal: Spacing.base, marginVertical: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, marginRight: Spacing.xs },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 10, fontWeight: '800', color: Colors.secondaryText },
  filterChipTextActive: { color: Colors.white },
  scroll: { padding: Spacing.base },
  userCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  userVillage: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.xs },
  phoneText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600' },
  verifText: { fontSize: Fonts.sizes.xs, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  modalTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  modalSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  closeBtn: { fontSize: 20, color: Colors.secondaryText, padding: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoVal: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText },
});

