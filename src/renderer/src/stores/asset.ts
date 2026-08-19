import { defineStore } from 'pinia'
import type { WithError } from '@shared/types/ipc-results'
import type {
  Asset,
  AssetType,
  AssetValue,
  Liability
} from '@shared/types/models'

interface AssetState {
  assets: Asset[]
  liabilities: Liability[]
  loaded: boolean
}

export const useAssetStore = defineStore('asset', {
  state: (): AssetState => ({
    assets: [],
    liabilities: [],
    loaded: false
  }),
  getters: {
    fixedAssets: (state): Asset[] => state.assets.filter((a) => a.type === 'fixed'),
    investmentAssets: (state): Asset[] => state.assets.filter((a) => a.type === 'investment'),
    fixedTotal: (state): number =>
      state.assets.filter((a) => a.type === 'fixed').reduce((s, a) => s + a.value, 0),
    investmentTotal: (state): number =>
      state.assets.filter((a) => a.type === 'investment').reduce((s, a) => s + a.value, 0),
    liabilityTotal: (state): number =>
      state.liabilities.reduce((s, l) => s + (l.totalAmount - l.paidAmount), 0)
  },
  actions: {
    async fetch(): Promise<void> {
      const [assets, liabilities] = await Promise.all([
        window.api.asset.list(),
        window.api.asset.listLiabilities()
      ])
      this.assets = 'error' in assets ? [] : assets
      this.liabilities = 'error' in liabilities ? [] : liabilities
      this.loaded = true
    },
    async create(data: { name: string; type: AssetType; value: number; unit?: string | null; note?: string | null }): Promise<void> {
      const result = await window.api.asset.create(data)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async update(id: number, data: { name?: string; type?: AssetType; value?: number; unit?: string | null; note?: string | null }): Promise<void> {
      const result = await window.api.asset.update(id, data)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async remove(id: number): Promise<void> {
      const result = await window.api.asset.delete(id)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async addValue(assetId: number, value: number, date: string): Promise<AssetValue> {
      const result = await window.api.asset.addValue(assetId, value, date)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
      return result
    },
    listValues(assetId: number): Promise<WithError<AssetValue[]>> {
      return window.api.asset.listValues(assetId)
    },
    async createLiability(data: { name: string; totalAmount: number; paidAmount: number; interestRate: number; note?: string | null }): Promise<void> {
      const result = await window.api.asset.createLiability(data)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async updateLiability(id: number, data: { name?: string; totalAmount?: number; paidAmount?: number; interestRate?: number; note?: string | null }): Promise<void> {
      const result = await window.api.asset.updateLiability(id, data)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    },
    async removeLiability(id: number): Promise<void> {
      const result = await window.api.asset.deleteLiability(id)
      if ('error' in result) {
        throw new Error(result.error)
      }
      await this.fetch()
    }
  }
})
