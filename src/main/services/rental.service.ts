import type Database from 'better-sqlite3-multiple-ciphers'
import type { RentRecord, RentRecordWithMeta, TransactionWithMeta } from '@shared/types/models'
import { isValidAmount, normalizeAmount } from '@shared/validation/validators'
import { AccountRepository } from './storage/repositories/account.repository'
import { CategoryRepository } from './storage/repositories/category.repository'
import { RentalRepository } from './storage/repositories/rental.repository'
import { TransactionRepository } from './storage/repositories/transaction.repository'

const INCOME_CATEGORY = '租金收入'

export class RentalService {
  constructor(
    private db: Database.Database,
    private accounts: AccountRepository,
    private categories: CategoryRepository,
    private transactions: TransactionRepository,
    private rentals: RentalRepository
  ) {}

  recordRent(data: {
    leaseId: number
    amount: number
    date: string
    accountId: number
    note?: string | null
  }): { record: RentRecord; transaction: TransactionWithMeta } {
    const amount = normalizeAmount(data.amount)
    if (!isValidAmount(amount)) {
      throw new Error('INVALID_AMOUNT')
    }
    const lease = this.rentals.getLease(data.leaseId)
    if (!lease) {
      throw new Error('LEASE_NOT_FOUND')
    }
    if (lease.status !== 'active') {
      throw new Error('LEASE_NOT_ACTIVE')
    }
    const account = this.accounts.getById(data.accountId)
    if (!account || account.type === 'credit') {
      throw new Error('INVALID_ACCOUNT')
    }

    const run = this.db.transaction(() => {
      const category = this.findOrCreateIncomeCategory()
      const transaction = this.transactions.create({
        type: 'income',
        amount,
        categoryId: category.id,
        accountId: account.id,
        note: data.note ?? `收租-${lease.id}`,
        date: data.date
      })
      const record = this.rentals.createRentRecord({
        leaseId: lease.id,
        amount,
        date: data.date,
        transactionId: transaction.id,
        note: data.note ?? null
      })
      return { record, transaction }
    })
    return run()
  }

  deleteRentRecord(id: number): void {
    const record = this.rentals.getRentRecord(id)
    if (!record) {
      throw new Error('RENT_RECORD_NOT_FOUND')
    }
    const run = this.db.transaction(() => {
      if (record.transactionId !== null) {
        this.transactions.delete(record.transactionId)
      }
      this.rentals.deleteRentRecord(record.id)
    })
    run()
  }

  private findOrCreateIncomeCategory(): { id: number } {
    const existing = this.categories
      .list()
      .find((category) => category.name === INCOME_CATEGORY && category.type === 'income')
    if (existing) {
      return existing
    }
    return this.categories.create({ name: INCOME_CATEGORY, type: 'income' })
  }
}

export type { RentRecordWithMeta }
