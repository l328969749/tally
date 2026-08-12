export function maskCardNumber(cardNumber: string | null | undefined): string {
  const digits = (cardNumber ?? '').replace(/\s+/g, '')
  if (!digits) {
    return ''
  }
  if (digits.length <= 4) {
    return digits
  }
  return `**** **** ${digits.slice(-4)}`
}

export function isDueReminder(dueDate: number | null | undefined, balance: number, today: Date): boolean {
  if (dueDate === null || dueDate === undefined) {
    return false
  }
  if (balance >= 0) {
    return false
  }
  return daysUntilDue(dueDate, today) <= 3
}

export function daysUntilDue(dueDate: number | null | undefined, today: Date): number {
  if (dueDate === null || dueDate === undefined) {
    return Infinity
  }
  let target = new Date(today)
  target.setDate(dueDate)
  if (target < today) {
    target = new Date(today)
    target.setMonth(target.getMonth() + 1)
    target.setDate(dueDate)
  }
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  return diff >= 0 ? diff : 0
}
