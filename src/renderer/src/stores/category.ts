import { defineStore } from 'pinia'
import type { Category, CategoryType } from '@shared/types/models'

interface CategoryState {
  categories: Category[]
  loaded: boolean
}

export const useCategoryStore = defineStore('category', {
  state: (): CategoryState => ({
    categories: [],
    loaded: false
  }),
  getters: {
    incomeCategories: (state): Category[] =>
      state.categories.filter((c) => c.type === 'income' && c.parentId === null),
    expenseCategories: (state): Category[] =>
      state.categories.filter((c) => c.type === 'expense' && c.parentId === null),
    subcategories: (state) => {
      return (parentId: number): Category[] =>
        state.categories.filter((c) => c.parentId === parentId)
    },
    categoryName: (state) => {
      return (id: number): string => {
        const category = state.categories.find((c) => c.id === id)
        return category ? category.name : ''
      }
    }
  },
  actions: {
    async fetch(): Promise<void> {
      this.categories = await window.api.category.list()
      this.loaded = true
    },
    async create(data: { name: string; type: CategoryType; parentId?: number | null }): Promise<void> {
      await window.api.category.create(data)
      await this.fetch()
    },
    async update(id: number, data: { name?: string; parentId?: number | null }): Promise<void> {
      await window.api.category.update(id, data)
      await this.fetch()
    },
    async remove(id: number): Promise<void> {
      await window.api.category.delete(id)
      await this.fetch()
    }
  }
})
