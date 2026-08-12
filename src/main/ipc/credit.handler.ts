import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import { isValidAmount, normalizeAmount } from '@shared/validation/validators'
import { LedgerManager } from '../services/ledger-manager'

export function registerCreditHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(
    IpcChannels.credit.repay,
    (
      _event: IpcMainInvokeEvent,
      data: {
        creditAccountId: number
        fundingAccountId: number
        amount: number
        date: string
        note?: string | null
      }
    ) => {
      try {
        if (!isValidAmount(data.amount)) {
          return { error: 'INVALID_AMOUNT' }
        }
        const result = ledgerManager.storageService.credit.repay({
          ...data,
          amount: normalizeAmount(data.amount)
        })
        return { ok: true, ...result }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' }
      }
    }
  )
}
