import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        await this.$connect();
    }
}

@Injectable()
export class PrismaRepository<T extends keyof PrismaService> {
    public model: Pick<PrismaService, T>;
    constructor(private _prismaService: PrismaService) {
        this.model = this._prismaService;
    }
}

