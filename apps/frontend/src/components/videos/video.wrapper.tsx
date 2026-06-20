import { FC } from 'react';

export const videosList: {identifier: string, Component: FC}[] = [];

export const videoWrapper = (identifier: string, Component: any): null => {
  if (videosList.map(p => p.identifier).includes(identifier)) {
    return null;
  }

  videosList.push({
    identifier,
    Component
  });

  return null;
}