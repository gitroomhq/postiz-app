import '@clickvote/frontend/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import DefaultSEO from '../components/seo/DefaultSeo';
import Head from 'next/head';
import Layout from './Layout'; // Import your Layout component
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  const [darkMode, setDarkMode] = useState(false);

  // Function to toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // Save the dark mode preference to localStorage
    localStorage.setItem('darkMode', newDarkMode ? 'true' : 'false');
  };

  // Load dark mode preference from localStorage
  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
  }, []);

  return (
    <>
      <Head>
        <meta
          name="keywords"
          content="open source, like component, upvote component, review component"
        />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <DefaultSEO />
      <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <Component {...pageProps} />
      </Layout>
      <ToastContainer theme={darkMode ? 'dark' : 'light'} position="bottom-right" />
    </>
  );
}
