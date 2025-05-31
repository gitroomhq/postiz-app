'use client';

import { FC } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const BuyerSeller: FC = () => {
  const path = usePathname();
  const t = useT();
  const pathComputed = path === '/marketplace' ? '/marketplace/seller' : path;
  return (
    <div className="relative">
      <div className="w-[286px] h-[50px] bg-third p-[9px] flex select-none absolute -translate-y-[63px] end-0">
        <div className="bg-input flex flex-1">
          <Link
            href="/marketplace/seller"
            className={clsx(
              'flex justify-center items-center flex-1',
              pathComputed.indexOf('/marketplace/seller') > -1 &&
                'bg-forth text-white'
            )}
          >
            {t('seller', 'Seller')}
          </Link>
          <Link
            href="/marketplace/buyer"
            className={clsx(
              'flex justify-center items-center flex-1',
              pathComputed.indexOf('/marketplace/buyer') > -1 &&
                'bg-forth text-white'
            )}
          >
            {t('buyer', 'Buyer')}
          </Link>
        </div>
      </div>
    </div>
  );
};
