export interface UploadSimpleOptions {
  headers?: Record<string, string>;
}

export interface IUploadProvider {
  uploadSimple(path: string, options?: UploadSimpleOptions): Promise<string>;
  uploadFile(file: Express.Multer.File): Promise<any>;
  removeFile(filePath: string): Promise<void>;
}
