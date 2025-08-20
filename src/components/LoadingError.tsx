import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LoadingErrorProps {
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  loadingMessage?: string;
}

export function LoadingError({
  isLoading,
  error,
  onRetry,
  loadingMessage = 'Loading...',
}: LoadingErrorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto p-6 space-y-4 my-8">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Error</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300">{error.message}</p>
        {onRetry && (
          <div className="flex justify-end">
            <Button onClick={onRetry} variant="default">
              Try Again
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return null;
}
