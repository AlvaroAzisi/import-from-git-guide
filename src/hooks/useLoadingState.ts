import { useState, useCallback } from 'react';
import { useToast } from './useToast';

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export function useLoadingState(initialState: boolean = false) {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialState,
    error: null,
  });
  const { toast } = useToast();

  const startLoading = useCallback(() => {
    setState({ isLoading: true, error: null });
  }, []);

  const stopLoading = useCallback(
    (error?: Error) => {
      setState({
        isLoading: false,
        error: error || null,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return {
    ...state,
    startLoading,
    stopLoading,
  };
}
