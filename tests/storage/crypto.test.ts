import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3-multiple-ciphers'
import {
  createEncryptedDatabase,
  openEncryptedDatabase,
  changeDatabasePassword,
  CryptoError,
  KDF_ITERATIONS
} from '../../src/main/services/crypto-service'

const dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tally-crypto-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  while (dirs.length > 0) {
    rmSync(dirs.pop()!, { recursive: true, force: true })
  }
})

describe('SQLCipher 加密', () => {
  it('错误密码必须抛出 INVALID_PASSWORD，且不泄露明文', () => {
    const dir = tempDir()
    const file = join(dir, 'a.ledger')
    const db = createEncryptedDatabase(file, 'correct-password')
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, secret TEXT)')
    db.prepare('INSERT INTO t (secret) VALUES (?)').run('top-secret')
    db.close()

    const raw = readFileSync(file).toString('latin1')
    expect(raw).not.toContain('top-secret')
    expect(raw).not.toContain('CREATE TABLE')

    expect(() => openEncryptedDatabase(file, 'wrong-password')).toThrow(CryptoError)
    expect(() => openEncryptedDatabase(file, 'wrong-password')).toThrow(/INVALID_PASSWORD|密码错误/)
  })

  it('正确密码可读取数据，KDF 迭代次数生效', () => {
    const dir = tempDir()
    const file = join(dir, 'b.ledger')
    const db = createEncryptedDatabase(file, 'p@ssword')
    db.pragma('cipher_migrate')
    const kdf = db.pragma('kdf_iter') as Record<string, string>[]
    expect(Object.values(kdf[0]).join(',')).toContain(String(KDF_ITERATIONS))
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)')
    db.prepare('INSERT INTO t (v) VALUES (?)').run('hello')
    db.close()

    const reopened = openEncryptedDatabase(file, 'p@ssword')
    const row = reopened.prepare('SELECT v FROM t').get() as { v: string }
    expect(row.v).toBe('hello')
    reopened.close()
  })

  it('需求4.3: PRAGMA rekey 改密后旧密码失效、新密码可打开', () => {
    const dir = tempDir()
    const file = join(dir, 'c.ledger')
    const db = createEncryptedDatabase(file, 'old-password')
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)')
    db.prepare('INSERT INTO t (v) VALUES (?)').run('data')
    changeDatabasePassword(db, 'old-password', 'new-password')
    db.close()

    expect(() => openEncryptedDatabase(file, 'old-password')).toThrow(CryptoError)
    const reopened = openEncryptedDatabase(file, 'new-password')
    const row = reopened.prepare('SELECT v FROM t').get() as { v: string }
    expect(row.v).toBe('data')
    reopened.close()
  })

  it('文件头为 SQLCipher 加密格式，无明文特征', () => {
    const dir = tempDir()
    const file = join(dir, 'd.ledger')
    const db = createEncryptedDatabase(file, 'password')
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)')
    db.close()
    const raw = readFileSync(file)
    expect(raw.length).toBeGreaterThan(0)
    expect(raw.includes(Buffer.from('SQLite format 3', 'latin1'))).toBe(false)
  })

  it('密码含单引号也能正确处理', () => {
    const dir = tempDir()
    const file = join(dir, 'e.ledger')
    const db = createEncryptedDatabase(file, "it's-secret")
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)')
    db.prepare('INSERT INTO t (v) VALUES (?)').run('ok')
    db.close()

    const reopened = openEncryptedDatabase(file, "it's-secret")
    const row = reopened.prepare('SELECT v FROM t').get() as { v: string }
    expect(row.v).toBe('ok')
    reopened.close()
  })

  it('明文数据库用 SQLCipher 打开应报错而非静默成功', () => {
    const dir = tempDir()
    const file = join(dir, 'plain.db')
    const plain = new Database(file)
    plain.exec('CREATE TABLE t (id INTEGER PRIMARY KEY)')
    plain.close()

    expect(() => openEncryptedDatabase(file, 'any-password')).toThrow()
  })
})
