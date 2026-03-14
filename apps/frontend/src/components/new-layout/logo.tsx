'use client';

import Image from 'next/image';

export const Logo = () => {
  return (
    <Image
      src="/postra-icon.png"
      alt="Postra"
      width={60}
      height={60}
      priority
      className="mt-[8px] min-h-[60px] min-w-[60px] rounded-[16px]"
    />
  );
};
