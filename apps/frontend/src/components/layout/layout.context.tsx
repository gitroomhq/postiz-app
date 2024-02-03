"use client";

import {ReactNode, useCallback} from "react";
import {FetchWrapperComponent} from "@gitroom/helpers/utils/custom.fetch";

export default async function LayoutContext({children}: {children: ReactNode}) {
    const afterRequest = useCallback(async (url: string, options: RequestInit, response: Response) => {
        console.log(response?.headers.get('cookie'));
        if (response?.headers?.get('reload')) {
            window.location.reload();
        }
    }, []);

    return (
        <FetchWrapperComponent
            baseUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
            afterRequest={afterRequest}
        >
            {children}
        </FetchWrapperComponent>
    )
}