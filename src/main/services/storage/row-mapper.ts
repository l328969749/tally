export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
}

export function mapRow<T>(row: unknown): T {
  if (row === null || row === undefined || typeof row !== 'object' || Array.isArray(row)) {
    return row as T
  }
  const source = row as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(source)) {
    result[toCamelCase(key)] = source[key]
  }
  return result as T
}

export function mapRows<T>(rows: unknown[]): T[] {
  return rows.map((row) => mapRow<T>(row))
}
