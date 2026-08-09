import type Database from 'better-sqlite3-multiple-ciphers'
import type {
  Transaction,
  TransactionFilter,
  TransactionWithMeta,
  TransactionListResult
} from '@shared/types/models'
import type { TagRepository } from './tag.repository'
import { mapRow, mapRows } from '../row-mapper'

type Db = Database.Database

export class TransactionRepository {
  constructor(
    private db: Db,
    private tags: TagRepository
  ) {}

  getById(id: number): Transaction | undefined {
    return mapRow<Transaction | undefined>(
      this.db.prepare('SELECT * FROM "transaction" WHERE id = ?').get(id)
    )
  }

  list(filter: TransactionFilter): TransactionListResult {
    const page = filter.page ?? 1
    const pageSize = filter.pageSize ?? 50

    const conditions: string[] = []
    const params: unknown[] = []

    if (filter.type) {
      conditions.push('t.type = ?')
      params.push(filter.type)
    }
    if (filter.startDate) {
      conditions.push('t.date >= ?')
      params.push(filter.startDate)
    }
    if (filter.endDate) {
      conditions.push('t.date <= ?')
      params.push(filter.endDate)
    }
    if (filter.categoryIds && filter.categoryIds.length > 0) {
      conditions.push(`t.category_id IN (${filter.categoryIds.map(() => '?').join(',')})`)
      params.push(...filter.categoryIds)
    }
    if (filter.accountIds && filter.accountIds.length > 0) {
      conditions.push(`t.account_id IN (${filter.accountIds.map(() => '?').join(',')})`)
      params.push(...filter.accountIds)
    }
    if (filter.minAmount !== undefined) {
      conditions.push('t.amount >= ?')
      params.push(filter.minAmount)
    }
    if (filter.maxAmount !== undefined) {
      conditions.push('t.amount <= ?')
      params.push(filter.maxAmount)
    }
    if (filter.keyword) {
      conditions.push('t.note LIKE ?')
      params.push(`%${filter.keyword}%`)
    }

    let tagJoin = ''
    if (filter.tagIds && filter.tagIds.length > 0) {
      conditions.push(
        `t.id IN (SELECT tt.transaction_id FROM transaction_tag tt WHERE tt.tag_id IN (${filter.tagIds
          .map(() => '?')
          .join(',')}))`
      )
      params.push(...filter.tagIds)
      tagJoin = ''
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const totalRow = this.db
      .prepare(`SELECT count(*) AS c FROM "transaction" t ${whereClause}`)
      .get(...params) as { c: number }
    const total = totalRow.c

    const items = this.db
      .prepare(
        `SELECT t.*, c.name AS category_name, a.name AS account_name
         FROM "transaction" t
         INNER JOIN category c ON c.id = t.category_id
         INNER JOIN account a ON a.id = t.account_id
         ${whereClause}
         ORDER BY t.date DESC, t.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize)

    const result: TransactionWithMeta[] = mapRows<TransactionWithMeta>(items).map((row) => ({
      ...row,
      tags: this.tags.getTransactionTags(row.id)
    }))

    return { items: result, total, page, pageSize }
  }

  create(data: {
    type: Transaction['type']
    amount: number
    categoryId: number
    accountId: number
    note?: string | null
    date: string
    tagIds?: number[]
  }): TransactionWithMeta {
    const now = Date.now()
    const tx = this.db.transaction(() => {
      const result = this.db
        .prepare(
          `INSERT INTO "transaction" (type, amount, category_id, account_id, note, date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(data.type, data.amount, data.categoryId, data.accountId, data.note ?? null, data.date, now, now)
      const id = result.lastInsertRowid as number
      if (data.tagIds && data.tagIds.length > 0) {
        this.tags.setTransactionTags(id, data.tagIds)
      }
      return this.buildWithMeta(this.getById(id)!)
    })
    return tx()
  }

  update(
    id: number,
    data: {
      type?: Transaction['type']
      amount?: number
      categoryId?: number
      accountId?: number
      note?: string | null
      date?: string
      tagIds?: number[]
    }
  ): TransactionWithMeta {
    const current = this.getById(id)
    if (!current) {
      throw new Error('TRANSACTION_NOT_FOUND')
    }
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE "transaction" SET type = ?, amount = ?, category_id = ?, account_id = ?, note = ?, date = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          data.type ?? current.type,
          data.amount ?? current.amount,
          data.categoryId ?? current.categoryId,
          data.accountId ?? current.accountId,
          data.note === undefined ? current.note : data.note,
          data.date ?? current.date,
          Date.now(),
          id
        )
      if (data.tagIds) {
        this.tags.setTransactionTags(id, data.tagIds)
      }
      return this.buildWithMeta(this.getById(id)!)
    })
    return tx()
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM "transaction" WHERE id = ?').run(id)
  }

  sumByType(type: Transaction['type'], startDate?: string, endDate?: string): number {
    const conditions = ['type = ?']
    const params: unknown[] = [type]
    if (startDate) {
      conditions.push('date >= ?')
      params.push(startDate)
    }
    if (endDate) {
      conditions.push('date <= ?')
      params.push(endDate)
    }
    const row = this.db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM "transaction" WHERE ${conditions.join(' AND ')}`)
      .get(...params) as { s: number }
    return row.s
  }

  private buildWithMeta(transaction: Transaction): TransactionWithMeta {
    const categoryRow = this.db
      .prepare('SELECT name FROM category WHERE id = ?')
      .get(transaction.categoryId) as { name: string }
    const accountRow = this.db
      .prepare('SELECT name FROM account WHERE id = ?')
      .get(transaction.accountId) as { name: string }
    return {
      ...transaction,
      categoryName: categoryRow.name,
      accountName: accountRow.name,
      tags: this.tags.getTransactionTags(transaction.id)
    }
  }
}
