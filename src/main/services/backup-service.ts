import { copyFileSync, existsSync } from 'fs'
import type { StorageService } from './storage'
import { openEncryptedDatabase, CryptoError } from './crypto-service'
import type Database from 'better-sqlite3-multiple-ciphers'

export class BackupService {
  constructor(private storage: StorageService) {}

  create(targetPath: string): void {
    const db = this.storage.raw()
    const sourcePath = this.getDbPath(db)
    if (!existsSync(sourcePath)) {
      throw new Error('LEDGER_NOT_FOUND')
    }
    if (existsSync(targetPath)) {
      throw new Error('TARGET_EXISTS')
    }
    copyFileSync(sourcePath, targetPath)
    const saltFile = `${sourcePath}.salt`
    if (existsSync(saltFile)) {
      copyFileSync(saltFile, `${targetPath}.salt`)
    }
  }

  restore(backupPath: string, password: string, targetPath: string): void {
    if (!existsSync(backupPath)) {
      throw new Error('BACKUP_NOT_FOUND')
    }
    try {
      const backupDb = openEncryptedDatabase(backupPath, password)
      backupDb.close()
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error
      }
      throw new Error('CORRUPTED_BACKUP')
    }

    const currentDb = this.storage.raw()
    const currentPath = this.getDbPath(currentDb)
    currentDb.close()

    copyFileSync(backupPath, targetPath)
    const backupSaltFile = `${backupPath}.salt`
    if (existsSync(backupSaltFile)) {
      copyFileSync(backupSaltFile, `${targetPath}.salt`)
    }
    if (currentPath !== targetPath && existsSync(currentPath)) {
      copyFileSync(currentPath, `${currentPath}.pre-restore`)
    }
  }

  private getDbPath(db: Database.Database): string {
    const rows = db.pragma('database_list') as unknown as Array<{ file: string }>
    return rows[0].file
  }
}
