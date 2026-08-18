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
      await window.api.account.create(data)
      await this.fetch()
    },
    async update(id: number, data: AccountUpdateInput): Promise<void> {
      await window.api.account.update(id, data)
      await this.fetch()
    },
    async remove(id: number): Promise<void> {
      await window.api.account.delete(id)
      await this.fetch()
    },
    async archive(id: number, archived: boolean): Promise<void> {
      await window.api.account.archive(id, archived)
      await this.fetch()
    },
    async reorder(id: number, sortOrder: number): Promise<void> {
      await window.api.account.reorder(id, sortOrder)
      await this.fetch()
    }
  }
})

export type { AccountType }
