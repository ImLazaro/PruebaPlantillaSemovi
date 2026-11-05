import type { TableColumn } from './institutional-table.component';

export type SortDirection = 'asc' | 'desc' | null;

export function getNextSortState(
  currentColumn: string | null,
  currentDirection: SortDirection,
  targetColumn: string
): { column: string | null; direction: SortDirection } {
  if (currentColumn !== targetColumn) {
    return { column: targetColumn, direction: 'asc' };
  }

  if (currentDirection === 'asc') {
    return { column: targetColumn, direction: 'desc' };
  }

  if (currentDirection === 'desc') {
    return { column: null, direction: null };
  }

  return { column: targetColumn, direction: 'asc' };
}

export function getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current !== null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function resolveSortValue(item: Record<string, unknown>, sortColumn: string): unknown {
  if (sortColumn === 'person.full_name') {
    const person = item['person'] as Record<string, unknown> | undefined;
    return person
      ? `${person['first_name'] ?? ''} ${person['last_name'] ?? ''} ${person['second_last_name'] ?? ''}`.trim()
      : '';
  }

  return getNestedProperty(item, sortColumn);
}

function compareValues(valueA: unknown, valueB: unknown): number {
  if (valueA == null && valueB == null) return 0;
  if (valueA == null) return 1;
  if (valueB == null) return -1;

  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase(), 'es-ES');
  }

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  if (valueA instanceof Date && valueB instanceof Date) {
    return valueA.getTime() - valueB.getTime();
  }

  return String(valueA).toLowerCase().localeCompare(String(valueB).toLowerCase(), 'es-ES');
}

export function sortDataLocally(
  data: Record<string, unknown>[],
  sortColumn: string | null,
  sortDirection: SortDirection
): Record<string, unknown>[] {
  if (!sortColumn || !sortDirection) {
    return [...data];
  }

  return [...data].sort((a, b) => {
    const comparison = compareValues(resolveSortValue(a, sortColumn), resolveSortValue(b, sortColumn));
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

export function toggleSelectedItem<T>(selectedItems: T[], item: T): T[] {
  return selectedItems.includes(item)
    ? selectedItems.filter(selected => selected !== item)
    : [...selectedItems, item];
}

export function computeSelectionState(selectedItems: unknown[], displayData: unknown[]): { allSelected: boolean; someSelected: boolean } {
  return {
    allSelected: displayData.length > 0 && selectedItems.length === displayData.length,
    someSelected: selectedItems.length > 0 && selectedItems.length < displayData.length
  };
}

export function computeStickyOffsets(columns: TableColumn[], widthMap: Record<number, number>): {
  leftOffsets: Record<number, number>;
  rightOffsets: Record<number, number>;
} {
  const leftOffsets: Record<number, number> = {};
  const rightOffsets: Record<number, number> = {};

  const leftPinnedIndexes = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.pin === 'left')
    .map(({ index }) => index)
    .sort((a, b) => a - b);

  let accumulated = 0;
  for (const index of leftPinnedIndexes) {
    leftOffsets[index] = accumulated;
    accumulated += widthMap[index] ?? 0;
  }

  const rightPinnedIndexes = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.pin === 'right')
    .map(({ index }) => index)
    .sort((a, b) => b - a);

  accumulated = 0;
  for (const index of rightPinnedIndexes) {
    rightOffsets[index] = accumulated;
    accumulated += widthMap[index] ?? 0;
  }

  return { leftOffsets, rightOffsets };
}


export function applyLocalSortState(params: {
  localSort?: boolean;
  originalData: Record<string, unknown>[];
  sortColumn: string | null;
  sortDirection: SortDirection;
}): Record<string, unknown>[] {
  if (!params.localSort) {
    return [...params.originalData];
  }

  if (!params.originalData.length) {
    return [];
  }

  if (!params.sortColumn || !params.sortDirection) {
    return [...params.originalData];
  }

  return sortDataLocally(params.originalData, params.sortColumn, params.sortDirection);
}

export function resolveDisplayData(params: {
  localSort?: boolean;
  sortedData: Record<string, unknown>[];
  originalData: Record<string, unknown>[];
  inputData: Record<string, unknown>[];
}): Record<string, unknown>[] {
  if (params.localSort) {
    return params.sortedData.length > 0 ? params.sortedData : params.originalData;
  }

  return params.inputData ?? [];
}

export function buildSelectionChangeEvent(params: {
  selectedItems: unknown[];
  totalItems: number;
}): { selectedItems: Record<string, unknown>[]; allSelected: boolean } {
  return {
    selectedItems: params.selectedItems as Record<string, unknown>[],
    allSelected: params.totalItems > 0 && params.selectedItems.length === params.totalItems
  };
}

export function buildSelectAllChangeEvent(checked: boolean, displayData: Record<string, unknown>[]): {
  selectedItems: Record<string, unknown>[];
  allSelected: boolean;
} {
  return {
    selectedItems: checked ? [...displayData] : [],
    allSelected: checked
  };
}

export function buildWidthMapFromHeaderCells(
  headerCells: Array<{ getAttribute: (name: string) => string | null; offsetWidth: number }>
): Record<number, number> {
  const widthMap: Record<number, number> = {};

  for (const cell of headerCells) {
    const idx = cell.getAttribute('data-col-index');
    if (idx !== null) {
      widthMap[Number(idx)] = cell.offsetWidth;
    }
  }

  return widthMap;
}
