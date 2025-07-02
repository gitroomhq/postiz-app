import { createRoot } from 'react-dom/client';
import './style.css';
import { MainContent } from '@gitroom/extension/pages/content/main.content';
const div = document.createElement('div');
div.id = '__root';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(<MainContent />);
