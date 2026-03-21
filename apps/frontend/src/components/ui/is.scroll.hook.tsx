import { useState, useEffect } from 'react';

export function useHasScroll(
  ref: React.RefObject<HTMLElement>,
) {
  const [hasScroll, setHasScroll] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => setHasScroll(el.scrollHeight > el.clientHeight);
    check();

    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [ref]);

  return hasScroll;
}
