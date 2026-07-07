import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { uploadMediaFile } from '@/src/api/media.api';
import type { UploadedMedia } from '@/src/api/media.api';

export type LocalAsset = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  file?: File;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
]);
const allowedVideoTypes = new Set(['video/mp4']);

function extensionFromMime(mimeType: string) {
  const [, subtype] = mimeType.split('/');

  return subtype === 'jpeg' ? 'jpg' : subtype || 'jpg';
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) {
    return `${Math.round(value / (1024 * 1024 * 1024))} GB`;
  }

  return `${Math.round(value / (1024 * 1024))} MB`;
}

function validateAsset(asset: LocalAsset) {
  const mimeType = asset.mimeType.toLowerCase();
  const isImage = allowedImageTypes.has(mimeType);
  const isVideo = allowedVideoTypes.has(mimeType);

  if (!isImage && !isVideo) {
    throw new Error('Choose a supported image or MP4 video.');
  }

  if (asset.size && isImage && asset.size > MAX_IMAGE_SIZE) {
    throw new Error(`Images must be ${formatBytes(MAX_IMAGE_SIZE)} or smaller.`);
  }

  if (asset.size && isVideo && asset.size > MAX_VIDEO_SIZE) {
    throw new Error(`Videos must be ${formatBytes(MAX_VIDEO_SIZE)} or smaller.`);
  }
}

function toLocalAsset(asset: ImagePicker.ImagePickerAsset, index: number): LocalAsset {
  const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

  return {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}-${index}.${extensionFromMime(mimeType)}`,
    mimeType: mimeType.toLowerCase(),
    size: asset.fileSize ?? asset.file?.size,
    file: asset.file ?? undefined,
  };
}

export async function pickMediaFromLibrary(): Promise<LocalAsset[]> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Media library permission is required to attach media.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.9,
  });

  if (result.canceled) {
    return [];
  }

  const assets = result.assets.map(toLocalAsset);

  assets.forEach(validateAsset);

  return assets;
}

export async function uploadAsset(asset: LocalAsset): Promise<UploadedMedia> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    const file =
      asset.file ??
      new File([await (await fetch(asset.uri)).blob()], asset.name, { type: asset.mimeType });

    form.append('file', file as unknown as Blob);
  } else {
    form.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType,
    } as unknown as Blob);
  }

  return uploadMediaFile(form);
}
