import type Database from 'better-sqlite3-multiple-ciphers'
import { AccountRepository } from './repositories/account.repository'
import { CategoryRepository } from './repositories/category.repository'
import { TagRepository } from './repositories/tag.repository'
import { TransactionRepository } from './repositories/transaction.repository'
import { AssetRepository } from './repositories/asset.repository'
import { AnalyticsRepository } from './repositories/analytics.repository'
import { RentalRepository } from './repositories/rental.repository'
import { CreditService } from '../credit.service'
import { RentalService } from '../rental.service'

export class StorageService {
  private _account?: AccountRepository
  private _category?: CategoryRepository
  private _tag?: TagRepository
  private _transaction?: TransactionRepository
  private _asset?: AssetRepository
  private _analytics?: AnalyticsRepository
  private _rental?: RentalRepository
  private _credit?: CreditService
  private _rentalService?: RentalService

  constructor(private db: Database.Database) {}

  get account(): AccountRepository {
    if (!this._account) {
      this._account = new AccountRepository(this.db)
    }
    return this._account
  }

  get category(): CategoryRepository {
    if (!this._category) {
      this._category = new CategoryRepository(this.db)
    }
    return this._category
  }

  get tag(): TagRepository {
    if (!this._tag) {
      this._tag = new TagRepository(this.db)
    }
    return this._tag
  }

  get transaction(): TransactionRepository {
    if (!this._transaction) {
      this._transaction = new TransactionRepository(this.db, this.tag)
    }
    return this._transaction
  }

  get asset(): AssetRepository {
    if (!this._asset) {
      this._asset = new AssetRepository(this.db)
    }
    return this._asset
  }

  get analytics(): AnalyticsRepository {
    if (!this._analytics) {
      this._analytics = new AnalyticsRepository(this.db, this.tag)
    }
    return this._analytics
  }

  get credit(): CreditService {
    if (!this._credit) {
      this._credit = new CreditService(this.db, this.account, this.category, this.transaction)
    }
    return this._credit
  }

  get rental(): RentalRepository {
    if (!this._rental) {
      this._rental = new RentalRepository(this.db)
    }
    return this._rental
  }

  get rentalService(): RentalService {
    if (!this._rentalService) {
      this._rentalService = new RentalService(
        this.db,
        this.account,
        this.category,
        this.transaction,
        this.rental
      )
    }
    return this._rentalService
  }

  raw(): Database.Database {
    return this.db
  }
}
