import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';

export const PurchaseCrypto: FC = () => {
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const data = await (await fetch('/billing/crypto')).json();
    window.location.href = data.invoice_url;
  }, []);

  return (
    <div
      className="flex-1 bg-sixth items-center border border-customColor6 rounded-[4px] p-[24px] gap-[16px] flex [@media(max-width:1024px)]:items-center"
    >
      <div>Purchase a Life-time PRO account with SOL ($199)</div>
      <div>
        <Button loading={loading} onClick={load}>Purchase now</Button>
      </div>
    </div>
  );
};
