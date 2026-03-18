'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export const Redirect = (props) => {
    const { url, delay } = props;
    const router = useRouter();
    useEffect(() => {
        setTimeout(() => {
            router.push(url);
        }, delay);
    }, []);
    return null;
};
//# sourceMappingURL=redirect.js.map