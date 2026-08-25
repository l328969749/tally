import { _electron, type ElectronApplication, type Page } from 'playwright-core'
import { join, dirname } from 'path'

export const rootDir = dirname(dirname(__dirname))

export async function launchApp(ledgerPath: string): Promise<ElectronApplication> {
  const app = await _electron.launch({
    executablePath: join(rootDir, 'node_modules/electron/dist/electron'),
    args: [rootDir, '--no-sandbox', '--disable-gpu'],
    env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1' },
    cwd: rootDir
  })
  await app.evaluate(({ dialog }, base) => {
    let lastSaved: string | null = null
    dialog.showSaveDialog = async () => {
      const filePath = `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.file`
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

export function nav(page: Page, label: string): Promise<void> {
  return page.locator('.nav-item', { hasText: label }).first().click({ noWaitAfter: true })
}

export async function closeAutoOpenDialog(page: Page): Promise<void> {
  const autoOpenDialog = page.locator('.el-overlay-dialog', { hasText: '打开账本' })
  if (await autoOpenDialog.isVisible().catch(() => false)) {
    await autoOpenDialog.locator('.el-dialog__headerbtn').click()
  }
}
