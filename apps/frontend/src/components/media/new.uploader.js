import { __awaiter } from "tslib";
import { useMemo } from 'react';
// @ts-ignore
import Uppy from '@uppy/core';
// @ts-ignore
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { getUppyUploadPlugin } from "../../../../../libraries/react-shared-libraries/src/helpers/uppy.upload";
// Uppy styles
import { useVariables } from "../../../../../libraries/react-shared-libraries/src/helpers/variable.context";
import Compressor from '@uppy/compressor';
import { useToaster } from "../../../../../libraries/react-shared-libraries/src/toaster/toaster";
import { useLaunchStore } from "../new-launch/store";
import { uniqBy } from 'lodash';
export class CompressionWrapper extends Compressor {
    prepareUpload(fileIDs) {
        const _super = Object.create(null, {
            prepareUpload: { get: () => super.prepareUpload }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const { files } = this.uppy.getState();
            // 1) Skip GIFs (and anything missing)
            const filteredIDs = fileIDs.filter((id) => {
                var _a, _b;
                const f = files[id];
                if (!f)
                    return false;
                const type = (_a = f.type) !== null && _a !== void 0 ? _a : '';
                const name = ((_b = f.name) !== null && _b !== void 0 ? _b : '').toLowerCase();
                const isGif = type === 'image/gif' || name.endsWith('.gif');
                return !isGif;
            });
            // 2) Let @uppy/compressor do its work (convert/resize/etc)
            return _super.prepareUpload.call(this, filteredIDs);
        });
    }
}
export function useUppyUploader(props) {
    const setLocked = useLaunchStore((state) => state.setLocked);
    const toast = useToaster();
    const { storageProvider, backendUrl, disableImageCompression, transloadit } = useVariables();
    const { onUploadSuccess, allowedFileTypes } = props;
    const fetch = useFetch();
    return useMemo(() => {
        // Track file order to maintain original sequence after upload
        let fileOrderIndex = 0;
        const uppy2 = new Uppy({
            autoProceed: true,
            restrictions: {
                // maxNumberOfFiles: 5,
                // allowedFileTypes: allowedFileTypes.split(','),
                maxFileSize: 1000000000, // Default 1GB, but we'll override with custom validation
            },
        });
        // check for valid file types it can be something like this image/*,video/mp4.
        // If it's an image, I need to replace image/* with image/png, image/jpeg, image/jpeg, image/gif (separately)
        uppy2.addPreProcessor((fileIDs) => {
            return new Promise((resolve, reject) => {
                const files = uppy2.getFiles();
                const allowedTypes = allowedFileTypes
                    .split(',')
                    .map((type) => type.trim());
                // Expand generic types to specific ones
                const expandedTypes = allowedTypes.flatMap((type) => {
                    if (type === 'image/*') {
                        return [
                            'image/png',
                            'image/jpeg',
                            'image/jpg',
                            'image/gif',
                            'image/webp',
                        ];
                    }
                    if (type === 'video/*') {
                        return ['video/mp4', 'video/mpeg', 'video/quicktime'];
                    }
                    if (type === 'video/mp4' && transloadit && transloadit.length > 0) {
                        return ['video/mp4', 'video/mpeg', 'video/quicktime'];
                    }
                    return [type];
                });
                for (const file of files) {
                    if (fileIDs.includes(file.id)) {
                        const fileType = file.type;
                        // Check if file type is allowed
                        const isAllowed = expandedTypes.some((allowedType) => {
                            if (allowedType.endsWith('/*')) {
                                const baseType = allowedType.replace('/*', '/');
                                return fileType === null || fileType === void 0 ? void 0 : fileType.startsWith(baseType);
                            }
                            return fileType === allowedType;
                        });
                        if (!isAllowed) {
                            const error = new Error(`File type "${fileType}" is not allowed for file "${file.name}". Allowed types: ${allowedFileTypes}`);
                            uppy2.log(error.message, 'error');
                            uppy2.info(error.message, 'error', 5000);
                            toast.show(`File type "${fileType}" is not allowed. Allowed types: ${allowedFileTypes}`, 'warning');
                            uppy2.removeFile(file.id);
                            return reject(error);
                        }
                    }
                }
                resolve();
            });
        });
        uppy2.addPreProcessor((fileIDs) => {
            return new Promise((resolve, reject) => {
                var _a, _b;
                const files = uppy2.getFiles();
                for (const file of files) {
                    if (fileIDs.includes(file.id)) {
                        const isImage = (_a = file.type) === null || _a === void 0 ? void 0 : _a.startsWith('image/');
                        const isVideo = (_b = file.type) === null || _b === void 0 ? void 0 : _b.startsWith('video/');
                        const maxImageSize = 30 * 1024 * 1024; // 30MB
                        const maxVideoSize = 1000 * 1024 * 1024; // 1GB
                        if (isImage && file.size > maxImageSize) {
                            const error = new Error(`Image file "${file.name}" is too large. Maximum size allowed is 30MB.`);
                            uppy2.log(error.message, 'error');
                            uppy2.info(error.message, 'error', 5000);
                            toast.show(`Image file is too large. Maximum size allowed is 30MB.`);
                            uppy2.removeFile(file.id); // Remove file from queue
                            return reject(error);
                        }
                        if (isVideo && file.size > maxVideoSize) {
                            const error = new Error(`Video file "${file.name}" is too large. Maximum size allowed is 1GB.`);
                            uppy2.log(error.message, 'error');
                            uppy2.info(error.message, 'error', 5000);
                            toast.show(`Video file is too large. Maximum size allowed is 1GB.`);
                            uppy2.removeFile(file.id); // Remove file from queue
                            return reject(error);
                        }
                    }
                }
                resolve();
            });
        });
        const { plugin, options } = getUppyUploadPlugin(transloadit.length > 0 ? 'transloadit' : storageProvider, fetch, backendUrl, transloadit);
        uppy2.use(plugin, options);
        if (!disableImageCompression) {
            uppy2.use(CompressionWrapper, {
                convertTypes: ['image/jpeg', 'image/png', 'image/webp'],
                maxWidth: 1000,
                maxHeight: 1000,
                quality: 1,
            });
        }
        // Set additional metadata when a file is added
        uppy2.on('file-added', (file) => {
            setLocked(true);
            uppy2.setFileMeta(file.id, {
                useCloudflare: storageProvider === 'cloudflare' ? 'true' : 'false', // Example of adding a custom field
                addedOrder: fileOrderIndex++, // Track original order for sorting after upload
                // Add more fields as needed
            });
        });
        uppy2.on('error', (result) => {
            uppy2.clear();
            setLocked(false);
            props.onEnd();
            fileOrderIndex = 0;
        });
        uppy2.on('upload-start', () => {
            props.onStart();
        });
        uppy2.on('complete', (result) => __awaiter(this, void 0, void 0, function* () {
            console.log(result);
            for (const file of [...result.successful]) {
                uppy2.removeFile(file.id);
            }
            props.onEnd();
            // Sort results by original add order to maintain file sequence
            const sortedSuccessful = [...result.successful].sort((a, b) => {
                var _a, _b, _c, _d;
                const orderA = +((_b = (_a = a.meta) === null || _a === void 0 ? void 0 : _a.addedOrder) !== null && _b !== void 0 ? _b : 0);
                const orderB = +((_d = (_c = b.meta) === null || _c === void 0 ? void 0 : _c.addedOrder) !== null && _d !== void 0 ? _d : 0);
                return orderA - orderB;
            });
            if (storageProvider === 'local') {
                setLocked(false);
                fileOrderIndex = 0;
                onUploadSuccess(sortedSuccessful.map((p) => p.response.body));
                return;
            }
            if (transloadit.length > 0) {
                // @ts-ignore
                const allRes = result.transloadit[0].results;
                const toSave = uniqBy(
                // @ts-ignore
                Object.values(allRes).flatMap((p) => {
                    return p.flatMap((item) => ({
                        name: item.url.split('/').pop(),
                        originalName: item.name || '',
                        order: +item.user_meta.addedOrder,
                    }));
                }), (item) => item.name);
                const loadAllMedia = (yield Promise.all(toSave.map((_a) => __awaiter(this, [_a], void 0, function* ({ name, originalName, order }) {
                    return ({
                        file: yield (yield fetch('/media/save-media', {
                            method: 'POST',
                            body: JSON.stringify({
                                name,
                                originalName,
                            }),
                        })).json(),
                        order,
                    });
                }))))
                    .sort((a, b) => {
                    return a.order - b.order;
                })
                    .map((p) => p.file);
                setLocked(false);
                fileOrderIndex = 0;
                onUploadSuccess(loadAllMedia);
                return;
            }
            setLocked(false);
            fileOrderIndex = 0;
            onUploadSuccess(sortedSuccessful.map((p) => p.response.body.saved));
        }));
        uppy2.on('upload-success', (file, response) => {
            // @ts-ignore
            uppy2.setFileState(file.id, {
                // @ts-ignore
                progress: uppy2.getState().files[file.id].progress,
                // @ts-ignore
                uploadURL: response.body.Location,
                response: response,
                isPaused: false,
            });
        });
        return uppy2;
    }, []);
}
//# sourceMappingURL=new.uploader.js.map