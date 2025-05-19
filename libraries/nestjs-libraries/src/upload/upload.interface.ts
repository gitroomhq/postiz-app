export interface IUploadProvider {
    uploadSimple(path: string): Promise<string>;
    //Forze
    uploadFile(file: Express.Multer.File, contentType?: string): Promise<any>;
    removeFile(filePath: string): Promise<void>;
}