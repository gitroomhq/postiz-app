import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./settings.component.tsx', import.meta.url)),
  'utf8',
);

describe('Settings mobile stack', () => {
  it('does not cap phone nav at 132px', () => {
    assert.doesNotMatch(source, /max-h-\[132px\]/);
  });

  it('uses an index list then a pushed pane on phone', () => {
    assert.match(source, /data-settings-index/);
    assert.match(source, /showIndex/);
    assert.match(source, /closeMobilePane/);
  });

  it('hides the pane title with the JS phone chrome, not Tailwind mobile: (1025px)', () => {
    assert.match(source, /hideTitle=\{mobile\}/);
    assert.doesNotMatch(source, /text-pqText mobile:hidden/);
  });
});

describe('Account nav', () => {
  it('lists Account as the first Account-group row', () => {
    const accountBlock = source.slice(source.indexOf("if (showLogout)"));
    const accountTab = accountBlock.indexOf("tab: 'account'");
    const apiTab = accountBlock.indexOf("tab: 'api'");
    assert.ok(accountTab >= 0);
    assert.ok(apiTab > accountTab);
    assert.match(source, /label: t\('your_account', 'Account'\)/);
  });
});
