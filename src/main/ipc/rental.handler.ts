import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type {
  LeaseInput,
  LeaseWithMeta,
  PayCycle,
  RentalPropertyInput,
  RentalPropertyUpdateInput,
  RentRecordInput,
  TenantInput,
  TenantUpdateInput
} from '@shared/types/models'
import {
  isValidAmount,
  isValidAddress,
  isValidDate,
  isValidLeaseDates,
  isValidNonNegative,
  isValidPayCycle,
  isValidPhone,
  isValidIdNumber,
  normalizeAmount
} from '@shared/validation/validators'
import { buildRentalReminders } from '@shared/rental-utils'
import { LedgerManager } from '../services/ledger-manager'
import type { StorageService } from '../services/storage'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR'
}

export function registerRentalHandlers(ledgerManager: LedgerManager): void {
  const repo = (): StorageService['rental'] => ledgerManager.storageService.rental

  ipcMain.handle(IpcChannels.rental.listProperties, () => {
    try {
      return repo().listProperties()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.rental.createProperty,
    (_event: IpcMainInvokeEvent, data: RentalPropertyInput) => {
      try {
        if (!isValidAddress(data.address)) {
          return { error: 'INVALID_ADDRESS' }
        }
        if (
          !isValidNonNegative(data.area) ||
          !isValidNonNegative(data.monthlyRent) ||
          !isValidNonNegative(data.deposit)
        ) {
          return { error: 'INVALID_PROPERTY_VALUE' }
        }
        return repo().createProperty({
          ...data,
          area: data.area ?? 0,
          monthlyRent: data.monthlyRent ?? 0,
          deposit: data.deposit ?? 0
        })
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IpcChannels.rental.updateProperty,
    (_event: IpcMainInvokeEvent, id: number, data: RentalPropertyUpdateInput) => {
      try {
        if (data.address !== undefined && !isValidAddress(data.address)) {
          return { error: 'INVALID_ADDRESS' }
        }
        repo().updateProperty(id, data)
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.rental.deleteProperty, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      repo().deleteProperty(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.listTenants, () => {
    try {
      return repo().listTenants()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.createTenant, (_event: IpcMainInvokeEvent, data: TenantInput) => {
    try {
      if (!data.name.trim()) {
        return { error: 'INVALID_NAME' }
      }
      if (!isValidPhone(data.phone ?? '')) {
        return { error: 'INVALID_PHONE' }
      }
      if (!isValidIdNumber(data.idNumber ?? '')) {
        return { error: 'INVALID_ID_NUMBER' }
      }
      return repo().createTenant({ name: data.name.trim(), phone: data.phone ?? null, idNumber: data.idNumber ?? null })
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.rental.updateTenant,
    (_event: IpcMainInvokeEvent, id: number, data: TenantUpdateInput) => {
      try {
        if (data.name !== undefined && !data.name.trim()) {
          return { error: 'INVALID_NAME' }
        }
        if (data.phone !== undefined && !isValidPhone(data.phone ?? '')) {
          return { error: 'INVALID_PHONE' }
        }
        if (data.idNumber !== undefined && !isValidIdNumber(data.idNumber ?? '')) {
          return { error: 'INVALID_ID_NUMBER' }
        }
        repo().updateTenant(id, {
          name: data.name?.trim(),
          phone: data.phone,
          idNumber: data.idNumber
        })
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.rental.deleteTenant, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      if (repo().hasLeases(id)) {
        return { error: 'TENANT_HAS_LEASES' }
      }
      repo().deleteTenant(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.listLeases, () => {
    try {
      return repo().listLeases()
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.createLease, (_event: IpcMainInvokeEvent, data: LeaseInput) => {
    try {
      if (!isValidLeaseDates(data.startDate, data.endDate)) {
        return { error: 'INVALID_LEASE_DATES' }
      }
      if (!isValidAmount(data.monthlyRent)) {
        return { error: 'INVALID_RENT' }
      }
      if (!isValidPayCycle(data.payCycle)) {
        return { error: 'INVALID_PAY_CYCLE' }
      }
      return repo().createLease({
        propertyId: data.propertyId,
        tenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyRent: data.monthlyRent,
        payCycle: data.payCycle as PayCycle,
        note: data.note ?? null
      })
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(
    IpcChannels.rental.updateLease,
    (
      _event: IpcMainInvokeEvent,
      id: number,
      data: { startDate?: string; endDate?: string; monthlyRent?: number; payCycle?: PayCycle; note?: string | null }
    ) => {
      try {
        if (data.startDate !== undefined && !isValidDate(data.startDate)) {
          return { error: 'INVALID_LEASE_DATES' }
        }
        if (data.endDate !== undefined && !isValidDate(data.endDate)) {
          return { error: 'INVALID_LEASE_DATES' }
        }
        if (data.monthlyRent !== undefined && !isValidAmount(data.monthlyRent)) {
          return { error: 'INVALID_RENT' }
        }
        if (data.payCycle !== undefined && !isValidPayCycle(data.payCycle)) {
          return { error: 'INVALID_PAY_CYCLE' }
        }
        repo().updateLease(id, data)
        return { ok: true }
      } catch (error) {
        return { error: getErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(IpcChannels.rental.terminateLease, (_event: IpcMainInvokeEvent, id: number, terminatedAt: string) => {
    try {
      if (!isValidDate(terminatedAt)) {
        return { error: 'INVALID_TERMINATED_AT' }
      }
      repo().terminateLease(id, terminatedAt)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.listRentRecords, (_event: IpcMainInvokeEvent, leaseId?: number) => {
    try {
      return repo().listRentRecords(leaseId)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.recordRent, (_event: IpcMainInvokeEvent, data: RentRecordInput) => {
    try {
      if (!isValidAmount(data.amount)) {
        return { error: 'INVALID_AMOUNT' }
      }
      if (!isValidDate(data.date)) {
        return { error: 'INVALID_DATE' }
      }
      const result = ledgerManager.storageService.rentalService.recordRent({
        leaseId: data.leaseId,
        amount: normalizeAmount(data.amount),
        date: data.date,
        accountId: data.accountId,
        note: data.note ?? null
      })
      return { ok: true, record: result.record, transaction: result.transaction }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.deleteRentRecord, (_event: IpcMainInvokeEvent, id: number) => {
    try {
      ledgerManager.storageService.rentalService.deleteRentRecord(id)
      return { ok: true }
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })

  ipcMain.handle(IpcChannels.rental.reminders, () => {
    try {
      const leases = repo().listLeases()
      const today = new Date()
      return buildRentalReminders(leases, today)
    } catch (error) {
      return { error: getErrorMessage(error) }
    }
  })
}
