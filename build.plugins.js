const { readdirSync, statSync, writeFileSync } = require('fs');
const { join } = require('path');

function isNonEmptyFolder(folderPath) {
  const items = readdirSync(folderPath);
  // Check if there are any items in the folder
  return items.some((item) => {
    const fullPath = join(folderPath, item);
    // Check if the item is a file or a non-empty directory
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return isNonEmptyFolder(fullPath); // Recursively check subfolders
    }
    return true; // It's a file
  });
}

// Function to get all non-empty folders
function getNonEmptyFolders(rootFolder) {
  const result = [];
  const items = readdirSync(rootFolder);

  items.forEach((item) => {
    const fullPath = join(rootFolder, item);
    const stats = statSync(fullPath);
    if (stats.isDirectory() && isNonEmptyFolder(fullPath)) {
      result.push(item);
    }
  });

  return result;
}
const abc = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
];
const list = getNonEmptyFolders('./libraries/plugins/src/list');
const fileContent = `${list
  .map((p, index) => {
    return `import Module${abc[
      index
    ].toUpperCase()} from '@gitroom/plugins/list/${p}/backend/module';`;
  })
  .join('\n')}

export default [${list
  .map((p, index) => {
    return `Module${abc[index].toUpperCase()}`;
  })
  .join(', ')}];
`;

writeFileSync('./libraries/plugins/src/plugins.ts', fileContent);
