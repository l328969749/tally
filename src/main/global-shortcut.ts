import { globalShortcut } from 'electron'
import { getLedgerManager } from './ipc'
import { showMainWindow } from './app'
import { sendToRenderer } from './app'

export const QUICK_ENTRY_CHANNEL = 'app:quick-entry'

let currentAccelerator: string | null = null

export function registerQuickEntryShortcut(accelerator: string): boolean {
  globalShortcut.unregisterAll()
  const ok = globalShortcut.register(accelerator, () => {
    triggerQuickEntry()
  })
  currentAccelerator = accelerator
  return ok
}

export function registerDefaultShortcut(): void {
  const saved = getLedgerManager().getGlobalShortcut()
  registerQuickEntryShortcut(saved)
}

export function triggerQuickEntry(): void {
  showMainWindow()
  sendToRenderer(QUICK_ENTRY_CHANNEL)
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
  currentAccelerator = null
}

export function getActiveAccelerator(): string | null {
  return currentAccelerator
}
