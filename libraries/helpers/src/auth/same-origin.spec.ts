import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSameFrontendOrigin } from './same-origin.ts';

const FRONTEND = 'https://app.postqueen.ai';

describe('isSameFrontendOrigin', () => {
  it('accepts a matching Origin', () => {
    assert.equal(
      isSameFrontendOrigin({ origin: 'https://app.postqueen.ai' }, FRONTEND),
      true
    );
  });

  it('accepts a matching Referer when Origin is absent', () => {
    assert.equal(
      isSameFrontendOrigin(
        { referer: 'https://app.postqueen.ai/settings?tab=account' },
        FRONTEND
      ),
      true
    );
  });

  it('rejects a cross-site Origin', () => {
    assert.equal(
      isSameFrontendOrigin({ origin: 'https://evil.example' }, FRONTEND),
      false
    );
  });

  it('rejects when neither Origin nor Referer is present', () => {
    assert.equal(isSameFrontendOrigin({}, FRONTEND), false);
  });

  it('rejects when FRONTEND_URL is missing', () => {
    assert.equal(
      isSameFrontendOrigin({ origin: 'https://app.postqueen.ai' }, ''),
      false
    );
  });
});
