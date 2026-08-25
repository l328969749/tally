import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Page } from 'playwright-core'
import { launchApp, nav } from './helpers'


async function fillPasswordPrompt(page: Page, password: string): Promise<void> {
  const input = page.locator('.el-message-box input[type="password"]').first()
  await input.fill(password)
  await page.locator('.el-message-box__btns button', { hasText: '恢复' }).first().click()
}

describe('Electron E2E 全流程（任务 10.4）', () => {
  it('新建账本 → 建账户 → 记账 → 分析图表 → 导出 → 备份恢复', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-e2e-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()
    page.on('pageerror', (error) => console.log('[pageerror]', error.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text())
    })
    await page.waitForSelector('text=新建账本')

    // 若上次运行残留的 lastLedgerPath 触发了自动解锁对话框，先关闭
    const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
    if (await autoOpenDialog.isVisible().catch(() => false)) {
      await autoOpenDialog.locator('.el-dialog__headerbtn').click()
    }

    // 1. 新建账本
    await page.getByRole('button', { name: '新建账本' }).click()
    await page.locator('input[placeholder="例如：我的家庭账本"]').fill('E2E测试账本')
    await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
    await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForSelector('.app-sidebar')
    await page.waitForSelector('text=账本创建成功')
    await page.waitForSelector('text=本月结余')

    // 2. 新建账户
    await nav(page, '账户')
    await page.getByRole('button', { name: '新建账户' }).click()
    await page.locator('input[placeholder="例如：招商银行信用卡"]').fill('测试银行卡')
    await page.locator('.el-input-number input').fill('1000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=测试银行卡')

    // 3. 记账
    await nav(page, '流水')
    await page.getByRole('button', { name: '记一笔' }).click()
    await page.locator('.el-dialog .el-input-number input').fill('88')
    await page.locator('.el-dialog .el-select').nth(0).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '餐饮' })
      .first()
      .click()
    await page.locator('.el-dialog .el-select').nth(1).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '测试银行卡' })
      .first()
      .click()
    await page.getByRole('button', { name: '确定' }).click()
    await page.waitForSelector('text=流水已记录')
    await page.waitForSelector('.el-table .el-table__row')

    // 4. 分析图表渲染
    await nav(page, '分析')
    await page.waitForSelector('#pie-chart canvas')
    await page.waitForSelector('#tag-chart canvas')
    await page.waitForSelector('#trend-chart canvas')
    await page.waitForSelector('#networth-chart canvas')
    await page.waitForSelector('#balance-chart canvas')

    // 5. 导出 CSV（在数据管理 tab）
    await nav(page, '设置')
    await page.locator('.el-tabs__item', { hasText: '数据管理' }).first().click()
    await page.getByRole('button', { name: '导出流水 CSV' }).click()
    await page.waitForSelector('text=导出成功')

    // 6. 备份与恢复
    await page.getByRole('button', { name: '备份当前账本' }).click()
    await page.waitForSelector('text=备份成功')
    await page.getByRole('button', { name: '从备份恢复' }).click()
    await fillPasswordPrompt(page, 'secret-123')
    await page.waitForSelector('text=恢复成功')

    await app.close()
  }, 180000)
})
