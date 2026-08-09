import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import { LedgerManager } from '../services/ledger-manager'
import { isValidTagName } from '@shared/validation/validators'

export function registerTagHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(IpcChannels.tag.list, () => {
    try {
      return ledgerManager.storageService.tag.list()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.tag.create, (_event: IpcMainInvokeEvent, name: string) => {
    try {
      if (!isValidTagName(name)) {
        return { error: 'INVALID_NAME' }
      }
      const repo = ledgerManager.storageService.tag
      if (repo.getByName(name)) {
        return { error: 'TAG_EXISTS' }
      }
      return repo.create(name)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.tag.update, (_event: IpcMainInvokeEvent, id: number, name: string) => {
    try {
      if (!isValidTagName(name)) {
        return { error: 'INVALID_NAME' }
      }
      ledgerManager.storageService.tag.update(id, name)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.tag.delete, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      ledgerManager.storageService.tag.delete(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
