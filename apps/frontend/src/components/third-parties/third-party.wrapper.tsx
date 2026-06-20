import { FC } from 'react';

export const thirdPartyList: {identifier: string, Component: FC}[] = [];

export const thirdPartyWrapper = (identifier: string, Component: any): null => {
  if (thirdPartyList.map(p => p.identifier).includes(identifier)) {
    return null;
  }

  thirdPartyList.push({
    identifier,
    Component
  });

  return null;
}