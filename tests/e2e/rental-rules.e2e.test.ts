import { describe, it } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { _electron, type Page } from 'playwright-core'

const rootDir = dirname(dirname(__dirname))

async function launchApp(ledgerPath: string) {
  const app = await _electron.launch({
    executablePath: join(rootDir, 'node_modules/electron/dist/electron'),
    args: [rootDir, '--no-sandbox', '--disable-gpu'],
    env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1' },
    cwd: rootDir
  })
  await app.evaluate(({ dialog }, base) => {
    let lastSaved: string | null = null
    dialog.showSaveDialog = async () => {
      const filePath = `${base}-${Date.now()}.file`
      lastSaved = filePath
      return { canceled: false, filePath }
    }
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [lastSaved ?? `${base}-missing.file`]
    })
  }, ledgerPath)
  return app
}

function nav(page: Page, label: string): Promise<void> {
  return page.locator('.nav-item', { hasText: label }).first().click()
}

describe('出租管理业务规则 E2E', () => {
  it('租户有关联合同禁止删除；删除出租房级联删除合同后可再删租户', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-rules-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()

    await page.waitForSelector('text=新建账本')
    const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
    if (await autoOpenDialog.isVisible().catch(() => false)) {
      await autoOpenDialog.locator('.el-dialog__headerbtn').click()
    }
    await page.getByRole('button', { name: '新建账本' }).click()
    await page.locator('input[placeholder="例如：我的家庭账本"]').fill('规则测试')
    await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
    await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForSelector('.app-sidebar')

    await nav(page, '出租')

    // 登记出租房与租户
    await page.getByRole('button', { name: '登记出租房' }).click()
    await page.locator('input[placeholder="例如：幸福小区 3 栋 502"]').fill('规则楼 1 号')
    await page.locator('.el-dialog:visible .el-input-number input').nth(1).fill('2000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=出租房已登记')

    await page.locator('.el-tabs__item', { hasText: '租户' }).first().click()
    await page.getByRole('button', { name: '登记租户' }).click()
    await page.locator('input[placeholder="租户姓名"]').fill('王五')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=租户已登记')

    // 建合同
    await page.locator('.el-tabs__item', { hasText: '合同' }).first().click()
    await page.getByRole('button', { name: '新建合同' }).click()
    await page.locator('.el-dialog:visible .el-select').nth(0).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '规则楼 1 号' })
      .first()
      .click()
    await page.locator('.el-dialog:visible .el-select').nth(1).click()
    await page
      .locator('.el-select-dropdown__item:visible')
      .filter({ hasText: '王五' })
      .first()
      .click()
    await page.locator('.el-dialog:visible .el-date-editor input').nth(0).fill('2026-01-01')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(0).press('Enter')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(1).fill('2026-12-31')
    await page.locator('.el-dialog:visible .el-date-editor input').nth(1).press('Enter')
    await page.locator('.el-dialog:visible .el-input-number input').fill('2000')
    await page.getByRole('button', { name: '保存' }).click()
    await page.waitForSelector('text=合同已创建')

    // 1. 租户存在关联合同时删除被拦截
    await page.locator('.el-tabs__item', { hasText: '租户' }).first().click()
    await page.locator('.el-table:visible .el-table__row', { hasText: '王五' })
      .locator('button', { hasText: '删除' })
      .click()
    await page.locator('.el-message-box__btns button', { hasText: '删除' }).first().click()
    await page.waitForSelector('text=该租户存在关联合同，请先终止合同')
    const tenantStillThere = await page
      .locator('.el-table:visible .el-table__row', { hasText: '王五' })
      .count()
    expect(tenantStillThere).toBe(1)

    // 2. 删除出租房，级联删除合同
    await page.locator('.el-tabs__item', { hasText: '出租房' }).first().click()
    await page.locator('.el-table:visible .el-table__row', { hasText: '规则楼 1 号' })
      .locator('button', { hasText: '删除' })
      .click()
    await page.locator('.el-message-box__btns button', { hasText: '删除' }).first().click()
    await page.waitForSelector('text=已删除')

    // 3. 合同随出租房一并消失
    await page.locator('.el-tabs__item', { hasText: '合同' }).first().click()
    const leaseRows = await page
      .locator('.el-table:visible .el-table__row', { hasText: '规则楼 1 号' })
      .count()
    expect(leaseRows).toBe(0)

    // 4. 合同删除后租户可正常删除
    await page.locator('.el-tabs__item', { hasText: '租户' }).first().click()
    await page.locator('.el-table:visible .el-table__row', { hasText: '王五' })
      .locator('button', { hasText: '删除' })
      .click()
    await page.locator('.el-message-box__btns button', { hasText: '删除' }).first().click()
    await page.waitForSelector('text=已删除')
    const tenantRows = await page
      .locator('.el-table:visible .el-table__row', { hasText: '王五' })
      .count()
    expect(tenantRows).toBe(0)

    await app.close()
  }, 240000)
})
