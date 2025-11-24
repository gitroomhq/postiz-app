'use client';

import { FC, useEffect, useState } from 'react';
import { HttpStatusCode } from 'axios';
import { useRouter } from 'next/navigation';
import { Redirect } from '@gitroom/frontend/components/layout/redirect';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';

export const ContinueIntegration: FC<{
  provider: string;
  searchParams: any;
}> = (props) => {
  const { provider, searchParams } = props;
  const { push } = useRouter();
  const t = useT();
  const fetch = useFetch();
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const timezone = String(dayjs.tz().utcOffset());
      const modifiedParams = { ...searchParams };
      if (provider === 'x') {
        Object.assign(modifiedParams, {
          state: searchParams.oauth_token || '',
          code: searchParams.oauth_verifier || '',
          refresh: searchParams.refresh || '',
        });
      }

      if (provider === 'vk') {
        Object.assign(modifiedParams, {
          ...searchParams,
          state: searchParams.state || '',
          code: searchParams.code + '&&&&' + searchParams.device_id,
        });
      }

      const data = await fetch(`/integrations/social/${provider}/connect`, {
        method: 'POST',
        body: JSON.stringify({ ...modifiedParams, timezone }),
      });

      if (data.status === HttpStatusCode.PreconditionFailed) {
        push(`/launches?precondition=true`);
        return ;
      }

      if (data.status === HttpStatusCode.NotAcceptable) {
        const { msg } = await data.json();
        push(`/launches?msg=${msg}`);
        return;
      }

      if (
        data.status !== HttpStatusCode.Ok &&
        data.status !== HttpStatusCode.Created
      ) {
        setError(true);
        return;
      }

      const { inBetweenSteps, id } = await data.json();
      if (inBetweenSteps && !searchParams.refresh) {
        push(`/launches?added=${provider}&continue=${id}`);
        return;
      }
      push(`/launches?added=${provider}&msg=Channel Updated`);
    })();
  }, [provider, searchParams]);

  return error ? (
    <>
      <div className="mt-[50px] text-[50px]">
        {t('could_not_add_provider', 'Could not add provider.')}
        <br />
        {t('you_are_being_redirected_back', 'You are being redirected back')}
      </div>
      <Redirect url="/launches" delay={3000} />
    </>
  ) : null;
};
