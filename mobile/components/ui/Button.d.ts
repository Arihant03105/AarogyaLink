import React from 'react';
export interface ButtonProps {
  onPress?: (e?: any) => void;
  title?: any;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  loading?: boolean;
  disabled?: boolean;
  icon?: any;
  style?: any;
  textStyle?: any;
  fullWidth?: boolean;
}
export declare const Button: React.FC<ButtonProps>;

