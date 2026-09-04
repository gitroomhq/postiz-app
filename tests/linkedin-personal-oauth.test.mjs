import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const providerSource = readFileSync(
  new URL(
    '../libraries/nestjs-libraries/src/integrations/social/linkedin.provider.ts',
    import.meta.url
  ),
  'utf8'
);
const pageProviderSource = readFileSync(
  new URL(
    '../libraries/nestjs-libraries/src/integrations/social/linkedin.page.provider.ts',
    import.meta.url
  ),
  'utf8'
);

test('personal LinkedIn OAuth requests only personal posting scopes', () => {
  const scopesBlock = providerSource.match(/scopes = \[(.*?)\n\s*\]/s)?.[1];
  const scopes = scopesBlock?.match(/'[^']+'/g);

  assert.deepEqual(scopes, [
    "'openid'",
    "'profile'",
    "'w_member_social'",
  ]);
});

test('LinkedIn OAuth allows interactive consent', () => {
  assert.doesNotMatch(providerSource, /prompt=none/);
  assert.doesNotMatch(pageProviderSource, /prompt=none/);
});
