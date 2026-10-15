import localFont from 'next/font/local';

export const jakartaSans = localFont({
  src: [
    { path: './PlusJakartaSans.woff2', weight: '500 700', style: 'normal' },
    {
      path: './PlusJakartaSans-Italic.woff2',
      weight: '500 700',
      style: 'italic',
    },
  ],
});
