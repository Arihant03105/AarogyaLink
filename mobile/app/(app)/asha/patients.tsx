import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState, EmptyState, OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';
import { patientAPI } from '../../../src/services/api';
import { dbAll } from '../../../src/database';

export default function AshaPatientsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLocalPatients();
    if (isOnline) {
      fetchServerPatients();
    }
  }, []);

  const loadLocalPatients = async () => {
    try {
      const rows = await dbAll('SELECT * FROM patients ORDER BY created_at DESC');
      if (rows && rows.length > 0) {
        setPatients(rows);
      }
    } catch (e) {
      console.log('Error loading local ASHA patients:', e.message);
    }
  };

  const fetchServerPatients = async () => {
    try {
      const ashaId = user?._id || user?.id;
      const res = await patientAPI.list({ ashaId });
      const serverList = res.data?.patients || res.data || [];
      if (serverList.length > 0) {
        setPatients(serverList);
      }
    } catch (e) {
      console.log('Error fetching server patients:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const loadPatients = async () => {
    await loadLocalPatients();
    if (isOnline) {
      await fetchServerPatients();
    }
    setRefreshing(false);
  };

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.mobile && p.mobile.includes(term)) ||
      (p.village && p.village.toLowerCase().includes(term)) ||
      (p.patient_code && p.patient_code.toLowerCase().includes(term)) ||
      (p.patientCode && p.patientCode.toLowerCase().includes(term))
    );
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Village Patients"
        subtitle="Community health register & follow-ups"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(app)/asha/register-patient')}
          >
            <Text style={styles.addBtnText}>+ New Patient</Text>
          </TouchableOpacity>
        }
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, mobile, village or ID..."
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
          <LoadingState message="Loading registered patients..." />
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Patients Found"
            subtitle={searchTerm ? `No patient matches "${searchTerm}"` : "You have not registered any community patients yet."}
            action={() => router.push('/(app)/asha/register-patient')}
            actionLabel="+ Register First Patient"
          />
        ) : (
          filteredPatients.map((pat, idx) => {
            const pCode = pat.patientCode || pat.patient_code || `AAPL-PAT-${idx + 101}`;
            return (
              <Card key={pat._id || pat.id || idx} style={styles.patientCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{pat.name}</Text>
                    <Text style={styles.patientSub}>
                      {pat.age ? `${pat.age} yrs` : 'Age N/A'} • {pat.gender || 'Gender N/A'} • {pat.village || 'Local Village'}
                    </Text>
                  </View>
                  <Badge status={pat.sync_status || 'synced'} />
                </View>

                <View style={styles.idBox}>
                  <Text style={styles.idLabel}>Health Card ID:</Text>
                  <Text style={styles.idValue}>{pCode}</Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.phoneText}>📞 {pat.mobile || 'No Phone'}</Text>
                  <Text style={styles.bloodText}>Blood: {pat.blood_group || pat.bloodGroup || 'Unknown'}</Text>
                </View>

                {pat.medical_history || pat.medicalHistory ? (
                  <View style={styles.historyBox}>
                    <Text style={styles.historyLabel}>History / Risk:</Text>
                    <Text style={styles.historyText}>{pat.medical_history || pat.medicalHistory}</Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push('/(app)/asha/visits')}
                  >
                    <Text style={styles.actionBtnText}>📋 Record Visit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border }]}
                    onPress={() => router.push('/(app)/asha/referrals')}
                  >
                    <Text style={[styles.actionBtnText, { color: Colors.primaryDark }]}>🔗 Refer to Doctor</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  addBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
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
    ...Shadows.sm,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.darkText },
  clearBtn: { fontSize: 16, color: Colors.secondaryText, padding: 4 },
  scroll: { padding: Spacing.base },
  patientCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  patientSub: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 2 },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  idLabel: { fontSize: 10, color: Colors.secondaryText, marginRight: 4 },
  idValue: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  phoneText: { fontSize: Fonts.sizes.xs, color: Colors.darkText, fontWeight: '600' },
  bloodText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText },
  historyBox: { marginTop: Spacing.xs, backgroundColor: '#FFFBEB', padding: Spacing.xs + 2, borderRadius: Radii.sm },
  historyLabel: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  historyText: { fontSize: Fonts.sizes.xs, color: '#92400E', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  actionBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: Spacing.sm, borderRadius: Radii.md, alignItems: 'center' },
  actionBtnText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
});

