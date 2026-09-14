export function asContinueSelectionList<T>(
  selection: T | T[] | null
): T[] {
  if (Array.isArray(selection)) {
    return selection;
  }
  return selection == null ? [] : [selection];
}

export function toggleContinueSelection<TItem, TSelection>(
  current: TSelection | TSelection[] | null,
  item: TItem,
  getValue: (item: TItem) => TSelection,
  isSelected: (item: TItem, selection: TSelection | null) => boolean
): TSelection[] {
  const list = asContinueSelectionList(current);
  if (list.some((value) => isSelected(item, value))) {
    return list.filter((value) => !isSelected(item, value));
  }
  return [...list, getValue(item)];
}

export function itemIsContinueSelected<TItem, TSelection>(
  item: TItem,
  selection: TSelection | TSelection[] | null,
  isSelected: (item: TItem, selection: TSelection | null) => boolean
): boolean {
  return asContinueSelectionList(selection).some((value) =>
    isSelected(item, value)
  );
}
