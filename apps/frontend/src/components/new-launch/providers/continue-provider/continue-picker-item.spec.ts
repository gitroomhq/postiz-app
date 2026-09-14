import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { continuePickerHandle } from '../../../channels/channel-handle.ts';
import {
  CONTINUE_PICKER_AVATAR_ATTR,
  continuePickerInitial,
  continuePickerItemClasses,
  joinContinuePickerMeta,
} from './continue-picker-meta.ts';

const itemSource = readFileSync(
  fileURLToPath(new URL('./continue-picker-item.tsx', import.meta.url)),
  'utf8',
);

describe('joinContinuePickerMeta', () => {
  it('joins non-empty parts with a middle dot', () => {
    assert.equal(
      joinContinuePickerMeta('@studio', '12 subscribers', 'Primary'),
      '@studio · 12 subscribers · Primary',
    );
  });

  it('drops empty, blank, and falsy parts', () => {
    assert.equal(
      joinContinuePickerMeta('', '  ', undefined, false, null, '@clips'),
      '@clips',
    );
  });

  it('returns undefined when nothing remains', () => {
    assert.equal(joinContinuePickerMeta('', '  ', undefined, false), undefined);
  });
});

describe('continuePickerHandle', () => {
  it('prefixes a bare username and keeps an existing at-sign', () => {
    assert.equal(continuePickerHandle('iamgokhankinay'), '@iamgokhankinay');
    assert.equal(continuePickerHandle('@studio'), '@studio');
  });

  it('skips blank usernames', () => {
    assert.equal(continuePickerHandle('  '), undefined);
    assert.equal(continuePickerHandle(undefined), undefined);
  });

  it('shows a Tumblr URL as host plus path, without an extra at-sign', () => {
    assert.equal(
      continuePickerHandle('https://thegokhankinay.tumblr.com/'),
      'thegokhankinay.tumblr.com',
    );
  });
});

describe('continuePickerInitial', () => {
  it('uses the first letter of the name', () => {
    assert.equal(continuePickerInitial('GÖKHAN KINAY'), 'G');
    assert.equal(continuePickerInitial('  studio'), 'S');
  });

  it('falls back when the name is empty', () => {
    assert.equal(continuePickerInitial('   '), '?');
  });
});

describe('ContinuePickerItem contract', () => {
  it('exposes the avatar attribute and list/confirm typography classes', () => {
    assert.equal(CONTINUE_PICKER_AVATAR_ATTR, 'data-avatar');
    assert.match(continuePickerItemClasses.text, /min-w-0 max-w-full/);
    assert.match(
      continuePickerItemClasses.name,
      /text-\[14px\] font-\[600\] text-pqText/,
    );
    assert.match(continuePickerItemClasses.meta, /text-\[12px\] text-pqMuted/);
  });

  it('renders data-avatar on both the photo and the fallback so density CSS can size them', () => {
    assert.match(itemSource, /data-avatar=""/);
    assert.match(itemSource, /src \? \(/);
    assert.match(itemSource, /continuePickerItemClasses\.fallback/);
    assert.match(itemSource, /\{meta \? \(/);
  });
});
