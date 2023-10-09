import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  BullMqClient,
  EncryptionService,
  RedisVotesService,
  VoteServiceProducer,
  VotesInterface,
} from '@clickvote/nest-libraries';
import { Server, Socket } from 'socket.io';
import { EnvService } from '../env/env.service';
import dayjs from 'dayjs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { IdFromClient, KeyFromClient } from '../helpers/key.from.client';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  public constructor(
    private _redisVotesService: RedisVotesService,
    private _encryptionService: EncryptionService,
    private _envService: EnvService,
    @VoteServiceProducer() private _voteServiceProducer: BullMqClient
  ) {}
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('login')
  public async login(
    @ConnectedSocket() client: Socket,
    @MessageBody('apiKey') apiKey: string
  ) {
    const key = await this._envService.validateApiKey(apiKey);
    if (!key) {
      return;
    }

    const expiryDate = dayjs().add(30, 'minutes').unix();

    const token = await this._encryptionService.encryptKey(
      JSON.stringify({
        id: key._id.toString(),
        key: apiKey,
        expiration: expiryDate,
      }),
      process.env.TOKEN_KEY
    );

    client.emit('login', { token, expiration: expiryDate });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('get-votes')
  public async getVotes(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    params: {
      id: string;
      voteTo: string;
      userId: string;
      type: 'single' | 'range';
    },
    @IdFromClient() id: string
  ) {
    const getVoteElements = await this._envService.getVoteByEnvAndId(
      id,
      params.id
    );
    if (!getVoteElements) {
      return false;
    }

    const total = await this._redisVotesService.getRedisTotalVotes(
      id,
      params.id,
      params.voteTo
    );

    const voted = await this._redisVotesService.userVoted(
      id,
      params.id,
      params.voteTo,
      params.userId
    );

    client.emit(`get-votes-${params.id}-${params.voteTo}`, {
      voted: !!voted,
      voteValue: voted || 0,
      total,
      startEnd: {
        start: getVoteElements.start,
        end: getVoteElements.end,
      },
    });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('vote')
  public async votes(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    params: {
      id: string;
      voteTo: string;
      userId: string;
      type: 'single' | 'range';
      value: number;
    },
    @IdFromClient() envId: string
  ) {
    this._voteServiceProducer.emit(
      'new_vote',
      JSON.stringify({
        uuid: uuidv4(),
        env: envId,
        voteId: params.id,
        to: params.voteTo,
        user: params.userId,
        value: params.value,
        ref: '',
        geo_location: {
          type: 'Point',
          coordinates: [-50.25415, 49.34868],
        },
        device: 'Android',
        browser: 'Firefox',
      } as VotesInterface)
    );

    const total = await this._redisVotesService.redisVote(
      envId,
      params.id,
      params.voteTo,
      params.userId,
      params.type,
      params.value
    );

    await this._envService.persistentNumbers(
      envId,
      params.id,
      params.voteTo,
      params.userId,
      params.type,
      +(total?.initial || 0),
      params.value
    );

    client.broadcast.emit(`get-votes-${params.id}-${params.voteTo}`, {
      total,
      poster: {
        id: params.userId,
        value: params.value,
      },
    });
  }
}
