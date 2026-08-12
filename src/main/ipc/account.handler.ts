import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { AccountInput, AccountType, AccountUpdateInput } from '@shared/types/models'
import { LedgerManager } from '../services/ledger-manager'
import {
  isValidAccountName,
  isValidCardNumber,
  isValidCreditLimit,
  isValidMonthDay
} from '@shared/validation/validators'

function validateAccountInput(data: {
  name?: string
  type?: AccountType
  cardNumber?: string | null
  creditLimit?: number
  billDate?: number | null
  dueDate?: number | null
}): string | null {
  if (data.name !== undefined && !isValidAccountName(data.name)) {
    return 'INVALID_NAME'
  }
  if (data.cardNumber !== undefined && !isValidCardNumber(data.cardNumber ?? '')) {
    return 'INVALID_CARD_NUMBER'
  }
  if (data.creditLimit !== undefined && !isValidCreditLimit(data.creditLimit)) {
    return 'INVALID_CREDIT_LIMIT'
  }
  if (data.billDate !== undefined && data.billDate !== null && !isValidMonthDay(data.billDate)) {
    return 'INVALID_BILL_DATE'
  }
  if (data.dueDate !== undefined && data.dueDate !== null && !isValidMonthDay(data.dueDate)) {
    return 'INVALID_DUE_DATE'
  }
  return null
}

export function registerAccountHandlers(ledgerManager: LedgerManager): void {
  ipcMain.handle(IpcChannels.account.list, () => {
    try {
      return ledgerManager.storageService.account.list()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.account.create, (_event: IpcMainInvokeEvent, data: AccountInput) => {
    try {
      const invalid = validateAccountInput(data)
      if (invalid) {
        return { error: invalid }
      }
      return ledgerManager.storageService.account.create(data)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.account.update,
    (_event: IpcMainInvokeEvent, id: number, data: AccountUpdateInput) => {
      try {
        const invalid = validateAccountInput(data)
        if (invalid) {
          return { error: invalid }
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
