export interface IUploadProvider {
    uploadFile(file: Express.Multer.File): Promise<any>;
    removeFile(filePath: string): Promise<void>;
}