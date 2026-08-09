import Database from 'better-sqlite3-multiple-ciphers'

export const KDF_ITERATIONS = 600000

export class CryptoError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CryptoError'
    this.code = code
  }
}

function applyCipherConfig(db: Database.Database, password: string): void {
  db.pragma("cipher = 'sqlcipher'")
  db.pragma('legacy = 4')
  db.pragma('cipher_kdf_algorithm = 1')
  db.pragma('cipher_hmac_algorithm = 1')
  db.pragma(`kdf_iter = ${KDF_ITERATIONS}`)
  db.pragma(`key = '${sanitizeSqlString(password)}'`)
  db.pragma('cipher_migrate')
}

export function openEncryptedDatabase(path: string, password: string): Database.Database {
  const db = new Database(path, { readonly: false })
  try {
    applyCipherConfig(db, password)
    verifyPassword(db)
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export function createEncryptedDatabase(path: string, password: string): Database.Database {
  const db = new Database(path)
  try {
    applyCipherConfig(db, password)
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export function changeDatabasePassword(
  db: Database.Database,
  oldPassword: string,
  newPassword: string
): void {
  db.pragma('cipher_migrate')
  db.pragma(`rekey = '${sanitizeSqlString(newPassword)}'`)
}

export function verifyPassword(db: Database.Database): void {
  try {
    db.prepare('SELECT count(*) AS c FROM sqlite_master').get()
  } catch (error) {
    if (error instanceof Error && error.message.includes('file is not a database')) {
      throw new CryptoError('INVALID_PASSWORD', '密码错误或文件已损坏')
    }
    throw error
  }
}

function sanitizeSqlString(value: string): string {
  return value.replace(/'/g, "''")
}
