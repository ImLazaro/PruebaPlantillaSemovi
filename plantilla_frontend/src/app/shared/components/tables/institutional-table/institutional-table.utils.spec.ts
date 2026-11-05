import {
  applyLocalSortState,
  buildSelectAllChangeEvent,
  buildSelectionChangeEvent,
  buildWidthMapFromHeaderCells,
  computeSelectionState,
  computeStickyOffsets,
  getNestedProperty,
  getNextSortState,
  resolveDisplayData,
  sortDataLocally,
  toggleSelectedItem
} from './institutional-table.utils';

describe('institutional-table.utils', () => {
  it('calcula transición de sort asc/desc/null', () => {
    expect(getNextSortState(null, null, 'name')).toEqual({ column: 'name', direction: 'asc' });
    expect(getNextSortState('name', 'asc', 'name')).toEqual({ column: 'name', direction: 'desc' });
    expect(getNextSortState('name', 'desc', 'name')).toEqual({ column: null, direction: null });
  });

  it('ordena datos localmente', () => {
    const result = sortDataLocally([
      { name: 'Zulu' },
      { name: 'alpha' }
    ], 'name', 'asc');

    expect(result.map(item => item['name'])).toEqual(['alpha', 'Zulu']);
  });

  it('resuelve selección y estados', () => {
    const row = { id: 1 };
    const updated = toggleSelectedItem([], row);
    expect(updated).toEqual([row]);
    expect(computeSelectionState(updated, [row])).toEqual({ allSelected: true, someSelected: false });
  });

  it('calcula offsets sticky para pinning', () => {
    const { leftOffsets, rightOffsets } = computeStickyOffsets([
      { key: 'a', label: 'A', pin: 'left' },
      { key: 'b', label: 'B' },
      { key: 'c', label: 'C', pin: 'right' }
    ], { 0: 100, 2: 80 });

    expect(leftOffsets[0]).toBe(0);
    expect(rightOffsets[2]).toBe(0);
    expect(getNestedProperty({ person: { name: 'Ana' } }, 'person.name')).toBe('Ana');
  });

  it('compone estado local de ordenamiento y display', () => {
    const originalData = [{ name: 'Zulu' }, { name: 'Alpha' }];
    const sortedData = applyLocalSortState({
      localSort: true,
      originalData,
      sortColumn: 'name',
      sortDirection: 'asc'
    });

    expect(sortedData.map(item => item['name'])).toEqual(['Alpha', 'Zulu']);

    expect(resolveDisplayData({
      localSort: true,
      sortedData,
      originalData,
      inputData: []
    })).toEqual(sortedData);
  });

  it('compone eventos de selección y mapeo de widths', () => {
    expect(buildSelectionChangeEvent({ selectedItems: [{ id: 1 }], totalItems: 1 })).toEqual({
      selectedItems: [{ id: 1 }],
      allSelected: true
    });

    expect(buildSelectAllChangeEvent(true, [{ id: 1 }])).toEqual({
      selectedItems: [{ id: 1 }],
      allSelected: true
    });

    expect(buildWidthMapFromHeaderCells([
      { getAttribute: () => '0', offsetWidth: 120 },
      { getAttribute: () => '2', offsetWidth: 80 }
    ])).toEqual({ 0: 120, 2: 80 });
  });
});
