import '@clickvote/frontend/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className={inter.className}>
        <Component {...pageProps} />
        <ToastContainer theme="dark" position="bottom-right" />
      </div>
    </>
  );
}
