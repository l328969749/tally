import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import { LedgerManager } from '../services/ledger-manager'
import { registerLedgerHandlers } from './ledger.handler'
import { registerTransactionHandlers } from './transaction.handler'
import { registerAccountHandlers } from './account.handler'
import { registerCategoryHandlers } from './category.handler'
import { registerTagHandlers } from './tag.handler'
import { registerAssetHandlers } from './asset.handler'
import { registerAnalyticsHandlers } from './analytics.handler'
import { registerBackupExportHandlers } from './backup-export.handler'
import { registerCreditHandlers } from './credit.handler'

let ledgerManager: LedgerManager | null = null

export function getLedgerManager(): LedgerManager {
  if (!ledgerManager) {
    ledgerManager = new LedgerManager()
  }
  return ledgerManager
}

export function registerIpcHandlers(): void {
  const ledger = getLedgerManager()

  ipcMain.handle(IpcChannels.app.getWindowState, () => {
    return { shortcut: ledger.getGlobalShortcut() }
  })

  registerLedgerHandlers(ledger)
  registerTransactionHandlers(ledger)
  registerAccountHandlers(ledger)
  registerCategoryHandlers(ledger)
  registerTagHandlers(ledger)
  registerAssetHandlers(ledger)
  registerAnalyticsHandlers(ledger)
  registerBackupExportHandlers(ledger)
  registerCreditHandlers(ledger)
}
