import { ReactNode } from 'react';
import { toast } from '../../hooks/useToast';

interface NotifyOptions {
  title?: string;
  description: string;
  duration?: number;
  icon?: ReactNode;
}

export const notify = {
  success: ({ title = 'Success', description, duration = 3000 }: NotifyOptions) => {
    toast({
      title,
      description,
      duration,
      variant: 'default',
      className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    });
  },

  error: ({ title = 'Error', description, duration = 5000 }: NotifyOptions) => {
    toast({
      title,
      description,
      duration,
      variant: 'destructive',
      className: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    });
  },

  warning: ({ title = 'Warning', description, duration = 4000 }: NotifyOptions) => {
    toast({
      title,
      description,
      duration,
      variant: 'default',
      className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    });
  },

  info: ({ title = 'Info', description, duration = 3000 }: NotifyOptions) => {
    toast({
      title,
      description,
      duration,
      variant: 'default',
      className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    });
  }
};
