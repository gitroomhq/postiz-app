'use client';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useMenuItem } from "./top.menu";
export const Title = () => {
    const path = usePathname();
    const { all: menuItems } = useMenuItem();
    const currentTitle = useMemo(() => {
        var _a;
        return (_a = menuItems.find((item) => path.indexOf(item.path) > -1)) === null || _a === void 0 ? void 0 : _a.name;
    }, [path]);
    return <h1>{currentTitle}</h1>;
};
//# sourceMappingURL=title.js.map