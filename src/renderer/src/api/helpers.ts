export function unwrap<T>(result: T | { error: string }): T {
  if (result && typeof result === 'object' && 'error' in result) {
    throw new Error((result as { error: string }).error)
  }
  return result as T
}

export function assertOk(result: { ok?: boolean; error?: string }): void {
  if (result.error) {
    throw new Error(result.error)
  }
}
