import React from 'react';
export interface LoadingStateProps {
  message?: string;
}
export interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
}
export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}
export interface OfflineBannerProps {
  pendingCount?: number;
}
export declare const LoadingState: React.FC<LoadingStateProps>;
export declare const EmptyState: React.FC<EmptyStateProps>;
export declare const ErrorState: React.FC<ErrorStateProps>;
export declare const OfflineBanner: React.FC<OfflineBannerProps>;

