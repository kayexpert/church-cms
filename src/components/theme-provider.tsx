"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// We're now using an external script for theme initialization
// This is just a placeholder for compatibility

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "church-cms-theme",
  attribute = "class",
  enableSystem = true,
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  // Get initial theme from data attribute or localStorage
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      // First try to get theme from data attribute (set by the initialization script)
      const dataTheme = document.documentElement.getAttribute('data-theme') as Theme;
      if (dataTheme && (dataTheme === 'light' || dataTheme === 'dark' || dataTheme === 'system')) {
        return dataTheme;
      }

      // Then try localStorage
      const savedTheme = localStorage.getItem(storageKey) as Theme;
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        return savedTheme;
      }
    }
    return defaultTheme;
  });

  // Make sure the body is visible once the component is mounted
  useEffect(() => {
    // Ensure the theme-initialized class is added
    document.documentElement.classList.add('theme-initialized');
  }, []);

  // Add a listener for system theme changes if using system theme
  useEffect(() => {
    if (!enableSystem || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const newTheme = mediaQuery.matches ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      document.documentElement.style.colorScheme = newTheme;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, enableSystem]);

  // Apply theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;

    // Prevent transitions during theme change
    root.classList.add("no-transitions");

    // Force a reflow to ensure the class is applied
    document.body.offsetHeight;

    // Determine the actual theme to apply
    let appliedTheme = theme;
    if (theme === "system") {
      appliedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    // Apply the theme
    root.classList.remove("light", "dark");
    root.classList.add(appliedTheme);
    root.style.colorScheme = appliedTheme;

    // Update the data attribute for consistency
    root.setAttribute('data-theme', theme);

    // Update background color
    if (appliedTheme === 'dark') {
      root.style.backgroundColor = "#1a2236";
    } else {
      root.style.backgroundColor = "#ffffff";
    }

    // Re-enable transitions after a short delay
    setTimeout(() => {
      root.classList.remove("no-transitions");
    }, 50);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // Validate theme value
      if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'system') {
        console.error('Invalid theme value:', newTheme);
        return;
      }

      // Store theme in localStorage
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (e) {
        console.error('Failed to save theme to localStorage:', e);
      }

      // Update state
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
