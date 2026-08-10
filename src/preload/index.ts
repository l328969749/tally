import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc-channels'
import type {
  Account,
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
  AccountBalanceItem
} from '../shared/types/models'
import type {
  BackupCreateResult,
  BackupRestoreResult,
  ExportCsvResult,
  ExportJsonResult,
  LedgerOpenResult,
  LedgerCreateResult,
  OpResult
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
      ipcRenderer.invoke(IpcChannels.ledger.chooseOpenPath)
  },
  transaction: {
    list: (filter: TransactionFilter): Promise<TransactionListResult> =>
      ipcRenderer.invoke(IpcChannels.transaction.list, filter),
    create: (data: TransactionInput): Promise<TransactionWithMeta> =>
      ipcRenderer.invoke(IpcChannels.transaction.create, data),
    update: (id: number, data: Partial<TransactionInput>): Promise<TransactionWithMeta> =>
      ipcRenderer.invoke(IpcChannels.transaction.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.transaction.delete, id)
  },
  account: {
    list: (): Promise<AccountWithBalance[]> => ipcRenderer.invoke(IpcChannels.account.list),
    create: (data: { name: string; type: AccountType; initialBalance: number }): Promise<Account> =>
      ipcRenderer.invoke(IpcChannels.account.create, data),
    update: (
      id: number,
      data: { name?: string; type?: AccountType; initialBalance?: number }
    ): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.account.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.account.delete, id),
    archive: (id: number, archived: boolean): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.account.archive, id, archived),
    reorder: (id: number, sortOrder: number): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.account.reorder, id, sortOrder)
  },
  category: {
    list: (): Promise<Category[]> => ipcRenderer.invoke(IpcChannels.category.list),
    create: (data: { name: string; type: CategoryType; parentId?: number | null }): Promise<Category> =>
      ipcRenderer.invoke(IpcChannels.category.create, data),
    update: (id: number, data: { name?: string; parentId?: number | null }): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.category.update, id, data),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.category.delete, id)
  },
  tag: {
    list: (): Promise<Tag[]> => ipcRenderer.invoke(IpcChannels.tag.list),
    create: (name: string): Promise<Tag> => ipcRenderer.invoke(IpcChannels.tag.create, name),
    update: (id: number, name: string): Promise<OpResult> =>
      ipcRenderer.invoke(IpcChannels.tag.update, id, name),
    delete: (id: number): Promise<OpResult> => ipcRenderer.invoke(IpcChannels.tag.delete, id)
  },
  asset: {
    list: (): Promise<Asset[]> => ipcRenderer.invoke(IpcChannels.asset.list),
    create: (data: {
      name: string
      type: AssetType
      value: number
      unit?: string | null
      note?: string | null
    }): Promise<Asset> => ipcRenderer.invoke(IpcChannels.asset.create, data),
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
    addValue: (assetId: number, value: number, date: string): Promise<AssetValue> =>
      ipcRenderer.invoke(IpcChannels.asset.addValue, assetId, value, date),
    listValues: (assetId: number): Promise<AssetValue[]> =>
      ipcRenderer.invoke(IpcChannels.asset.listValues, assetId),
    listLiabilities: (): Promise<Liability[]> => ipcRenderer.invoke(IpcChannels.asset.listLiabilities),
    createLiability: (data: {
      name: string
      totalAmount: number
      paidAmount: number
      interestRate: number
      note?: string | null
    }): Promise<Liability> => ipcRenderer.invoke(IpcChannels.asset.createLiability, data),
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
    overview: (): Promise<OverviewData> => ipcRenderer.invoke(IpcChannels.analytics.overview),
    expenseByCategory: (startDate: string, endDate: string): Promise<CategoryExpenseItem[]> =>
      ipcRenderer.invoke(IpcChannels.analytics.expenseByCategory, startDate, endDate),
    expenseByTag: (startDate: string, endDate: string): Promise<TagExpenseItem[]> =>
      ipcRenderer.invoke(IpcChannels.analytics.expenseByTag, startDate, endDate),
    monthlyTrend: (startDate: string, endDate: string): Promise<MonthlyTrendItem[]> =>
      ipcRenderer.invoke(IpcChannels.analytics.monthlyTrend, startDate, endDate),
    netWorth: (): Promise<NetWorthPoint[]> => ipcRenderer.invoke(IpcChannels.analytics.netWorth),
    accountBalance: (): Promise<AccountBalanceItem[]> =>
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
