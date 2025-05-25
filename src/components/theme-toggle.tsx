"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only show the toggle after hydration to avoid flash
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the current theme for the toggle
  const currentTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const toggleTheme = () => {
    // Get the current applied theme
    const currentAppliedTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    // Toggle to the opposite theme
    const newTheme = currentAppliedTheme === 'dark' ? 'light' : 'dark';

    // Disable transitions before theme change
    document.documentElement.classList.add('no-transitions');

    // Apply the new theme immediately for visual feedback
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    document.documentElement.style.backgroundColor = newTheme === 'dark' ? '#1a2236' : '#ffffff';

    // Update localStorage and state
    try {
      localStorage.setItem('church-cms-theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }

    // Update the theme state
    setTheme(newTheme);

    // Re-enable transitions after a short delay
    setTimeout(() => {
      document.documentElement.classList.remove('no-transitions');
    }, 50);
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <div className="h-12 w-12" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-12 w-12 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 shadow-sm hover:shadow"
      aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <Sun className="h-7 w-7 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-7 w-7 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
