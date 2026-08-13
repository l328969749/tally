import type { LeaseWithMeta, PayCycle, RentalReminder } from './types/models'

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function daysUntilDate(dateString: string, today: Date): number {
  const target = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(target.getTime())) {
    return Infinity
  }
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  return diff >= 0 ? diff : 0
}

export function nextDueDate(startDate: string, payCycle: PayCycle, today: Date): string | null {
  if (!isValidDateString(startDate)) {
    return null
  }
  const cursor = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(cursor.getTime())) {
    return null
  }
  for (let step = 0; step < 600; step++) {
    const candidate = new Date(cursor.getTime())
    if (candidate >= today) {
      return formatDate(candidate)
    }
    if (payCycle === 'monthly') {
      candidate.setMonth(candidate.getMonth() + 1)
    } else if (payCycle === 'quarterly') {
      candidate.setMonth(candidate.getMonth() + 3)
    } else {
      candidate.setFullYear(candidate.getFullYear() + 1)
    }
    cursor.setTime(candidate.getTime())
  }
  return null
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildRentalReminders(leases: LeaseWithMeta[], today: Date): RentalReminder[] {
  const reminders: RentalReminder[] = []
  for (const lease of leases) {
    if (lease.status !== 'active') {
      continue
    }
    const label = `${lease.propertyAddress} · ${lease.tenantName}`
    const end = new Date(`${lease.endDate}T00:00:00`)
    const endDays = Math.round((end.getTime() - today.getTime()) / 86400000)
    if (endDays >= 0 && endDays <= 30) {
      reminders.push({
        kind: 'lease_expiry',
        leaseId: lease.id,
        leaseLabel: label,
        date: lease.endDate,
        daysLeft: endDays
      })
    }
    if (lease.nextDueDate) {
      const due = new Date(`${lease.nextDueDate}T00:00:00`)
      const dueDays = Math.round((due.getTime() - today.getTime()) / 86400000)
      if (dueDays >= 0 && dueDays <= 3) {
        reminders.push({
          kind: 'rent_due',
          leaseId: lease.id,
          leaseLabel: label,
          date: lease.nextDueDate,
          daysLeft: dueDays
        })
      }
    }
  }
  return reminders
}
