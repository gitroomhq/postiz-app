'use client';

import {
  FC,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  PendingAnchor,
  usePreviewComments,
} from '@gitroom/frontend/components/preview/preview.comments.context';

interface HighlightRange {
  id: string;
  start: number;
  end: number;
}

// The btnPrimary token has no alpha channel, so the tints are mixed in CSS.
const MARK_CLASS = [
  'bg-[color-mix(in_srgb,var(--new-btn-primary)_25%,transparent)]',
  'bg-[color-mix(in_srgb,var(--new-btn-primary)_45%,transparent)]',
  'bg-[color-mix(in_srgb,var(--new-btn-primary)_65%,transparent)]',
];

const markClassName = (count: number, pending: boolean) =>
  clsx(
    'text-inherit rounded-[2px]',
    pending
      ? 'bg-[color-mix(in_srgb,var(--new-btn-primary)_40%,transparent)] underline decoration-btnPrimary decoration-2'
      : [MARK_CLASS[Math.min(count, MARK_CLASS.length) - 1], 'cursor-pointer']
  );

// Offsets are into the plain text of the rendered item, so a range from the
// start of the container to (node, offset) measures exactly that.
const textOffset = (root: HTMLElement, node: Node, offset: number) => {
  const range = document.createRange();
  range.setStart(root, 0);
  range.setEnd(node, offset);
  return range.toString().length;
};

