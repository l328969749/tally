import type Database from 'better-sqlite3-multiple-ciphers'
import type { Asset, AssetType, AssetValue, Liability } from '@shared/types/models'
import { mapRow, mapRows } from '../row-mapper'

type Db = Database.Database

export class AssetRepository {
  constructor(private db: Db) {}

  list(): Asset[] {
    return mapRows<Asset>(this.db.prepare('SELECT * FROM asset ORDER BY type ASC, id ASC').all())
  }

  getById(id: number): Asset | undefined {
    return mapRow<Asset | undefined>(this.db.prepare('SELECT * FROM asset WHERE id = ?').get(id))
  }

  create(data: {
    name: string
    type: AssetType
    value: number
    unit?: string | null
    note?: string | null
  }): Asset {
    const result = this.db
      .prepare('INSERT INTO asset (name, type, value, unit, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(data.name, data.type, data.value, data.unit ?? null, data.note ?? null, Date.now())
    return this.getById(result.lastInsertRowid as number)!
  }

  update(
    id: number,
    data: { name?: string; type?: AssetType; value?: number; unit?: string | null; note?: string | null }
  ): void {
    const current = this.getById(id)
    if (!current) {
      throw new Error('ASSET_NOT_FOUND')
    }
    this.db
      .prepare('UPDATE asset SET name = ?, type = ?, value = ?, unit = ?, note = ? WHERE id = ?')
      .run(
        data.name ?? current.name,
        data.type ?? current.type,
        data.value ?? current.value,
        data.unit === undefined ? current.unit : data.unit,
        data.note === undefined ? current.note : data.note,
        id
      )
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM asset WHERE id = ?').run(id)
  }

  addValue(assetId: number, value: number, date: string): AssetValue {
    const result = this.db
      .prepare('INSERT INTO asset_value (asset_id, value, date) VALUES (?, ?, ?)')
      .run(assetId, value, date)
    this.db.prepare('UPDATE asset SET value = ? WHERE id = ?').run(value, assetId)
    return mapRow<AssetValue>(
      this.db
        .prepare('SELECT * FROM asset_value WHERE id = ?')
        .get(result.lastInsertRowid as number)
    )
  }

  listValues(assetId: number): AssetValue[] {
    return mapRows<AssetValue>(
      this.db
        .prepare('SELECT * FROM asset_value WHERE asset_id = ? ORDER BY date ASC, id ASC')
        .all(assetId)
    )
  }

  listLiabilities(): Liability[] {
    return mapRows<Liability>(
      this.db.prepare('SELECT * FROM liability ORDER BY id ASC').all()
    )
  }

  createLiability(data: {
    name: string
    totalAmount: number
    paidAmount: number
    interestRate?: number
    note?: string | null
  }): Liability {
    const result = this.db
      .prepare(
        'INSERT INTO liability (name, total_amount, paid_amount, interest_rate, note) VALUES (?, ?, ?, ?, ?)'
      )
      .run(data.name, data.totalAmount, data.paidAmount, data.interestRate ?? 0, data.note ?? null)
    return mapRow<Liability>(
      this.db
        .prepare('SELECT * FROM liability WHERE id = ?')
        .get(result.lastInsertRowid as number)
    )
  }

  updateLiability(
    id: number,
    data: {
      name?: string
      totalAmount?: number
      paidAmount?: number
      interestRate?: number
      note?: string | null
    }
  ): void {
    const current = mapRow<Liability | undefined>(
      this.db.prepare('SELECT * FROM liability WHERE id = ?').get(id)
    )
    if (!current) {
      throw new Error('LIABILITY_NOT_FOUND')
    }
    this.db
      .prepare(
        'UPDATE liability SET name = ?, total_amount = ?, paid_amount = ?, interest_rate = ?, note = ? WHERE id = ?'
      )
      .run(
        data.name ?? current.name,
        data.totalAmount ?? current.totalAmount,
        data.paidAmount ?? current.paidAmount,
        data.interestRate ?? current.interestRate,
        data.note === undefined ? current.note : data.note,
        id
      )
  }

  deleteLiability(id: number): void {
    this.db.prepare('DELETE FROM liability WHERE id = ?').run(id)
  }
}
