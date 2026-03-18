import { __awaiter } from "tslib";
import { readFileSync } from 'fs';
import axios from 'axios';
export const readOrFetch = (path) => __awaiter(void 0, void 0, void 0, function* () {
    if (path.indexOf('http') === 0) {
        return (yield axios({
            url: path,
            method: 'GET',
            responseType: 'arraybuffer',
        })).data;
    }
    return readFileSync(path);
});
//# sourceMappingURL=read.or.fetch.js.map