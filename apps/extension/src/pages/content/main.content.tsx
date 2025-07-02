import {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ProviderList } from '@gitroom/extension/providers/provider.list';
import { createPortal } from 'react-dom';
import { ActionComponent } from '@gitroom/extension/pages/content/elements/action.component';

// Define a type to track elements with their action types
interface ActionElement {
  element: HTMLElement;
  actionType: string;
}

export const MainContent: FC = () => {
  return <MainContentInner />;
};

export const MainContentInner: FC = (props) => {
  const [actionElements, setActionElements] = useState<ActionElement[]>([]);
  const actionSetRef = useRef(new Map<HTMLElement, string>());
  const provider = useMemo(() => {
    return ProviderList.find((p) => {
      return p.baseUrl.indexOf(new URL(window.location.href).hostname) > -1;
    });
  }, []);

  useEffect(() => {
    if (!provider) return;

    // Helper to scan DOM for existing matching elements
    const scanDOMForExistingMatches = () => {
      const action = { selector: provider.element, type: 'post' };
      const matches = document.querySelectorAll(action.selector);
      matches.forEach((match) => {
        const htmlMatch = match as HTMLElement;
        if (!actionSetRef.current.has(htmlMatch)) {
          actionSetRef.current.set(htmlMatch, action.type);
        }
      });

      // Update state
      const elements: ActionElement[] = [];
      actionSetRef.current.forEach((actionType, element) => {
        elements.push({ element, actionType });
      });
      setActionElements(elements);
    };

    // Initial scan before observing
    scanDOMForExistingMatches();

    const observer = new MutationObserver((mutationsList) => {
      let addedSomething = false;
      let removedSomething = false;

      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;

              const action = { selector: provider.element, type: 'post' };
              if (
                el.matches?.(action.selector) &&
                !actionSetRef.current.has(el)
              ) {
                actionSetRef.current.set(el, action.type);
                addedSomething = true;
              }

              if (el.querySelectorAll) {
                const matches = el.querySelectorAll(action.selector);
                matches.forEach((match) => {
                  const htmlMatch = match as HTMLElement;
                  if (!actionSetRef.current.has(htmlMatch)) {
                    actionSetRef.current.set(htmlMatch, action.type);
                    addedSomething = true;
                  }
                });
              }
            }
          }

          for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;

              if (actionSetRef.current.has(el)) {
                actionSetRef.current.delete(el);
                removedSomething = true;
              }

              const action = { selector: provider.element, type: 'post' };
              if (el.querySelectorAll) {
                const matches = el.querySelectorAll(action.selector);
                matches.forEach((match) => {
                  const htmlMatch = match as HTMLElement;
                  if (actionSetRef.current.has(htmlMatch)) {
                    actionSetRef.current.delete(htmlMatch);
                    removedSomething = true;
                  }
                });
              }
            }
          }
        }

        if (mutation.type === 'attributes') {
          const el = mutation.target;
          if (el instanceof HTMLElement) {
            const action = { selector: provider.element, type: 'post' };
            const matchesNow = el.matches(action.selector);
            const wasTracked = actionSetRef.current.has(el);

            if (matchesNow && !wasTracked) {
              actionSetRef.current.set(el, action.type);
              addedSomething = true;
            } else if (!matchesNow && wasTracked) {
              actionSetRef.current.delete(el);
              removedSomething = true;
            }
          }
        }
      }

      if (addedSomething || removedSomething) {
        const elements: ActionElement[] = [];
        actionSetRef.current.forEach((actionType, element) => {
          elements.push({ element, actionType });
        });
        setActionElements(elements);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
    });

    return () => observer.disconnect();
  }, []);

  return actionElements.map((actionEl, index) => (
    <Fragment key={index}>
      {createPortal(
        <ActionComponent
          target={actionEl.element}
          keyIndex={index}
          actionType={actionEl.actionType}
          provider={provider}
          wrap={true}
          selector={stringToABC(
            provider.element
              .split(',')
              .map((z) => z.trim())
              .find((p) => actionEl.element.matches(p)) || ''
          )}
        />,
        actionEl.element
      )}
    </Fragment>
  ));
};

function stringToABC(text: string, length = 8) {
  // Simple DJB2-like hash (non-cryptographic!)
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }

  hash = Math.abs(hash);

  // Convert to base-26 string using a–z
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  while (result.length < length) {
    result = alphabet[hash % 26] + result;
    hash = Math.floor(hash / 26);
  }

  return result;
}
