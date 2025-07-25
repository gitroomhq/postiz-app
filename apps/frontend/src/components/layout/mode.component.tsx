'use client';

import { useCallback, useEffect, useState } from 'react';
import useCookie from 'react-use-cookie';
const ModeComponent = () => {
  const [mode, setMode] = useCookie('mode', 'dark');

  const changeMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode]);

  useEffect(() => {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(mode);
  }, [mode]);
  return (
    <div onClick={changeMode} className="select-none cursor-pointer">
      {mode === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
        >
          <path
            d="M10.75 1V3M10.75 19V21M2.75 11H0.75M5.06412 5.31412L3.6499 3.8999M16.4359 5.31412L17.8501 3.8999M5.06412 16.69L3.6499 18.1042M16.4359 16.69L17.8501 18.1042M20.75 11H18.75M15.75 11C15.75 13.7614 13.5114 16 10.75 16C7.98858 16 5.75 13.7614 5.75 11C5.75 8.23858 7.98858 6 10.75 6C13.5114 6 15.75 8.23858 15.75 11Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M21.625 12.9011C20.2967 15.231 17.7898 16.8019 14.916 16.8019C10.6539 16.8019 7.19884 13.3468 7.19884 9.08473C7.19884 6.21071 8.76993 3.70363 11.1001 2.37549C6.20501 2.83962 2.37561 6.96182 2.37561 11.9784C2.37561 17.306 6.69447 21.6248 12.0221 21.6248C17.0384 21.6248 21.1605 17.7959 21.625 12.9011Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};
export default ModeComponent;
