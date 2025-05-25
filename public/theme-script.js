// This script runs immediately and sets the theme before any content is rendered
(function() {
  try {
    // Get the saved theme from localStorage
    const storageKey = "church-cms-theme";
    const savedTheme = localStorage.getItem(storageKey);

    // Determine the theme to use - default to light theme
    let theme = savedTheme || 'light';

    // If system theme, check user preference
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Get the actual theme to apply (dark or light, not system)
    const appliedTheme = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;

    // Apply the theme immediately to prevent flash
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(appliedTheme);

    // Set color scheme
    document.documentElement.style.colorScheme = appliedTheme;

    // Set background color based on theme
    if (appliedTheme === 'dark') {
      document.documentElement.style.backgroundColor = '#1a2236';
    } else {
      document.documentElement.style.backgroundColor = '#ffffff';
    }

    // Store the theme in a data attribute for faster access
    document.documentElement.setAttribute('data-theme', theme);

    // Add a class to indicate theme is initialized
    document.documentElement.classList.add('theme-initialized');
  } catch (e) {
    console.error('Theme initialization error:', e);
    // Fallback to light theme if there's an error
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    document.documentElement.style.backgroundColor = '#ffffff';
    document.documentElement.classList.add('theme-initialized');
  }
})();
