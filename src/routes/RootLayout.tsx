import { AppLayout } from '../layouts/AppLayout';

/**
 * RootLayout - Wrapper for all protected routes
 * Uses the existing AppLayout component which includes:
 * - Sidebar navigation
 * - TopBar with search, theme, language, notifications
 * - Outlet for nested routes
 */
export const RootLayout = () => {
  return <AppLayout />;
};
