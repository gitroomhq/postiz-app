import { readFileSync } from 'fs';
import axios from 'axios';

export const readOrFetch = async (path: string) => {
  if (path.indexOf('http') === 0) {
    return (
      await axios({
        url: path,
        method: 'GET',
        responseType: 'arraybuffer',
      })
    ).data;
  }

  return readFileSync(path);
};
