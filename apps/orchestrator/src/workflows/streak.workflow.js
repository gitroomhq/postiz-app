import { __awaiter } from "tslib";
import { proxyActivities, sleep } from '@temporalio/workflow';
const { sendEmailAsync, getUserOrgs, setStreak } = proxyActivities({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    cancellationType: 'ABANDON',
});
export function streakWorkflow(_a) {
    return __awaiter(this, arguments, void 0, function* ({ organizationId, }) {
        yield setStreak(organizationId, 'start');
        yield sleep(79200000);
        const userOrgs = yield getUserOrgs(organizationId);
        for (const user of userOrgs.users) {
            if (!user.user.sendStreakEmails) {
                continue;
            }
            yield sendEmailAsync(user.user.email, 'Streak Reminder', '<p>You are about to lose your streak in two hours! schedule a post now to keep it!</p>', 'bottom');
        }
        yield sleep(7200000);
        yield setStreak(organizationId, 'end');
    });
}
//# sourceMappingURL=streak.workflow.js.map