import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

export const LoadingState = ({ 
  message = 'Loading...', 
  className = '',
  size = 'md'
}: LoadingStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500 mb-2`} />
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export const LoadingOverlay = ({ message }: { message?: string }) => {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingState message={message} size="lg" />
    </div>
  );
};
