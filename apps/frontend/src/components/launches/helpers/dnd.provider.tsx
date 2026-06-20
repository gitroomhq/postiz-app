'use client';

import { FC, ReactNode } from 'react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
export const DNDProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
};
