import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { WebhooksRepository } from "./webhooks.repository";
let WebhooksService = class WebhooksService {
    constructor(_webhooksRepository) {
        this._webhooksRepository = _webhooksRepository;
    }
    getTotal(orgId) {
        return this._webhooksRepository.getTotal(orgId);
    }
    getWebhooks(orgId) {
        return this._webhooksRepository.getWebhooks(orgId);
    }
    createWebhook(orgId, body) {
        return this._webhooksRepository.createWebhook(orgId, body);
    }
    deleteWebhook(orgId, id) {
        return this._webhooksRepository.deleteWebhook(orgId, id);
    }
};
WebhooksService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [WebhooksRepository])
], WebhooksService);
export { WebhooksService };
//# sourceMappingURL=webhooks.service.js.map