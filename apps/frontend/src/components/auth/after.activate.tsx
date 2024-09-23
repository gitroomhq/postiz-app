'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export const AfterActivate = () => {
  const fetch = useFetch();
  const params = useParams();
  const [showLoader, setShowLoader] = useState(true);
  const run = useRef(false);

  useEffect(() => {
    if (!run.current) {
      run.current = true;
      loadCode();
    }
  }, []);

  const loadCode = useCallback(async () => {
    if (params.code) {
      const { can } = await (
        await fetch(`/auth/activate`, {
          method: 'POST',
          body: JSON.stringify({ code: params.code }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ).json();

      if (!can) {
        setShowLoader(false);
      }
    }
  }, []);

  return (
    <>{showLoader ? <LoadingComponent /> : (<>This user is already activated,<br /><Link href="/auth/login" className="underline">Click here to go back to login</Link></>)}</>
  );
};
