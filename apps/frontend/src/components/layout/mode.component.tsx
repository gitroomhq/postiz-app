'use client';
import { useCallback, useEffect, useState } from 'react';

import { ReactComponent as MoonSvg } from '@gitroom/frontend/assets/moon.svg';
import { ReactComponent as SunSvg } from '@gitroom/frontend/assets/sun.svg';

const ModeComponent = () => {
  const [mode, setMode] = useState(localStorage.getItem('mode') || 'dark');

  const changeMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
    localStorage.setItem('mode', mode === 'dark' ? 'light' : 'dark');
  }, [mode]);

  useEffect(() => {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(mode);
  }, [mode]);

  return (
    <div onClick={changeMode} className="select-none cursor-pointer">
      {mode === 'dark' ? <MoonSvg /> : <SunSvg />}
    </div>
  );
};

export default ModeComponent;
