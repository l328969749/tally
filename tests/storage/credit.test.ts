import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3-multiple-ciphers'
import { StorageService } from '../../src/main/services/storage'
import { migrateSchema, seedDefaultCategories } from '../../src/main/services/storage/schema'

function createTestCtx(): { db: Database.Database; storage: StorageService } {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  migrateSchema(db)
  seedDefaultCategories(db)
  return { db, storage: new StorageService(db) }
}

function seedCreditAccount(storage: StorageService, name = '招行信用卡'): number {
  return storage.account.create({
    name,
    type: 'credit',
    initialBalance: 0,
    creditLimit: 20000,
    billDate: 5,
    dueDate: 23
  }).id
}

describe('CreditService.repay', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestCtx()
  })

  afterEach(() => {
    ctx.db.close()
    vi.restoreAllMocks()
  })

  it('还款生成还款账户支出与信用卡收入两条流水，且欠款减少', () => {
    const creditId = seedCreditAccount(ctx.storage)
    const fundingId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 10000 }).id
    const expenseCat = ctx.storage.category.list().find((c) => c.name === '餐饮')!
    const incomeCat = ctx.storage.category.list().find((c) => c.name === '工资')!

    ctx.storage.transaction.create({ type: 'expense', amount: 800, categoryId: expenseCat.id, accountId: creditId, date: '2026-02-01', note: '消费' })
    const before = ctx.storage.analytics.accountBalance().find((a) => a.accountId === creditId)!
    expect(before.balance).toBe(-800)

    const result = ctx.storage.credit.repay({
      creditAccountId: creditId,
      fundingAccountId: fundingId,
      amount: 800,
      date: '2026-02-10'
    })

    expect(result.expense.type).toBe('expense')
    expect(result.expense.accountId).toBe(fundingId)
    expect(result.expense.amount).toBe(800)
    expect(result.income.type).toBe('income')
    expect(result.income.accountId).toBe(creditId)
    expect(result.income.amount).toBe(800)

    const after = ctx.storage.analytics.accountBalance().find((a) => a.accountId === creditId)!
    expect(after.balance).toBe(0)
    const funding = ctx.storage.analytics.accountBalance().find((a) => a.accountId === fundingId)!
    expect(funding.balance).toBe(9200)
  })

  it('剩余额度 = 信用额度 + 余额', () => {
    const creditId = seedCreditAccount(ctx.storage)
    const expenseCat = ctx.storage.category.list().find((c) => c.name === '餐饮')!
    ctx.storage.transaction.create({ type: 'expense', amount: 500, categoryId: expenseCat.id, accountId: creditId, date: '2026-02-01' })

    const item = ctx.storage.analytics.accountBalance().find((a) => a.accountId === creditId)!
    expect(item.availableCredit).toBe(19500)
    expect(item.dueDate).toBe(23)
  })

  it('非信用卡账户作为还款对象报错且不产生流水', () => {
    const fundingId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 10000 }).id

    expect(() =>
      ctx.storage.credit.repay({
        creditAccountId: fundingId,
        fundingAccountId: fundingId,
        amount: 100,
        date: '2026-02-10'
      })
    ).toThrow('INVALID_CREDIT_ACCOUNT')

    const count = ctx.db.prepare('SELECT count(*) AS c FROM "transaction"').get() as { c: number }
    expect(count.c).toBe(0)
  })

  it('信用卡账户不能作为还款资金来源', () => {
    const creditId = seedCreditAccount(ctx.storage)
    const credit2 = ctx.storage.account.create({ name: '另一张卡', type: 'credit', initialBalance: 0 }).id

    expect(() =>
      ctx.storage.credit.repay({
        creditAccountId: creditId,
        fundingAccountId: credit2,
        amount: 100,
        date: '2026-02-10'
      })
    ).toThrow('INVALID_FUNDING_ACCOUNT')
  })

  it('中间失败时整体回滚，不产生部分流水', () => {
    const creditId = seedCreditAccount(ctx.storage)
    const fundingId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 10000 }).id
    const expenseCat = ctx.storage.category.list().find((c) => c.name === '餐饮')!
    ctx.storage.transaction.create({ type: 'expense', amount: 800, categoryId: expenseCat.id, accountId: creditId, date: '2026-02-01' })

    const original = ctx.storage.transaction.create.bind(ctx.storage.transaction)
    let calls = 0
    vi.spyOn(ctx.storage.transaction, 'create').mockImplementation((data) => {
      calls += 1
      if (calls === 2) {
        throw new Error('SIMULATED_FAILURE')
      }
      return original(data)
    })

    expect(() =>
      ctx.storage.credit.repay({
        creditAccountId: creditId,
        fundingAccountId: fundingId,
        amount: 800,
        date: '2026-02-10'
      })
    ).toThrow('SIMULATED_FAILURE')

    const count = ctx.db.prepare('SELECT count(*) AS c FROM "transaction"').get() as { c: number }
    expect(count.c).toBe(1)
    const repaymentCat = ctx.db
      .prepare("SELECT count(*) AS c FROM category WHERE name IN ('信用卡还款', '还款')")
      .get() as { c: number }
    expect(repaymentCat.c).toBe(0)
  })
})
