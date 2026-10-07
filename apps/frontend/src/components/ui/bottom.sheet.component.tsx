'use client';

import React, { FC, ReactNode } from 'react';
import {
  ChevronRightIcon,
  CloseIcon,
} from '@gitroom/frontend/components/ui/icons';

export const BottomSheetHeader: FC<{
  title: ReactNode;
  onClose: () => void;
}> = ({ title, onClose }) => {
  return (
    <>
      <div className="self-center w-[33px] h-[4px] mb-[8px] rounded-[2px] bg-newSep" />
      <div className="flex items-center gap-[8px] h-[60px] mb-[16px] px-[16px]">
        <div className="flex-1 text-[20px] font-[600]">{title}</div>
        <div
          onClick={onClose}
          className="w-[32px] h-[32px] flex justify-end items-center cursor-pointer text-[#A3A3A3]"
        >
          <CloseIcon />
        </div>
      </div>
    </>
  );
};

export const BottomSheetButton: FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, onClick, disabled }) => {
  return (
    <div className="px-[16px] pt-[12px]">
      <button
        disabled={disabled}
        onClick={onClick}
        className="w-full h-[44px] rounded-[8px] bg-btnPrimary text-white text-[15px] font-[600] disabled:bg-btnSimple disabled:text-textItemBlur"
      >
        {label}
      </button>
    </div>
  );
};

// slides up from the bottom of the screen, opened from the mobile layout
export const BottomSheet: FC<{
  title: string;
  onClose: () => void;
  children: ReactNode;
  // the main action under the content, like Done or Save
  button?: { label: string; onClick: () => void; disabled?: boolean };
}> = ({ title, onClose, children, button }) => {
  return (
    <div className="fixed inset-0 z-[600] flex flex-col justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-popup backdrop-blur-[8px] animate-fadeIn touch-none"
      />
      <div className="relative max-h-[90%] flex flex-col bg-newBgColorInner rounded-t-[24px] pt-[8px] pb-[24px] animate-fade">
        <BottomSheetHeader title={title} onClose={onClose} />
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-[16px] scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner">
          {children}
        </div>
        {button && <BottomSheetButton {...button} />}
      </div>
    </div>
  );
};

export const BottomSheetRow: FC<{
  icon: ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-[12px] py-[8px] cursor-pointer select-none"
    >
      <div className="text-[#A3A3A3]">{icon}</div>
      <div className="flex-1 text-[15px] font-[600]">{label}</div>
      <ChevronRightIcon size={20} className="text-[#A3A3A3] rtl:rotate-180" />
    </div>
  );
};
