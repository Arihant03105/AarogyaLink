import React from 'react';
export interface InputProps {
  label?: any;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
  error?: any;
  disabled?: boolean;
  icon?: any;
  rightElement?: any;
  style?: any;
  inputStyle?: any;
  autoCapitalize?: any;
  maxLength?: number;
}
export declare const Input: React.FC<InputProps>;

