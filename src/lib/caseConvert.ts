// Shallow key-case conversion between Postgres's snake_case columns and the
// app's existing camelCase JS shapes (kept from the Firestore era). Only the
// top-level keys are converted — jsonb column contents are stored/read as
// plain camelCase blobs and left untouched.

const toCamelKey = (key: string) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnakeKey = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function snakeToCamel<T = any>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    out[toCamelKey(key)] = row[key];
  }
  return out as T;
}

export function camelToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    out[toSnakeKey(key)] = obj[key];
  }
  return out;
}
