import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  channelConnectBody,
  channelConnectEndpoints,
  shouldTryNextConnectEndpoint,
} from './channel-connect.request.ts';

describe('channelConnectBody', () => {
  it('sends the selection and the OAuth state, not the Google callback query', () => {
    assert.deepEqual(channelConnectBody({ id: 'UC123' }, 'N6DA9WO'), {
      id: 'UC123',
      state: 'N6DA9WO',
    });
  });

  it('omits state when the callback has none', () => {
    assert.deepEqual(channelConnectBody({ id: 'UC123' }), { id: 'UC123' });
  });

  it('keeps a pages array for multi-select connect', () => {
    assert.deepEqual(
      channelConnectBody({ pages: ['111', '222'] }, 'N6DA9WO'),
      { pages: ['111', '222'], state: 'N6DA9WO' }
    );
  });
});

describe('channelConnectEndpoints', () => {
  it('prefers the public route on the OAuth callback so Save hits the org that started connect', () => {
    assert.deepEqual(
      channelConnectEndpoints({
        integrationId: 'int-1',
        logged: true,
        state: 'N6DA9WO',
      }),
      [
        '/integrations/public/provider/int-1/connect',
        '/integrations/provider/int-1/connect',
      ]
    );
  });

  it('uses only the public route when the user has no session cookie', () => {
    assert.deepEqual(
      channelConnectEndpoints({
        integrationId: 'int-1',
        logged: false,
        state: 'abc',
      }),
      ['/integrations/public/provider/int-1/connect']
    );
  });

  it('uses the authenticated route for the in-app continue modal (no state)', () => {
    assert.deepEqual(
      channelConnectEndpoints({
        integrationId: 'int-1',
        logged: true,
      }),
      ['/integrations/provider/int-1/connect']
    );
  });

  it('returns nothing when the integration id never arrived', () => {
    assert.deepEqual(
      channelConnectEndpoints({
        integrationId: '',
        logged: true,
        state: 'abc',
      }),
      []
    );
  });
});

describe('shouldTryNextConnectEndpoint', () => {
  it('retries on auth / missing-row failures, not on provider 4xx/5xx', () => {
    assert.equal(shouldTryNextConnectEndpoint(401), true);
    assert.equal(shouldTryNextConnectEndpoint(404), true);
    assert.equal(shouldTryNextConnectEndpoint(400), false);
    assert.equal(shouldTryNextConnectEndpoint(500), false);
  });
});
