import { describe, it } from 'vitest'
import { existsSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { _electron, type Page } from 'playwright-core'

const packagedBinary = '/workspace/dist/linux-unpacked/tally'

describe('打包产物冒烟测试', () => {
  it.skipIf(!existsSync(packagedBinary))('打包产物中创建加密账本并记账', async () => {
    const app = await _electron.launch({
      executablePath: packagedBinary,
      args: ['--no-sandbox', '--disable-gpu'],
      env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1' }
    })
    await app.evaluate(({ dialog }, base) => {
      let lastSaved: string | null = null
      dialog.showSaveDialog = async () => {
        const filePath = `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ledger`
        lastSaved = filePath
        return { canceled: false, filePath }
      }
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [lastSaved ?? `${base}-missing.ledger`]
      })
    }, join(mkdtempSync(join(tmpdir(), 'tally-pack-')), 'pack'))

    const page: Page = await app.firstWindow()
    page.on('pageerror', (error) => console.log('[pageerror]', error.message))
    await page.waitForSelector('text=新建账本')

    const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
    if (await autoOpenDialog.isVisible().catch(() => false)) {
      await autoOpenDialog.locator('.el-dialog__headerbtn').click()
    }

    await page.getByRole('button', { name: '新建账本' }).click()
    await page.locator('input[placeholder="例如：我的家庭账本"]').fill('打包冒烟')
    await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
    await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForSelector('text=账本创建成功', { timeout: 20000 })
    await page.waitForSelector('text=本月结余', { timeout: 20000 })
    console.log('[packaged-app] 打包产物创建加密账本成功')
    await app.close()
  }, 120000)
})
