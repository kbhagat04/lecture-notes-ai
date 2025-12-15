import React from 'react';

type Props = {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
};

const ThemeToggle: React.FC<Props> = ({ theme, setTheme }) => {
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="theme-toggle">
      <button
        className="theme-toggle-btn"
        aria-pressed={theme === 'dark'}
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? (
          <svg className="theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
          </svg>
        ) : (
          <svg className="theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4.5v-2M12 21.5v-2M4.5 12h-2M21.5 12h-2M5.64 5.64l-1.4-1.4M19.76 19.76l-1.4-1.4M5.64 18.36l-1.4 1.4M19.76 4.24l-1.4 1.4M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ThemeToggle;
