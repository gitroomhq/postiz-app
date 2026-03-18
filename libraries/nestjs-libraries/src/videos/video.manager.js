import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { VideoAbstract, } from "./video.interface";
let VideoManager = class VideoManager {
    constructor(_moduleRef) {
        this._moduleRef = _moduleRef;
    }
    getAllVideos() {
        return (Reflect.getMetadata('video', VideoAbstract) || [])
            .filter((f) => f.available)
            .map((p) => ({
            target: p.target,
            identifier: p.identifier,
            title: p.title,
            tools: p.tools,
            dto: p.dto,
            description: p.description,
            placement: p.placement,
            trial: p.trial,
        }));
    }
    checkAvailableVideoFunction(method) {
        const videoFunction = Reflect.getMetadata('video-function', method);
        return !videoFunction;
    }
    getVideoByName(identifier) {
        const video = (Reflect.getMetadata('video', VideoAbstract) || []).find((p) => p.identifier === identifier);
        return Object.assign(Object.assign({}, video), { instance: this._moduleRef.get(video.target, {
                strict: false,
            }) });
    }
};
VideoManager = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ModuleRef])
], VideoManager);
export { VideoManager };
//# sourceMappingURL=video.manager.js.map