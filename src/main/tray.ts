import { Menu, Tray, nativeImage } from 'electron'
import { showMainWindow } from './app'
import { getLedgerManager } from './ipc'

let tray: Tray | null = null

function createTrayIcon(): Electron.NativeImage {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  const r = 46
  const g = 113
  const b = 229
  for (let i = 0; i < size * size; i++) {
    const x = i % size
    const y = Math.floor(i / size)
    const round = Math.round(
      Math.max(
        0,
        Math.min(
          1,
          Math.min(
            Math.min(x, size - 1 - x),
            Math.min(y, size - 1 - y)
          ) / 3
        )
      )
    )
    canvas[i * 4] = r
    canvas[i * 4 + 1] = g
    canvas[i * 4 + 2] = b
    canvas[i * 4 + 3] = 255 * round
  }
  return nativeImage.createFromBitmap(canvas, { width: size, height: size })
}

export function createTray(onQuickEntry: () => void): Tray {
  const icon = createTrayIcon()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主界面', click: () => showMainWindow() },
    { label: '快速记账', click: () => onQuickEntry() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        getLedgerManager().close()
        tray?.destroy()
        process.exit(0)
      }
    }
  ])
  tray.setToolTip('Tally - 本地财务工具')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => showMainWindow())
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
