import type Database from 'better-sqlite3-multiple-ciphers'
import type { Tag } from '@shared/types/models'
import { mapRow, mapRows } from '../row-mapper'

type Db = Database.Database

export class TagRepository {
  constructor(private db: Db) {}

  list(): Tag[] {
    return mapRows<Tag>(this.db.prepare('SELECT * FROM tag ORDER BY name ASC').all())
  }

  getById(id: number): Tag | undefined {
    return mapRow<Tag | undefined>(this.db.prepare('SELECT * FROM tag WHERE id = ?').get(id))
  }

  getByName(name: string): Tag | undefined {
    return mapRow<Tag | undefined>(this.db.prepare('SELECT * FROM tag WHERE name = ?').get(name))
  }

  create(name: string): Tag {
    const result = this.db.prepare('INSERT INTO tag (name) VALUES (?)').run(name.trim())
    return this.getById(result.lastInsertRowid as number)!
  }

  update(id: number, name: string): void {
    this.db.prepare('UPDATE tag SET name = ? WHERE id = ?').run(name.trim(), id)
  }

  delete(id: number): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM transaction_tag WHERE tag_id = ?').run(id)
      this.db.prepare('DELETE FROM tag WHERE id = ?').run(id)
    })
    tx()
  }

  setTransactionTags(transactionId: number, tagIds: number[]): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM transaction_tag WHERE transaction_id = ?').run(transactionId)
      const insert = this.db.prepare(
        'INSERT INTO transaction_tag (transaction_id, tag_id) VALUES (?, ?)'
      )
      for (const tagId of tagIds) {
        insert.run(transactionId, tagId)
      }
    })
    tx()
  }

  getTransactionTags(transactionId: number): Tag[] {
    return mapRows<Tag>(
      this.db
        .prepare(
          `SELECT t.* FROM tag t
           INNER JOIN transaction_tag tt ON tt.tag_id = t.id
           WHERE tt.transaction_id = ? ORDER BY t.name ASC`
        )
        .all(transactionId)
    )
  }

  getTagsByIds(tagIds: number[]): Tag[] {
    if (tagIds.length === 0) {
      return []
    }
    const placeholders = tagIds.map(() => '?').join(',')
    return mapRows<Tag>(
      this.db.prepare(`SELECT * FROM tag WHERE id IN (${placeholders})`).all(...tagIds)
    )
  }
}
