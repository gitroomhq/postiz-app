import { useEffect, useState } from "react";

/**
 * useWaitForClass
 *
 * Watches the DOM for the presence of a CSS class and resolves when found.
 *
 * @param className - The class to wait for (without the dot, e.g. "my-element")
 * @param root - The root node to observe (defaults to document.body)
 * @returns A boolean indicating if the class is currently present
 */
export function useWaitForClass(className: string, root: HTMLElement | null = null): boolean {
  const [found, setFound] = useState(false);

  useEffect(() => {
    const target = root ?? document.body;

    if (!target) return;

    // Check immediately in case the element is already present
    if (target.querySelector(`.${className}`)) {
      setFound(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (target.querySelector(`.${className}`)) {
        setFound(true);
        observer.disconnect();
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [className, root]);

  return found;
}