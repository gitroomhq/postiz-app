"use client";

import {ReactNode, useCallback} from "react";
import {FetchWrapperComponent} from "@gitroom/helpers/utils/custom.fetch";

export default async function LayoutContext(params: {children: ReactNode}) {
    if (params?.children) {
        // eslint-disable-next-line react/no-children-prop
        return <LayoutContextInner children={params.children} />
    }

    return <></>
}
function LayoutContextInner(params: {children: ReactNode}) {
    const afterRequest = useCallback(async (url: string, options: RequestInit, response: Response) => {
        if (response?.headers?.get('reload')) {
            window.location.reload();
        }
    }, []);

    return (
        <FetchWrapperComponent
            baseUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
            afterRequest={afterRequest}
        >

            {params?.children || <></>}
        </FetchWrapperComponent>
    )
}