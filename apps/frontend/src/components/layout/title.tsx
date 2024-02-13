"use client";

import {usePathname} from "next/navigation";
import {useMemo} from "react";
import {menuItems} from "@gitroom/frontend/components/layout/top.menu";

export const Title = () => {
    const path = usePathname();
    const currentTitle = useMemo(() => {
        return menuItems.find(item => item.path === path)?.name;
    }, [path]);

    return (
        <div className="flex">
            <h1 className="text-[24px] mb-5 flex-1">{currentTitle}</h1>
        </div>
    );
}