const clearHighlights = (root: HTMLElement) => {
  root.querySelectorAll('mark[data-preview-mark]').forEach((mark) => {
    const parent = mark.parentNode!;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  root.normalize();
};

// Split the text nodes at every range boundary, then wrap each piece once
// with a mark that lists every thread covering it.
const applyHighlights = (
  root: HTMLElement,
  ranges: HighlightRange[],
  pending: PendingAnchor | null
) => {
  clearHighlights(root);

  const all = [
    ...ranges,
    ...(pending ? [{ id: '', start: pending.start, end: pending.end }] : []),
  ];
  if (!all.length) {
    return;
  }

  const boundaries = Array.from(
    new Set(all.flatMap((r) => [r.start, r.end]))
  ).sort((a, b) => a - b);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let next: Node | null;
  while ((next = walker.nextNode())) {
    textNodes.push(next as Text);
  }

  const segments: { node: Text; start: number; end: number }[] = [];
  let offset = 0;
  for (const node of textNodes) {
    const length = node.length;
    let current = node;
    let currentStart = offset;
    for (const boundary of boundaries) {
      if (boundary <= currentStart || boundary >= offset + length) {
        continue;
      }
      const rest = current.splitText(boundary - currentStart);
      segments.push({ node: current, start: currentStart, end: boundary });
      current = rest;
      currentStart = boundary;
    }
    segments.push({ node: current, start: currentStart, end: offset + length });
    offset += length;
  }

  for (const segment of segments) {
    if (segment.end <= segment.start) {
      continue;
    }
    const covering = all.filter(
      (r) => r.start <= segment.start && r.end >= segment.end
    );
    if (!covering.length) {
      continue;
    }
    const ids = covering.map((c) => c.id).filter(Boolean);
    const isPending = covering.some((c) => !c.id);
    const mark = document.createElement('mark');
    mark.setAttribute('data-preview-mark', '');
    if (ids.length) {
      mark.setAttribute('data-thread-ids', ids.join(','));
    }
    mark.className = markClassName(ids.length, isPending && !ids.length);
    segment.node.parentNode!.insertBefore(mark, segment.node);
    mark.appendChild(segment.node);
  }
};

const marksOf = (root: HTMLElement, id: string) =>
  Array.from(
    root.querySelectorAll<HTMLElement>('mark[data-thread-ids]')
  ).filter((mark) => mark.dataset.threadIds!.split(',').includes(id));

export const PostContentClient: FC<{ postId: string; html: string }> = ({
  postId,
  html,
}) => {
  const t = useT();
  const {
    comments,
    pending,
    setPending,
    activeThread,
    setActiveThread,
    hoveredThread,
    setHoveredThread,
  } = usePreviewComments();
  const ref = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<
    (PendingAnchor & { top: number; left: number }) | null
  >(null);
  // Follows the mouse over the text so nobody has to guess that selecting
  // it opens a comment.
  const [hint, setHint] = useState<{
    top: number;
    left: number;
    onMark: boolean;
  } | null>(null);

  const ranges = useMemo<HighlightRange[]>(
    () =>
      comments
        .filter(
          (c) =>
            c.postId === postId &&
            !c.parentId &&
            !c.resolvedAt &&
            c.anchorStart !== null &&
            c.anchorEnd !== null
        )
        .map((c) => ({ id: c.id, start: c.anchorStart!, end: c.anchorEnd! })),
    [comments, postId]
  );

  const ownPending = pending?.postId === postId ? pending : null;

  useEffect(() => {
    if (ref.current) {
      applyHighlights(ref.current, ranges, ownPending);
    }
  }, [ranges, ownPending, html]);

  useEffect(() => {
    ref.current
      ?.querySelectorAll<HTMLElement>('mark[data-thread-ids]')
      .forEach((mark) => {
        const ids = mark.dataset.threadIds!.split(',');
        mark.classList.toggle(
          'ring-1',
          ids.includes(hoveredThread!) || ids.includes(activeThread?.id!)
        );
        mark.classList.toggle(
          'ring-btnPrimary',
          ids.includes(hoveredThread!) || ids.includes(activeThread?.id!)
        );
      });
  }, [hoveredThread, activeThread, ranges, ownPending]);

  useEffect(() => {
    if (!ref.current || activeThread?.source !== 'card') {
      return;
    }
    const [mark] = marksOf(ref.current, activeThread.id);
    if (!mark) {
      return;
    }
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mark.classList.add('animate-pulse');
    const timer = setTimeout(
      () => mark.classList.remove('animate-pulse'),
      1500
    );
    return () => clearTimeout(timer);
  }, [activeThread]);

  useEffect(() => {
    const onSelectionChange = () => {
      const current = window.getSelection();
      if (!current || current.isCollapsed) {
        setSelection(null);
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const onMouseUp = useCallback(() => {
    const root = ref.current;
    const current = window.getSelection();
    if (!root || !current || current.isCollapsed || !current.rangeCount) {
      setSelection(null);
      return;
    }
    const selected = current.getRangeAt(0);
    if (!selected.intersectsNode(root)) {
      setSelection(null);
      return;
    }
    // A triple-click ends the selection just past the item; clamp to the item,
    // but only when nothing visible lies outside it.
    const range = selected.cloneRange();
    if (!root.contains(range.startContainer)) {
      range.setStart(root, 0);
    }
    if (!root.contains(range.endContainer)) {
      range.setEnd(root, root.childNodes.length);
    }
    if (selected.toString().trim() !== range.toString().trim()) {
      setSelection(null);
      return;
    }
    const start = textOffset(root, range.startContainer, range.startOffset);
    const end = textOffset(root, range.endContainer, range.endOffset);
    const quote = (root.textContent || '').slice(start, end);
    if (end <= start || !quote.trim() || quote.length > 500) {
      setSelection(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    setSelection({
      postId,
      start,
      end,
      quote,
      top: rect.bottom - rootRect.top + 6,
      left: Math.max(0, rect.right - rootRect.left - 90),
    });
  }, [postId]);

  const startComment = useCallback(() => {
    if (!selection) {
      return;
    }
    const { top, left, ...anchor } = selection;
    setPending(anchor);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setActiveThread(null);
  }, [selection, setPending, setActiveThread]);

  const threadOf = (e: MouseEvent<HTMLDivElement>) =>
    (e.target as HTMLElement)
      .closest<HTMLElement>('mark[data-thread-ids]')
      ?.dataset.threadIds?.split(',')[0] || null;

  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const root = ref.current;
    // While dragging a selection the "Comment" button takes over afterwards.
    if (!root || e.buttons) {
      setHint(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    setHint({
      top: e.clientY - rootRect.top + 22,
      left: Math.max(
        0,
        Math.min(e.clientX - rootRect.left + 14, rootRect.width - 190)
      ),
      onMark: !!threadOf(e),
    });
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="text-[14px] whitespace-pre-wrap leading-[22px] preview-comment-cursor"
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHint(null)}
        onMouseOver={(e) => setHoveredThread(threadOf(e))}
        onMouseOut={() => setHoveredThread(null)}
        onClick={(e) => {
          const id = threadOf(e);
          if (id) {
            setActiveThread({ id, source: 'mark' });
          }
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!!hint && !selection && !ownPending && (
        <div
          style={{ top: hint.top, left: hint.left }}
          className="absolute z-[10] pointer-events-none bg-newBgColorInner border border-newTableBorder text-newTextColor text-[12px] rounded-[6px] px-[8px] h-[24px] flex items-center gap-[6px] shadow-lg whitespace-nowrap"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-btnPrimary"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {hint.onMark
            ? t('preview_click_to_open_comment', 'Click to open the comment')
            : t('preview_select_text_to_comment', 'Select text to comment')}
        </div>
      )}
      {!!selection && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startComment}
          style={{ top: selection.top, left: selection.left }}
          className="absolute z-[10] bg-btnPrimary text-white text-[12px] font-[500] rounded-[6px] px-[10px] h-[28px] flex items-center gap-[6px] shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {t('comment', 'Comment')}
        </button>
      )}
    </div>
  );
};
