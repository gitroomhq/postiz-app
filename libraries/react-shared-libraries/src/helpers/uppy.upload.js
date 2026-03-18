import { __awaiter } from "tslib";
import XHRUpload from '@uppy/xhr-upload';
import AwsS3Multipart from '@uppy/aws-s3';
import sha256 from 'sha256';
import Transloadit from '@uppy/transloadit';
const fetchUploadApiEndpoint = (fetch, endpoint, data) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`/media/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
    return res.json();
});
// Define the factory to return appropriate Uppy configuration
export const getUppyUploadPlugin = (provider, fetch, backendUrl, transloadit = []) => {
    switch (provider) {
        case 'transloadit':
            return {
                plugin: Transloadit,
                options: {
                    waitForEncoding: true,
                    alwaysRunAssembly: true,
                    assemblyOptions: {
                        params: {
                            auth: { key: transloadit[0] },
                            template_id: transloadit[1],
                        },
                    },
                },
            };
        case 'cloudflare':
            return {
                plugin: AwsS3Multipart,
                options: {
                    shouldUseMultipart: (file) => true,
                    endpoint: '',
                    createMultipartUpload: (file) => __awaiter(void 0, void 0, void 0, function* () {
                        let fileHash = '';
                        const contentType = file.type;
                        // Skip hash calculation for files larger than 100MB to avoid "Invalid array length" error
                        if (file.size <= 100 * 1024 * 1024) {
                            try {
                                const arrayBuffer = yield new Response(file.data).arrayBuffer();
                                fileHash = sha256(Buffer.from(arrayBuffer));
                            }
                            catch (error) {
                                console.warn('Failed to calculate file hash, proceeding without hash:', error);
                                fileHash = '';
                            }
                        }
                        return fetchUploadApiEndpoint(fetch, 'create-multipart-upload', {
                            file,
                            fileHash,
                            contentType,
                        });
                    }),
                    listParts: (file, props) => fetchUploadApiEndpoint(fetch, 'list-parts', Object.assign({ file }, props)),
                    signPart: (file, props) => fetchUploadApiEndpoint(fetch, 'sign-part', Object.assign({ file }, props)),
                    abortMultipartUpload: (file, props) => fetchUploadApiEndpoint(fetch, 'abort-multipart-upload', Object.assign({ file }, props)),
                    completeMultipartUpload: (file, props) => fetchUploadApiEndpoint(fetch, 'complete-multipart-upload', Object.assign({ file }, props)),
                },
            };
        case 'local':
            return {
                plugin: XHRUpload,
                options: {
                    endpoint: `${backendUrl}/media/upload-server`,
                    withCredentials: true,
                },
            };
        // Add more cases for other cloud providers
        default:
            throw new Error(`Unsupported storage provider: ${provider}`);
    }
};
//# sourceMappingURL=uppy.upload.js.map