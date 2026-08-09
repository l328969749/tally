import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { AccountType } from '@shared/types/models'
import { LedgerManager } from '../services/ledger-manager'
import { isValidAccountName } from '@shared/validation/validators'

export function registerAccountHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(IpcChannels.account.list, () => {
    try {
      return ledgerManager.storageService.account.list()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.account.create,
    (
      _event: IpcMainInvokeEvent,
      data: { name: string; type: AccountType; initialBalance: number }
    ) => {
      try {
        if (!isValidAccountName(data.name)) {
          return { error: 'INVALID_NAME' }
        }
        return ledgerManager.storageService.account.create(data)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.account.update,
    (
      _event: IpcMainInvokeEvent,
      id: number,
      data: { name?: string; type?: AccountType; initialBalance?: number }
    ) => {
      try {
        if (data.name !== undefined && !isValidAccountName(data.name)) {
          return { error: 'INVALID_NAME' }
        }
        ledgerManager.storageService.account.update(id, data)
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.account.delete, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const repo = ledgerManager.storageService.account
      if (repo.hasTransactions(id)) {
        return { error: 'ACCOUNT_HAS_TRANSACTIONS' }
      }
      repo.delete(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.account.archive, (_event: IpcMainInvokeEvent, id: number, archived: boolean) => {
    try {
      ledgerManager.storageService.account.setArchived(id, archived)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.account.reorder, (_event: IpcMainInvokeEvent, id: number, sortOrder: number) => {
    try {
      ledgerManager.storageService.account.reorder(id, sortOrder)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
