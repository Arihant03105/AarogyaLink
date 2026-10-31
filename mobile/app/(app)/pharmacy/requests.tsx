import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
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

export default function PharmacyRequestsScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    // Demonstration requests representing patient drug inquiries from village app
    setTimeout(() => {
      setRequests([
        {
          id: 'REQ-101',
          patientName: 'Sunita Roy (ASHA referral)',
          village: 'Kalyanpur GP',
          medicineName: 'Azithromycin 500mg (3 tablets)',
          date: 'Today, 10:15 AM',
          status: 'pending',
          urgency: 'high',
        },
        {
          id: 'REQ-102',
          patientName: 'Bipul Bora',
          village: 'Morigaon Ward 4',
          medicineName: 'Metformin 500mg SR',
          date: 'Yesterday',
          status: 'available',
          priceQuoted: 28.0,
          urgency: 'normal',
        },
        {
          id: 'REQ-103',
          patientName: 'Abdul Karim',
          village: 'Sub-Centre East',
          medicineName: 'Oral Rehydration Salts (ORS) x 5 packets',
          date: '28 Oct 2026',
          status: 'completed',
          priceQuoted: 19.5,
          urgency: 'normal',
        },
      ]);
      setLoading(false);
      setRefreshing(false);
    }, 400);
  };

  const handleRespond = (reqItem, isAvail) => {
    const updated = requests.map(r => {
      if (r.id === reqItem.id) {
        return {
          ...r,
          status: isAvail ? 'available' : 'out_of_stock',
          priceQuoted: isAvail ? 35.0 : null,
        };
      }
      return r;
    });
    setRequests(updated);
    Alert.alert(
      'Response Sent',
      isAvail
        ? `Marked ${reqItem.medicineName} as AVAILABLE at your listed price.`
        : `Marked as OUT OF STOCK. Patient advised to check nearby Jan Aushadhi Kendra.`
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Patient Drug Requests"
        subtitle="Inbound stock queries from nearby villages & ASHA staff"
      />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRequests(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>📡 Rural Medicine Dispatch Network</Text>
          <Text style={styles.infoDesc}>
            Village health workers and patients query this hub for emergency stocks of anti-microbials, ORS, maternal supplements and chronic care medicines.
          </Text>
        </Card>

        {loading ? (
          <LoadingState message="Loading inquiries..." />
        ) : requests.length === 0 ? (
          <EmptyState
            icon="📩"
            title="No Inquiries"
            subtitle="There are no pending drug requests from your catchment zone."
          />
        ) : (
          requests.map((req) => (
            <Card key={req.id} style={styles.reqCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patName}>{req.patientName}</Text>
                  <Text style={styles.villageText}>Location: {req.village} • {req.date}</Text>
                </View>
                <Badge status={req.status} />
              </View>

              <View style={styles.medicineBox}>
                <Text style={styles.medLabel}>Requested Medicine:</Text>
                <Text style={styles.medName}>💊 {req.medicineName}</Text>
              </View>

              {req.status === 'pending' ? (
                <View style={styles.actionRow}>
                  <Button
                    title="✓ In Stock (Confirm)"
                    variant="primary"
                    size="sm"
                    onPress={() => handleRespond(req, true)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="✕ Out of Stock"
                    variant="outline"
                    size="sm"
                    onPress={() => handleRespond(req, false)}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <View style={styles.responseBanner}>
                  <Text style={styles.responseText}>
                    {req.status === 'available'
                      ? `✓ Confirmed in stock. Quoted price: ₹${req.priceQuoted?.toFixed(2)}`
                      : '● Notified patient of stock unavailability.'}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  infoCard: { backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  infoTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primaryDark },
  infoDesc: { fontSize: Fonts.sizes.xs, color: Colors.darkText, marginTop: 2, lineHeight: 17 },
  reqCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patName: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  villageText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  medicineBox: { backgroundColor: Colors.inputBg, padding: Spacing.sm, borderRadius: Radii.sm, marginVertical: Spacing.sm },
  medLabel: { fontSize: 10, fontWeight: '700', color: Colors.secondaryText },
  medName: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primaryDark, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.divider },
  responseBanner: { backgroundColor: '#F0FDF4', padding: Spacing.xs + 2, borderRadius: Radii.sm, marginTop: Spacing.xs },
  responseText: { fontSize: Fonts.sizes.xs, color: '#166534', fontWeight: '700' },
});

