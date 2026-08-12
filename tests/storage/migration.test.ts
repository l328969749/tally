import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3-multiple-ciphers'
import { migrateSchema } from '../../src/main/services/storage/schema'
import { StorageService } from '../../src/main/services/storage'

function createV1Db(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cash','bank','alipay','wechat','other')),
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
  `)
  db.pragma('user_version = 1')
  return db
}

describe('schema v1 → v2 迁移', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createV1Db()
  })

  it('升级后保留既有账户数据并新增信用卡字段', () => {
    db.prepare(
      "INSERT INTO account (name, type, initial_balance, sort_order, archived, created_at) VALUES ('工资卡', 'bank', 5000, 0, 0, 1)"
    ).run()

    migrateSchema(db)

    const version = db.pragma('user_version', { simple: true })
    expect(version).toBe(2)

    const row = db.prepare('SELECT * FROM account WHERE name = ?').get('工资卡') as Record<string, unknown>
    expect(row.id).toBe(1)
    expect(row.initial_balance).toBe(5000)
    expect(row).toHaveProperty('card_number')
    expect(row.card_number).toBeNull()
    expect(row).toHaveProperty('credit_limit')
    expect(row).toHaveProperty('bill_date')
    expect(row).toHaveProperty('due_date')
  })

  it('升级后可创建信用卡账户（credit 类型 + 额度字段）', () => {
    migrateSchema(db)

    const storage = new StorageService(db)
    const credit = storage.account.create({
      name: '招行信用卡',
      type: 'credit',
      initialBalance: 0,
      cardNumber: '6225 8899 0011 2233',
      creditLimit: 20000,
      billDate: 5,
      dueDate: 23
    })

    expect(credit.type).toBe('credit')
    expect(credit.cardNumber).toBe('6225 8899 0011 2233')
    expect(credit.creditLimit).toBe(20000)
    expect(credit.billDate).toBe(5)
    expect(credit.dueDate).toBe(23)
  })

  it('升级后 transaction 外键仍可读', () => {
    db.prepare(
      "INSERT INTO account (name, type, initial_balance, sort_order, archived, created_at) VALUES ('现金', 'cash', 100, 0, 0, 1)"
    ).run()
    db.prepare("INSERT INTO category (name, type, sort_order) VALUES ('餐饮', 'expense', 0)").run()

    migrateSchema(db)

    const storage = new StorageService(db)
    const transaction = storage.transaction.create({
      type: 'expense',
      amount: 30,
      categoryId: 1,
      accountId: 1,
      note: '午饭',
      date: '2026-01-05'
    })
    expect(transaction.note).toBe('午饭')
    expect(transaction.accountName).toBe('现金')
    expect(transaction.categoryName).toBe('餐饮')
  })
})
