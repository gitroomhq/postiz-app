import { __awaiter } from "tslib";
import { PostizAPI } from '../api';
import { getConfig } from '../config';
import { readFileSync } from 'fs';
export function uploadFile(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = getConfig();
        const api = new PostizAPI(config);
        if (!args.file) {
            console.error('❌ File path is required');
            process.exit(1);
        }
        try {
            const fileBuffer = readFileSync(args.file);
            const filename = args.file.split('/').pop() || 'file';
            const result = yield api.upload(fileBuffer, filename);
            console.log('✅ File uploaded successfully!');
            console.log(JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error('❌ Failed to upload file:', error.message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=upload.js.map