export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function isValidAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isValidTagName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 30
}

export function isValidCategoryName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 50
}

export function isValidAccountName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 50
}

export function isValidCardNumber(cardNumber: string): boolean {
  if (!cardNumber.trim()) {
    return true
  }
  return /^[0-9\s-]+$/.test(cardNumber.trim())
}

export function isValidMonthDay(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 31
}

export function isValidCreditLimit(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function isValidNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function isValidAddress(address: string): boolean {
  const trimmed = address.trim()
  return trimmed.length > 0 && trimmed.length <= 200
}

export function isValidPhone(phone: string): boolean {
  if (!phone.trim()) {
    return true
  }
  return phone.trim().length <= 20
}

export function isValidIdNumber(idNumber: string): boolean {
  if (!idNumber.trim()) {
    return true
  }
  return idNumber.trim().length <= 30
}

export function isValidPayCycle(value: string): boolean {
  return value === 'monthly' || value === 'quarterly' || value === 'yearly'
}

export function isValidLeaseDates(startDate: string, endDate: string): boolean {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false
  }
  return startDate <= endDate
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100
}
