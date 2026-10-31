import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { useI18n, LANGUAGES } from '../../../src/i18n';
import { authAPI } from '../../../src/services/api';

export default function PatientProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { isOnline, pendingCount, lastSyncTime, triggerSync, isSyncing } = useSync();
  const { language, changeLanguage, t } = useI18n();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile Edit fields
  const [name, setName] = useState(user?.name || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [village, setVillage] = useState(user?.village || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || user?.profileData?.bloodGroup || '');
  const [allergies, setAllergies] = useState(user?.allergies || user?.profileData?.allergies || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyPhone || user?.profileData?.emergencyPhone || '');

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updateData = {
        name,
        district,
        village,
        bloodGroup,
        allergies,
        emergencyPhone,
        profileData: {
          bloodGroup,
          allergies,
          emergencyPhone,
        },
      };

      if (isOnline) {
        await authAPI.updateProfile(updateData);
      }
      await updateUser(updateData);
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Save Failed', e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of AAROGYA LINK?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="My Profile"
        subtitle="Manage your personal & clinical account"
        rightElement={
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editBtn}>
            <Text style={styles.editText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        }
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Identity Card */}
        <Card style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Patient'}</Text>
          <Text style={styles.userRole}>Rural Healthcare Patient</Text>
          <View style={styles.badgeRow}>
            <Badge status="active" label={user?.role?.toUpperCase() || 'PATIENT'} />
            <Badge status="synced" label={isOnline ? 'ONLINE' : 'OFFLINE MODE'} />
          </View>
        </Card>

        {isEditing ? (
          <Card style={styles.editCard} title="Edit Profile Details">
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
            />
            <Input
              label="Village"
              value={village}
              onChangeText={setVillage}
              placeholder="Your village / panchayat"
            />
            <Input
              label="District"
              value={district}
              onChangeText={setDistrict}
              placeholder="District"
            />
            <Input
              label="Blood Group"
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="e.g. O+, A+, B+, AB-"
            />
            <Input
              label="Allergies (if any)"
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. Penicillin, Peanuts"
            />
            <Input
              label="Emergency Contact Phone"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
            />
            <Button
              title="Save Changes"
              variant="primary"
              loading={loading}
              onPress={handleSaveProfile}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        ) : (
          <>
            {/* Personal Details */}
            <Card title="Personal Information">
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                <Text style={styles.infoValue}>{user?.mobile || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not specified'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {user?.village || 'Village'}, {user?.district || 'District'}, {user?.state || 'India'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Group</Text>
                <Text style={styles.infoValue}>{bloodGroup || 'Not Recorded'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Known Allergies</Text>
                <Text style={styles.infoValue}>{allergies || 'None recorded'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Emergency Contact</Text>
                <Text style={styles.infoValue}>{emergencyPhone || 'Not added'}</Text>
              </View>
            </Card>

            {/* Language Selection */}
            <Card title="Preferred Language (भाषा)">
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

            {/* Offline & Synchronization Status */}
            <Card title="Offline Synchronization Status">
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Local Database</Text>
                <Text style={styles.infoValue}>Expo SQLite (Active)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pending Local Operations</Text>
                <Text style={[styles.infoValue, { color: pendingCount > 0 ? Colors.warning : Colors.success }]}>
                  {pendingCount} records
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Successful Sync</Text>
                <Text style={styles.infoValue}>
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Not yet synced'}
                </Text>
              </View>
              <Button
                title={isSyncing ? 'Syncing...' : 'Force Sync Now'}
                variant="outline"
                size="sm"
                loading={isSyncing}
                onPress={triggerSync}
                style={{ marginTop: Spacing.sm }}
              />
            </Card>

            {/* Logout Action */}
            <Button
              title="Log Out of Account"
              variant="danger"
              size="lg"
              onPress={handleLogout}
              style={styles.logoutBtn}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  editText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  profileHeaderCard: { alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.md },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarEmoji: { fontSize: 36 },
  userName: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.darkText },
  userRole: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2, marginBottom: Spacing.sm },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  infoValue: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.darkText, textAlign: 'right', flex: 1, marginLeft: Spacing.sm },
  editCard: { marginBottom: Spacing.md },
  langList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  langChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langChipText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600' },
  langChipTextActive: { color: Colors.white, fontWeight: '700' },
  langCheck: { color: Colors.white, fontWeight: '800' },
  logoutBtn: { marginVertical: Spacing.md },
});

