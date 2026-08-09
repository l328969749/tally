import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { AssetType } from '@shared/types/models'
import { LedgerManager } from '../services/ledger-manager'

export function registerAssetHandlers(ledgerManager: LedgerManager): void {
  const storage = () => ledgerManager.storageService

  ipcMain.handle(IpcChannels.asset.list, () => {
    try {
      return storage().asset.list()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.asset.create,
    (
      _event: IpcMainInvokeEvent,
      data: { name: string; type: AssetType; value: number; unit?: string | null; note?: string | null }
    ) => {
      try {
        return storage().asset.create(data)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.asset.update,
    (
      _event: IpcMainInvokeEvent,
      id: number,
      data: { name?: string; type?: AssetType; value?: number; unit?: string | null; note?: string | null }
    ) => {
      try {
        storage().asset.update(id, data)
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.asset.delete, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      storage().asset.delete(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.asset.addValue,
    (_event: IpcMainInvokeEvent, assetId: number, value: number, date: string) => {
      try {
        return storage().asset.addValue(assetId, value, date)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.asset.listValues, (_event: IpcMainInvokeEvent, assetId: number) => {
    try {
      return storage().asset.listValues(assetId)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.asset.listLiabilities, () => {
    try {
      return storage().asset.listLiabilities()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.asset.createLiability,
    (
      _event: IpcMainInvokeEvent,
      data: {
        name: string
        totalAmount: number
        paidAmount: number
        interestRate: number
        note?: string | null
      }
    ) => {
      try {
        return storage().asset.createLiability(data)
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.asset.updateLiability,
    (
      _event: IpcMainInvokeEvent,
      id: number,
      data: {
        name?: string
        totalAmount?: number
        paidAmount?: number
        interestRate?: number
        note?: string | null
      }
    ) => {
      try {
        storage().asset.updateLiability(id, data)
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.asset.deleteLiability, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      storage().asset.deleteLiability(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}
