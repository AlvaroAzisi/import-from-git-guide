import { useCallback, useState } from 'react';
import { useToast } from './useToast';

interface DataState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useDataFetching<T>() {
  const [state, setState] = useState<DataState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });
  const { toast } = useToast();

  const execute = useCallback(async (
    fetchFn: () => Promise<T>,
    {
      errorMessage = 'An error occurred',
      successMessage,
    }: {
      errorMessage?: string;
      successMessage?: string;
    } = {}
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await fetchFn();
      setState({ data: result, error: null, isLoading: false });
      
      if (successMessage) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      setState({ data: null, error: errorObj, isLoading: false });
      
      toast({
        title: 'Error',
        description: errorObj.message,
        variant: 'destructive',
      });

      return null;
    }
  }, [toast]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}