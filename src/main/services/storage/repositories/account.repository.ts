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
        `SELECT *,
          credit_limit + CASE WHEN balance < 0 THEN balance ELSE 0 END AS available_credit
        FROM (
          SELECT a.*,
            a.initial_balance + COALESCE((
              SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
              FROM "transaction" t WHERE t.account_id = a.id
            ), 0) AS balance
          FROM account a
          WHERE ${includeArchived ? '1=1' : 'a.archived = 0'}
        )
        ORDER BY archived ASC, sort_order ASC, id ASC`
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

  create(data: {
    name: string
    type: AccountType
    initialBalance: number
    cardNumber?: string | null
    creditLimit?: number
    billDate?: number | null
    dueDate?: number | null
  }): Account {
    const credit = data.type === 'credit'
    const result = this.db
      .prepare(
        `INSERT INTO account (name, type, card_number, credit_limit, bill_date, due_date, initial_balance, sort_order, archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
      )
      .run(
        data.name,
        data.type,
        data.cardNumber ?? null,
        credit ? data.creditLimit ?? 0 : 0,
        credit ? data.billDate ?? null : null,
        credit ? data.dueDate ?? null : null,
        data.initialBalance,
        Date.now()
      )
    return this.getById(result.lastInsertRowid as number)!
  }

  update(
    id: number,
    data: {
      name?: string
      type?: AccountType
      initialBalance?: number
      cardNumber?: string | null
      creditLimit?: number
      billDate?: number | null
      dueDate?: number | null
    }
  ): void {
    const current = this.getById(id)
    if (!current) {
      throw new Error('ACCOUNT_NOT_FOUND')
    }
    const type = data.type ?? current.type
    const credit = type === 'credit'
    this.db
      .prepare(
        `UPDATE account SET name = ?, type = ?, card_number = ?, credit_limit = ?, bill_date = ?, due_date = ?, initial_balance = ? WHERE id = ?`
      )
      .run(
        data.name ?? current.name,
        type,
        data.cardNumber !== undefined ? data.cardNumber : current.cardNumber,
        credit ? (data.creditLimit ?? current.creditLimit) : 0,
        credit
          ? (data.billDate !== undefined ? data.billDate : current.billDate)
          : null,
        credit ? (data.dueDate !== undefined ? data.dueDate : current.dueDate) : null,
        data.initialBalance ?? current.initialBalance,
        id
      )
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
