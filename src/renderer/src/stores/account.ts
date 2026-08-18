import { defineStore } from 'pinia'
import type { AccountInput, AccountType, AccountUpdateInput, AccountWithBalance } from '@shared/types/models'

interface AccountState {
  accounts: AccountWithBalance[]
  loaded: boolean
}

export const useAccountStore = defineStore('account', {
  state: (): AccountState => ({
    accounts: [],
    loaded: false
  }),
  getters: {
    totalBalance: (state): number =>
      state.accounts.reduce((sum, account) => sum + account.balance, 0)
  },
  actions: {
    async fetch(): Promise<void> {
      const result = await window.api.account.list()
      this.accounts = 'error' in result ? [] : result
      this.loaded = true
    },
    async create(data: AccountInput): Promise<void> {
      const result = await window.api.account.create(data)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async update(id: number, data: AccountUpdateInput): Promise<void> {
      const result = await window.api.account.update(id, data)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async remove(id: number): Promise<void> {
      const result = await window.api.account.delete(id)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async archive(id: number, archived: boolean): Promise<void> {
      const result = await window.api.account.archive(id, archived)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async reorder(id: number, sortOrder: number): Promise<void> {
      const result = await window.api.account.reorder(id, sortOrder)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    }
  }
})

export type { AccountType }
