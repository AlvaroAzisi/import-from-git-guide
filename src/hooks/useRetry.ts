import { useState, useCallback } from 'react';

interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

interface RetryState {
  attempt: number;
  error: Error | null;
  loading: boolean;
}

export function useRetry<T>(
  operation: () => Promise<T>,
  {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  }: RetryConfig = {}
) {
  const [state, setState] = useState<RetryState>({
    attempt: 0,
    error: null,
    loading: false,
  });

  const calculateDelay = (attempt: number) => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelay);
  };

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await operation();
        setState({ attempt: 0, error: null, loading: false });
        return result;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt === maxAttempts - 1) {
          setState({
            attempt: attempt + 1,
            error: error as Error,
            loading: false,
          });
          return null;
        }

        setState(prev => ({ ...prev, attempt: attempt + 1 }));
        await new Promise(resolve => setTimeout(resolve, calculateDelay(attempt)));
      }
    }

    return null;
  }, [operation, maxAttempts, initialDelay, maxDelay, backoffFactor]);

  const reset = useCallback(() => {
    setState({ attempt: 0, error: null, loading: false });
  }, []);

  return {
    execute,
    reset,
    ...state,
  };
}
