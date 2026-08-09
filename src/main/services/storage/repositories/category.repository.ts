import type Database from 'better-sqlite3-multiple-ciphers'
import type { Category, CategoryType } from '@shared/types/models'
import { mapRow, mapRows } from '../row-mapper'

type Db = Database.Database

export class CategoryRepository {
  constructor(private db: Db) {}

  list(): Category[] {
    return mapRows<Category>(
      this.db.prepare('SELECT * FROM category ORDER BY type ASC, sort_order ASC, id ASC').all()
    )
  }

  getById(id: number): Category | undefined {
    return mapRow<Category | undefined>(
      this.db.prepare('SELECT * FROM category WHERE id = ?').get(id)
    )
  }

  create(data: { name: string; type: CategoryType; parentId?: number | null }): Category {
    const result = this.db
      .prepare(
        'INSERT INTO category (name, type, parent_id, sort_order) VALUES (?, ?, ?, ?)'
      )
      .run(data.name, data.type, data.parentId ?? null, this.nextSortOrder(data.type))
    return this.getById(result.lastInsertRowid as number)!
  }

  update(id: number, data: { name?: string; parentId?: number | null }): void {
    const current = this.getById(id)
    if (!current) {
      throw new Error('CATEGORY_NOT_FOUND')
    }
    this.db
      .prepare('UPDATE category SET name = ?, parent_id = ? WHERE id = ?')
      .run(data.name ?? current.name, data.parentId === undefined ? current.parentId : data.parentId, id)
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM category WHERE id = ?').run(id)
  }

  hasTransactions(id: number): boolean {
    const row = this.db
      .prepare('SELECT count(*) AS c FROM "transaction" WHERE category_id = ?')
      .get(id) as { c: number }
    return row.c > 0
  }

  private nextSortOrder(type: CategoryType): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM category WHERE type = ?')
      .get(type) as { next: number }
    return row.next
  }
}
