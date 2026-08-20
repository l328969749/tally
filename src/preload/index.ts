import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc-channels'
import type {
  Account,
  AccountInput,
  AccountUpdateInput,
  AccountWithBalance,
  AccountType,
  Asset,
  AssetType,
  AssetValue,
  Category,
  CategoryType,
  LedgerMeta,
  Liability,
  MonthlyTrendItem,
  NetWorthPoint,
  OverviewData,
  Tag,
  TransactionFilter,
  TransactionInput,
  TransactionListResult,
  TransactionWithMeta,
  CategoryExpenseItem,
  TagExpenseItem,
  AccountBalanceItem,
  RentalProperty,
  RentalPropertyInput,
  RentalPropertyUpdateInput,
  Tenant,
  TenantInput,
  TenantUpdateInput,
  LeaseWithMeta,
  LeaseInput,
  RentRecord,
  RentRecordInput,
  RentalReminder
} from '../shared/types/models'
import type {
  BackupCreateResult,
  BackupRestoreResult,
  ExportCsvResult,
  ExportJsonResult,
  LedgerOpenResult,
  LedgerCreateResult,
  OpResult,
  WithError
} from '../shared/types/ipc-results'

const api = {
  ledger: {
    open: (path: string, password: string): Promise<LedgerOpenResult> =>
      ipcRenderer.invoke(IpcChannels.ledger.open, path, password),
    create: (path: string, password: string, name: string): Promise<LedgerCreateResult> =>
      ipcRenderer.invoke(IpcChannels.ledger.create, path, password, name),
    close: (): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.ledger.close),
    changePassword: (oldPassword: string, newPassword: string): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.ledger.changePassword, oldPassword, newPassword),
    getLastUsed: (): Promise<{ path: string | null }> =>
      ipcRenderer.invoke(IpcChannels.ledger.getLastUsed),
    setBackupReminder: (enabled: boolean): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.ledger.setBackupReminder, enabled),
    chooseCreatePath: (): Promise<{ path: string | null }> =>
      ipcRenderer.invoke(IpcChannels.ledger.chooseCreatePath),
    chooseOpenPath: (): Promise<{ path: string | null }> =>
      ipcRenderer.invoke(IpcChannels.ledger.chooseOpenPath),
    delete: (): Promise<OpResult & { path?: string }> =>
      ipcRenderer.invoke(IpcChannels.ledger.delete),
    getAutoOpenLastLedger: (): Promise<{ enabled: boolean }> =>
      ipcRenderer.invoke(IpcChannels.ledger.getAutoOpenLastLedger),
    setAutoOpenLastLedger: (enabled: boolean): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.ledger.setAutoOpenLastLedger, enabled),
    getBackupReminder: (): Promise<{ enabled: boolean }> =>
      ipcRenderer.invoke(IpcChannels.ledger.getBackupReminder)
  },
  transaction: {
    list: (filter: TransactionFilter): Promise<WithError<TransactionListResult>> =>
      ipcRenderer.invoke(IpcChannels.transaction.list, filter),
    create: (data: TransactionInput): Promise<WithError<TransactionWithMeta>> =>
      ipcRenderer.invoke(IpcChannels.transaction.create, data),
    update: (id: number, data: Partial<TransactionInput>): Promise<WithError<TransactionWithMeta>> =>
      ipcRenderer.invoke(IpcChannels.transaction.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.transaction.delete, id)
  },
  account: {
    list: (): Promise<WithError<AccountWithBalance[]>> => ipcRenderer.invoke(IpcChannels.account.list),
    create: (data: AccountInput): Promise<WithError<Account>> =>
      ipcRenderer.invoke(IpcChannels.account.create, data),
    update: (id: number, data: AccountUpdateInput): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.account.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.account.delete, id),
    archive: (id: number, archived: boolean): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.account.archive, id, archived),
    reorder: (id: number, sortOrder: number): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.account.reorder, id, sortOrder)
  },
  credit: {
    repay: (data: {
      creditAccountId: number
      fundingAccountId: number
      amount: number
      date: string
      note?: string | null
    }): Promise<OpResult & { expense?: unknown; income?: unknown }> =>
      ipcRenderer.invoke(IpcChannels.credit.repay, data)
  },
  rental: {
    listProperties: (): Promise<WithError<RentalProperty[]>> => ipcRenderer.invoke(IpcChannels.rental.listProperties),
    createProperty: (data: RentalPropertyInput): Promise<WithError<RentalProperty>> =>
      ipcRenderer.invoke(IpcChannels.rental.createProperty, data),
    updateProperty: (id: number, data: RentalPropertyUpdateInput): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.rental.updateProperty, id, data),
    deleteProperty: (id: number): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.rental.deleteProperty, id),
    listTenants: (): Promise<WithError<Tenant[]>> => ipcRenderer.invoke(IpcChannels.rental.listTenants),
    createTenant: (data: TenantInput): Promise<WithError<Tenant>> =>
      ipcRenderer.invoke(IpcChannels.rental.createTenant, data),
    updateTenant: (id: number, data: TenantUpdateInput): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.rental.updateTenant, id, data),
    deleteTenant: (id: number): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.rental.deleteTenant, id),
    listLeases: (): Promise<WithError<LeaseWithMeta[]>> => ipcRenderer.invoke(IpcChannels.rental.listLeases),
    createLease: (data: LeaseInput): Promise<WithError<LeaseWithMeta>> =>
      ipcRenderer.invoke(IpcChannels.rental.createLease, data),
    updateLease: (
      id: number,
      data: { startDate?: string; endDate?: string; monthlyRent?: number; payCycle?: string; note?: string | null }
    ): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.rental.updateLease, id, data),
    terminateLease: (id: number, terminatedAt: string): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.rental.terminateLease, id, terminatedAt),
    listRentRecords: (leaseId?: number): Promise<WithError<RentRecord[]>> =>
      ipcRenderer.invoke(IpcChannels.rental.listRentRecords, leaseId),
    recordRent: (data: RentRecordInput): Promise<OpResult & { record?: RentRecord }> =>
      ipcRenderer.invoke(IpcChannels.rental.recordRent, data),
    deleteRentRecord: (id: number): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.rental.deleteRentRecord, id),
    reminders: (): Promise<WithError<RentalReminder[]>> => ipcRenderer.invoke(IpcChannels.rental.reminders)
  },
  category: {
    list: (): Promise<WithError<Category[]>> => ipcRenderer.invoke(IpcChannels.category.list),
    create: (data: { name: string; type: CategoryType; parentId?: number | null }): Promise<WithError<Category>> =>
      ipcRenderer.invoke(IpcChannels.category.create, data),
    update: (id: number, data: { name?: string; parentId?: number | null }): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.category.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.category.delete, id)
  },
  tag: {
    list: (): Promise<WithError<Tag[]>> => ipcRenderer.invoke(IpcChannels.tag.list),
    create: (name: string): Promise<WithError<Tag>> => ipcRenderer.invoke(IpcChannels.tag.create, name),
    update: (id: number, name: string): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.tag.update, id, name),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.tag.delete, id)
  },
  asset: {
    list: (): Promise<WithError<Asset[]>> => ipcRenderer.invoke(IpcChannels.asset.list),
    create: (data: {
      name: string
      type: AssetType
      value: number
      unit?: string | null
      note?: string | null
    }): Promise<WithError<Asset>> => ipcRenderer.invoke(IpcChannels.asset.create, data),
    update: (
      id: number,
      data: {
        name?: string
        type?: AssetType
        value?: number
        unit?: string | null
        note?: string | null
      }
    ): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.asset.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.asset.delete, id),
    addValue: (assetId: number, value: number, date: string): Promise<WithError<AssetValue>> =>
      ipcRenderer.invoke(IpcChannels.asset.addValue, assetId, value, date),
    listValues: (assetId: number): Promise<WithError<AssetValue[]>> =>
      ipcRenderer.invoke(IpcChannels.asset.listValues, assetId),
    listLiabilities: (): Promise<WithError<Liability[]>> => ipcRenderer.invoke(IpcChannels.asset.listLiabilities),
    createLiability: (data: {
      name: string
      totalAmount: number
      paidAmount: number
      interestRate: number
      note?: string | null
    }): Promise<WithError<Liability>> => ipcRenderer.invoke(IpcChannels.asset.createLiability, data),
    updateLiability: (
      id: number,
      data: {
        name?: string
        totalAmount?: number
        paidAmount?: number
        interestRate?: number
        note?: string | null
      }
    ): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.asset.updateLiability, id, data),
    deleteLiability: (id: number): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.asset.deleteLiability, id)
  },
  analytics: {
    overview: (): Promise<WithError<OverviewData>> => ipcRenderer.invoke(IpcChannels.analytics.overview),
    expenseByCategory: (startDate: string, endDate: string): Promise<WithError<CategoryExpenseItem[]>> =>
      ipcRenderer.invoke(IpcChannels.analytics.expenseByCategory, startDate, endDate),
    expenseByTag: (startDate: string, endDate: string): Promise<WithError<TagExpenseItem[]>> =>
      ipcRenderer.invoke(IpcChannels.analytics.expenseByTag, startDate, endDate),
    monthlyTrend: (startDate: string, endDate: string): Promise<WithError<MonthlyTrendItem[]>> =>
      ipcRenderer.invoke(IpcChannels.analytics.monthlyTrend, startDate, endDate),
    netWorth: (): Promise<WithError<NetWorthPoint[]>> => ipcRenderer.invoke(IpcChannels.analytics.netWorth),
    accountBalance: (): Promise<WithError<AccountBalanceItem[]>> =>
      ipcRenderer.invoke(IpcChannels.analytics.accountBalance)
  },
  backup: {
    create: (): Promise<BackupCreateResult> => ipcRenderer.invoke(IpcChannels.backup.create),
    restore: (password: string): Promise<BackupRestoreResult> =>
      ipcRenderer.invoke(IpcChannels.backup.restore, password)
  },
  export: {
    toCsv: (scope: 'transactions' | 'accounts' | 'assets' | 'all'): Promise<ExportCsvResult> =>
      ipcRenderer.invoke(IpcChannels.export.toCsv, scope),
    toJson: (): Promise<ExportJsonResult> => ipcRenderer.invoke(IpcChannels.export.toJson)
  },
  app: {
    getWindowState: (): Promise<{ shortcut: string }> =>
      ipcRenderer.invoke(IpcChannels.app.getWindowState),
    onQuickEntry: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('app:quick-entry', listener)
      return () => ipcRenderer.removeListener('app:quick-entry', listener)
    }
  }
}

export type RendererApi = typeof api

contextBridge.exposeInMainWorld('api', api)
