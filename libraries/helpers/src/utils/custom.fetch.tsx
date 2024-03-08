"use client";

import {createContext, FC, ReactNode, useContext, useRef, useState} from "react";
import {customFetch, Params} from "./custom.fetch.func";

const FetchProvider = createContext(customFetch(
    // @ts-ignore
    {
        baseUrl: '',
        beforeRequest: () => {},
        afterRequest: () => {
            return true;
        }
    } as Params));

export const FetchWrapperComponent: FC<Params & {children: ReactNode}> = (props) => {
    const {children, ...params} = props;
    // @ts-ignore
    const fetchData = useRef(customFetch(params));
    return (
        // @ts-ignore
        <FetchProvider.Provider value={fetchData.current}>
            {children}
        </FetchProvider.Provider>
    )
}

export const useFetch = () => {
    return useContext(FetchProvider);
}