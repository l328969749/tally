import { IpcMainInvokeEvent } from 'electron'
import { ipcMain, dialog } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import { LedgerManager } from '../services/ledger-manager'
import { CryptoError } from '../services/crypto-service'

export function registerLedgerHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(IpcChannels.ledger.chooseCreatePath, async (): Promise<{ path: string | null }> => {
    const result = await dialog.showSaveDialog({
      title: '新建账本',
      defaultPath: 'my-ledger.ledger',
      filters: [{ name: '账本文件', extensions: ['ledger'] }]
    })
    if (result.canceled || !result.filePath) {
      return { path: null }
    }
    return { path: result.filePath }
  })

  ipcMain.handle(IpcChannels.ledger.chooseOpenPath, async (): Promise<{ path: string | null }> => {
    const result = await dialog.showOpenDialog({
      title: '打开账本',
      filters: [{ name: '账本文件', extensions: ['ledger'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { path: null }
    }
    return { path: result.filePaths[0] }
  })
  ipcMain.handle(IpcChannels.ledger.open, (_event: IpcMainInvokeEvent, path: string, password: string) => {
    try {
      return ledgerManager.open(path, password)
    } catch (error) {
      return { error: mapLedgerError(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.ledger.create,
    (_event: IpcMainInvokeEvent, path: string, password: string, name: string) => {
      try {
        return ledgerManager.create(path, password, name)
      } catch (error) {
        return { error: mapLedgerError(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.ledger.close, () => {
    ledgerManager.close()
    return { ok: true }
  })

  ipcMain.handle(
    IpcChannels.ledger.changePassword,
    (_event: IpcMainInvokeEvent, oldPassword: string, newPassword: string) => {
      try {
        ledgerManager.changePassword(oldPassword, newPassword)
        return { ok: true }
      } catch (error) {
        return { error: mapLedgerError(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.ledger.getLastUsed, () => {
    return { path: ledgerManager.getLastUsedPath() }
  })

  ipcMain.handle(IpcChannels.ledger.setBackupReminder, (_event: IpcMainInvokeEvent, enabled: boolean) => {
    ledgerManager.setBackupReminder(enabled)
    return { ok: true }
  })

  ipcMain.handle(IpcChannels.ledger.delete, () => {
    try {
      const path = ledgerManager.deleteCurrent()
      return { ok: true, path }
    } catch (error) {
      return { error: mapLedgerError(error) }
    }
  })
}

function mapLedgerError(error: unknown): string {
  if (error instanceof CryptoError) {
    return error.code
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'UNKNOWN_ERROR'
}
