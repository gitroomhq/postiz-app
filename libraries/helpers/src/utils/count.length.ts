// @ts-ignore
import twitter from 'twitter-text';

const normalizeBlueskyUrls = (text: string): string => {
  return text.replace(/https?:\/\/\S+/g, (match) =>
    match.length > 23 ? '0'.repeat(23) : match
  );
};


export const textSlicer = (
  integrationType: string,
  end: number,
  text: string
): { start: number; end: number } => {
  if (integrationType === 'bluesky') {
    const normalized = normalizeBlueskyUrls(text);
    const diff = text.length - normalized.length;
    return {
      start: 0,
      end: end + diff,
    };
  }

  if (integrationType !== 'x') {
    return {
      start: 0,
      end,
    };
  }

  const { validRangeEnd, valid } = twitter.parseTweet(text, {
    version: 3,
    maxWeightedTweetLength: end,
    scale: 100,
    defaultWeight: 200,
    emojiParsingEnabled: true,
    transformedURLLength: 23,
    ranges: [
      { start: 0, end: 4351, weight: 100 },
      { start: 8192, end: 8205, weight: 100 },
      { start: 8208, end: 8223, weight: 100 },
      { start: 8242, end: 8247, weight: 100 },
    ],
  });

  return {
    start: 0,
    end: valid ? end : validRangeEnd,
  };
};

export const weightedLength = (text: string): number => {
  return twitter.parseTweet(text).weightedLength;
};