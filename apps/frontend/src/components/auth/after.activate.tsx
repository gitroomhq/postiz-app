'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
export const AfterActivate = () => {
  const fetch = useFetch();
  const params = useParams();
  const [showLoader, setShowLoader] = useState(true);
  const run = useRef(false);
  const t = useT();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');

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
          body: JSON.stringify({
            code: params.code,
            datafast_visitor_id,
          }),
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
    <>
      {showLoader ? (
        <LoadingComponent />
      ) : (
        <div className="rounded-[16px] border border-white/8 bg-white/[0.03] p-[18px] text-textColor/78">
          This user is already activated,
          <br />
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-[#38bdf8]">
            {t(
              'click_here_to_go_back_to_login',
              'Click here to go back to login'
            )}
          </Link>
        </div>
      )}
    </>
  );
};
