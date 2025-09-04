import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SidebarProvider } from './contexts/SidebarContext.tsx';
import { ThemeProvider } from './hooks/useTheme';
import { LanguageProvider } from './hooks/useLanguage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <SidebarProvider>
          <Router>
            <AuthProvider>
              <App />
            </AuthProvider>
          </Router>
        </SidebarProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
);
