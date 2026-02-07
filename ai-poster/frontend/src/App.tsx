import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#fff',
            color: '#212529',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            padding: '12px 16px',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
}
