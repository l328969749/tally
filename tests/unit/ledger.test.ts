// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { LedgerMeta } from '@shared/types/models'

const meta: LedgerMeta = { path: '/tmp/test.ledger', name: '测试', createdAt: '2026-01-01T00:00:00.000Z' }

const { api } = vi.hoisted(() => ({
  api: {
    ledger: {
      open: vi.fn(),
      create: vi.fn(),
      close: vi.fn(),
      delete: vi.fn(),
      getLastUsed: vi.fn(),
      getAutoOpenLastLedger: vi.fn()
    }
  }
}))

vi.stubGlobal('window', { api })

import { useLedgerStore } from '@renderer/stores/ledger'

describe('ledger store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    api.ledger.open.mockReset()
    api.ledger.create.mockReset()
    api.ledger.close.mockReset()
    api.ledger.delete.mockReset()
    api.ledger.getLastUsed.mockReset()
    api.ledger.getAutoOpenLastLedger.mockReset()
  })

  it('open 成功时写入 meta', async () => {
    api.ledger.open.mockResolvedValue(meta)
    const store = useLedgerStore()
    await store.open('/tmp/test.ledger', 'pw')
    expect(store.meta).toEqual(meta)
    expect(store.isOpen).toBe(true)
  })

  it('open 返回 error 时抛出并清空 meta', async () => {
    api.ledger.open.mockResolvedValue({ error: 'PASSWORD_WRONG' })
    const store = useLedgerStore()
    await expect(store.open('/tmp/test.ledger', 'bad')).rejects.toThrow('PASSWORD_WRONG')
    expect(store.meta).toBeNull()
  })

  it('close 成功时清空 meta', async () => {
    api.ledger.close.mockResolvedValue({ ok: true })
    const store = useLedgerStore()
    store.meta = meta
    await store.close()
    expect(store.meta).toBeNull()
    expect(store.isOpen).toBe(false)
  })

  it('close 返回 error 时抛出并保留 meta', async () => {
    api.ledger.close.mockResolvedValue({ error: 'CLOSE_FAILED' })
    const store = useLedgerStore()
    store.meta = meta
    await expect(store.close()).rejects.toThrow('CLOSE_FAILED')
    expect(store.meta).toEqual(meta)
  })
})
