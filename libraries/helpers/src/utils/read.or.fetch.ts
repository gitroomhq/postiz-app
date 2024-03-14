import {readFileSync} from "fs";

export const readOrFetch = async (path: string) => {
  if (path.indexOf('https') === 0) {
    return (await fetch(path, {})).arrayBuffer();
  }

  return readFileSync(path);
};
