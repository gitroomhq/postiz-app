import { __awaiter } from "tslib";
import { proxyActivities, sleep } from '@temporalio/workflow';
const { autoPost } = proxyActivities({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 1,
        initialInterval: '2 minutes',
    },
});
export function autoPostWorkflow(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id, immediately, }) {
        while (true) {
            try {
                if (immediately) {
                    yield autoPost(id);
                }
            }
            catch (err) { }
            immediately = true;
            yield sleep(3600000);
        }
    });
}
//# sourceMappingURL=autopost.workflow.js.map