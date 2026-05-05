import { AgentModelResolver } from './agent.model.resolver';
import { AiClientFactory } from '@gitroom/nestjs-libraries/ai/ai-client.factory';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

const buildContext = (entries: Record<string, unknown>) => ({
  get: (key: string) => entries[key],
});

describe('AgentModelResolver', () => {
  let resolver: AgentModelResolver;
  let factory: MockProxy<AiClientFactory> & AiClientFactory;

  beforeEach(() => {
    factory = createMock<AiClientFactory>();
    resolver = new AgentModelResolver(factory);
  });

  it('deve extrair orgId de organization JSON e chamar factory.text', async () => {
    factory.text.mockResolvedValue({
      provider: 'openrouter',
      model: { id: 'gpt-5.5' } as any,
      fallbackModel: null,
      options: {},
      credentialId: 'cred-1',
    });

    const context = buildContext({
      organization: JSON.stringify({ id: 'org-1' }),
      profileId: 'profile-9',
    });

    const result = await resolver.resolve(context);

    expect(factory.text).toHaveBeenCalledWith('org-1', 'profile-9');
    expect(result).toEqual({ id: 'gpt-5.5' });
  });

  it('deve aceitar organization ja como objeto', async () => {
    factory.text.mockResolvedValue({
      provider: 'openrouter',
      model: { id: 'm' } as any,
      fallbackModel: null,
      options: {},
      credentialId: 'cred-1',
    });

    const context = buildContext({
      organization: { id: 'org-2' },
      profileId: undefined,
    });

    await resolver.resolve(context);

    expect(factory.text).toHaveBeenCalledWith('org-2', undefined);
  });

  it('deve passar profileId undefined quando vazio', async () => {
    factory.text.mockResolvedValue({
      provider: 'openrouter',
      model: { id: 'm' } as any,
      fallbackModel: null,
      options: {},
      credentialId: 'cred-1',
    });

    const context = buildContext({
      organization: JSON.stringify({ id: 'org-3' }),
      profileId: '',
    });

    await resolver.resolve(context);

    expect(factory.text).toHaveBeenCalledWith('org-3', undefined);
  });

  it('deve lancar 500 quando organization ausente', async () => {
    const context = buildContext({});

    await expect(resolver.resolve(context)).rejects.toThrow(HttpException);
    expect(factory.text).not.toHaveBeenCalled();
  });

  it('deve lancar 500 quando organization JSON e invalida', async () => {
    const context = buildContext({
      organization: 'isso nao e json valido',
    });

    await expect(resolver.resolve(context)).rejects.toThrow(HttpException);
  });
});
