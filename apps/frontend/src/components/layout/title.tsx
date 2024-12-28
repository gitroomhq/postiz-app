"use client";

import {usePathname} from "next/navigation";
import {useMemo} from "react";
import { useMenuItems } from '@gitroom/frontend/components/layout/top.menu';
import { useTranslations } from "next-intl";

export const Title = () => {
    const path = usePathname();
    const menuItems = useMenuItems();
    const currentTitle = useMemo(() => {
        const items = menuItems.find(item => path.indexOf(item.path) > -1);
        return items?.name || 'Calendar';
    }, [path]);
    const t = useTranslations("Navigation")

    return (
        <div className="flex">
            <h1 className="text-[24px] mb-5 flex-1">{t(currentTitle)}</h1>
        </div>
    );
}
