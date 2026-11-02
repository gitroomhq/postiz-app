'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FC, useEffect } from 'react';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
export const IntegrationRedirectComponent: FC = () => {
  const offset = newDayjs().utcOffset();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const newUrl = `${pathname}/continue?${searchParams.toString()}&timezone=${offset}`;
  useEffect(() => {
    router.push(newUrl);
  }, [newUrl]);
  return null;
};
