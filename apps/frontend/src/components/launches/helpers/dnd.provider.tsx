'use client';

import { FC, ReactNode } from 'react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

const DRAG_HANDLERS = [
  'handleTopDragStart',
  'handleTopDragStartCapture',
  'handleTopDragEndCapture',
  'handleTopDragEnter',
  'handleTopDragEnterCapture',
  'handleTopDragLeaveCapture',
  'handleTopDragOver',
  'handleTopDragOverCapture',
  'handleTopDrop',
  'handleTopDropCapture',
];

// the path is kept from the start of the dispatch, the editor can re-render
// the target out of the page before the event bubbles up to the window
const isInsideEditor = (event: Event) =>
  event
    .composedPath()
    .some((node) => (node as HTMLElement).isContentEditable);

// the backend listens to every drag on the window and cancels the native drops
// it doesn't own, so dragging text or pictures inside the post editor did nothing
const CalendarBackend: typeof HTML5Backend = (manager, context, options) => {
  const backend = HTML5Backend(manager, context, options) as any;
  for (const name of DRAG_HANDLERS) {
    const handler = backend[name];
    if (typeof handler !== 'function') {
      continue;
    }

    backend[name] = (event: DragEvent) => {
      if (!isInsideEditor(event)) {
        handler(event);
      }
    };
  }

  return backend;
};

// without a context react-dnd keeps the manager in a global it clears from an
// effect cleanup, a remount of the calendar in the same tick then builds a
// second manager while the first still owns the window listeners and the
// backend throws "Cannot have two HTML5 backends at the same time" (CLOUD-252)
const dndContext = typeof window === 'undefined' ? undefined : window;

export const DNDProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <DndProvider backend={CalendarBackend} context={dndContext}>
      {children}
    </DndProvider>
  );
};
