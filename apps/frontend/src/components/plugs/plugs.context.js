'use client';
import { createContext, useContext } from 'react';
export const PlugsContext = createContext({
    providerId: '',
    name: '',
    identifier: '',
    plugs: [
        {
            title: '',
            description: '',
            runEveryMilliseconds: 0,
            methodName: '',
            fields: [
                {
                    name: '',
                    type: '',
                    placeholder: '',
                    description: '',
                    validation: '',
                },
            ],
        },
    ],
});
export const usePlugs = () => useContext(PlugsContext);
//# sourceMappingURL=plugs.context.js.map