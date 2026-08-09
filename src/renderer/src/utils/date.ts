export function today(): string {
  const now = new Date()
  return formatDate(now)
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function monthEnd(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`
}

export function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`
}

export function formatAmount(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatDateDisplay(date: string): string {
  return date
}

export function monthLabel(month: string): string {
  const [year, mon] = month.split('-')
  return `${year}年${Number(mon)}月`
}
