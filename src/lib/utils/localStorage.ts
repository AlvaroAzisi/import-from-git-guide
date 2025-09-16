/**
 * localStorage utilities for persisting user preferences
 */

const STORAGE_KEYS = {
  SIDEBAR_MINIMIZED: 'kupintar_sidebar_minimized',
  THEME: 'kupintar_theme',
  LANGUAGE: 'kupintar_language',
} as const;

/**
 * Get sidebar minimized state
 */
export const getSidebarMinimized = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_MINIMIZED);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read sidebar state from localStorage:', error);
    return false;
  }
};

/**
 * Set sidebar minimized state
 */
export const setSidebarMinimized = (minimized: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_MINIMIZED, minimized.toString());
  } catch (error) {
    console.warn('Failed to save sidebar state to localStorage:', error);
  }
};

/**
 * Get theme preference
 */
export const getThemePreference = (): 'light' | 'dark' | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    return stored as 'light' | 'dark' | null;
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
    return null;
  }
};

/**
 * Set theme preference
 */
export const setThemePreference = (theme: 'light' | 'dark'): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
};

/**
 * Get language preference
 */
export const getLanguagePreference = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE);
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
    return null;
  }
};

/**
 * Set language preference
 */
export const setLanguagePreference = (lang: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
};
