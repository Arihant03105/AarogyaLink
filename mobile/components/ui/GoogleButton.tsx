import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import { Colors, Fonts, Spacing, Radii } from '../../src/theme';
import { useAuth } from '../../src/store/AuthContext';
import { useGoogleAuth, hasConfiguredGoogleOAuth } from '../../src/services/googleAuth';
import { useRouter } from 'expo-router';

interface GoogleButtonProps {
  mode?: 'login' | 'signup';
  defaultRole?: string;
  onSuccessRedirect?: (role: string) => void;
  style?: any;
}

const PRESET_GOOGLE_ACCOUNTS = [
  {
    role: 'patient',
    roleLabel: 'Patient',
    icon: '🤒',
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    desc: 'Access patient dashboard & health records',
  },
  {
    role: 'asha',
    roleLabel: 'ASHA Health Worker',
    icon: '👩‍⚕️',
    name: 'Manju Devi (ASHA)',
    email: 'manju.asha@gmail.com',
    desc: 'Community monitoring & patient intake',
  },
  {
    role: 'doctor',
    roleLabel: 'Doctor (MD)',
    icon: '🩺',
    name: 'Dr. Anita Sharma',
    email: 'dr.anita.sharma@gmail.com',
    desc: 'Consultations & digital prescriptions',
  },
  {
    role: 'pharmacy',
    roleLabel: 'Pharmacy Partner',
    icon: '💊',
    name: 'Kalyan Jan Aushadhi',
    email: 'kalyan.pharma@gmail.com',
    desc: 'Medicine inventory & requests',
  },
];

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  mode = 'login',
  defaultRole = 'patient',
  onSuccessRedirect,
  style,
}) => {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  const roleRoutes: Record<string, any> = {
    patient: '/(app)/patient',
    asha: '/(app)/asha',
    doctor: '/(app)/doctor',
    pharmacy: '/(app)/pharmacy',
  };

  const handleGoogleSuccess = async (googleProfile: any, chosenRole: string = defaultRole) => {
    try {
      setInternalLoading(true);
      const user = await loginWithGoogle({
        ...googleProfile,
        role: chosenRole,
      });

      setRoleModalVisible(false);

      if (onSuccessRedirect) {
        onSuccessRedirect(user.role);
      } else {
        router.replace(roleRoutes[user.role] || '/(app)/patient');
      }
    } catch (err: any) {
      Alert.alert('Google Sign-In Failed', err.message || 'Could not complete Google Sign-In.');
    } finally {
      setInternalLoading(false);
    }
  };

  const { signIn, loading: authLoading } = useGoogleAuth(async (profile) => {
    if (mode === 'signup') {
      setRoleModalVisible(true);
    } else {
      await handleGoogleSuccess(profile, defaultRole);
    }
  });

  const handlePress = async () => {
    const res = await signIn(defaultRole);
    if (res?.isSimulationNeeded) {
      setRoleModalVisible(true);
    }
  };

  const selectAccountAndProceed = async (acc: typeof PRESET_GOOGLE_ACCOUNTS[0]) => {
    await handleGoogleSuccess({
      googleId: `google_${acc.role}_${Date.now()}`,
      email: acc.email,
      name: acc.name,
      photo: null,
    }, acc.role);
  };

  const loading = internalLoading || authLoading;

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <View style={styles.content}>
            <View style={styles.googleIconBadge}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
            <Text style={styles.buttonText}>
              {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Role Selection / Google Profile Modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.googleIconBadge}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
              <Text style={styles.modalTitle}>Sign in with Google</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              Select your Google Account & Role to proceed:
            </Text>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {PRESET_GOOGLE_ACCOUNTS.map((acc) => (
                <TouchableOpacity
                  key={acc.role}
                  style={styles.accountChoice}
                  onPress={() => selectAccountAndProceed(acc)}
                >
                  <Text style={styles.accountIcon}>{acc.icon}</Text>
                  <View style={styles.accountTextContainer}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.accountName}>{acc.name}</Text>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{acc.roleLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.accountEmail}>{acc.email}</Text>
                    <Text style={styles.accountDesc}>{acc.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                {hasConfiguredGoogleOAuth
                  ? 'Connected to Google Cloud OAuth.'
                  : '💡 Dev Mode: Quick Google sign-in active. In production, add your Google Client ID to mobile/.env'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setRoleModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  googleLetter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonText: {
    color: '#1F2937',
    fontSize: Fonts.sizes.base,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '800',
    color: Colors.darkText,
  },
  modalSubtitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  accountChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: Spacing.sm,
  },
  accountIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  accountTextContainer: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.darkText,
  },
  roleTag: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  accountEmail: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  accountDesc: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  hintBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hintText: {
    fontSize: 10,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 14,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
});
