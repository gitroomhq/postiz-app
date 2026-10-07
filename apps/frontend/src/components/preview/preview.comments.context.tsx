'use client';

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface PreviewComment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  anchorStart: number | null;
  anchorEnd: number | null;
  anchorQuote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  name: string | null;
}

export interface PendingAnchor {
  postId: string;
  start: number;
  end: number;
  quote: string;
}

// Which side asked for the focus decides which side scrolls: a click on a
// highlight scrolls the card into view, a click on a card quote scrolls the
// highlight into view.
export interface ActiveThread {
  id: string;
  source: 'mark' | 'card';
}

const useComments = (previewId: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/public/posts/${previewId}/comments`)).json();
  }, [previewId]);
  return useSWR<{ comments: PreviewComment[] }>(
    `/public/posts/${previewId}/comments`,
    load
  );
};

interface PreviewCommentsContextInterface {
  previewId: string;
  postIds: string[];
  organizationId: string;
  comments: PreviewComment[];
  isLoading: boolean;
  mutate: () => Promise<any>;
  pending: PendingAnchor | null;
  setPending: (pending: PendingAnchor | null) => void;
  activeThread: ActiveThread | null;
  setActiveThread: (thread: ActiveThread | null) => void;
  hoveredThread: string | null;
  setHoveredThread: (id: string | null) => void;
}

const PreviewCommentsContext = createContext<PreviewCommentsContextInterface>(
  {} as PreviewCommentsContextInterface
);

export const PreviewCommentsProvider: FC<{
  previewId: string;
  postIds: string[];
  organizationId: string;
  children: ReactNode;
}> = ({ previewId, postIds, organizationId, children }) => {
  const { data, mutate, isLoading } = useComments(previewId);
  const [pending, setPending] = useState<PendingAnchor | null>(null);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);

  return (
    <PreviewCommentsContext.Provider
      value={{
        previewId,
        postIds,
        organizationId,
        comments: data?.comments || [],
        isLoading,
        mutate,
        pending,
        setPending,
        activeThread,
        setActiveThread,
        hoveredThread,
        setHoveredThread,
      }}
    >
      {children}
    </PreviewCommentsContext.Provider>
  );
};

export const usePreviewComments = () => useContext(PreviewCommentsContext);
