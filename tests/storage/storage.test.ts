import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3-multiple-ciphers'
import { StorageService } from '../../src/main/services/storage'
import { migrateSchema, seedDefaultCategories } from '../../src/main/services/storage/schema'

function createTestDb(): { db: Database.Database; storage: StorageService } {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  migrateSchema(db)
  seedDefaultCategories(db)
  return { db, storage: new StorageService(db) }
}

function seedAccount(storage: StorageService): number {
  return storage.account.create({ name: '测试银行卡', type: 'bank', initialBalance: 1000 }).id
}

function seedCategory(storage: StorageService, type: 'income' | 'expense' = 'expense'): number {
  const category = storage.category.create({ name: '测试分类', type })
  return category.id
}

describe('AccountRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestDb()
  })

  afterEach(() => {
    ctx.db.close()
  })

  it('创建账户并返回初始余额', () => {
    const account = ctx.storage.account.create({ name: '现金', type: 'cash', initialBalance: 500 })
    expect(account.name).toBe('现金')
    expect(account.type).toBe('cash')
    expect(account.initialBalance).toBe(500)
  })

  it('属性2/5: 账户余额 = 初始余额 + 收入 - 支出，且随流水增删重算一致', () => {
    const accountId = seedAccount(ctx.storage)
    const incomeCat = seedCategory(ctx.storage, 'income')
    const expenseCat = seedCategory(ctx.storage, 'expense')

    ctx.storage.transaction.create({
      type: 'income',
      amount: 300,
      categoryId: incomeCat,
      accountId,
      date: '2026-01-05'
    })
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 120.5,
      categoryId: expenseCat,
      accountId,
      date: '2026-01-06'
    })

    let balance = ctx.storage.account.getBalance(accountId)
    expect(balance).toBeCloseTo(1000 + 300 - 120.5)

    const expenseTx = ctx.storage.transaction.list({ page: 1, pageSize: 100 }).items.find(
      (t) => t.type === 'expense'
    )!
    ctx.storage.transaction.delete(expenseTx.id)

    balance = ctx.storage.account.getBalance(accountId)
    expect(balance).toBeCloseTo(1000 + 300)
  })

  it('删除有关联流水的账户应阻止（hasTransactions）', () => {
    const accountId = seedAccount(ctx.storage)
    const expenseCat = seedCategory(ctx.storage, 'expense')
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 50,
      categoryId: expenseCat,
      accountId,
      date: '2026-01-01'
    })
    expect(ctx.storage.account.hasTransactions(accountId)).toBe(true)
  })
})

describe('TransactionRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestDb()
  })

  afterEach(() => {
    ctx.db.close()
  })

  it('属性1: 金额必须为正数，数据库 CHECK 约束拒绝非正金额', () => {
    const accountId = seedAccount(ctx.storage)
    const expenseCat = seedCategory(ctx.storage, 'expense')
    expect(() =>
      ctx.storage.transaction.create({
        type: 'expense',
        amount: -10,
        categoryId: expenseCat,
        accountId,
        date: '2026-01-01'
      })
    ).toThrow()
  })

  it('组合筛选：时间范围、分类、账户、金额区间、关键词、标签', () => {
    const accountId = seedAccount(ctx.storage)
    const foodCat = seedCategory(ctx.storage, 'expense')
    const trafficCat = seedCategory(ctx.storage, 'expense')

    const tag = ctx.storage.tag.create('差旅')
    const tx1 = ctx.storage.transaction.create({
      type: 'expense',
      amount: 30,
      categoryId: foodCat,
      accountId,
      date: '2026-03-01',
      note: '午餐'
    })
    ctx.storage.tag.setTransactionTags(tx1.id, [tag.id])
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 200,
      categoryId: trafficCat,
      accountId,
      date: '2026-03-05',
      note: '高铁票'
    })

    const result = ctx.storage.transaction.list({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      categoryIds: [foodCat],
      minAmount: 10,
      maxAmount: 100,
      tagIds: [tag.id],
      page: 1,
      pageSize: 20
    })
    expect(result.total).toBe(1)
    expect(result.items[0].note).toBe('午餐')
  })

  it('按日期倒序分页返回', () => {
    const accountId = seedAccount(ctx.storage)
    const expenseCat = seedCategory(ctx.storage, 'expense')
    for (let i = 1; i <= 5; i++) {
      ctx.storage.transaction.create({
        type: 'expense',
        amount: i,
        categoryId: expenseCat,
        accountId,
        date: `2026-02-0${i}`
      })
    }
    const page1 = ctx.storage.transaction.list({ page: 1, pageSize: 3 })
    expect(page1.items.length).toBe(3)
    expect(page1.total).toBe(5)
    expect(page1.items[0].date).toBe('2026-02-05')
  })
})

describe('TagRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestDb()
  })

  afterEach(() => {
    ctx.db.close()
  })

  it('需求9.6: 删除标签后关联全部解除', () => {
    const accountId = seedAccount(ctx.storage)
    const expenseCat = seedCategory(ctx.storage, 'expense')
    const tag = ctx.storage.tag.create('旅行')
    const tx = ctx.storage.transaction.create({
      type: 'expense',
      amount: 100,
      categoryId: expenseCat,
      accountId,
      date: '2026-01-01'
    })
    ctx.storage.tag.setTransactionTags(tx.id, [tag.id])
    expect(ctx.storage.tag.getTransactionTags(tx.id).length).toBe(1)

    ctx.storage.tag.delete(tag.id)
    expect(ctx.storage.tag.getTransactionTags(tx.id).length).toBe(0)
  })

  it('需求9.2: 标签名称唯一', () => {
    ctx.storage.tag.create('唯一标签')
    expect(() => ctx.storage.tag.create('唯一标签')).toThrow()
  })
})

