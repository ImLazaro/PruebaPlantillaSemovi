/**
 * QueryBuilder Utility for Frontend
 * 
 * Transforms filter objects into URL query parameters with operator notation
 * compatible with the backend QueryParserUtility.
 * 
 * EXAMPLES:
 * Input:  { nombre: 'Juan', activo: true }
 * Output: nombre[like]=%Juan%&activo[eq]=true
 * 
 * Input:  { edad: { gte: 18 }, categoria: { in: ['A', 'B'] } }
 * Output: edad[gte]=18&categoria[in]=A,B
 */

/**
 * Supported filter operators matching backend QueryParserUtility
 */
export enum FilterOperator {
  EQ = 'eq',       // Equal
  NE = 'ne',       // Not equal
  IN = 'in',       // In list
  NIN = 'nin',     // Not in list
  GT = 'gt',       // Greater than
  LT = 'lt',       // Less than
  GTE = 'gte',     // Greater than or equal
  LTE = 'lte',     // Less than or equal
  LIKE = 'like',   // Partial match
  ILIKE = 'ilike', // Case-insensitive partial match
  BETWEEN = 'between',  // Range
  NULL = 'null'    // Is null / is not null
}

/**
 * Filter value can be a primitive or an object with operator
 */
export type FilterValue = 
  | string 
  | number 
  | boolean 
  | null
  | { [operator: string]: unknown };

/**
 * Filter object structure
 */
export interface FilterObject {
  [field: string]: FilterValue;
}

/**
 * QueryBuilder class for constructing URL query parameters
 */
export class QueryBuilder {
  /**
   * Cache of valid operators for performance
   */
  private static readonly VALID_OPERATORS = new Set(Object.values(FilterOperator));

  /**
   * Build query parameters from a filter object
   * Automatically adds LIKE wildcards for string values unless operator is specified
   * 
   * @param filters Filter object with field names and values
   * @param options Configuration options
   * @returns Record of query parameters ready for HttpParams
   */
  static buildQueryParams(
    filters: FilterObject,
    options: {
      autoLike?: boolean;  // Automatically wrap strings with % for LIKE operator (default: true)
      skipEmpty?: boolean;  // Skip null/undefined/empty string values (default: true)
      likeOperator?: FilterOperator.LIKE | FilterOperator.ILIKE; // Operator for string searches (default: ilike)
    } = {}
  ): Record<string, string> {
    const { autoLike = true, skipEmpty = true, likeOperator = FilterOperator.ILIKE } = options;
    const params: Record<string, string> = {};

    for (const [field, value] of Object.entries(filters)) {
      // Skip empty values if configured
      if (skipEmpty && this.isEmptyValue(value)) {
        continue;
      }

      // Handle object notation with explicit operators
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const operators = Object.keys(value);
        if (operators.length === 1) {
          const operator = operators[0];
          const operatorValue = value[operator];
          
          if (this.isValidOperator(operator)) {
            const paramKey = `${field}[${operator}]`;
            params[paramKey] = this.formatValue(operatorValue, operator as FilterOperator);
            continue;
          }
        }
      }

      // Handle simple values
      if (typeof value === 'string') {
        // Auto-wrap strings with % for LIKE operator if configured
        if (autoLike && !value.includes('%')) {
          params[`${field}[${likeOperator}]`] = `%${value}%`;
        } else if (autoLike && value.includes('%')) {
          // Already has wildcards, use as-is with LIKE
          params[`${field}[${likeOperator}]`] = value;
        } else {
          // Use exact match
          params[`${field}[eq]`] = value;
        }
      } else if (typeof value === 'boolean') {
        params[`${field}[eq]`] = String(value);
      } else if (typeof value === 'number') {
        params[`${field}[eq]`] = String(value);
      } else if (value === null) {
        params[`${field}[null]`] = 'true';
      }
    }

    return params;
  }

  /**
   * Format value based on operator
   */
  private static formatValue(value: unknown, operator: FilterOperator): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (operator) {
      case FilterOperator.IN:
      case FilterOperator.NIN:
        // Array values - join with comma
        if (Array.isArray(value)) {
          if (value.length === 0) {
            throw new Error('IN/NIN operator requires at least one value');
          }
          return value.map(v => String(v)).join(',');
        }
        return String(value);

      case FilterOperator.BETWEEN:
        // Range values - expect [min, max] array
        if (Array.isArray(value) && value.length === 2) {
          return `${value[0]},${value[1]}`;
        }
        throw new Error('BETWEEN operator requires array with 2 values');

      case FilterOperator.NULL:
        // Boolean for null check
        return String(Boolean(value));

      case FilterOperator.LIKE:
      case FilterOperator.ILIKE:
        // String with wildcards
        return String(value);

      default:
        // All other operators - simple value
        return String(value);
    }
  }

  /**
   * Check if value is empty
   */
  private static isEmptyValue(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  /**
   * Validate if string is a valid operator
   */
  private static isValidOperator(operator: string): boolean {
    return this.VALID_OPERATORS.has(operator as FilterOperator);
  }

  /**
   * Merge filter params with other query params (page, limit, sort, etc.)
   */
  static mergeParams(
    filters: FilterObject,
    otherParams: Record<string, unknown> = {}
  ): Record<string, string> {
    const filterParams = this.buildQueryParams(filters);
    const result: Record<string, string> = { ...filterParams };

    // Add other params (pagination, sorting, etc.)
    for (const [key, value] of Object.entries(otherParams)) {
      if (value !== null && value !== undefined && value !== '') {
        result[key] = String(value);
      }
    }

    return result;
  }
}
