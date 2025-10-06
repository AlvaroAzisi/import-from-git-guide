import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'standard' | 'wide' | 'full';
  className?: string;
}

/**
 * PageLayout - Centralized responsive layout wrapper
 * 
 * Provides consistent padding and max-width across all pages
 * Adapts to screen sizes from 1366×768 to 4K ultrawide
 */
export const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  maxWidth = 'standard',
  className = '' 
}) => {
  const maxWidthClasses = {
    standard: 'max-w-[1600px]',
    wide: 'max-w-screen-2xl',
    full: 'max-w-full'
  };

  return (
    <div className={`
      ${maxWidthClasses[maxWidth]} 
      mx-auto 
      px-4 
      md:px-6 
      lg:px-8 
      2xl:px-12
      3xl:px-16
      4xl:px-24
      py-6
      md:py-8
      lg:py-10
      2xl:py-12
      ${className}
    `}>
      {children}
    </div>
  );
};
