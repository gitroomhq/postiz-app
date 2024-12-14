// @ts-ignore
import twitter from 'twitter-text';

export const textSlicer = (
  integrationType: string,
  end: number,
  text: string
): {start: number, end: number} => {
  if (integrationType !== 'x') {
    return {
      start: 0,
      end
    }
  }

  const {validRangeEnd, valid} = twitter.parseTweet(text);
  return {
    start: 0,
    end: valid ? end : validRangeEnd
  }
};

export const weightedLength = (text: string): number => {
  return twitter.parseTweet(text).weightedLength;
}
