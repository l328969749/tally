import type Database from 'better-sqlite3-multiple-ciphers'
import type {
  AccountBalanceItem,
  CategoryExpenseItem,
  MonthlyTrendItem,
  NetWorthPoint,
  OverviewData,
  TagExpenseItem,
  TransactionWithMeta
} from '@shared/types/models'
import type { TagRepository } from './tag.repository'
import { mapRows } from '../row-mapper'

type Db = Database.Database

export class AnalyticsRepository {
  constructor(
    private db: Db,
    private tags: TagRepository
  ) {}

  overview(): OverviewData {
    const monthPrefix = new Date().toISOString().slice(0, 7)
    const monthStart = `${monthPrefix}-01`
    const monthEnd = `${monthPrefix}-31`

    const totalAssetsRow = this.db
      .prepare(
        `SELECT
          COALESCE((SELECT SUM(a.value) FROM asset a), 0) +
          COALESCE((SELECT SUM(ac.initial_balance +
            COALESCE((SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
             FROM "transaction" t WHERE t.account_id = ac.id), 0)) FROM account ac WHERE ac.archived = 0), 0) AS total`
      )
      .get() as { total: number }

    const liabilitiesRow = this.db
      .prepare(
        'SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total FROM liability'
      )
      .get() as { total: number }

    const incomeRow = this.db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM \"transaction\" WHERE type = 'income' AND date >= ? AND date <= ?"
      )
      .get(monthStart, monthEnd) as { total: number }

    const expenseRow = this.db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM \"transaction\" WHERE type = 'expense' AND date >= ? AND date <= ?"
      )
      .get(monthStart, monthEnd) as { total: number }

    const recentRows = this.db
      .prepare(
        `SELECT t.*, c.name AS category_name, a.name AS account_name
         FROM "transaction" t
         INNER JOIN category c ON c.id = t.category_id
         INNER JOIN account a ON a.id = t.account_id
         ORDER BY t.date DESC, t.id DESC
         LIMIT 10`
      )
      .all()

    const recentTransactions: TransactionWithMeta[] = mapRows<TransactionWithMeta>(
      recentRows
    ).map((row) => ({
      ...row,
      tags: this.tags.getTransactionTags(row.id)
    }))

    return {
      netWorth: totalAssetsRow.total - liabilitiesRow.total,
      totalAssets: totalAssetsRow.total,
      totalLiabilities: liabilitiesRow.total,
      monthIncome: incomeRow.total,
      monthExpense: expenseRow.total,
      recentTransactions
    }
  }

  expenseByCategory(startDate: string, endDate: string): CategoryExpenseItem[] {
    return this.db
      .prepare(
        `SELECT t.category_id AS categoryId, c.name AS categoryName, SUM(t.amount) AS amount
         FROM "transaction" t
         INNER JOIN category c ON c.id = t.category_id
         WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
         GROUP BY t.category_id, c.name
         ORDER BY amount DESC`
      )
      .all(startDate, endDate) as unknown as CategoryExpenseItem[]
  }

  expenseByTag(startDate: string, endDate: string): TagExpenseItem[] {
    return this.db
      .prepare(
        `SELECT tt.tag_id AS tagId, t2.name AS tagName, SUM(t.amount) AS amount
         FROM transaction_tag tt
         INNER JOIN "transaction" t ON t.id = tt.transaction_id
         INNER JOIN tag t2 ON t2.id = tt.tag_id
         WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
         GROUP BY tt.tag_id, t2.name
         ORDER BY amount DESC`
      )
      .all(startDate, endDate) as unknown as TagExpenseItem[]
  }

  monthlyTrend(startDate: string, endDate: string): MonthlyTrendItem[] {
    return this.db
      .prepare(
        `SELECT substr(t.date, 1, 7) AS month,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
           SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
         FROM "transaction" t
         WHERE t.date >= ? AND t.date <= ?
         GROUP BY substr(t.date, 1, 7)
         ORDER BY month ASC`
      )
      .all(startDate, endDate) as unknown as MonthlyTrendItem[]
  }

  netWorthTrend(): NetWorthPoint[] {
    const accountBalancesByDate = this.db
      .prepare(
        `SELECT t.date AS date, t.account_id AS accountId,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS delta
         FROM "transaction" t
         GROUP BY t.date, t.account_id`
      )
      .all() as Array<{ date: string; accountId: number; delta: number }>

    const assetValues = this.db
      .prepare(
        `SELECT av.date AS date, av.value AS value
         FROM asset_value av
         ORDER BY av.date ASC`
      )
      .all() as Array<{ date: string; value: number }>

    const liabilityRows = this.db
      .prepare('SELECT total_amount AS total, paid_amount AS paid FROM liability')
      .all() as Array<{ total: number; paid: number }>

    const accounts = this.db
      .prepare('SELECT id, initial_balance AS initialBalance FROM account')
      .all() as Array<{ id: number; initialBalance: number }>

    const dates = new Set<string>()
    accountBalancesByDate.forEach((row) => dates.add(row.date))
    assetValues.forEach((row) => dates.add(row.date))
    if (dates.size === 0) {
      return []
    }

    const sortedDates = Array.from(dates).sort()
    const balances: Record<number, number> = {}
    accounts.forEach((account) => {
      balances[account.id] = account.initialBalance
    })

    const totalLiability = liabilityRows.reduce(
      (sum, row) => sum + (row.total - row.paid),
      0
    )

    const points: NetWorthPoint[] = []
    for (const date of sortedDates) {
      const dailyAccountDeltas = accountBalancesByDate.filter((row) => row.date === date)
      dailyAccountDeltas.forEach((row) => {
        balances[row.accountId] = (balances[row.accountId] ?? 0) + row.delta
      })
      const latestAssetValue = assetValues
        .filter((row) => row.date <= date)
        .reduce((sum, row) => sum + row.value, 0)

      const accountTotal = Object.values(balances).reduce((sum, v) => sum + v, 0)
      const value = accountTotal + latestAssetValue - totalLiability
      points.push({ date, value: Math.round(value * 100) / 100 })
    }
    return points
  }

  accountBalance(): AccountBalanceItem[] {
    const rows = this.db
      .prepare(
        `SELECT a.id AS accountId, a.name AS accountName,
           a.initial_balance + COALESCE((
             SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
             FROM "transaction" t WHERE t.account_id = a.id
           ), 0) AS balance
         FROM account a
         WHERE a.archived = 0
         ORDER BY a.sort_order ASC, a.id ASC`
      )
      .all() as unknown as AccountBalanceItem[]
    return rows
  }
}
