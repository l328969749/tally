import { app, BrowserWindow, dialog } from 'electron'
import { createWindow } from './window'
import { createTray, destroyTray } from './tray'
import { registerDefaultShortcut, unregisterShortcuts, triggerQuickEntry, QUICK_ENTRY_CHANNEL } from './global-shortcut'
import { getLedgerManager, registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow()
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.show()
  mainWindow.focus()
}

export function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

export function initApp(): void {
  registerIpcHandlers()

  app.whenReady().then(() => {
    createTray(() => triggerQuickEntry())
    registerDefaultShortcut()
    showMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        showMainWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', async (event) => {
    const ledger = getLedgerManager()
    if (ledger.isOpen && ledger.getBackupReminder()) {
      event.preventDefault()
      const choice = await dialog.showMessageBox({
        type: 'question',
        title: '退出确认',
        message: '是否在退出前备份账本？',
        buttons: ['备份并退出', '直接退出', '取消'],
        defaultId: 0,
        cancelId: 2
      })
      if (choice.response === 0) {
        const saved = await dialog.showSaveDialog({
          title: '备份账本',
          defaultPath: `${ledger.metadata?.name ?? 'ledger'}-backup.ledger`,
          filters: [{ name: '账本文件', extensions: ['ledger'] }]
        })
        if (!saved.canceled && saved.filePath) {
          try {
            const { BackupService } = await import('./services/backup-service')
            new BackupService(ledger.storageService).create(saved.filePath)
          } catch (error) {
            dialog.showErrorBox('备份失败', error instanceof Error ? error.message : '未知错误')
          }
        }
      }
      if (choice.response !== 2) {
        ledger.close()
        unregisterShortcuts()
        destroyTray()
        app.exit(0)
      }
      return
    }
    ledger.close()
    unregisterShortcuts()
    destroyTray()
  })

  app.on('will-quit', () => {
    unregisterShortcuts()
  })
}

export function quickEntryChannel(): string {
  return QUICK_ENTRY_CHANNEL
}
