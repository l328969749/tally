import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { TransactionFilter } from '@shared/types/models'
import { LedgerManager } from '../services/ledger-manager'
import { isValidAmount, isValidDate } from '@shared/validation/validators'

export function registerTransactionHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(
    IpcChannels.transaction.list,
    (_event: IpcMainInvokeEvent, filter: TransactionFilter) => {
      try {
        return ledgerManager.storageService.transaction.list(filter ?? {})
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.transaction.create,
    (
      _event: IpcMainInvokeEvent,
      data: {
        type: 'income' | 'expense'
        amount: number
        categoryId: number
        accountId: number
        note?: string | null
        date: string
        tagIds?: number[]
      }
    ) => {
      try {
        if (!isValidAmount(data.amount)) {
          return { error: 'INVALID_AMOUNT' }
        }
        if (!isValidDate(data.date)) {
          return { error: 'INVALID_DATE' }
        }
        return ledgerManager.storageService.transaction.create(data)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.transaction.update,
    (
      _event: IpcMainInvokeEvent,
      id: number,
      data: {
        type?: 'income' | 'expense'
        amount?: number
        categoryId?: number
        accountId?: number
        note?: string | null
        date?: string
        tagIds?: number[]
      }
    ) => {
      try {
        if (data.amount !== undefined && !isValidAmount(data.amount)) {
          return { error: 'INVALID_AMOUNT' }
        }
        if (data.date !== undefined && !isValidDate(data.date)) {
          return { error: 'INVALID_DATE' }
        }
        return ledgerManager.storageService.transaction.update(id, data)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.transaction.delete, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      ledgerManager.storageService.transaction.delete(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
