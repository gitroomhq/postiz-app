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

  const {validRangeEnd} = twitter.parseTweet(text);
  return {
    start: 0,
    end: validRangeEnd
  }
};

export const weightedLength = (text: string): number => {
  return twitter.parseTweet(text).weightedLength;
}
