import { __awaiter } from "tslib";
import { UploadPartCommand, S3Client, ListPartsCommand, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, PutObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { makeId } from "../services/make.is";
const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_BUCKETNAME, CLOUDFLARE_BUCKET_URL, } = process.env;
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: CLOUDFLARE_ACCESS_KEY,
        secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
    },
});
// Function to generate a random string
function generateRandomString() {
    return makeId(20);
}
export default function handleR2Upload(endpoint, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (endpoint) {
            case 'create-multipart-upload':
                return createMultipartUpload(req, res);
            case 'prepare-upload-parts':
                return prepareUploadParts(req, res);
            case 'complete-multipart-upload':
                return completeMultipartUpload(req, res);
            case 'list-parts':
                return listParts(req, res);
            case 'abort-multipart-upload':
                return abortMultipartUpload(req, res);
            case 'sign-part':
                return signPart(req, res);
        }
        return res.status(404).end();
    });
}
export function simpleUpload(data, originalFilename, contentType) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileExtension = path.extname(originalFilename); // Extract extension
        const randomFilename = generateRandomString() + fileExtension; // Append extension
        const params = {
            Bucket: CLOUDFLARE_BUCKETNAME,
            Key: randomFilename,
            Body: data,
            ContentType: contentType,
        };
        const command = new PutObjectCommand(Object.assign({}, params));
        yield R2.send(command);
        return CLOUDFLARE_BUCKET_URL + '/' + randomFilename;
    });
}
export function createMultipartUpload(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { file, fileHash, contentType } = req.body;
        const fileExtension = path.extname(file.name); // Extract extension
        const randomFilename = generateRandomString() + fileExtension; // Append extension
        try {
            const params = {
                Bucket: CLOUDFLARE_BUCKETNAME,
                Key: `${randomFilename}`,
                ContentType: contentType,
                Metadata: {
                    'x-amz-meta-file-hash': fileHash,
                },
            };
            const command = new CreateMultipartUploadCommand(Object.assign({}, params));
            const response = yield R2.send(command);
            return res.status(200).json({
                uploadId: response.UploadId,
                key: response.Key,
            });
        }
        catch (err) {
            console.log('Error', err);
            return res.status(500).json({ source: { status: 500 } });
        }
    });
}
export function prepareUploadParts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { partData } = req.body;
        const parts = partData.parts;
        const response = {
            presignedUrls: {},
        };
        for (const part of parts) {
            try {
                const params = {
                    Bucket: CLOUDFLARE_BUCKETNAME,
                    Key: partData.key,
                    PartNumber: part.number,
                    UploadId: partData.uploadId,
                };
                const command = new UploadPartCommand(Object.assign({}, params));
                const url = yield getSignedUrl(R2, command, { expiresIn: 3600 });
                // @ts-ignore
                response.presignedUrls[part.number] = url;
            }
            catch (err) {
                console.log('Error', err);
                return res.status(500).json(err);
            }
        }
        return res.status(200).json(response);
    });
}
export function listParts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, uploadId } = req.body;
        try {
            const params = {
                Bucket: CLOUDFLARE_BUCKETNAME,
                Key: key,
                UploadId: uploadId,
            };
            const command = new ListPartsCommand(Object.assign({}, params));
            const response = yield R2.send(command);
            return res.status(200).json(response['Parts']);
        }
        catch (err) {
            console.log('Error', err);
            return res.status(500).json(err);
        }
    });
}
export function completeMultipartUpload(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { key, uploadId, parts } = req.body;
        try {
            const params = {
                Bucket: CLOUDFLARE_BUCKETNAME,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            };
            const command = new CompleteMultipartUploadCommand({
                Bucket: CLOUDFLARE_BUCKETNAME,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            });
            const response = yield R2.send(command);
            response.Location =
                process.env.CLOUDFLARE_BUCKET_URL +
                    '/' +
                    ((_a = response === null || response === void 0 ? void 0 : response.Location) === null || _a === void 0 ? void 0 : _a.split('/').at(-1));
            return response;
        }
        catch (err) {
            console.log('Error', err);
            return res.status(500).json(err);
        }
    });
}
export function abortMultipartUpload(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, uploadId } = req.body;
        try {
            const params = {
                Bucket: CLOUDFLARE_BUCKETNAME,
                Key: key,
                UploadId: uploadId,
            };
            const command = new AbortMultipartUploadCommand(Object.assign({}, params));
            const response = yield R2.send(command);
            return res.status(200).json(response);
        }
        catch (err) {
            console.log('Error', err);
            return res.status(500).json(err);
        }
    });
}
export function signPart(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, uploadId } = req.body;
        const partNumber = parseInt(req.body.partNumber);
        const params = {
            Bucket: CLOUDFLARE_BUCKETNAME,
            Key: key,
            PartNumber: partNumber,
            UploadId: uploadId,
            Expires: 3600,
        };
        const command = new UploadPartCommand(Object.assign({}, params));
        const url = yield getSignedUrl(R2, command, { expiresIn: 3600 });
        return res.status(200).json({
            url: url,
        });
    });
}
//# sourceMappingURL=r2.uploader.js.map