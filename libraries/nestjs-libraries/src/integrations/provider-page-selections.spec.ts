import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { providerPageSelections } from './provider-page-selections.ts';

describe('providerPageSelections', () => {
  it('keeps a single Facebook page payload', () => {
    assert.deepEqual(providerPageSelections({ page: '111', state: 'abc' }), [
      { page: '111' },
    ]);
  });

  it('maps Facebook / LinkedIn page id lists to { page }', () => {
    assert.deepEqual(
      providerPageSelections({ pages: ['111', '222'], state: 'abc' }),
      [{ page: '111' }, { page: '222' }]
    );
  });

  it('passes Instagram / YouTube / GMB objects through', () => {
    assert.deepEqual(
      providerPageSelections({
        pages: [
          { id: 'ig-1', pageId: 'fb-1' },
          { id: 'ig-2', pageId: 'fb-2' },
        ],
      }),
      [
        { id: 'ig-1', pageId: 'fb-1' },
        { id: 'ig-2', pageId: 'fb-2' },
      ]
    );
  });

  it('keeps a single Instagram selection without wrapping it in page', () => {
    assert.deepEqual(
      providerPageSelections({ id: 'ig-1', pageId: 'fb-1', state: 'x' }),
      [{ id: 'ig-1', pageId: 'fb-1' }]
    );
  });

  it('returns nothing when the body is empty or not an object', () => {
    assert.deepEqual(providerPageSelections(null), []);
    assert.deepEqual(providerPageSelections({ state: 'abc' }), []);
    assert.deepEqual(providerPageSelections([]), []);
  });
});