describe('CategoryRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestDb()
  })

  afterEach(() => {
    ctx.db.close()
  })

  it('需求3.6: 支持多级分类与种子数据', () => {
    const root = ctx.storage.category.create({ name: '餐饮', type: 'expense' })
    const child = ctx.storage.category.create({ name: '外卖', type: 'expense', parentId: root.id })
    const categories = ctx.storage.category.list()
    expect(categories.filter((c) => c.parentId === root.id).length).toBe(1)
    expect(categories.some((c) => c.name === '工资')).toBe(true)
    expect(child.parentId).toBe(root.id)
  })
})

describe('AssetRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestDb()
  })

  afterEach(() => {
    ctx.db.close()
  })

  it('资产与估值历史、负债', () => {
    const asset = ctx.storage.asset.create({ name: '股票', type: 'investment', value: 5000 })
    ctx.storage.asset.addValue(asset.id, 5500, '2026-02-01')
    ctx.storage.asset.addValue(asset.id, 5200, '2026-03-01')
    const values = ctx.storage.asset.listValues(asset.id)
    expect(values.length).toBe(2)
    expect(ctx.storage.asset.getById(asset.id)!.value).toBe(5200)

    const liability = ctx.storage.asset.createLiability({
      name: '房贷',
      totalAmount: 1000000,
      paidAmount: 200000,
      interestRate: 4.1
    })
    expect(liability.totalAmount).toBe(1000000)
    const liabilities = ctx.storage.asset.listLiabilities()
    expect(liabilities.length).toBe(1)
  })
})

describe('AnalyticsRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestDb()
  })

  afterEach(() => {
    ctx.db.close()
  })

  it('属性4: 净资产 = 流动资产 + 固定资产 + 投资资产 - 负债', () => {
    const accountId = seedAccount(ctx.storage)
    ctx.storage.account.create({ name: '支付宝', type: 'alipay', initialBalance: 2000 })
    ctx.storage.asset.create({ name: '房产', type: 'fixed', value: 500000 })
    ctx.storage.asset.create({ name: '基金', type: 'investment', value: 30000 })
    ctx.storage.asset.createLiability({
      name: '车贷',
      totalAmount: 100000,
      paidAmount: 40000
    })

    const overview = ctx.storage.analytics.overview()
    const expectedNetWorth = (1000 + 2000) + 500000 + 30000 - (100000 - 40000)
    expect(overview.netWorth).toBeCloseTo(expectedNetWorth)
  })

  it('分类支出聚合按金额降序', () => {
    const accountId = seedAccount(ctx.storage)
    const foodCat = seedCategory(ctx.storage, 'expense')
    const trafficCat = seedCategory(ctx.storage, 'expense')
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 100,
      categoryId: foodCat,
      accountId,
      date: '2026-04-01'
    })
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 300,
      categoryId: trafficCat,
      accountId,
      date: '2026-04-02'
    })
    const result = ctx.storage.analytics.expenseByCategory('2026-04-01', '2026-04-30')
    expect(result[0].amount).toBe(300)
    expect(result[0].categoryId).toBe(trafficCat)
  })

  it('需求9.5: 标签支出聚合按金额降序，仅统计支出', () => {
    const accountId = seedAccount(ctx.storage)
    const expenseCat = seedCategory(ctx.storage, 'expense')
    const incomeCat = seedCategory(ctx.storage, 'income')
    const travelTag = ctx.storage.tag.create('旅行').id
    const foodTag = ctx.storage.tag.create('餐饮').id

    ctx.storage.transaction.create({
      type: 'expense',
      amount: 200,
      categoryId: expenseCat,
      accountId,
      date: '2026-04-01',
      tagIds: [travelTag, foodTag]
    })
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 600,
      categoryId: expenseCat,
      accountId,
      date: '2026-04-02',
      tagIds: [travelTag]
    })
    ctx.storage.transaction.create({
      type: 'income',
      amount: 900,
      categoryId: incomeCat,
      accountId,
      date: '2026-04-03',
      tagIds: [travelTag]
    })

    const result = ctx.storage.analytics.expenseByTag('2026-04-01', '2026-04-30')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ tagId: travelTag, tagName: '旅行', amount: 800 })
    expect(result[1]).toMatchObject({ tagId: foodTag, tagName: '餐饮', amount: 200 })
  })

  it('月度收支趋势聚合', () => {
    const accountId = seedAccount(ctx.storage)
    const incomeCat = seedCategory(ctx.storage, 'income')
    const expenseCat = seedCategory(ctx.storage, 'expense')
    ctx.storage.transaction.create({
      type: 'income',
      amount: 10000,
      categoryId: incomeCat,
      accountId,
      date: '2026-01-10'
    })
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 2000,
      categoryId: expenseCat,
      accountId,
      date: '2026-01-15'
    })
    ctx.storage.transaction.create({
      type: 'expense',
      amount: 1500,
      categoryId: expenseCat,
      accountId,
      date: '2026-02-03'
    })
    const trend = ctx.storage.analytics.monthlyTrend('2026-01-01', '2026-12-31')
    expect(trend.length).toBe(2)
    expect(trend[0].month).toBe('2026-01')
    expect(trend[0].income).toBe(10000)
    expect(trend[0].expense).toBe(2000)
    expect(trend[1].month).toBe('2026-02')
    expect(trend[1].expense).toBe(1500)
  })
})
