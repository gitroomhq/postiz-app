/**
 * Parses a `data:` URL into a Buffer and its mime type.
 *
 * gpt-image models only return base64 image data (never a URL), so the image
 * generation flow hands `uploadSimple` a data URL instead of a remote URL.
 *
 * Returns null when the value is not a valid data URL.
 */
export function parseDataUrl(
  value: string
): { buffer: Buffer; mime: string } | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(value);
  if (!match) {
    return null;
  }

  const mime = match[1] || 'application/octet-stream';
  const isBase64 = !!match[2];
  const data = match[3];

  const buffer = isBase64
    ? Buffer.from(data, 'base64')
    : Buffer.from(decodeURIComponent(data), 'utf-8');

  return { buffer, mime };
}
