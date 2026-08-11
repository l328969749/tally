import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const userDataDirs: string[] = []
let userDataDir = ''

vi.mock('electron', () => {
  return {
    app: {
      getPath: (name: string) => {
        if (name === 'userData') {
          return userDataDir
        }
        return join(userDataDir, name)
      }
    }
  }
})

import { LedgerManager } from '../../src/main/services/ledger-manager'
import { CryptoError } from '../../src/main/services/crypto-service'

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'tally-ledger-mgr-'))
  userDataDirs.push(userDataDir)
})

afterEach(() => {
  while (userDataDirs.length > 0) {
    rmSync(userDataDirs.pop()!, { recursive: true, force: true })
  }
})

describe('LedgerManager 账本生命周期', () => {
  it('创建账本：建表、默认分类种子、记录最近路径', () => {
    const manager = new LedgerManager()
    const ledgerPath = join(userDataDir, '家庭账本.ledger')
    const meta = manager.create(ledgerPath, 'secret-123', '家庭账本')

    expect(manager.isOpen).toBe(true)
    expect(meta.name).toBe('家庭账本')
    expect(existsSync(ledgerPath)).toBe(true)

    const storage = manager.storageService
    const categories = storage.category.list()
    expect(categories.length).toBe(13)
    expect(categories.some((c) => c.name === '工资')).toBe(true)

    expect(manager.getLastUsedPath()).toBe(ledgerPath)
    manager.close()
  })

  it('打开账本：路径不存在报 FILE_NOT_FOUND', () => {
    const manager = new LedgerManager()
    expect(() => manager.open(join(userDataDir, 'nope.ledger'), 'pw')).toThrow('FILE_NOT_FOUND')
  })

  it('需求1.8: 连续 5 次密码错误锁定为 TOO_MANY_ATTEMPTS', () => {
    const manager = new LedgerManager()
    const ledgerPath = join(userDataDir, 'lock.ledger')
    manager.create(ledgerPath, 'right-password')
    manager.close()

    for (let i = 0; i < 4; i++) {
      expect(() => manager.open(ledgerPath, 'wrong')).toThrow(CryptoError)
      expect(manager['failCount']).toBe(i + 1)
    }
    expect(() => manager.open(ledgerPath, 'wrong')).toThrow('TOO_MANY_ATTEMPTS')
    expect(manager.isOpen).toBe(false)
  })

  it('正确密码打开成功且重置失败计数', () => {
    const manager = new LedgerManager()
    const ledgerPath = join(userDataDir, 'open.ledger')
    manager.create(ledgerPath, 'pw-123')
    manager.close()

    expect(() => manager.open(ledgerPath, 'bad')).toThrow(CryptoError)
    const meta = manager.open(ledgerPath, 'pw-123')
    expect(meta.name).toBe('open')
    expect(manager.isOpen).toBe(true)
    expect(manager['failCount']).toBe(0)
    manager.close()
  })

  it('改密后：旧密码打开失败，新密码可打开', () => {
    const manager = new LedgerManager()
    const ledgerPath = join(userDataDir, 'rekey.ledger')
    manager.create(ledgerPath, 'old-pw')
    manager.storageService.transaction // ensure storage initialized
    manager.changePassword('old-pw', 'new-pw')
    manager.close()

    expect(() => manager.open(ledgerPath, 'old-pw')).toThrow()
    const reopened = manager.open(ledgerPath, 'new-pw')
    expect(reopened.name).toBe('rekey')
    manager.close()
  })

  it('关闭账本：isOpen=false 且 storage 访问抛 LEDGER_NOT_OPEN', () => {
    const manager = new LedgerManager()
    const ledgerPath = join(userDataDir, 'close.ledger')
    manager.create(ledgerPath, 'pw')
    manager.close()

    expect(manager.isOpen).toBe(false)
    expect(() => manager.storageService).toThrow('LEDGER_NOT_OPEN')
  })

  it('备份提醒开关持久化到 config.json', () => {
    const manager = new LedgerManager()
    expect(manager.getBackupReminder()).toBe(false)
    manager.setBackupReminder(true)
    const manager2 = new LedgerManager()
    expect(manager2.getBackupReminder()).toBe(true)
  })

  it('需求2.5: 删除账本删除文件并清除最近路径', () => {
    const manager = new LedgerManager()
    const ledgerPath = join(userDataDir, 'delete-me.ledger')
    manager.create(ledgerPath, 'pw-123')
    expect(existsSync(ledgerPath)).toBe(true)

    const deleted = manager.deleteCurrent()
    expect(deleted).toBe(ledgerPath)
    expect(manager.isOpen).toBe(false)
    expect(existsSync(ledgerPath)).toBe(false)
    expect(manager.getLastUsedPath()).toBe(null)
  })

  it('需求2.5: 未打开且无最近账本时删除抛 LEDGER_NOT_FOUND', () => {
    const manager = new LedgerManager()
    expect(() => manager.deleteCurrent()).toThrow('LEDGER_NOT_FOUND')
  })
})
