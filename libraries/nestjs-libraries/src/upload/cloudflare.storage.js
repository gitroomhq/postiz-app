import { __awaiter } from "tslib";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import 'multer';
import { makeId } from "../services/make.is";
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
class CloudflareStorage {
    constructor(accountID, accessKey, secretKey, region, _bucketName, _uploadUrl) {
        this.region = region;
        this._bucketName = _bucketName;
        this._uploadUrl = _uploadUrl;
        this._client = new S3Client({
            endpoint: `https://${accountID}.r2.cloudflarestorage.com`,
            region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            requestChecksumCalculation: 'WHEN_REQUIRED',
        });
        this._client.middlewareStack.add((next) => (args) => __awaiter(this, void 0, void 0, function* () {
            const request = args.request;
            // Remove checksum headers
            const headers = request.headers;
            delete headers['x-amz-checksum-crc32'];
            delete headers['x-amz-checksum-crc32c'];
            delete headers['x-amz-checksum-sha1'];
            delete headers['x-amz-checksum-sha256'];
            request.headers = headers;
            Object.entries(request.headers).forEach(
            // @ts-ignore
            ([key, value]) => {
                if (!request.headers) {
                    request.headers = {};
                }
                request.headers[key] = value;
            });
            return next(args);
        }), { step: 'build', name: 'customHeaders' });
    }
    uploadSimple(path) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const loadImage = yield fetch(path);
            const contentType = ((_a = loadImage === null || loadImage === void 0 ? void 0 : loadImage.headers) === null || _a === void 0 ? void 0 : _a.get('content-type')) ||
                ((_b = loadImage === null || loadImage === void 0 ? void 0 : loadImage.headers) === null || _b === void 0 ? void 0 : _b.get('Content-Type'));
            const extension = getExtension(contentType);
            const id = makeId(10);
            const params = {
                Bucket: this._bucketName,
                Key: `${id}.${extension}`,
                Body: Buffer.from(yield loadImage.arrayBuffer()),
                ContentType: contentType,
                ChecksumMode: 'DISABLED',
            };
            const command = new PutObjectCommand(Object.assign({}, params));
            yield this._client.send(command);
            return `${this._uploadUrl}/${id}.${extension}`;
        });
    }
    uploadFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = makeId(10);
                const extension = mime.extension(file.mimetype) || '';
                // Create the PutObjectCommand to upload the file to Cloudflare R2
                const command = new PutObjectCommand({
                    Bucket: this._bucketName,
                    ACL: 'public-read',
                    Key: `${id}.${extension}`,
                    Body: file.buffer,
                });
                yield this._client.send(command);
                return {
                    filename: `${id}.${extension}`,
                    mimetype: file.mimetype,
                    size: file.size,
                    buffer: file.buffer,
                    originalname: `${id}.${extension}`,
                    fieldname: 'file',
                    path: `${this._uploadUrl}/${id}.${extension}`,
                    destination: `${this._uploadUrl}/${id}.${extension}`,
                    encoding: '7bit',
                    stream: file.buffer,
                };
            }
            catch (err) {
                console.error('Error uploading file to Cloudflare R2:', err);
                throw err;
            }
        });
    }
    // Implement the removeFile method from IUploadProvider
    removeFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // const fileName = filePath.split('/').pop(); // Extract the filename from the path
            // const command = new DeleteObjectCommand({
            //   Bucket: this._bucketName,
            //   Key: fileName,
            // });
            // await this._client.send(command);
        });
    }
}
export { CloudflareStorage };
export default CloudflareStorage;
//# sourceMappingURL=cloudflare.storage.js.map