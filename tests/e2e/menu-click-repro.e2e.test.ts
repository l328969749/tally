import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Page } from 'playwright-core'
import { launchApp, nav } from './helpers'


describe('快速点击菜单复现', () => {
  it('连续快速点击菜单后右侧不应空白', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-repro-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()

    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.log('[pageerror]', error.message)
    })
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text())
    })

    await page.waitForSelector('text=新建账本')
    const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
    if (await autoOpenDialog.isVisible().catch(() => false)) {
      await autoOpenDialog.locator('.el-dialog__headerbtn').click()
    }

    await page.getByRole('button', { name: '新建账本' }).click()
    await page.locator('input[placeholder="例如：我的家庭账本"]').fill('复现账本')
    await page.locator('input[placeholder="请输入密码"]').fill('secret-123')
    await page.locator('input[placeholder="再次输入密码"]').fill('secret-123')
    await page.getByRole('button', { name: '创建' }).click()
    await page.waitForSelector('.app-sidebar')

    // 进入分析页等待 echarts 渲染后，再快速连点其它菜单
    const labels = ['流水', '账户', '资产', '出租', '分析', '设置', '仪表盘']
    for (let round = 0; round < 8; round++) {
      for (const label of labels) {
        await nav(page, label)
      }
    }

    // 等 3 秒看最终是否空白
    await page.waitForTimeout(3000)

    const finalUrl = page.url()
    console.log('[final-url]', finalUrl)
    const html = await page.locator('.app-main').innerHTML().catch(() => '')
    console.log('[app-main-html-len]', html.length)
    const text = await page.locator('.app-main').innerText().catch(() => '')
    console.log('[app-main-text]', JSON.stringify(text.slice(0, 300)))

    console.log('[pageerrors]', JSON.stringify(pageErrors))

    expect(html.length).toBeGreaterThan(0)
    expect(pageErrors).toEqual([])
    await app.close()
  }, 180000)
})
