import React from 'react';
import { createRoot } from 'react-dom/client';
import '@chaolaolo/extension/pages/options/index.css';
import Options from '@chaolaolo/extension/pages/options/Options';

function init() {
  const rootContainer = document.querySelector('#__root');
  if (!rootContainer) throw new Error("Can't find Options root element");
  const root = createRoot(rootContainer);
  root.render(<Options />);
}

init();
