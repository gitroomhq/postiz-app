import {ReactNode} from "react";
import {LeftMenu} from "@gitroom/frontend/components/layout/left.menu";
import {Title} from "@gitroom/frontend/components/layout/title";
import {headers} from "next/headers";
import {ContextWrapper} from "@gitroom/frontend/components/layout/user.context";

export const LayoutSettings = ({children}: {children: ReactNode}) => {
    const user = JSON.parse(headers().get('user')!);
    return (
        <ContextWrapper user={user}>
            <div className="min-w-[100vw] min-h-[100vh] bg-primary py-[14px] px-[12px] text-white flex">
                <div className="w-[216px] p-2 gap-10 flex flex-col">
                    <div>
                        Logo
                    </div>
                    <LeftMenu />
                </div>
                <div className="flex-1 flex">
                    <div className="bg-secondary flex-1 rounded-3xl px-[24px] py-[28px]">
                        <Title />
                        {children}
                    </div>
                </div>
            </div>
        </ContextWrapper>
    );
}