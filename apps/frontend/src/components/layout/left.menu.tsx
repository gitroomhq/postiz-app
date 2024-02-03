"use client";

import {FC} from "react";
import Link from "next/link";
import clsx from "clsx";
import {usePathname} from "next/navigation";

export const menuItems = [
    {
        name: 'Analytics',
        icon: 'analytics',
        path: '/analytics',
    },
    {
        name: 'Schedule',
        icon: 'schedule',
        path: '/schedule',
    },
    {
        name: 'Media',
        icon: 'media',
        path: '/media',
    },
    {
        name: 'Settings',
        icon: 'settings',
        path: '/settings',
    },
    {
        name: 'Billing',
        icon: 'billing',
        path: '/billing',
    },
];

export const LeftMenu: FC = () => {
    const path = usePathname();
    return (
        <div className="flex flex-col h-full">
            <ul className="gap-5 flex flex-col flex-1">
                {menuItems.map((item, index) => (
                    <li key={item.name}>
                        <Link href={item.path} className={clsx("flex gap-2 items-center", menuItems.map(p => p.path).indexOf(path) === index && 'font-bold')}>
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
            <div>
                <a href="/auth/logout">Logout</a>
            </div>
        </div>
    );
}