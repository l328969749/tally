import type Database from 'better-sqlite3-multiple-ciphers'
import type { TransactionWithMeta } from '@shared/types/models'
import { isValidAmount, normalizeAmount } from '@shared/validation/validators'
import { AccountRepository } from './storage/repositories/account.repository'
import { CategoryRepository } from './storage/repositories/category.repository'
import { TransactionRepository } from './storage/repositories/transaction.repository'

const EXPENSE_CATEGORY = '信用卡还款'
const INCOME_CATEGORY = '还款'

export class CreditService {
  constructor(
    private db: Database.Database,
    private accounts: AccountRepository,
    private categories: CategoryRepository,
    private transactions: TransactionRepository
  ) {}

  repay(data: {
    creditAccountId: number
    fundingAccountId: number
    amount: number
    date: string
    note?: string | null
  }): { expense: TransactionWithMeta; income: TransactionWithMeta } {
    const amount = normalizeAmount(data.amount)
    if (!isValidAmount(amount)) {
      throw new Error('INVALID_AMOUNT')
    }
    const creditAccount = this.accounts.getById(data.creditAccountId)
    if (!creditAccount || creditAccount.type !== 'credit') {
      throw new Error('INVALID_CREDIT_ACCOUNT')
    }
    const fundingAccount = this.accounts.getById(data.fundingAccountId)
    if (!fundingAccount || fundingAccount.type === 'credit' || fundingAccount.id === creditAccount.id) {
      throw new Error('INVALID_FUNDING_ACCOUNT')
    }

    const run = this.db.transaction(() => {
      const expenseCategory = this.findOrCreateCategory(EXPENSE_CATEGORY, 'expense')
      const incomeCategory = this.findOrCreateCategory(INCOME_CATEGORY, 'income')
      const expense = this.transactions.create({
        type: 'expense',
        amount,
        categoryId: expenseCategory.id,
        accountId: fundingAccount.id,
        note: data.note ?? `信用卡还款-${creditAccount.name}`,
        date: data.date
      })
      const income = this.transactions.create({
        type: 'income',
        amount,
        categoryId: incomeCategory.id,
        accountId: creditAccount.id,
        note: data.note ?? `信用卡还款-${fundingAccount.name}`,
        date: data.date
      })
      return { expense, income }
    })
    return run()
  }

  private findOrCreateCategory(
    name: string,
    type: 'income' | 'expense'
  ): { id: number } {
    const existing = this.categories.list().find((category) => category.name === name && category.type === type)
    if (existing) {
      return existing
    }
    return this.categories.create({ name, type })
  }
}
