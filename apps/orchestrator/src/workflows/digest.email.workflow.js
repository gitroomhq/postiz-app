import { __awaiter } from "tslib";
import { condition, continueAsNew, proxyActivities, setHandler, sleep, } from '@temporalio/workflow';
import { emailSignal } from "../signals/email.signal";
const { getUserOrgs, sendEmailAsync } = proxyActivities({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    cancellationType: 'ABANDON',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 1,
        initialInterval: '2 minutes',
    },
});
export function digestEmailWorkflow(_a) {
    return __awaiter(this, arguments, void 0, function* ({ organizationId, queue = [], }) {
        setHandler(emailSignal, (data) => {
            queue.push(...data);
        });
        while (true) {
            yield condition(() => queue.length > 0);
            yield sleep(3600000);
            // Take a snapshot batch and immediately clear queue.
            const batch = queue.splice(0, queue.length);
            queue = [];
            const org = yield getUserOrgs(organizationId);
            for (const user of org.users) {
                const allowFailure = user.user.sendFailureEmails ? 'fail' : null;
                const allowSuccess = user.user.sendSuccessEmails ? 'success' : null;
                const toSend = batch.filter((email) => email.type === allowFailure ||
                    email.type === allowSuccess ||
                    email.type === 'info');
                if (toSend.length === 0)
                    continue;
                yield sendEmailAsync(user.user.email, toSend.length === 1
                    ? toSend[0].title
                    : `[Postiz] Your latest notifications`, toSend.map((p) => p.message).join('<br/>'), 'bottom');
            }
            return yield continueAsNew({
                organizationId,
                queue,
            });
        }
    });
}
//# sourceMappingURL=digest.email.workflow.js.map