import type Database from 'better-sqlite3-multiple-ciphers'

export const SCHEMA_VERSION = 1

export function migrateSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cash','bank','alipay','wechat','other')),
      initial_balance REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      parent_id INTEGER REFERENCES category(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS "transaction" (
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
    CREATE INDEX IF NOT EXISTS idx_transaction_date ON "transaction"(date DESC);
    CREATE INDEX IF NOT EXISTS idx_transaction_account ON "transaction"(account_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_category ON "transaction"(category_id);

    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS transaction_tag (
      transaction_id INTEGER NOT NULL REFERENCES "transaction"(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
      PRIMARY KEY (transaction_id, tag_id)
    );
    CREATE INDEX IF NOT EXISTS idx_transaction_tag_tag ON transaction_tag(tag_id);

    CREATE TABLE IF NOT EXISTS asset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('fixed','investment','liquid')),
      value REAL NOT NULL DEFAULT 0,
      unit TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset_value (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
      value REAL NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS liability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS ledger_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  db.pragma(`user_version = ${SCHEMA_VERSION}`)
}

export const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' }> = [
  { name: '工资', type: 'income' },
  { name: '奖金', type: 'income' },
  { name: '理财收益', type: 'income' },
  { name: '兼职', type: 'income' },
  { name: '餐饮', type: 'expense' },
  { name: '交通', type: 'expense' },
  { name: '购物', type: 'expense' },
  { name: '居住', type: 'expense' },
  { name: '娱乐', type: 'expense' },
  { name: '医疗', type: 'expense' },
  { name: '教育', type: 'expense' },
  { name: '人情往来', type: 'expense' },
  { name: '其他支出', type: 'expense' }
]

export function seedDefaultCategories(db: Database.Database): void {
  const count = db.prepare('SELECT count(*) AS c FROM category').get() as { c: number }
  if (count.c > 0) {
    return
  }
  const insert = db.prepare(
    'INSERT INTO category (name, type, parent_id, sort_order) VALUES (?, ?, NULL, ?)'
  )
  const tx = db.transaction(() => {
    DEFAULT_CATEGORIES.forEach((category, index) => {
      insert.run(category.name, category.type, index)
    })
  })
  tx()
}
