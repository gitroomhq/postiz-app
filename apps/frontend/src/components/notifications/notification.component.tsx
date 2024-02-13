"use client";

import {NotificationBell, NovuProvider, PopoverNotificationCenter} from "@novu/notification-center";
import {useUser} from "@gitroom/frontend/components/layout/user.context";

export const NotificationComponent = () => {
    const user = useUser();
    return (
        <NovuProvider
            subscriberId={user?.id}
            applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER!}
        >
            <PopoverNotificationCenter colorScheme="dark">
                {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
            </PopoverNotificationCenter>
        </NovuProvider>
    )
}