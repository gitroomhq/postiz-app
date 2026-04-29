import { Injectable, Logger } from '@nestjs/common';
import { CredentialRepository } from './credential.repository';
import { EncryptionService } from '@gitroom/nestjs-libraries/crypto/encryption.service';

const SENTINEL = '__REDACTED__';

@Injectable()
export class CredentialService {
  private readonly _logger = new Logger(CredentialService.name);

  constructor(
    private _credentialRepository: CredentialRepository,
    private _encryptionService: EncryptionService
  ) {}

  private redact(data: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value ? SENTINEL : '',
      ])
    );
  }

  // Overlay incoming sobre current preservando todas as chaves existentes que
  // o body parcial nao mencionou. Necessario porque a credencial encriptada
  // pode misturar campos de UIs distintas (App ID/Secret + messaging tokens
  // do Instagram, no caso do provider 'facebook') e cada UI envia apenas o
  // subset que conhece. Antes desta correcao, qualquer save em uma UI
  // descartava silenciosamente os campos da outra.
  private unredact(
    incoming: Record<string, string>,
    current: Record<string, string>
  ): Record<string, string> {
    const droppedKeys = Object.keys(current).filter((k) => !(k in incoming));
    if (droppedKeys.length > 0) {
      this._logger.warn(
        `[credentials.unredact] body parcial omitiu ${droppedKeys.length} ` +
          `campo(s) que foram preservados automaticamente: ${droppedKeys.join(
            ', '
          )}. Verifique se o formulario que enviou esse body deveria incluir ` +
          `esses campos.`
      );
    }
    const merged: Record<string, string> = { ...current };
    for (const [key, value] of Object.entries(incoming)) {
      merged[key] = value === SENTINEL ? (current[key] ?? '') : value;
    }
    return merged;
  }

  async save(
    organizationId: string,
    provider: string,
    data: Record<string, string>,
    profileId?: string
  ) {
    const existing = await this.getRaw(organizationId, provider, profileId);
    const merged = existing ? this.unredact(data, existing) : data;

    // If the merge leaves every field empty, delete the record entirely so
    // `configured` flips back to false and the platform falls back to env
    // vars cleanly. This is triggered when the user removes the last
    // configured product section.
    const hasAnyValue = Object.values(merged).some(
      (v) => typeof v === 'string' && v.length > 0
    );
    if (!hasAnyValue) {
      if (existing) {
        await this._credentialRepository.delete(organizationId, provider, profileId);
      }
      return null;
    }

    const encryptedData = this._encryptionService.encryptJson(merged);
    return this._credentialRepository.upsert(
      organizationId,
      provider,
      encryptedData,
      profileId
    );
  }

  async getRedacted(
    organizationId: string,
    provider: string,
    profileId?: string
  ): Promise<{ data: Record<string, string>; updatedAt: Date } | null> {
    const record = await this._credentialRepository.findByProvider(
      organizationId,
      provider,
      profileId
    );
    if (!record) return null;
    const data = this._encryptionService.decryptJson(record.encryptedData) as Record<string, string>;
    return { data: this.redact(data), updatedAt: record.updatedAt };
  }

  async getRaw(
    organizationId: string,
    provider: string,
    profileId?: string
  ): Promise<Record<string, string> | null> {
    const record = await this._credentialRepository.findByProvider(
      organizationId,
      provider,
      profileId
    );
    if (!record) return null;
    return this._encryptionService.decryptJson(record.encryptedData) as Record<string, string>;
  }

  async listByOrg(organizationId: string, profileId?: string) {
    const records =
      await this._credentialRepository.findAllByOrg(organizationId, profileId);
    return records.map((r) => ({
      provider: r.provider,
      configured: true,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async configureInstagramWebhook(
    organizationId: string,
    callbackUrl: string,
    profileId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const creds = await this.getRaw(organizationId, 'facebook', profileId);
    // Prefer Instagram App credentials when the workspace uses the "Instagram
    // API with Instagram Login" product — Meta expects the Instagram app ID
    // and secret there. Falls back to the Facebook App credentials for
    // classic Graph API setups.
    const appId = creds?.instagramAppId || creds?.clientId;
    const appSecret = creds?.instagramAppSecret || creds?.clientSecret;
    if (!appId || !appSecret) {
      return {
        ok: false,
        error:
          'Configure o App ID e App Secret do Facebook (ou do Instagram quando usar "Instagram API with Instagram Login") antes de configurar o webhook.',
      };
    }

    const appAccessToken = `${appId}|${appSecret}`;
    const verifyToken = creds?.webhookVerifyToken || 'multipost';

    try {
      const params = new URLSearchParams({
        object: 'instagram',
        callback_url: callbackUrl,
        verify_token: verifyToken,
        fields: 'comments,messages',
        include_values: 'true',
        access_token: appAccessToken,
      });
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${appId}/subscriptions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.error) {
        return {
          ok: false,
          error:
            body?.error?.message ||
            `Meta retornou ${res.status}. Verifique o callback URL (deve ser HTTPS publico) e os produtos do app (Webhooks + Instagram).`,
        };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Erro ao chamar API Meta.' };
    }
  }

  async findAllDecrypted(provider: string) {
    const records = await this._credentialRepository.findAllByProviderAcrossOrgs(
      provider
    );
    return records.map((r) => ({
      organizationId: r.organizationId,
      profileId: r.profileId,
      data: this._encryptionService.decryptJson(r.encryptedData) as Record<
        string,
        string
      >,
    }));
  }

  async delete(organizationId: string, provider: string, profileId?: string) {
    return this._credentialRepository.delete(organizationId, provider, profileId);
  }

  /**
   * Update messaging-related fields in the Facebook credential row
   * (metaSystemUserToken, metaSystemUserTokenInfo, metaSystemUserTokenValidatedAt,
   * instagramTokens). Preserves all other fields via the SENTINEL pattern.
   * Composite fields (info, tokens array) are stored as JSON strings so the
   * Record<string, string> shape of the credential data stays intact.
   */
  async updateMessagingTokens(
    organizationId: string,
    profileId: string | undefined,
    updates: {
      metaSystemUserToken?: string | null;
      metaSystemUserTokenValidatedAt?: string | null;
      metaSystemUserTokenInfo?: Record<string, any> | null;
      instagramTokens?: Array<Record<string, any>> | null;
    }
  ) {
    const existing = await this.getRaw(organizationId, 'facebook', profileId);
    const body: Record<string, string> = {};

    // Start by preserving every existing field via SENTINEL.
    for (const key of Object.keys(existing || {})) {
      body[key] = SENTINEL;
    }

    const applyField = (key: string, value: any) => {
      if (value === undefined) return;
      if (value === null || value === '') {
        body[key] = '';
        return;
      }
      if (typeof value === 'string') {
        body[key] = value;
        return;
      }
      body[key] = JSON.stringify(value);
    };

    applyField('metaSystemUserToken', updates.metaSystemUserToken);
    applyField(
      'metaSystemUserTokenValidatedAt',
      updates.metaSystemUserTokenValidatedAt
    );
    applyField('metaSystemUserTokenInfo', updates.metaSystemUserTokenInfo);
    applyField('instagramTokens', updates.instagramTokens);

    return this.save(organizationId, 'facebook', body, profileId);
  }

  /**
   * Read and parse messaging-related fields from the Facebook credential row.
   * Returns empty defaults when nothing is configured.
   */
  async getMessagingTokens(
    organizationId: string,
    profileId?: string
  ): Promise<{
    metaSystemUserToken?: string;
    metaSystemUserTokenValidatedAt?: string;
    metaSystemUserTokenInfo?: Record<string, any>;
    instagramTokens: Array<Record<string, any>>;
  }> {
    const raw = await this.getRaw(organizationId, 'facebook', profileId);
    if (!raw) {
      return { instagramTokens: [] };
    }

    const parseJson = (value: string | undefined): any => {
      if (!value) return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    };

    const tokens = parseJson(raw.instagramTokens);
    const info = parseJson(raw.metaSystemUserTokenInfo);

    return {
      metaSystemUserToken: raw.metaSystemUserToken || undefined,
      metaSystemUserTokenValidatedAt:
        raw.metaSystemUserTokenValidatedAt || undefined,
      metaSystemUserTokenInfo: info,
      instagramTokens: Array.isArray(tokens) ? tokens : [],
    };
  }

  async test(
    organizationId: string,
    provider: string,
    profileId?: string,
    section?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const raw = await this.getRaw(organizationId, provider, profileId);
    if (!raw) {
      return { ok: false, error: 'Nenhuma credencial configurada para este provider.' };
    }

    try {
      const result = await this.validateCredential(provider, raw, section);
      if (!result.ok) {
        console.error(
          '[credentials.test] provider=%s section=%s resultou em erro: %s',
          provider,
          section || 'default',
          result.error
        );
      }
      return result;
    } catch (e: any) {
      console.error('[credentials.test] provider=%s exception=%o', provider, e);
      return { ok: false, error: e.message || 'Erro ao testar credencial.' };
    }
  }

  private async validateCredential(
    provider: string,
    creds: Record<string, string>,
    section?: string
  ): Promise<{ ok: boolean; error?: string }> {
    switch (provider) {
      case 'facebook': {
        // The "facebook" provider bundles credentials for Facebook, Instagram
        // (API with Instagram Login) and Threads. Only the Facebook App can
        // be validated via the Graph API OAuth client_credentials endpoint.
        // Instagram and Threads products only expose user-based OAuth flows
        // (no client_credentials grant) and their App IDs are not queryable
        // standalone — so the only way to test those pairs is to run the
        // full user authorization flow, which is what happens when the user
        // connects a channel from Canais → Adicionar.
        if (section && section !== 'facebook') {
          return {
            ok: false,
            error: `Teste direto não é suportado para ${section}. Para validar OAuth, conecte um canal em Canais → Adicionar.`,
          };
        }

        if (!creds.clientId || !creds.clientSecret) {
          return {
            ok: false,
            error: 'Facebook App ID e App Secret são obrigatórios.',
          };
        }

        const res = await fetch(
          `https://graph.facebook.com/oauth/access_token?client_id=${encodeURIComponent(creds.clientId)}&client_secret=${encodeURIComponent(creds.clientSecret)}&grant_type=client_credentials`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return {
            ok: false,
            error: body?.error?.message || `Facebook retornou ${res.status}`,
          };
        }
        return { ok: true };
      }
      case 'twitter': {
        try {
          const { TwitterApi } = await import('twitter-api-v2');
          const consumerClient = new TwitterApi({
            appKey: creds.clientId,
            appSecret: creds.clientSecret,
          });
          // appLogin faz o bearer token request v1.1 com o host e encoding corretos.
          // Lança se as Consumer Keys forem invalidas ou o app nao estiver em um Project.
          await consumerClient.appLogin();
          return { ok: true };
        } catch (e: any) {
          const details = e?.data || e?.message || String(e);
          console.error('[credentials.test.twitter] falhou:', details);
          const msg =
            e?.data?.errors?.[0]?.message ||
            e?.data?.error_description ||
            e?.message ||
            'Credenciais invalidas no X.';
          return { ok: false, error: msg };
        }
      }
      case 'reddit': {
        const encoded = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
        const res = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${encoded}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'RoboMultipost/1.0',
          },
          body: 'grant_type=client_credentials',
        });
        if (!res.ok) {
          return { ok: false, error: `Reddit retornou ${res.status} — credenciais inválidas.` };
        }
        return { ok: true };
      }
      case 'discord': {
        const encoded = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
        const res = await fetch('https://discord.com/api/v10/oauth2/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${encoded}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials&scope=identify',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: body?.error_description || `Discord retornou ${res.status}` };
        }
        return { ok: true };
      }
      case 'tiktok': {
        const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: creds.clientId,
            client_secret: creds.clientSecret,
            grant_type: 'client_credentials',
          }).toString(),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.error) {
          return { ok: false, error: body?.error_description || `TikTok retornou ${res.status}` };
        }
        return { ok: true };
      }
      default: {
        const empty = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
        if (empty.length > 0) {
          return { ok: false, error: `Campos vazios: ${empty.join(', ')}` };
        }
        return { ok: true };
      }
    }
  }
}
