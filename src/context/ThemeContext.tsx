import { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'night' | 'light' | 'ocean' | 'forest' | 'paper' | 'lavender';

const THEMES: Theme[] = ['dark', 'night', 'light', 'ocean', 'forest', 'paper', 'lavender'];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('dblab-theme');
    return THEMES.find(option => option === savedTheme) ?? 'dark';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('dblab-theme', t);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
