import { defineStore } from 'pinia'
import type { Tag } from '@shared/types/models'

interface TagState {
  tags: Tag[]
  loaded: boolean
}

export const useTagStore = defineStore('tag', {
  state: (): TagState => ({
    tags: [],
    loaded: false
  }),
  actions: {
    async fetch(): Promise<void> {
      const result = await window.api.tag.list()
      this.tags = 'error' in result ? [] : result
      this.loaded = true
    },
    async create(name: string): Promise<void> {
      await window.api.tag.create(name)
      await this.fetch()
    },
    async update(id: number, name: string): Promise<void> {
      await window.api.tag.update(id, name)
      await this.fetch()
    },
    async remove(id: number): Promise<void> {
      await window.api.tag.delete(id)
      await this.fetch()
    }
  }
})
