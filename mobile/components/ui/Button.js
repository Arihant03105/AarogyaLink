import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Colors, Radii, Spacing, Fonts } from '../../src/theme';

export const Button = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const containerStyles = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyles}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { marginRight: Spacing.sm },
  text: { fontWeight: '600' },

  // Variants
  variant_primary: { backgroundColor: Colors.primary },
  variant_secondary: { backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border },
  variant_outline: { backgroundColor: Colors.transparent, borderWidth: 1.5, borderColor: Colors.primary },
  variant_ghost: { backgroundColor: Colors.transparent },
  variant_danger: { backgroundColor: Colors.error },
  variant_success: { backgroundColor: Colors.success },

  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.primary },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },
  text_danger: { color: Colors.white },
  text_success: { color: Colors.white },
  textDisabled: { color: Colors.secondaryText },

  // Sizes
  size_sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  size_md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  size_lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base },

  textSize_sm: { fontSize: Fonts.sizes.sm },
  textSize_md: { fontSize: Fonts.sizes.base },
  textSize_lg: { fontSize: Fonts.sizes.lg },
});

