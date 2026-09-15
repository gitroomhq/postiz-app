import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tagsToPostPayload } from './tags.payload.ts';

describe('tagsToPostPayload', () => {
  it('maps picker rows to the {label,value} shape /posts persists', () => {
    assert.deepEqual(
      tagsToPostPayload([{ id: '1', name: 'Launch', color: '#f00' }]),
      [{ label: 'Launch', value: 'Launch' }]
    );
  });

  it('keeps an already-normalized payload', () => {
    assert.deepEqual(
      tagsToPostPayload([{ label: 'Launch', value: 'Launch' }]),
      [{ label: 'Launch', value: 'Launch' }]
    );
  });

  it('drops empty rows so a nameless tag is not posted', () => {
    assert.deepEqual(tagsToPostPayload([{}]), []);
  });
});
