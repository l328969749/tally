import { describe, it } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Page } from 'playwright-core'
import { launchApp, nav } from './helpers'


async function createLedger(page: Page): Promise<void> {
  await page.waitForSelector('text=新建账本')
  const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
  if (await autoOpenDialog.isVisible().catch(() => false)) {
    await autoOpenDialog.locator('.el-dialog__headerbtn').click()
  }
  await page.getByRole('button', { name: '新建账本' }).click()
  await page.locator('input[placeholder="例如：我的家庭账本"]').fill('信用卡E2E账本')
  await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
  await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
  await page.getByRole('button', { name: '创建' }).click()
  await page.waitForSelector('.app-sidebar')
  await page.waitForSelector('text=本月结余')
}

describe('信用卡全流程 E2E（任务 7.1）', () => {
  it('创建信用卡 → 消费欠款 → 还款回正且生成还款账户支出', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-credit-e2e-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()
    page.on('pageerror', (error) => console.log('[pageerror]', error.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text())
    })

    await createLedger(page)

    // 1. 创建储蓄卡（还款资金来源）
    await nav(page, '账户')
    await page.getByRole('button', { name: '新建账户' }).click()
    await page.locator('input[placeholder="例如：招商银行信用卡"]').fill('还款储蓄卡')
    await page.locator('.el-form-item:has-text("初始余额") input').fill('10000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=还款储蓄卡')

    // 2. 创建信用卡账户（含卡号/额度/账单日/还款日）
    await page.getByRole('button', { name: '新建账户' }).click()
    await page.locator('input[placeholder="例如：招商银行信用卡"]').fill('招行信用卡')
    await page.locator('.el-dialog .el-select').first().click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '信用卡' })
      .first()
      .click()
    await page.locator('.el-form-item:has-text("卡号") input').fill('6225 8899 0011 2233')
    await page.locator('.el-form-item:has-text("信用额度") input').fill('20000')
    await page.locator('.el-form-item:has-text("账单日") input').fill('5')
    await page.locator('.el-form-item:has-text("还款日") input').fill('23')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=招行信用卡')

    // 断言信用卡初始剩余额度为信用额度
    await page.waitForSelector('text=**** **** 2233')

    // 3. 记录一笔信用卡消费 500
    await nav(page, '流水')
    await page.getByRole('button', { name: '记一笔' }).click()
    await page.locator('.el-dialog .el-input-number input').fill('500')
    await page.locator('.el-dialog .el-select').nth(0).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '餐饮' })
      .first()
      .click()
    await page.locator('.el-dialog .el-select').nth(1).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '招行信用卡' })
      .first()
      .click()
    await page.getByRole('button', { name: '确定' }).click()
    await page.waitForSelector('text=流水已记录')

    // 4. 账户页断言信用卡余额为负欠款，剩余额度 = 额度 - 欠款
    await nav(page, '账户')
    await page.waitForSelector('text=招行信用卡')
    await page.waitForSelector('text=-500.00')
    await page.waitForSelector('text=19,500.00')

    // 5. 执行还款操作：还款储蓄卡 → 招行信用卡，金额 500
    await page.locator('.el-table__row', { hasText: '招行信用卡' }).getByRole('button', { name: '还款' }).click()
    await page.waitForSelector('.el-dialog:has-text("信用卡还款")')
    await page.locator('.el-dialog .el-select').first().click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '还款储蓄卡' })
      .first()
      .click()
    await page.locator('.el-dialog .el-input-number input').fill('500')
    await page.getByRole('button', { name: '确认还款' }).click()
    await page.waitForSelector('text=还款成功')

    // 6. 断言信用卡余额回正、储蓄卡支出 500
    await page.waitForSelector('.el-table__row:has-text("招行信用卡") >> text=0.00')
    await page.waitForSelector('.el-table__row:has-text("还款储蓄卡") >> text=9,500.00')

    await app.close()
  }, 180000)
})
