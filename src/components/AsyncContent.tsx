import React from 'react';
import { LoadingError } from './LoadingError';

interface AsyncContentProps<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  loadingMessage?: string;
  children: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
}

export function AsyncContent<T>({
  data,
  isLoading,
  error,
  onRetry,
  loadingMessage,
  children,
  fallback
}: AsyncContentProps<T>) {
  if (isLoading || error) {
    return (
      <LoadingError
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingMessage={loadingMessage}
      />
    );
  }

  if (!data) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children(data)}</>;
}
