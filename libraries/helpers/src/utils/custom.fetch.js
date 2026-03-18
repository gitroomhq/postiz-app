'use client';
import { __rest } from "tslib";
import { createContext, useContext, useRef, } from 'react';
import { customFetch } from './custom.fetch.func';
import { useVariables } from "../../../react-shared-libraries/src/helpers/variable.context";
const FetchProvider = createContext(customFetch(
// @ts-ignore
{
    baseUrl: '',
    beforeRequest: () => { },
    afterRequest: () => {
        return true;
    },
}));
export const FetchWrapperComponent = (props) => {
    const { children } = props, params = __rest(props, ["children"]);
    const { isSecured } = useVariables();
    // @ts-ignore
    const fetchData = useRef(customFetch(params, undefined, undefined, isSecured));
    return (
    // @ts-ignore
    <FetchProvider.Provider value={fetchData.current}>
      {children}
    </FetchProvider.Provider>);
};
export const useFetch = () => {
    return useContext(FetchProvider);
};
//# sourceMappingURL=custom.fetch.js.map