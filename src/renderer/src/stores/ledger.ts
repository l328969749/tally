import { defineStore } from 'pinia'
import type { LedgerMeta } from '@shared/types/models'

interface LedgerState {
  meta: LedgerMeta | null
  loading: boolean
}

export const useLedgerStore = defineStore('ledger', {
  state: (): LedgerState => ({
    meta: null,
    loading: false
  }),
  getters: {
    isOpen: (state): boolean => state.meta !== null,
    ledgerPath: (state): string | null => state.meta?.path ?? null
  },
  actions: {
    async open(path: string, password: string): Promise<void> {
      this.loading = true
      try {
        const result = await window.api.ledger.open(path, password)
        if ('error' in result) {
          throw new Error(result.error)
        }
        this.meta = result
      } finally {
        this.loading = false
      }
    },
    async create(path: string, password: string, name: string): Promise<void> {
      this.loading = true
      try {
        const result = await window.api.ledger.create(path, password, name)
        if ('error' in result) {
          throw new Error(result.error)
        }
        this.meta = result
      } finally {
        this.loading = false
      }
    },
    async close(): Promise<void> {
      await window.api.ledger.close()
      this.meta = null
    },
    async getLastUsedPath(): Promise<string | null> {
      const result = await window.api.ledger.getLastUsed()
      return result.path
    },
    async remove(): Promise<void> {
      const result = await window.api.ledger.delete()
      if ('error' in result) {
        throw new Error(result.error)
      }
      this.meta = null
    }
  }
})
