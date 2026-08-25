import { describe, it } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { _electron } from 'playwright-core'
import { launchApp, nav } from './helpers'


function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

describe('出租提醒 E2E（任务 6）', () => {
  it('合同到期与应收租日在仪表盘显示提醒', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-remind-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()

    // 合同 6 天后到期；下一应收租日为今天 + 3 天
    const today = new Date()
    const endDate = fmt(addDays(today, 6))
    let due = addDays(today, 3)
    if (due.getDate() > 28) {
      due = new Date(due.getFullYear(), due.getMonth(), 28)
    }
    const dueDate = fmt(due)
    const start = new Date(due.getFullYear(), due.getMonth() - 2, due.getDate())
    const startDate = fmt(start)

    await page.waitForSelector('text=新建账本')
    const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
    if (await autoOpenDialog.isVisible().catch(() => false)) {
      await autoOpenDialog.locator('.el-dialog__headerbtn').click()
    }
    await page.getByRole('button', { name: '新建账本' }).click()
    await page.locator('input[placeholder="例如：我的家庭账本"]').fill('提醒测试')
    await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
    await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForSelector('.app-sidebar')

    // 建收入账户
    await page.locator('.nav-item', { hasText: '账户' }).first().click()
    await page.getByRole('button', { name: '新建账户' }).click()
    await page.locator('input[placeholder="例如：招商银行信用卡"]').fill('收租账户')
    await page.locator('.el-input-number input').fill('1000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=收租账户')

    // 登记出租房与租户
    await page.locator('.nav-item', { hasText: '出租' }).first().click()
    await page.getByRole('button', { name: '登记出租房' }).click()
    await page.locator('input[placeholder="例如：幸福小区 3 栋 502"]').fill('提醒楼 1 号')
    await page.locator('.el-dialog:visible .el-input-number input').nth(1).fill('2000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=出租房已登记')

    await page.locator('.el-tabs__item', { hasText: '租户' }).first().click()
    await page.getByRole('button', { name: '登记租户' }).click()
    await page.locator('input[placeholder="租户姓名"]').fill('李四')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=租户已登记')

    // 新建合同（月付）
    await page.locator('.el-tabs__item', { hasText: '合同' }).first().click()
    await page.getByRole('button', { name: '新建合同' }).click()
    await page.locator('.el-dialog:visible .el-select').nth(0).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '提醒楼 1 号' })
      .first()
      .click()
    await page.locator('.el-dialog:visible .el-select').nth(1).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '李四' })
      .first()
      .click()
    await page.locator('.el-dialog:visible .el-date-editor input').nth(0).fill(startDate)
    await page.locator('.el-dialog:visible .el-date-editor input').nth(0).press('Enter')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(1).fill(endDate)
    await page.locator('.el-dialog:visible .el-date-editor input').nth(1).press('Enter')
    await page.locator('.el-dialog:visible .el-input-number input').fill('2000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=合同已创建')

    // 回仪表盘验证提醒
    await page.locator('.nav-item', { hasText: '仪表盘' }).first().click()
    await page.waitForSelector('.rental-reminders')
    await page.waitForSelector('text=出租提醒')
    await page.waitForSelector('text=合同到期')
    await page.waitForSelector('text=应收租')
    await page.waitForSelector('text=提醒楼 1 号 · 李四')
    await page.waitForSelector(`text=${endDate}`)
    await page.waitForSelector(`text=${dueDate}`)

    await app.close()
  }, 240000)
})
