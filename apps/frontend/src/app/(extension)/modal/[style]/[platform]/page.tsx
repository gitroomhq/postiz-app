'use client';

import { StandaloneModal } from '@gitroom/frontend/components/standalone-modal/standalone.modal';
export default async function Modal() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <div className="text-textColor h-[calc(100vh+80px)] w-[calc(100vw+80px)] -m-[40px]">
        <StandaloneModal />
      </div>
    </div>
  );
}
