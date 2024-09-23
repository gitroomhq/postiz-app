'use client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

dayjs.extend(utc);
dayjs.extend(timezone);

export const IntegrationRedirectComponent = () => {
  const offset = dayjs.tz().utcOffset();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const newUrl = `${pathname}/continue?${searchParams.toString()}&timezone=${offset}`;

  useEffect(() => {
    router.push(newUrl);
  }, [newUrl]);

  return null;
};
