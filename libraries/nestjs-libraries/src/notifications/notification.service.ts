import {Injectable} from "@nestjs/common";
import {Novu, TriggerRecipientsTypeEnum} from '@novu/node';
import {User} from "@prisma/client";

const novu = new Novu(process.env.NOVU_API_KEY!);

@Injectable()
export class NotificationService {
    async registerUserToTopic(userId: string, topic: string) {
        try {
            await novu.topics.create({
                name: 'organization topic',
                key: topic
            });
        }
        catch (err) { /* empty */ }
        await novu.topics.addSubscribers(topic, {
            subscribers: [userId]
        });
    }

    async identifyUser(user: User) {
        await novu.subscribers.identify(user.id, {
            email: user.email,
        });
    }

    async sendNotificationToTopic(workflow: string, topic: string, payload = {}) {
        await novu.trigger(workflow, {
            to: [{type: TriggerRecipientsTypeEnum.TOPIC, topicKey: topic}],
            payload
        });
    }
}