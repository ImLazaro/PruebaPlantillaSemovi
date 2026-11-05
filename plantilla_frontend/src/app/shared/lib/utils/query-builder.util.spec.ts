import { QueryBuilder, FilterOperator } from './query-builder.util';

describe('QueryBuilder', () => {
  describe('buildQueryParams - Simple Values', () => {
    it('should convert string to LIKE with wildcards by default', () => {
      const filters = { nombre: 'Juan' };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['nombre[ilike]']).toBe('%Juan%');
    });

    it('should convert boolean to EQ operator', () => {
      const filters = { activo: true, eliminado: false };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['activo[eq]']).toBe('true');
      expect(params['eliminado[eq]']).toBe('false');
    });

    it('should convert number to EQ operator', () => {
      const filters = { edad: 25, precio: 99.99 };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['edad[eq]']).toBe('25');
      expect(params['precio[eq]']).toBe('99.99');
    });

    it('should convert null to NULL operator', () => {
      const filters = { deletedAt: null };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['deletedAt[null]']).toBe('true');
    });

    it('should preserve existing wildcards in strings', () => {
      const filters = { email: '%@example.com' };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['email[ilike]']).toBe('%@example.com');
    });
  });

  describe('buildQueryParams - Explicit Operators', () => {
    it('should handle greater than or equal operator', () => {
      const filters = { edad: { gte: 18 } };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['edad[gte]']).toBe('18');
    });

    it('should handle not equal operator', () => {
      const filters = { status: { ne: 'Pending' } };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['status[ne]']).toBe('Pending');
    });

    it('should handle IN operator with array', () => {
      const filters = { categoria: { in: ['A', 'B', 'C'] } };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['categoria[in]']).toBe('A,B,C');
    });

    it('should handle BETWEEN operator with array', () => {
      const filters = { edad: { between: [18, 30] } };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['edad[between]']).toBe('18,30');
    });

    it('should handle LIKE operator with explicit wildcards', () => {
      const filters = { nombre: { ilike: 'Juan%' } };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['nombre[like]']).toBe('Juan%');
    });
  });

  describe('buildQueryParams - Options', () => {
    it('should disable auto-like when configured', () => {
      const filters = { nombre: 'Juan' };
      const params = QueryBuilder.buildQueryParams(filters, { autoLike: false });
      
      expect(params['nombre[eq]']).toBe('Juan');
      expect(params['nombre[like]']).toBeUndefined();
    });

    it('should skip empty values when configured', () => {
      const filters = { nombre: 'Juan', apellido: '', edad: null };
      const params = QueryBuilder.buildQueryParams(filters, { skipEmpty: true });
      
      expect(params['nombre[ilike]']).toBe('%Juan%');
      expect(params['apellido[eq]']).toBeUndefined();
      expect(params['edad[null]']).toBeUndefined();
    });

    it('should keep empty values when skipEmpty is false', () => {
      const filters = { nombre: '', apellido: null };
      const params = QueryBuilder.buildQueryParams(filters, { skipEmpty: false });
      
      expect(params['nombre[ilike]']).toBe('%%');
      expect(params['apellido[null]']).toBe('true');
    });
  });

  describe('buildQueryParams - Multiple Filters', () => {
    it('should handle multiple filters with different operators', () => {
      const filters = {
        nombre: 'Juan',
        edad: { gte: 18 },
        activo: true,
        categoria: { in: ['A', 'B'] }
      };
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['nombre[ilike]']).toBe('%Juan%');
      expect(params['edad[gte]']).toBe('18');
      expect(params['activo[eq]']).toBe('true');
      expect(params['categoria[in]']).toBe('A,B');
    });
  });

  describe('mergeParams', () => {
    it('should merge filters with pagination params', () => {
      const filters = { nombre: 'Juan', activo: true };
      const otherParams = { page: 1, limit: 10, sort: 'name' };
      const params = QueryBuilder.mergeParams(filters, otherParams);
      
      expect(params['nombre[ilike]']).toBe('%Juan%');
      expect(params['activo[eq]']).toBe('true');
      expect(params['page']).toBe('1');
      expect(params['limit']).toBe('10');
      expect(params['sort']).toBe('name');
    });

    it('should skip null and undefined values in other params', () => {
      const filters = { nombre: 'Juan' };
      const otherParams = { page: 1, limit: null, sort: undefined };
      const params = QueryBuilder.mergeParams(filters, otherParams);
      
      expect(params['page']).toBe('1');
      expect(params['limit']).toBeUndefined();
      expect(params['sort']).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filter object', () => {
      const filters = {};
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(Object.keys(params).length).toBe(0);
    });

    it('should throw error for invalid BETWEEN format', () => {
      const filters = { edad: { between: [18] } }; // Missing second value
      
      expect(() => {
        QueryBuilder.buildQueryParams(filters);
      }).toThrow('BETWEEN operator requires array with 2 values');
    });

    it('should handle complex nested scenario', () => {
      const filters = {
        firstName: 'Juan',
        lastName: { ilike: '%Perez%' },
        age: { gte: 18, lte: 65 }, // This would only use the first key
        status: { ne: 'Inactive' },
        category: { in: ['Electronics', 'Books'] }
      };
      
      // Note: Multiple operators on same field not supported - only first is used
      const params = QueryBuilder.buildQueryParams(filters);
      
      expect(params['firstName[ilike]']).toBe('%Juan%');
      expect(params['lastName[like]']).toBe('%Perez%');
      expect(params['age[gte]']).toBe('18'); // Only first operator
      expect(params['status[ne]']).toBe('Inactive');
      expect(params['category[in]']).toBe('Electronics,Books');
    });
  });
});
