import type { LedgerMeta, Tag } from './models'

export interface OpResult {
  ok?: boolean
  error?: string
}

export type LedgerOpenResult = LedgerMeta | { error: string }
export type LedgerCreateResult = LedgerMeta | { error: string }

export interface BackupCreateResult {
  ok?: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export interface BackupRestoreResult {
  ok?: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export interface ExportCsvResult {
  ok?: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export interface ExportJsonResult {
  ok?: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export type WithError<T> = T | { error: string }
