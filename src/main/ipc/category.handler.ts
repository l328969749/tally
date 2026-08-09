import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { CategoryType } from '@shared/types/models'
import { LedgerManager } from '../services/ledger-manager'
import { isValidCategoryName } from '@shared/validation/validators'

export function registerCategoryHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(IpcChannels.category.list, () => {
    try {
      return ledgerManager.storageService.category.list()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.category.create,
    (
      _event: IpcMainInvokeEvent,
      data: { name: string; type: CategoryType; parentId?: number | null }
    ) => {
      try {
        if (!isValidCategoryName(data.name)) {
          return { error: 'INVALID_NAME' }
        }
        return ledgerManager.storageService.category.create(data)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.category.update,
    (
      _event: IpcMainInvokeEvent,
      id: number,
      data: { name?: string; parentId?: number | null }
    ) => {
      try {
        if (data.name !== undefined && !isValidCategoryName(data.name)) {
          return { error: 'INVALID_NAME' }
        }
        ledgerManager.storageService.category.update(id, data)
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.category.delete, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const repo = ledgerManager.storageService.category
      if (repo.hasTransactions(id)) {
        return { error: 'CATEGORY_HAS_TRANSACTIONS' }
      }
      repo.delete(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
