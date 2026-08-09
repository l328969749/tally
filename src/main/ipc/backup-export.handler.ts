import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import { LedgerManager } from '../services/ledger-manager'
import { BackupService } from '../services/backup-service'
import { ExportService } from '../services/export-service'
import { CryptoError } from '../services/crypto-service'

export function registerBackupExportHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(IpcChannels.backup.create, async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: '备份账本',
        defaultPath: `${ledgerManager.metadata?.name ?? 'ledger'}-backup.ledger`,
        filters: [{ name: '账本文件', extensions: ['ledger'] }]
      })
      if (result.canceled || !result.filePath) {
        return { canceled: true }
      }
      const backup = new BackupService(ledgerManager.storageService)
      backup.create(result.filePath)
      return { ok: true, path: result.filePath }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.backup.restore, async (_event: IpcMainInvokeEvent, password: string) => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择备份文件',
        filters: [{ name: '账本文件', extensions: ['ledger'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true }
      }
      const backupPath = result.filePaths[0]
      const saveResult = await dialog.showSaveDialog({
        title: '恢复到的账本位置',
        defaultPath: backupPath.replace(/\.ledger$/, '') + '-restored.ledger',
        filters: [{ name: '账本文件', extensions: ['ledger'] }]
      })
      if (saveResult.canceled || !saveResult.filePath) {
        return { canceled: true }
      }
      const backup = new BackupService(ledgerManager.storageService)
      backup.restore(backupPath, password, saveResult.filePath)
      return { ok: true, path: saveResult.filePath }
    } catch (error) {
      if (error instanceof CryptoError) {
        return { error: error.code }
      }
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.export.toCsv,
    async (_event: IpcMainInvokeEvent, scope: 'transactions' | 'accounts' | 'assets' | 'all') => {
      try {
        const result = await dialog.showSaveDialog({
          title: '导出 CSV',
          defaultPath: `tally-export-${Date.now()}.csv`,
          filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
        })
        if (result.canceled || !result.filePath) {
          return { canceled: true }
        }
        const exporter = new ExportService(ledgerManager.storageService)
        exporter.toCsv(result.filePath, scope)
        return { ok: true, path: result.filePath }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.export.toJson, async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出 JSON',
        defaultPath: `tally-export-${Date.now()}.json`,
        filters: [{ name: 'JSON 文件', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) {
        return { canceled: true }
      }
      const exporter = new ExportService(ledgerManager.storageService)
      exporter.toJson(result.filePath)
      return { ok: true, path: result.filePath }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
