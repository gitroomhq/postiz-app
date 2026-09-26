// postmonster: jest stub - `file-type` is ESM-only and cannot be require()d
// from the CJS jest runtime (it is only pulled in transitively via the upload
// storage classes, which the tests never exercise)
module.exports = {
  fileTypeFromBuffer: async () => undefined,
  fileTypeFromFile: async () => undefined,
  fileTypeFromStream: async () => undefined,
};
