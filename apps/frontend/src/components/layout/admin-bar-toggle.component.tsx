'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'voc-hide-admin-bar';

const AdminBarToggle = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === '1';
    setHidden(stored);
    document.body.classList.toggle('voc-hide-admin', stored);
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      document.body.classList.toggle('voc-hide-admin', next);
      return next;
    });
  }, []);

  return (
    <div
      onClick={toggle}
      title={hidden ? 'Mostrar barra admin' : 'Ocultar barra admin'}
      className="select-none cursor-pointer text-[11px] font-[700] px-[8px] py-[4px] rounded-[6px] border border-newTableBorder hover:text-newTextColor whitespace-nowrap"
    >
      {hidden ? 'Admin: off' : 'Admin: on'}
    </div>
  );
};

export default AdminBarToggle;
