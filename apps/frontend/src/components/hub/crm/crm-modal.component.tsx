'use client';

import { FC, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export const CrmModal: FC<Props> = ({ title, onClose, children, width = 480 }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
      style={{ background: 'rgba(0,0,0,0.48)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full bg-newBgColorInner rounded-[20px] border border-newTableBorder flex flex-col"
        style={{ maxWidth: width, boxShadow: 'var(--voc-shadow-deep)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-[24px] py-[20px] border-b border-newTableBorder flex-shrink-0">
          <h2 className="text-[16px] font-[700] text-newTextColor">{title}</h2>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-newTableText hover:text-newTextColor hover:bg-newBgColor transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-[24px] py-[20px]">{children}</div>
      </div>
    </div>
  );
};
