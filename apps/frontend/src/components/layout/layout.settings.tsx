import {ReactNode} from "react";
import {Title} from "@gitroom/frontend/components/layout/title";
import {headers} from "next/headers";
import {ContextWrapper} from "@gitroom/frontend/components/layout/user.context";
import {NotificationComponent} from "@gitroom/frontend/components/notifications/notification.component";
import {TopMenu} from "@gitroom/frontend/components/layout/top.menu";
import {MantineWrapper} from "@gitroom/react/helpers/mantine.wrapper";

export const LayoutSettings = ({children}: {children: ReactNode}) => {
    const user = JSON.parse(headers().get('user')!);
    return (
        <ContextWrapper user={user}>
            <MantineWrapper>
                <div className="min-h-[100vh] w-full max-w-[1440px] mx-auto bg-primary px-[12px] text-white flex flex-col">
                    <div className="px-[23px] flex h-[80px] items-center justify-between z-[200] sticky top-0 bg-primary">
                        <div className="text-2xl">
                            Gitroom
                        </div>
                        <TopMenu />
                        <div>
                            <NotificationComponent />
                        </div>
                    </div>
                    <div className="flex-1 flex">
                        <div className="flex-1 rounded-3xl px-[23px] py-[17px] flex flex-col">
                            <Title />
                            <div className="flex flex-1 flex-col">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </MantineWrapper>
        </ContextWrapper>
    );
}