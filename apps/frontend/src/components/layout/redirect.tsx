'use client';

import { FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';
export const Redirect: FC<{
  url: string;
  delay: number;
}> = (props) => {
  const { url, delay } = props;
  const router = useRouter();
  useEffect(() => {
    setTimeout(() => {
      router.push(url);
    }, delay);
  }, []);
  return null;
};
