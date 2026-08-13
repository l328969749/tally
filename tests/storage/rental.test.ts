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

function seedRental(ctx: {
  storage: StorageService
}): { propertyId: number; tenantId: number; leaseId: number } {
  const propertyId = ctx.storage.rental.createProperty({
    address: '幸福小区 3 栋 502',
    area: 88,
    monthlyRent: 3200,
    deposit: 6400
  }).id
  const tenantId = ctx.storage.rental.createTenant({ name: '张三', phone: '13800000000' }).id
  const leaseId = ctx.storage.rental
    .createLease({
      propertyId,
      tenantId,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRent: 3200,
      payCycle: 'monthly'
    })
    .id
  return { propertyId, tenantId, leaseId }
}

describe('schema v2 → v3 迁移', () => {
  it('升级后新增租赁表并保留既有数据', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cash','bank','alipay','wechat','credit','other')),
        card_number TEXT,
        credit_limit REAL NOT NULL DEFAULT 0,
        bill_date INTEGER,
        due_date INTEGER,
        initial_balance REAL NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income','expense')),
        parent_id INTEGER REFERENCES category(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE "transaction" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('income','expense')),
        amount REAL NOT NULL CHECK(amount > 0),
        category_id INTEGER NOT NULL REFERENCES category(id),
        account_id INTEGER NOT NULL REFERENCES account(id),
        note TEXT,
        date TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE asset (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('fixed','investment','liquid')),
        value REAL NOT NULL DEFAULT 0,
        unit TEXT,
        note TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE ledger_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
    db.prepare(
      "INSERT INTO account (name, type, initial_balance, sort_order, archived, created_at) VALUES ('现金', 'cash', 5000, 0, 0, 1)"
    ).run()
    db.pragma('user_version = 2')

    migrateSchema(db)

    expect(db.pragma('user_version', { simple: true })).toBe(3)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>
    const names = tables.map((t) => t.name)
    expect(names).toContain('rental_property')
    expect(names).toContain('tenant')
    expect(names).toContain('lease')
    expect(names).toContain('rent_record')

    const account = db.prepare('SELECT * FROM account WHERE name = ?').get('现金') as Record<string, unknown>
    expect(account.initial_balance).toBe(5000)
    db.close()
  })
})

describe('RentalRepository', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestCtx()
  })

  afterEach(() => {
    ctx.db.close()
    vi.restoreAllMocks()
  })

  it('出租房 CRUD', () => {
    const property = ctx.storage.rental.createProperty({
      address: '幸福小区 3 栋 502',
      area: 88,
      monthlyRent: 3200,
      deposit: 6400,
      note: '精装两室'
    })
    expect(property.id).toBeGreaterThan(0)
    expect(property.address).toBe('幸福小区 3 栋 502')
    expect(property.monthlyRent).toBe(3200)

    ctx.storage.rental.updateProperty(property.id, { monthlyRent: 3500, area: 88 })
    const updated = ctx.storage.rental.getProperty(property.id)!
    expect(updated.monthlyRent).toBe(3500)
    expect(updated.area).toBe(88)
  })

  it('租户 CRUD 与关联合同删除拦截', () => {
    const tenant = ctx.storage.rental.createTenant({ name: '张三', phone: '13800000000', idNumber: '110101199001011234' })
    expect(tenant.name).toBe('张三')

    ctx.storage.rental.updateTenant(tenant.id, { phone: '13900000000' })
    expect(ctx.storage.rental.getTenant(tenant.id)!.phone).toBe('13900000000')

    const propertyId = ctx.storage.rental.createProperty({ address: 'A 栋 101', monthlyRent: 2000 }).id
    ctx.storage.rental.createLease({
      propertyId,
      tenantId: tenant.id,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRent: 2000,
      payCycle: 'monthly'
    })
    expect(ctx.storage.rental.hasLeases(tenant.id)).toBe(true)
    expect(() => ctx.storage.rental.deleteTenant(tenant.id)).toThrow('TENANT_HAS_LEASES')
  })

  it('合同列表聚合出租房地址、租户姓名与累计租金', () => {
    const { leaseId } = seedRental(ctx)
    const bankId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 0 }).id

    ctx.storage.rentalService.recordRent({ leaseId, amount: 3200, date: '2026-02-01', accountId: bankId })
    ctx.storage.rentalService.recordRent({ leaseId, amount: 3200, date: '2026-03-01', accountId: bankId })

    const leases = ctx.storage.rental.listLeases()
    expect(leases).toHaveLength(1)
    const lease = leases[0]
    expect(lease.propertyAddress).toBe('幸福小区 3 栋 502')
    expect(lease.tenantName).toBe('张三')
    expect(lease.totalRent).toBe(6400)
    expect(lease.rentCount).toBe(2)
    expect(lease.status).toBe('active')
    expect(lease.nextDueDate).not.toBeNull()
  })

  it('删除出租房级联删除合同与收租记录', () => {
    const { propertyId, leaseId } = seedRental(ctx)
    const bankId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 0 }).id
    ctx.storage.rentalService.recordRent({ leaseId, amount: 3200, date: '2026-02-01', accountId: bankId })

    ctx.storage.rental.deleteProperty(propertyId)

    expect(ctx.storage.rental.listLeases()).toHaveLength(0)
    expect(ctx.storage.rental.listRentRecords()).toHaveLength(0)
  })

  it('终止合同记录终止日期并停止计算应收租日', () => {
    const { leaseId } = seedRental(ctx)
    ctx.storage.rental.terminateLease(leaseId, '2026-06-30')
    const lease = ctx.storage.rental.getLease(leaseId)!
    expect(lease.status).toBe('terminated')
    expect(lease.terminatedAt).toBe('2026-06-30')

    const leases = ctx.storage.rental.listLeases()
    expect(leases[0].nextDueDate).toBeNull()
  })
})

