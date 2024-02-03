"use client";

import {usePathname} from "next/navigation";
import {useMemo} from "react";
import {menuItems} from "@gitroom/frontend/components/layout/left.menu";
import {useUser} from "@gitroom/frontend/components/layout/user.context";

export const Title = () => {
    const path = usePathname();
    const currentTitle = useMemo(() => {
        return menuItems.find(item => item.path === path)?.name;
    }, [path]);

    const user = useUser();

    return (
        <div className="flex">
            <h1 className="text-2xl mb-5 flex-1">{currentTitle}</h1>
            <div>bell</div>
            <div>{user?.email}</div>
        </div>
    );
}