import React from 'react';
export interface CardProps {
  children?: any;
  style?: any;
  title?: any;
  subtitle?: any;
  headerRight?: any;
}
export interface StatCardProps {
  icon?: any;
  label?: any;
  value?: any;
  color?: string;
  style?: any;
}
export declare const Card: React.FC<CardProps>;
export declare const StatCard: React.FC<StatCardProps>;

