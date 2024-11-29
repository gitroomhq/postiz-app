import React, {useContext, useMemo} from 'react';
import {MarketplaceProvider} from '@gitroom/frontend/components/marketplace/marketplace.provider';
import {useUser} from '@gitroom/frontend/components/layout/user.context';

import {CreateNewOrder} from "@gitroom/frontend/components/marketplace/actions/create-new-order";
import {OrderInProgress} from "@gitroom/frontend/components/marketplace/actions/order-in-progress";


enum OrderOptions {
    CREATE_A_NEW_ORDER = 'CREATE_A_NEW_ORDER',
    IN_PROGRESS = 'IN_PROGRESS',
    WAITING_PUBLICATION = 'WAITING_PUBLICATION',
}

export const OrderTopActions = () => {
    const {message} = useContext(MarketplaceProvider);
    const user = useUser();

    const isBuyer = useMemo(() => {
        return user?.id === message?.buyerId;
    }, [user, message]);

    const myOptions: OrderOptions | undefined = useMemo(() => {
        if (
            !isBuyer &&
            (!message?.orders.length ||
                message.orders[0].status === 'COMPLETED' ||
                message.orders[0].status === 'CANCELED')
        ) {
            return OrderOptions.CREATE_A_NEW_ORDER;
        }

        if (message?.orders?.[0]?.status === 'PENDING') {
            return OrderOptions.IN_PROGRESS;
        }

        if (message?.orders?.[0]?.status === 'ACCEPTED') {
            return OrderOptions.WAITING_PUBLICATION;
        }
    }, [isBuyer, user, message]);

    if (!myOptions) {
        return null;
    }

    switch (myOptions) {
        case OrderOptions.CREATE_A_NEW_ORDER:
            return <CreateNewOrder group={message?.id!}/>;
        case OrderOptions.WAITING_PUBLICATION:
            return <OrderInProgress group={message?.id!} buyer={isBuyer} order={message?.orders[0]?.id!}/>;
    }
    return <div/>;
};
