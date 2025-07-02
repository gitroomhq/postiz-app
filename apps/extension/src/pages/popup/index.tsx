import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@gitroom/extension/assets/styles/tailwind.css';
import Popup from '@gitroom/extension/pages/popup/Popup';

function init() {
  const rootContainer = document.querySelector('#__root');
  if (!rootContainer) throw new Error("Can't find Popup root element");
  const root = createRoot(rootContainer);
  root.render(<Popup />);
}

init();
