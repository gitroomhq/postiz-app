import React, { FC, useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const OrderList: FC<{
  type: 'seller' | 'buyer';
}> = (props) => {
  const fetch = useFetch();
  const { type } = props;
  const getOrderDetails = useCallback(async () => {
    return (await fetch(`/marketplace/orders?type=${type}`)).json();
  }, [type]);
  const { data, isLoading } = useSWR(
    `/marketplace/orders/${type}`,
    getOrderDetails
  );
  const t = useT();

  const biggerRow = useMemo(() => {
    return data?.orders?.reduce((all: any, current: any) => {
      if (current.details.length > all) return current.details.length;
      return all;
    }, 0);
  }, [data]);
  if (isLoading || !data?.orders?.length) return <></>;
  return (
    <div className="bg-sixth p-[24px] flex flex-col gap-[24px] border border-customColor6 rounded-[4px]">
      <h3 className="text-[24px]">{t('orders', 'Orders')}</h3>
      <div className="pt-[20px] px-[24px] border border-customColor6 flex">
        <table className="w-full">
          <tr>
            <td colSpan={biggerRow + 1} className="pb-[20px]">
              {type === 'seller' ? 'Buyer' : 'Seller'}
            </td>
            <td className="pb-[20px]">{t('price', 'Price')}</td>
            <td className="pb-[20px]">{t('state', 'State')}</td>
          </tr>
          {data.orders.map((order: any) => (
            <tr key={order.id}>
              <td className="pb-[20px]">{order.name}</td>
              {order.details.map((details: any, index: number) => (
                <td
                  className="pb-[20px]"
                  key={details.id}
                  {...(index === order.details.length - 1
                    ? {
                        colSpan: biggerRow - order.details.length + 1,
                      }
                    : {})}
                >
                  <div className="flex gap-[20px] items-center">
                    <div className="relative">
                      <img
                        src={details.integration.picture}
                        alt="platform"
                        className="w-[24px] h-[24px] rounded-full"
                      />
                      <img
                        className="absolute start-[15px] top-[15px] w-[15px] h-[15px] rounded-full"
                        src={`/icons/platforms/${details.integration.providerIdentifier}.png`}
                        alt={details.integration.name}
                      />
                    </div>
                    <div>
                      {details.integration.name} ({details.total}/
                      {details.submitted})
                    </div>
                  </div>
                </td>
              ))}
              <td className="pb-[20px]">{order.price}</td>
              <td className="pb-[20px]">{order.status}</td>
            </tr>
          ))}
        </table>
      </div>
    </div>
  );
};
