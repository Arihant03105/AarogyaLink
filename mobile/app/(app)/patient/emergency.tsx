import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Colors, Fonts, Spacing, Radii, Shadows } from '../../../src/theme';
import { Header } from '../../../components/ui/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { OfflineBanner } from '../../../components/ui/States';
import { useAuth } from '../../../src/store/AuthContext';
import { useSync } from '../../../src/store/SyncContext';

const HELPLINES = [
  { name: 'National Ambulance Service', number: '108', icon: '🚑', desc: 'Emergency response 24/7' },
  { name: 'Pregnant Women & Child Line', number: '102', icon: '🤱', desc: 'Free rural transport & care' },
  { name: 'National Emergency Number', number: '112', icon: '🚨', desc: 'All-in-one emergency dispatch' },
  { name: 'Kiran Mental Health Line', number: '18005990019', icon: '🧠', desc: 'Toll-free psychological support' },
];

export default function EmergencyScreen() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const insets = useSafeAreaInsets();

  const [locationStr, setLocationStr] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);

  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Unable to Call', `Please dial ${number} manually.`);
    });
  };

  const handleShareLocation = async () => {
    setSharingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location access is required to share your exact coordinates with emergency services.');
        setSharingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const coordStr = `Lat: ${loc.coords.latitude.toFixed(5)}, Long: ${loc.coords.longitude.toFixed(5)}`;
      setLocationStr(coordStr);
      Alert.alert('GPS Location Acquired', `Your coordinates: ${coordStr}\n\nReady to transmit to local ASHA & 108 Emergency dispatch.`);
    } catch (e) {
      Alert.alert('Location Error', 'Could not retrieve GPS coordinates. Ensure device location is turned ON.');
    } finally {
      setSharingLocation(false);
    }
  };

  const ashaName = user?.profileData?.ashaName || 'Assigned Village ASHA';
  const ashaPhone = user?.profileData?.ashaPhone || user?.emergencyPhone || '9000000002';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Emergency Care (आपातकाल)" subtitle="Immediate assistance and helpline dispatch" />
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Urgent Alert Banner */}
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Immediate Medical Emergency?</Text>
            <Text style={styles.alertSubtitle}>
              Tap the buttons below to directly dial emergency ambulance or connect with your community health worker.
            </Text>
          </View>
        </View>

        {/* Assigned ASHA Worker Contact */}
        <Card style={styles.ashaCard} title="Local ASHA Health Worker">
          <View style={styles.ashaRow}>
            <View style={styles.ashaAvatar}>
              <Text style={styles.ashaEmoji}>👩‍⚕️</Text>
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.ashaNameText}>{ashaName}</Text>
              <Text style={styles.ashaVillageText}>Covering Village: {user?.village || 'Local Panchayat'}</Text>
              <Text style={styles.ashaPhoneText}>📞 {ashaPhone}</Text>
            </View>
          </View>
          <Button
            title={`Call ASHA Worker (${ashaPhone})`}
            variant="primary"
            size="md"
            onPress={() => handleCall(ashaPhone)}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* GPS Emergency Beacon */}
        <Card title="Emergency Location Sharing">
          <Text style={styles.gpsExplanation}>
            Share your live satellite GPS location with ambulance operators and community responders. Location is shared only with your explicit consent.
          </Text>
          {locationStr && (
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Captured GPS Coordinates:</Text>
              <Text style={styles.coordText}>📍 {locationStr}</Text>
            </View>
          )}
          <Button
            title={sharingLocation ? 'Acquiring GPS...' : '📍 Capture & Transmit Location'}
            variant="outline"
            size="md"
            loading={sharingLocation}
            onPress={handleShareLocation}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        {/* Government Emergency Helplines */}
        <Text style={styles.sectionHeader}>National & State Emergency Hotlines</Text>
        {HELPLINES.map((h) => (
          <TouchableOpacity
            key={h.number}
            style={styles.helplineCard}
            onPress={() => handleCall(h.number)}
            activeOpacity={0.8}
          >
            <Text style={styles.helplineIcon}>{h.icon}</Text>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.helplineName}>{h.name}</Text>
              <Text style={styles.helplineDesc}>{h.desc}</Text>
            </View>
            <View style={styles.dialBtn}>
              <Text style={styles.dialText}>📞 {h.number}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  alertIcon: { fontSize: 32, marginRight: Spacing.sm },
  alertTitle: { fontSize: Fonts.sizes.base, fontWeight: '800', color: '#991B1B' },
  alertSubtitle: { fontSize: Fonts.sizes.xs, color: '#7F1D1D', marginTop: 2, lineHeight: 17 },
  ashaCard: { marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  ashaRow: { flexDirection: 'row', alignItems: 'center' },
  ashaAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  ashaEmoji: { fontSize: 26 },
  ashaNameText: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.darkText },
  ashaVillageText: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  ashaPhoneText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primaryDark, marginTop: 2 },
  gpsExplanation: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, lineHeight: 18, marginBottom: Spacing.xs },
  coordBox: { backgroundColor: '#F0FDF4', padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: '#BBF7D0', marginVertical: Spacing.xs },
  coordLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: '#166534' },
  coordText: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: '#15803D', marginTop: 2 },
  sectionHeader: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.darkText, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  helplineIcon: { fontSize: 28 },
  helplineName: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.darkText },
  helplineDesc: { fontSize: Fonts.sizes.xs, color: Colors.secondaryText, marginTop: 1 },
  dialBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  dialText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '800' },
});

