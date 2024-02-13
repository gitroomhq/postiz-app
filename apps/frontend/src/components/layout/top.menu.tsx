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
        name: 'Launches',
        icon: 'launches',
        path: '/launches',
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

export const TopMenu: FC = () => {
    const path = usePathname();
    return (
        <div className="flex flex-col h-full">
            <ul className="gap-5 flex flex-1 items-center text-[18px]">
                {menuItems.map((item, index) => (
                    <li key={item.name}>
                        <Link href={item.path} className={clsx("flex gap-2 items-center box", menuItems.map(p => p.path).indexOf(path) === index ? 'text-primary showbox' : 'text-gray')}>
                            <span>{item.name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}