describe('RentalService', () => {
  let ctx: { db: Database.Database; storage: StorageService }

  beforeEach(() => {
    ctx = createTestCtx()
  })

  afterEach(() => {
    ctx.db.close()
    vi.restoreAllMocks()
  })

  it('记录收租生成租金收入流水并增加账户余额', () => {
    const { leaseId } = seedRental(ctx)
    const bankId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 10000 }).id

    const result = ctx.storage.rentalService.recordRent({
      leaseId,
      amount: 3200,
      date: '2026-02-01',
      accountId: bankId,
      note: '二月房租'
    })

    expect(result.transaction.type).toBe('income')
    expect(result.transaction.amount).toBe(3200)
    expect(result.transaction.categoryName).toBe('租金收入')
    expect(result.transaction.accountId).toBe(bankId)
    expect(result.record.amount).toBe(3200)
    expect(result.record.transactionId).toBe(result.transaction.id)

    const balance = ctx.storage.analytics.accountBalance().find((a) => a.accountId === bankId)!
    expect(balance.balance).toBe(13200)
  })

  it('已终止合同不允许记录收租', () => {
    const { leaseId } = seedRental(ctx)
    const bankId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 0 }).id
    ctx.storage.rental.terminateLease(leaseId, '2026-06-30')

    expect(() =>
      ctx.storage.rentalService.recordRent({ leaseId, amount: 3200, date: '2026-07-01', accountId: bankId })
    ).toThrow('LEASE_NOT_ACTIVE')
  })

  it('信用卡账户不能作为租金收入账户', () => {
    const { leaseId } = seedRental(ctx)
    const creditId = ctx.storage.account.create({ name: '信用卡', type: 'credit', initialBalance: 0 }).id

    expect(() =>
      ctx.storage.rentalService.recordRent({ leaseId, amount: 3200, date: '2026-02-01', accountId: creditId })
    ).toThrow('INVALID_ACCOUNT')
  })

  it('删除收租记录同步删除关联收入流水', () => {
    const { leaseId } = seedRental(ctx)
    const bankId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 10000 }).id
    const result = ctx.storage.rentalService.recordRent({
      leaseId,
      amount: 3200,
      date: '2026-02-01',
      accountId: bankId
    })

    ctx.storage.rentalService.deleteRentRecord(result.record.id)

    expect(ctx.storage.rental.listRentRecords()).toHaveLength(0)
    expect(ctx.storage.transaction.getById(result.transaction.id)).toBeUndefined()
    const balance = ctx.storage.analytics.accountBalance().find((a) => a.accountId === bankId)!
    expect(balance.balance).toBe(10000)
  })

  it('记录收租中途失败整体回滚', () => {
    const { leaseId } = seedRental(ctx)
    const bankId = ctx.storage.account.create({ name: '储蓄卡', type: 'bank', initialBalance: 0 }).id

    const original = ctx.storage.transaction.create.bind(ctx.storage.transaction)
    let calls = 0
    vi.spyOn(ctx.storage.transaction, 'create').mockImplementation((data) => {
      calls += 1
      if (calls === 1) {
        throw new Error('SIMULATED_FAILURE')
      }
      return original(data)
    })

    expect(() =>
      ctx.storage.rentalService.recordRent({ leaseId, amount: 3200, date: '2026-02-01', accountId: bankId })
    ).toThrow('SIMULATED_FAILURE')

    expect(ctx.storage.rental.listRentRecords()).toHaveLength(0)
    const count = ctx.db.prepare('SELECT count(*) AS c FROM "transaction"').get() as { c: number }
    expect(count.c).toBe(0)
  })
})
