import { __asyncGenerator, __asyncValues, __await, __awaiter } from "tslib";
import { createReadStream, statSync } from 'fs';
// @ts-ignore
import mime from 'mime';
function nodeStreamToIterator(stream) {
    return __asyncGenerator(this, arguments, function* nodeStreamToIterator_1() {
        var _a, e_1, _b, _c;
        try {
            for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield __await(stream_1.next()), _a = stream_1_1.done, !_a; _d = true) {
                _c = stream_1_1.value;
                _d = false;
                const chunk = _c;
                yield yield __await(chunk);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = stream_1.return)) yield __await(_b.call(stream_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
function iteratorToStream(iterator) {
    return new ReadableStream({
        pull(controller) {
            return __awaiter(this, void 0, void 0, function* () {
                const { value, done } = yield iterator.next();
                if (done) {
                    controller.close();
                }
                else {
                    controller.enqueue(new Uint8Array(value));
                }
            });
        },
    });
}
export const GET = (request, context) => {
    const filePath = process.env.UPLOAD_DIRECTORY + '/' + context.params.path.join('/');
    const response = createReadStream(filePath);
    const fileStats = statSync(filePath);
    const contentType = mime.getType(filePath) || 'application/octet-stream';
    const iterator = nodeStreamToIterator(response);
    const webStream = iteratorToStream(iterator);
    return new Response(webStream, {
        headers: {
            'Content-Type': contentType,
            // Set the appropriate content-type header
            'Content-Length': fileStats.size.toString(),
            // Set the content-length header
            'Last-Modified': fileStats.mtime.toUTCString(),
            // Set the last-modified header
            'Cache-Control': 'public, max-age=31536000, immutable', // Example cache-control header
        },
    });
};
//# sourceMappingURL=route.js.map