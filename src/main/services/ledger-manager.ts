import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import Database from 'better-sqlite3-multiple-ciphers'
import type { LedgerMeta } from '@shared/types/models'
import { StorageService } from './storage'
import { migrateSchema, seedDefaultCategories } from './storage/schema'
import {
  createEncryptedDatabase,
  openEncryptedDatabase,
  changeDatabasePassword,
  CryptoError
} from './crypto-service'

interface AppConfig {
  lastLedgerPath?: string
  backupReminder: boolean
  globalShortcut: string
}

export class LedgerManager {
  private db: Database.Database | null = null
  private storage: StorageService | null = null
  private currentPath: string | null = null
  private currentName: string = ''
  private failCount = 0

  private get configPath(): string {
    const userData = app.getPath('userData')
    return join(userData, 'config.json')
  }

  private readConfig(): AppConfig {
    try {
      if (existsSync(this.configPath)) {
        const raw = require('fs').readFileSync(this.configPath, 'utf-8')
        const parsed = JSON.parse(raw)
        return {
          backupReminder: parsed.backupReminder ?? false,
          globalShortcut: parsed.globalShortcut ?? 'CommandOrControl+Shift+K',
          lastLedgerPath: parsed.lastLedgerPath
        }
      }
    } catch {
      // ignore malformed config
    }
    return { backupReminder: false, globalShortcut: 'CommandOrControl+Shift+K' }
  }

  private writeConfig(config: AppConfig): void {
    mkdirSync(app.getPath('userData'), { recursive: true })
    require('fs').writeFileSync(this.configPath, JSON.stringify(config, null, 2))
  }

  get isOpen(): boolean {
    return this.db !== null
  }

  get storageService(): StorageService {
    if (!this.storage || !this.db) {
      throw new Error('LEDGER_NOT_OPEN')
    }
    return this.storage
  }

  get metadata(): LedgerMeta | null {
    if (!this.db) {
      return null
    }
    return {
      path: this.currentPath!,
      name: this.currentName,
      openedAt: Date.now()
    }
  }

  open(path: string, password: string): LedgerMeta {
    if (!existsSync(path)) {
      throw new Error('FILE_NOT_FOUND')
    }
    try {
      const db = openEncryptedDatabase(path, password)
      this.db = db
      this.storage = new StorageService(db)
      this.currentPath = path
      this.currentName = this.extractName(path)
      this.failCount = 0
      const config = this.readConfig()
      config.lastLedgerPath = path
      this.writeConfig(config)
      return this.metadata!
    } catch (error) {
      if (error instanceof CryptoError && error.code === 'INVALID_PASSWORD') {
        this.failCount += 1
        if (this.failCount >= 5) {
          throw new Error('TOO_MANY_ATTEMPTS')
        }
        throw error
      }
      throw error
    }
  }

  create(path: string, password: string, name: string): LedgerMeta {
    if (existsSync(path)) {
      throw new Error('FILE_EXISTS')
    }
    const db = createEncryptedDatabase(path, password)
    migrateSchema(db)
    seedDefaultCategories(db)
    this.db = db
    this.storage = new StorageService(db)
    this.currentPath = path
    this.currentName = name || this.extractName(path)
    this.failCount = 0
    const config = this.readConfig()
    config.lastLedgerPath = path
    this.writeConfig(config)
    return this.metadata!
  }

  changePassword(oldPassword: string, newPassword: string): void {
    if (!this.db) {
      throw new Error('LEDGER_NOT_OPEN')
    }
    changeDatabasePassword(this.db, oldPassword, newPassword)
  }

  close(): void {
    if (this.db) {
      try {
        this.db.pragma('optimize')
      } catch {
        // ignore
      }
      this.db.close()
    }
    this.db = null
    this.storage = null
    this.currentPath = null
    this.currentName = ''
    this.failCount = 0
  }

  deleteCurrent(): string {
    const path = this.currentPath ?? this.getLastUsedPath()
    if (!path) {
      throw new Error('LEDGER_NOT_FOUND')
    }
    if (this.db) {
      try {
        this.db.close()
      } catch {
        // ignore
      }
      this.db = null
      this.storage = null
      this.currentName = ''
    }
    const { unlinkSync } = require('fs')
    const targets = [path, `${path}.salt`]
    for (const target of targets) {
      if (existsSync(target)) {
        unlinkSync(target)
      }
    }
    this.currentPath = null
    this.failCount = 0
    const config = this.readConfig()
    if (config.lastLedgerPath === path) {
      delete config.lastLedgerPath
    }
    this.writeConfig(config)
    return path
  }

  getLastUsedPath(): string | null {
    return this.readConfig().lastLedgerPath ?? null
  }

  getBackupReminder(): boolean {
    return this.readConfig().backupReminder
  }

  setBackupReminder(enabled: boolean): void {
    const config = this.readConfig()
    config.backupReminder = enabled
    this.writeConfig(config)
  }

  getGlobalShortcut(): string {
    return this.readConfig().globalShortcut
  }

  setGlobalShortcut(accelerator: string): void {
    const config = this.readConfig()
    config.globalShortcut = accelerator
    this.writeConfig(config)
  }

  private extractName(path: string): string {
    const base = path.split(/[\\/]/).pop() ?? 'ledger'
    return base.replace(/\.ledger$/, '')
  }
}
