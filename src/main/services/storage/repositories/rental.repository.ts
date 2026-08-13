import type Database from 'better-sqlite3-multiple-ciphers'
import type {
  Lease,
  LeaseInput,
  LeaseWithMeta,
  PayCycle,
  RentalProperty,
  RentalPropertyInput,
  RentalPropertyUpdateInput,
  RentRecord,
  Tenant,
  TenantInput,
  TenantUpdateInput
} from '@shared/types/models'
import { mapRow, mapRows } from '../row-mapper'
import { nextDueDate } from '@shared/rental-utils'

type Db = Database.Database

export class RentalRepository {
  constructor(private db: Db) {}

  // ---------- 出租房 ----------

  listProperties(): RentalProperty[] {
    return mapRows<RentalProperty>(
      this.db.prepare('SELECT * FROM rental_property ORDER BY id ASC').all()
    )
  }

  getProperty(id: number): RentalProperty | undefined {
    return mapRow<RentalProperty | undefined>(
      this.db.prepare('SELECT * FROM rental_property WHERE id = ?').get(id)
    )
  }

  createProperty(data: RentalPropertyInput): RentalProperty {
    const result = this.db
      .prepare(
        `INSERT INTO rental_property (address, area, monthly_rent, deposit, note, asset_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.address,
        data.area ?? 0,
        data.monthlyRent ?? 0,
        data.deposit ?? 0,
        data.note ?? null,
        data.assetId ?? null,
        Date.now()
      )
    return this.getProperty(result.lastInsertRowid as number)!
  }

  updateProperty(id: number, data: RentalPropertyUpdateInput): void {
    const current = this.getProperty(id)
    if (!current) {
      throw new Error('PROPERTY_NOT_FOUND')
    }
    this.db
      .prepare(
        `UPDATE rental_property SET address = ?, area = ?, monthly_rent = ?, deposit = ?, note = ?, asset_id = ? WHERE id = ?`
      )
      .run(
        data.address ?? current.address,
        data.area ?? current.area,
        data.monthlyRent ?? current.monthlyRent,
        data.deposit ?? current.deposit,
        data.note === undefined ? current.note : data.note,
        data.assetId === undefined ? current.assetId : data.assetId,
        id
      )
  }

  deleteProperty(id: number): void {
    this.db.prepare('DELETE FROM rental_property WHERE id = ?').run(id)
  }

  // ---------- 租户 ----------

  listTenants(): Tenant[] {
    return mapRows<Tenant>(this.db.prepare('SELECT * FROM tenant ORDER BY id ASC').all())
  }

  getTenant(id: number): Tenant | undefined {
    return mapRow<Tenant | undefined>(this.db.prepare('SELECT * FROM tenant WHERE id = ?').get(id))
  }

  createTenant(data: TenantInput): Tenant {
    const result = this.db
      .prepare('INSERT INTO tenant (name, phone, id_number, created_at) VALUES (?, ?, ?, ?)')
      .run(data.name, data.phone ?? null, data.idNumber ?? null, Date.now())
    return this.getTenant(result.lastInsertRowid as number)!
  }

  updateTenant(id: number, data: TenantUpdateInput): void {
    const current = this.getTenant(id)
    if (!current) {
      throw new Error('TENANT_NOT_FOUND')
    }
    this.db
      .prepare('UPDATE tenant SET name = ?, phone = ?, id_number = ? WHERE id = ?')
      .run(
        data.name ?? current.name,
        data.phone === undefined ? current.phone : data.phone,
        data.idNumber === undefined ? current.idNumber : data.idNumber,
        id
      )
  }

  deleteTenant(id: number): void {
    if (this.hasLeases(id)) {
      throw new Error('TENANT_HAS_LEASES')
    }
    this.db.prepare('DELETE FROM tenant WHERE id = ?').run(id)
  }

  hasLeases(tenantId: number): boolean {
    const row = this.db
      .prepare('SELECT count(*) AS c FROM lease WHERE tenant_id = ?')
      .get(tenantId) as { c: number }
    return row.c > 0
  }

  // ---------- 合同 ----------

  listLeases(): LeaseWithMeta[] {
    const today = new Date()
    const rows = this.db
      .prepare(
        `SELECT l.*, p.address AS property_address, t.name AS tenant_name,
           COALESCE((SELECT SUM(r.amount) FROM rent_record r WHERE r.lease_id = l.id), 0) AS total_rent,
           (SELECT count(*) FROM rent_record r WHERE r.lease_id = l.id) AS rent_count
         FROM lease l
         INNER JOIN rental_property p ON p.id = l.property_id
         INNER JOIN tenant t ON t.id = l.tenant_id
         ORDER BY l.status ASC, l.id DESC`
      )
      .all() as unknown as LeaseWithMeta[]
    return mapRows<LeaseWithMeta>(rows).map((row) => ({
      ...row,
      nextDueDate:
        row.status === 'active'
          ? nextDueDate(row.startDate, row.payCycle as PayCycle, today)
          : null
    }))
  }

  getLease(id: number): Lease | undefined {
    return mapRow<Lease | undefined>(this.db.prepare('SELECT * FROM lease WHERE id = ?').get(id))
  }

  createLease(data: LeaseInput): Lease {
    const result = this.db
      .prepare(
        `INSERT INTO lease (property_id, tenant_id, start_date, end_date, monthly_rent, pay_cycle, status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .run(
        data.propertyId,
        data.tenantId,
        data.startDate,
        data.endDate,
        data.monthlyRent,
        data.payCycle,
        data.note ?? null,
        Date.now()
      )
    return this.getLease(result.lastInsertRowid as number)!
  }

  updateLease(
    id: number,
    data: {
      startDate?: string
      endDate?: string
      monthlyRent?: number
      payCycle?: PayCycle
      note?: string | null
    }
  ): void {
    const current = this.getLease(id)
    if (!current) {
      throw new Error('LEASE_NOT_FOUND')
    }
    this.db
      .prepare(
        `UPDATE lease SET start_date = ?, end_date = ?, monthly_rent = ?, pay_cycle = ?, note = ? WHERE id = ?`
      )
      .run(
        data.startDate ?? current.startDate,
        data.endDate ?? current.endDate,
        data.monthlyRent ?? current.monthlyRent,
        data.payCycle ?? current.payCycle,
        data.note === undefined ? current.note : data.note,
        id
      )
  }

  terminateLease(id: number, terminatedAt: string): void {
    const current = this.getLease(id)
    if (!current) {
      throw new Error('LEASE_NOT_FOUND')
    }
    this.db
      .prepare(`UPDATE lease SET status = 'terminated', terminated_at = ? WHERE id = ?`)
      .run(terminatedAt, id)
  }

  // ---------- 收租记录 ----------

  listRentRecords(leaseId?: number): RentRecord[] {
    const params: unknown[] = []
    let whereClause = ''
    if (leaseId !== undefined) {
      whereClause = 'WHERE r.lease_id = ?'
      params.push(leaseId)
    }
    return mapRows<RentRecord>(
      this.db
        .prepare(
          `SELECT r.* FROM rent_record r ${whereClause} ORDER BY r.date DESC, r.id DESC`
        )
        .all(...params)
    )
  }

  getRentRecord(id: number): RentRecord | undefined {
    return mapRow<RentRecord | undefined>(
      this.db.prepare('SELECT * FROM rent_record WHERE id = ?').get(id)
    )
  }

  createRentRecord(data: {
    leaseId: number
    amount: number
    date: string
    transactionId: number | null
    note?: string | null
  }): RentRecord {
    const result = this.db
      .prepare(
        `INSERT INTO rent_record (lease_id, amount, date, transaction_id, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.leaseId,
        data.amount,
        data.date,
        data.transactionId,
        data.note ?? null,
        Date.now()
      )
    return this.getRentRecord(result.lastInsertRowid as number)!
  }

  deleteRentRecord(id: number): void {
    this.db.prepare('DELETE FROM rent_record WHERE id = ?').run(id)
  }
}
