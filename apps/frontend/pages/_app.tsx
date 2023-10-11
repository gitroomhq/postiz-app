import '@clickvote/frontend/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import DefaultSEO from '../components/seo/DefaultSeo';
import Head from 'next/head';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
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
      <div className={inter.className}>
        <Component {...pageProps} />
        <ToastContainer theme="dark" position="bottom-right" />
      </div>
    </>
  );
}
