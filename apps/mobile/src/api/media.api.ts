import { apiFetch } from '@/src/api/client';

export type UploadedMedia = {
  id: string;
  name?: string;
  originalName?: string;
  path: string;
  thumbnail?: string;
  alt?: string;
  thumbnailTimestamp?: number | null;
};

export type MediaLibraryResponse = {
  pages: number;
  results: UploadedMedia[];
};

function toQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

export function uploadMediaFile(form: FormData) {
  return apiFetch<UploadedMedia>('/media/upload-simple', {
    method: 'POST',
    body: form,
  });
}

export function getMediaLibrary(page = 1, search?: string) {
  return apiFetch<MediaLibraryResponse>(`/media?${toQuery({ page, search })}`, {
    method: 'GET',
  });
}

export function deleteMedia(id: string) {
  return apiFetch<unknown>(`/media/${id}`, {
    method: 'DELETE',
  });
}

export function saveMediaInformation(
  payload: Pick<UploadedMedia, 'alt' | 'id' | 'thumbnail' | 'thumbnailTimestamp'>
) {
  return apiFetch<UploadedMedia>('/media/information', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
