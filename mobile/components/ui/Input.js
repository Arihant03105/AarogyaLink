import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, Radii, Spacing, Fonts } from '../../src/theme';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  error,
  disabled = false,
  icon,
  rightElement,
  style,
  inputStyle,
  autoCapitalize = 'sentences',
  maxLength,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        focused && styles.focused,
        error && styles.hasError,
        disabled && styles.disabled,
        multiline && styles.multilineContainer,
      ]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondaryText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.icon}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
        {rightElement && <View style={styles.icon}>{rightElement}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.white },
  hasError: { borderColor: Colors.error },
  disabled: { backgroundColor: Colors.secondary, opacity: 0.7 },
  multilineContainer: { alignItems: 'flex-start', paddingVertical: Spacing.sm },
  input: {
    flex: 1,
    fontSize: Fonts.sizes.base,
    color: Colors.darkText,
    paddingVertical: 0,
  },
  multilineInput: { textAlignVertical: 'top', paddingTop: Spacing.xs },
  icon: { marginHorizontal: Spacing.xs },
  eyeIcon: { fontSize: 18 },
  error: {
    fontSize: Fonts.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

