/**
 * Serialization utilities for complex data types like Maps
 */

// Map serialization helpers
export function mapReplacer(key: string, value: any): any {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries())
    };
  }
  return value;
}

export function mapReviver(key: string, value: any): any {
  if (typeof value === 'object' && value !== null && value.dataType === 'Map') {
    return new Map(value.value);
  }
  return value;
}

export const serializer = {
  serialize: (data: any) => JSON.stringify(data, mapReplacer),
  deserialize: (data: string) => JSON.parse(data, mapReviver)
};