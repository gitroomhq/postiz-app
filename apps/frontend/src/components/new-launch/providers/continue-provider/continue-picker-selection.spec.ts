import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  asContinueSelectionList,
  itemIsContinueSelected,
  toggleContinueSelection,
} from './continue-picker-selection.ts';

const pages = [
  { id: 'a', name: 'PostQueen' },
  { id: 'b', name: 'Europe Esim' },
  { id: 'c', name: 'RedSim' },
];

const getValue = (item: (typeof pages)[number]) => item.id;
const isSelected = (
  item: (typeof pages)[number],
  selection: string | null
) => selection === item.id;

describe('toggleContinueSelection', () => {
  it('adds and removes pages without replacing the rest', () => {
    const afterFirst = toggleContinueSelection(
      null,
      pages[0],
      getValue,
      isSelected
    );
    assert.deepEqual(afterFirst, ['a']);

    const afterSecond = toggleContinueSelection(
      afterFirst,
      pages[2],
      getValue,
      isSelected
    );
    assert.deepEqual(afterSecond, ['a', 'c']);

    const afterRemove = toggleContinueSelection(
      afterSecond,
      pages[0],
      getValue,
      isSelected
    );
    assert.deepEqual(afterRemove, ['c']);
  });
});

describe('itemIsContinueSelected', () => {
  it('treats an array as many checked pages', () => {
    assert.equal(itemIsContinueSelected(pages[0], ['a', 'c'], isSelected), true);
    assert.equal(itemIsContinueSelected(pages[1], ['a', 'c'], isSelected), false);
  });
});

describe('asContinueSelectionList', () => {
  it('normalizes null, one value, and a list', () => {
    assert.deepEqual(asContinueSelectionList(null), []);
    assert.deepEqual(asContinueSelectionList('a'), ['a']);
    assert.deepEqual(asContinueSelectionList(['a', 'b']), ['a', 'b']);
  });
});
