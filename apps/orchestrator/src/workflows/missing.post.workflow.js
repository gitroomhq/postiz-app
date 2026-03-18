import { __awaiter } from "tslib";
import { proxyActivities, sleep } from '@temporalio/workflow';
const { searchForMissingThreeHoursPosts } = proxyActivities({
    startToCloseTimeout: '10 minute',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 1,
        initialInterval: '2 minutes',
    },
});
export function missingPostWorkflow() {
    return __awaiter(this, void 0, void 0, function* () {
        yield searchForMissingThreeHoursPosts();
        while (true) {
            yield sleep('1 hour');
            yield searchForMissingThreeHoursPosts();
        }
    });
}
//# sourceMappingURL=missing.post.workflow.js.map