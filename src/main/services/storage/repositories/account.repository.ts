import type Database from 'better-sqlite3-multiple-ciphers'
import type {
  Account,
  AccountWithBalance,
  AccountType
} from '@shared/types/models'
import { mapRow, mapRows } from '../row-mapper'

type Db = Database.Database

export class AccountRepository {
  constructor(private db: Db) {}

  list(includeArchived = false): AccountWithBalance[] {
    const rows = this.db
      .prepare(
        `SELECT a.*, 
          a.initial_balance + COALESCE((
            SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
            FROM "transaction" t WHERE t.account_id = a.id
          ), 0) AS balance
        FROM account a
        WHERE ${includeArchived ? '1=1' : 'a.archived = 0'}
        ORDER BY a.archived ASC, a.sort_order ASC, a.id ASC`
      )
      .all()
    return mapRows<AccountWithBalance>(rows)
  }

  getById(id: number): Account | undefined {
    return mapRow<Account | undefined>(
      this.db.prepare('SELECT * FROM account WHERE id = ?').get(id)
    )
  }

  getBalance(id: number): number {
    const row = this.db
      .prepare(
        `SELECT a.initial_balance + COALESCE((
          SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
          FROM "transaction" t WHERE t.account_id = a.id
        ), 0) AS balance
        FROM account a WHERE a.id = ?`
      )
      .get(id) as { balance: number }
    return row.balance
  }

  create(data: { name: string; type: AccountType; initialBalance: number }): Account {
    const result = this.db
      .prepare(
        'INSERT INTO account (name, type, initial_balance, sort_order, archived, created_at) VALUES (?, ?, ?, 0, 0, ?)'
      )
      .run(data.name, data.type, data.initialBalance, Date.now())
    return this.getById(result.lastInsertRowid as number)!
  }

  update(id: number, data: { name?: string; type?: AccountType; initialBalance?: number }): void {
    const current = this.getById(id)
    if (!current) {
      throw new Error('ACCOUNT_NOT_FOUND')
    }
    this.db
      .prepare('UPDATE account SET name = ?, type = ?, initial_balance = ? WHERE id = ?')
      .run(data.name ?? current.name, data.type ?? current.type, data.initialBalance ?? current.initialBalance, id)
  }

  setArchived(id: number, archived: boolean): void {
    this.db.prepare('UPDATE account SET archived = ? WHERE id = ?').run(archived ? 1 : 0, id)
  }

  reorder(id: number, sortOrder: number): void {
    this.db.prepare('UPDATE account SET sort_order = ? WHERE id = ?').run(sortOrder, id)
  }

  hasTransactions(id: number): boolean {
    const row = this.db
      .prepare('SELECT count(*) AS c FROM "transaction" WHERE account_id = ?')
      .get(id) as { c: number }
    return row.c > 0
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM account WHERE id = ?').run(id)
  }
}
