'use client';

import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type SettingsTabChromePatch = { title?: string; desc?: string };

const SettingsTabChromeContext = createContext<{
  inEditor: boolean;
  chromePatch: SettingsTabChromePatch | null;
  setInEditor: (value: boolean) => void;
  setChromePatch: (patch: SettingsTabChromePatch | null) => void;
} | null>(null);

export const SettingsTabChromeProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [inEditor, setInEditor] = useState(false);
  const [chromePatch, setChromePatch] = useState<SettingsTabChromePatch | null>(
    null
  );
  const value = useMemo(
    () => ({ inEditor, setInEditor, setChromePatch, chromePatch }),
    [inEditor, chromePatch]
  );
  return (
    <SettingsTabChromeContext.Provider value={value}>
      {children}
    </SettingsTabChromeContext.Provider>
  );
};

/** No-op outside the settings sheet (e.g. composer signature picker). */
export const useSettingsTabChrome = () => {
  const ctx = useContext(SettingsTabChromeContext);
  return (
    ctx ?? {
      inEditor: false,
      chromePatch: null,
      setInEditor: () => {},
      setChromePatch: () => {},
    }
  );
};
