import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Page } from 'playwright-core'
import { launchApp, nav } from './helpers'


describe('Electron E2E 出租管理全流程（任务 7.1）', () => {
  it('登记出租房与租户 → 新建合同 → 收租生成收入流水 → 删除收租同步删流水', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-rental-e2e-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()
    page.on('pageerror', (error) => console.log('[pageerror]', error.message))
    await page.waitForSelector('text=新建账本')

    const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
    if (await autoOpenDialog.isVisible().catch(() => false)) {
      await autoOpenDialog.locator('.el-dialog__headerbtn').click()
    }

    // 1. 新建账本
    await page.getByRole('button', { name: '新建账本' }).click()
    await page.locator('input[placeholder="例如：我的家庭账本"]').fill('E2E出租测试')
    await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
    await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForSelector('.app-sidebar')
    await page.waitForSelector('text=本月结余')

    // 2. 新建一个用于收租收入入账的现金账户
    await nav(page, '账户')
    await page.getByRole('button', { name: '新建账户' }).click()
    await page.locator('input[placeholder="例如：招商银行信用卡"]').fill('租金收入账户')
    await page.locator('.el-input-number input').fill('10000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=租金收入账户')

    // 3. 进入出租页，登记出租房
    await nav(page, '出租')
    await page.getByRole('button', { name: '登记出租房' }).click()
    await page.locator('input[placeholder="例如：幸福小区 3 栋 502"]').fill('幸福小区 3 栋 502')
    await page.locator('.el-dialog:visible .el-input-number input').nth(1).fill('2500')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=出租房已登记')
    await page.waitForSelector('text=幸福小区 3 栋 502')

    // 4. 登记租户
    await page.locator('.el-tabs__item', { hasText: '租户' }).first().click()
    await page.getByRole('button', { name: '登记租户' }).click()
    await page.locator('input[placeholder="租户姓名"]').fill('张三')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=租户已登记')
    await page.waitForSelector('text=张三')

    // 5. 新建合同（月租 2500，年付）
    await page.locator('.el-tabs__item', { hasText: '合同' }).first().click()
    await page.getByRole('button', { name: '新建合同' }).click()
    await page.locator('.el-dialog:visible .el-select').nth(0).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '幸福小区 3 栋 502' })
      .first()
      .click()
    await page.locator('.el-dialog:visible .el-select').nth(1).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '张三' })
      .first()
      .click()
    await page.locator('.el-dialog:visible .el-date-editor input').nth(0).fill('2026-01-01')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(0).press('Enter')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(1).fill('2026-12-31')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(1).press('Enter')
    await page.locator('.el-dialog:visible .el-input-number input').fill('2500')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=合同已创建')
    await page.locator('.el-table:visible .el-table__row', { hasText: '幸福小区 3 栋 502' }).first().waitFor()

    // 6. 收租：记录收租 → 自动生成「租金收入」流水
    await page.locator('.el-tabs__item', { hasText: '收租' }).first().click()
    await page.getByRole('button', { name: '记录收租' }).click()
    await page.locator('.el-dialog:visible .el-select').nth(1).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '租金收入账户' })
      .first()
      .click()
    await page.getByRole('button', { name: '确认收租' }).click()
    await page.waitForSelector('text=收租已记录，已生成收入流水')
    await page.locator('.el-table:visible .el-table__row', { hasText: '¥ 2,500.00' }).first().waitFor()

    // 7. 验证收入流水与账户余额
    await nav(page, '流水')
    await page.locator('.el-table:visible .el-table__row', { hasText: '租金收入' }).first().waitFor()
    await nav(page, '账户')
    await page.locator('.el-table:visible .el-table__row', { hasText: '12,500.00' }).first().waitFor()

    // 8. 删除收租 → 流水同步删除，账户余额回滚
    await nav(page, '出租')
    await page.locator('.el-tabs__item', { hasText: '收租' }).first().click()
    await page.locator('.el-table:visible .el-table__row', { hasText: '¥ 2,500.00' })
      .locator('button', { hasText: '删除' })
      .click()
    await page.locator('.el-message-box__btns button', { hasText: '删除' }).first().click()
    await page.waitForSelector('text=已删除')
    await nav(page, '流水')
    await page.locator('.el-table:visible .el-table__row', { hasText: '租金收入' }).first().waitFor({ state: 'detached' })
    await nav(page, '账户')
    await page.locator('.el-table:visible .el-table__row', { hasText: '10,000.00' }).first().waitFor()

    expect(true).toBe(true)
    await app.close()
  }, 240000)
})
