import { createContext, useContext } from 'react';
const ExistingDataContext = createContext({
    integration: '',
    group: undefined,
    posts: [],
    settings: {},
});
export const ExistingDataContextProvider = ({ children, value }) => {
    return (<ExistingDataContext.Provider value={value}>
      {children}
    </ExistingDataContext.Provider>);
};
export const useExistingData = () => useContext(ExistingDataContext);
//# sourceMappingURL=use.existing.data.js.map