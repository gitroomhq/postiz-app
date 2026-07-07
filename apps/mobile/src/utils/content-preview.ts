const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();

    if (lower.startsWith('#x')) {
      const parsed = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : match;
    }

    if (lower.startsWith('#')) {
      const parsed = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : match;
    }

    return namedEntities[lower] ?? match;
  });
}

function stripHtml(value: string) {
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\n)\s*[-*+]\s+/g, '$1')
    .replace(/(^|\n)\s*\d+\.\s+/g, '$1')
    .replace(/(^|\n)\s*>\s?/g, '$1')
    .replace(/[*_~`]+/g, '');
}

export function formatContentPreview(content?: string) {
  const formatted = stripMarkdown(decodeEntities(stripHtml(content ?? '')))
    .replace(/\s+/g, ' ')
    .trim();

  return formatted || 'Untitled post';
}
