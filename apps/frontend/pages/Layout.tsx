import React, { useState, useEffect } from 'react';

const Layout = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Retrieve dark mode preference from localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // Save the dark mode preference to localStorage
    localStorage.setItem('darkMode', newDarkMode ? 'true' : 'false');
  };

  return (
    <div className={`dark:bg-black dark:text-white ${darkMode ? 'dark' : ''}`}>
      {children}
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 p-2 bg-white text-black rounded-full"
      >
        {darkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
    </div>
  );
};

export default Layout;
