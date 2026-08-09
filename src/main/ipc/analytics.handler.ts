import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import { LedgerManager } from '../services/ledger-manager'

export function registerAnalyticsHandlers(ledgerManager: LedgerManager): void {
  const storage = () => ledgerManager.storageService

  ipcMain.handle(IpcChannels.analytics.overview, () => {
    try {
      return storage().analytics.overview()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.analytics.expenseByCategory,
    (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
      try {
        return storage().analytics.expenseByCategory(startDate, endDate)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.analytics.monthlyTrend,
    (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
      try {
        return storage().analytics.monthlyTrend(startDate, endDate)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.analytics.netWorth, () => {
    try {
      return storage().analytics.netWorthTrend()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.analytics.accountBalance, () => {
    try {
      return storage().analytics.accountBalance()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
