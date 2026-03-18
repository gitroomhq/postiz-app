'use client';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
export const DNDProvider = ({ children }) => {
    return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
};
//# sourceMappingURL=dnd.provider.js.map