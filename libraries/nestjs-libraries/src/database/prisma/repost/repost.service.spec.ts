jest.mock('nostr-tools', () => ({
  getPublicKey: jest.fn(),
  Relay: jest.fn(),
  finalizeEvent: jest.fn(),
  SimplePool: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { RepostService } from './repost.service';
import { RepostRepository } from './repost.repository';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';

describe('RepostService.runNow', () => {
  let service: RepostService;
  let repository: MockProxy<RepostRepository> & RepostRepository;
  let signalWithStart: jest.Mock;

  beforeEach(() => {
    repository = createMock<RepostRepository>();
    signalWithStart = jest.fn();
    const temporal: any = {
      client: {
        getRawClient: () => ({ workflow: { signalWithStart } }),
      },
    };

    service = new RepostService(
      repository,
      temporal,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('envia signal pokeRepost via signalWithStart com USE_EXISTING quando regra ativa', async () => {
    repository.getRuleById.mockResolvedValue({
      id: 'rule-1',
      enabled: true,
    } as any);

    const result = await service.runNow('org-1', 'rule-1');

    expect(signalWithStart).toHaveBeenCalledWith(
      'repostWorkflow',
      expect.objectContaining({
        workflowId: 'repost-rule-rule-1',
        signal: 'pokeRepost',
        signalArgs: [],
        args: [{ ruleId: 'rule-1' }],
        workflowIdConflictPolicy: 'USE_EXISTING',
        taskQueue: 'main',
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('lanca BadRequestException quando regra esta pausada', async () => {
    repository.getRuleById.mockResolvedValue({
      id: 'rule-1',
      enabled: false,
    } as any);

    await expect(service.runNow('org-1', 'rule-1')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(signalWithStart).not.toHaveBeenCalled();
  });

  it('retorna success:false quando Temporal falha (sem lancar)', async () => {
    repository.getRuleById.mockResolvedValue({
      id: 'rule-1',
      enabled: true,
    } as any);
    signalWithStart.mockRejectedValue(new Error('temporal down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.runNow('org-1', 'rule-1');

    expect(result).toEqual({ success: false });
    errorSpy.mockRestore();
  });
});
