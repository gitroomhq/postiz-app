import {useFetch} from "@gitroom/helpers/utils/custom.fetch";
import React, { FC, useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import ReactLoading from 'react-loading';

const Prorate: FC<{
    period: 'MONTHLY' | 'YEARLY';
    pack: 'STANDARD' | 'PRO';
}> = (props) => {
    const { period, pack } = props;
    const fetch = useFetch();
    const [price, setPrice] = useState<number | false>(0);
    const [loading, setLoading] = useState(false);

    const calculatePrice = useDebouncedCallback(async () => {
        setLoading(true);
        setPrice(
            (
                await (
                    await fetch('/billing/prorate', {
                        method: 'POST',
                        body: JSON.stringify({
                            period,
                            billing: pack,
                        }),
                    })
                ).json()
            ).price
        );
        setLoading(false);
    }, 500);

    useEffect(() => {
        setPrice(false);
        calculatePrice();
    }, [period, pack]);

    if (loading) {
        return (
            <div className="pt-[12px]">
                <ReactLoading type="spin" color="#fff" width={20} height={20} />
            </div>
        );
    }

    if (price === false) {
        return null;
    }

    return (
        <div className="text-[12px] flex pt-[12px]">
            (Pay Today ${(price < 0 ? 0 : price)?.toFixed(1)})
        </div>
    );
};

export default Prorate;