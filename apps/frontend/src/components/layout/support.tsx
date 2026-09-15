'use client';

import { ChatbaseComponent } from '@gitroom/frontend/components/layout/chatbase.component';
export const Support = () => {
  // Always mount: the bubble iframe can appear from a cached bot script, and
  // hide/pin must run whether or not this install currently has a bot id.
  return <ChatbaseComponent />;
};
