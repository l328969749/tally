import { writeFileSync } from 'fs'
import type { StorageService } from './storage'

export class ExportService {
  constructor(private storage: StorageService) {}

  toCsv(targetPath: string, scope: 'transactions' | 'accounts' | 'assets' | 'all'): void {
    const lines: string[] = []
    if (scope === 'all' || scope === 'transactions') {
      lines.push(...this.exportTransactionsCsv())
    }
    if (scope === 'all' || scope === 'accounts') {
      lines.push(...this.exportAccountsCsv())
    }
    if (scope === 'all' || scope === 'assets') {
      lines.push(...this.exportAssetsCsv())
    }
    const content = '\ufeff' + lines.join('\n')
    writeFileSync(targetPath, content, 'utf-8')
  }

  toJson(targetPath: string): void {
    const data = {
      exportedAt: new Date().toISOString(),
      accounts: this.storage.account.list(true),
      categories: this.storage.category.list(),
      tags: this.storage.tag.list(),
      transactions: this.storage.transaction.list({ page: 1, pageSize: 100000 }).items,
      assets: this.storage.asset.list(),
      liabilities: this.storage.asset.listLiabilities()
    }
    writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private exportTransactionsCsv(): string[] {
    const header = 'id,type,amount,category_id,account_id,date,note,tags'
    const rows = this.storage.transaction.list({ page: 1, pageSize: 100000 }).items
    const lines = rows.map((t) => {
      const tagNames = t.tags.map((tag) => tag.name).join(';')
      return [t.id, t.type, t.amount, t.categoryId, t.accountId, t.date, this.escapeCsv(t.note ?? ''), this.escapeCsv(tagNames)].join(',')
    })
    return [header, ...lines]
  }

  private exportAccountsCsv(): string[] {
    const header = 'id,name,type,initial_balance,sort_order,archived'
    const rows = this.storage.account.list(true)
    const lines = rows.map((a) => [a.id, this.escapeCsv(a.name), a.type, a.initialBalance, a.sortOrder, a.archived].join(','))
    return [header, ...lines]
  }

  private exportAssetsCsv(): string[] {
    const header = 'id,name,type,value,unit,note'
    const rows = this.storage.asset.list()
    const lines = rows.map((a) => [a.id, this.escapeCsv(a.name), a.type, a.value, a.unit ?? '', this.escapeCsv(a.note ?? '')].join(','))
    return [header, ...lines]
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
