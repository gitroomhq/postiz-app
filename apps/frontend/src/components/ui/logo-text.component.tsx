import React from 'react';
import Image from 'next/image';

export const LogoTextComponent = () => {
  return (
    <Image
      src="/postra-logo.png"
      alt="Postra"
      width={132}
      height={48}
      priority
      className="h-auto w-[132px]"
    />
  );
};
