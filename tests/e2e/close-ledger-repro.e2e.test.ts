import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Page } from 'playwright-core'
import { launchApp, nav } from './helpers'


describe('关闭账本竞态复现', () => {
  it('关闭账本后点击菜单不应空白', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-repro-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()

    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.log('[pageerror]', error.message)
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

    // 先切到「流水」页，确保关闭账本时会发生跨页导航
    await page.locator('.nav-item', { hasText: '流水' }).first().click()
    await page.waitForTimeout(800)

    // 点击「关闭账本」footer 按钮（未 await 的异步 race）
    await page.locator('.app-sidebar-footer .nav-item', { hasText: '关闭账本' }).first().click()
    await page.waitForTimeout(1500)
    const url1 = page.url()
    console.log('[after-close url]', url1)
    const html1 = await page.locator('.app-main').innerHTML().catch(() => '')
    console.log('[after-close html-len]', html1.length)
    const text1 = await page.locator('.app-main').innerText().catch(() => '')
    console.log('[after-close text]', JSON.stringify(text1.slice(0, 150)))

    // 关闭账本后应回到欢迎页，而非空白或滞留在 dashboard
    expect(url1.endsWith('#/welcome')).toBe(true)
    expect(html1.length).toBeGreaterThan(0)

    console.log('[pageerrors]', JSON.stringify(pageErrors))
    expect(pageErrors).toEqual([])
    await app.close()
  }, 180000)

  it('关闭账本后重新打开账本应正常回到仪表盘', async () => {
    const ledgerPath = join(mkdtempSync(join(tmpdir(), 'tally-repro-')), 'e2e.ledger')
    const app = await launchApp(ledgerPath)
    const page = await app.firstWindow()

    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.log('[pageerror]', error.message)
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

    // 关闭账本
    await page.locator('.app-sidebar-footer .nav-item', { hasText: '关闭账本' }).first().click()
    await page.waitForTimeout(1200)
    expect(page.url().endsWith('#/welcome')).toBe(true)

    // 重新打开账本（密码为空自动走打开路径）
    await page.locator('.el-overlay-dialog', { hasText: '打开账本' }).waitFor({ state: 'visible' })
    await page.locator('input[placeholder="请输入密码"]').last().fill('secret-123')
    await page.getByRole('button', { name: '打开' }).last().click()
    await page.waitForSelector('.app-sidebar')

    // 应回到仪表盘且非空白
    expect(page.url().endsWith('#/dashboard')).toBe(true)
    const html2 = await page.locator('.app-main').innerHTML().catch(() => '')
    expect(html2.length).toBeGreaterThan(0)

    console.log('[reopen pageerrors]', JSON.stringify(pageErrors))
    expect(pageErrors).toEqual([])
    await app.close()
  }, 180000)
})
