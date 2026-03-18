import { __awaiter } from "tslib";
import { proxyActivities, setHandler, condition, sleep, continueAsNew, } from '@temporalio/workflow';
import { sendEmailSignal, } from "../signals/send.email.signal";
const { sendEmail } = proxyActivities({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    cancellationType: 'ABANDON',
});
const RATE_LIMIT_MS = 700;
export function sendEmailWorkflow(_a) {
    return __awaiter(this, arguments, void 0, function* ({ queue = [], }) {
        let processedThisRun = 0;
        // Handle incoming email signals
        setHandler(sendEmailSignal, (addEmail) => {
            if (addEmail.to && addEmail.subject) {
                if (addEmail.addTo === 'top') {
                    queue.unshift(addEmail);
                }
                else {
                    queue.push(addEmail);
                }
            }
        });
        // Process emails with rate limiting
        while (true) {
            // Wait until there's an email in the queue or timeout after 1 hour of inactivity
            yield condition(() => queue.length > 0);
            try {
                const email = queue.shift();
                if (!email) {
                    continue;
                }
                yield sendEmail(email.to, email.subject, email.html, email.replyTo);
                processedThisRun++;
            }
            catch (err) {
                console.log(err);
            }
            yield sleep(RATE_LIMIT_MS);
            if (processedThisRun >= 30) {
                return yield continueAsNew({ queue });
            }
        }
    });
}
//# sourceMappingURL=send.email.workflow.js.map