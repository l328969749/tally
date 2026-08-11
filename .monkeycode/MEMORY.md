# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-08-09
- Context: Discovered by Agent while running storage-layer unit tests and fixing repo bugs for desktop-finance-tool (tally)
- Category: Testing Methods
- Instructions:
  - 单元测试命令：`npm test`（vitest），测试文件位于 `tests/` 目录，仓储/加密测试在 `tests/storage/`。
  - 仓储层所有 `SELECT *` 查询返回 snake_case 列，必须经 `src/main/services/storage/row-mapper.ts` 的 `mapRow/mapRows` 转为 camelCase 模型字段后再返回；新增查询必须走该映射，否则模型字段为 undefined。

[Project Knowledge Summary]
- Date: 2026-08-09
- Context: Discovered by Agent while debugging SQLCipher 密码修改与打开流程（crypto-service.ts）
- Category: Troubleshooting & Debugging
- Instructions:
  - `PRAGMA rekey` 不支持 `?` 参数绑定，必须用 `db.pragma("rekey = '...'")` 字符串插值（密码需先经 `sanitizeSqlString` 转义单引号）。
  - `openEncryptedDatabase` 中 `verifyPassword`（SELECT sqlite_master）必须紧跟在 `applyCipherConfig` 设置 key 之后执行，若在其后才设置 `journal_mode = WAL`，rekey 后的旧密码打开会先在该 pragma 抛原生 SqliteError 而无法映射为 CryptoError。
  - `db.pragma('kdf_iter')` 返回 `[{"600000":"600000"}]` 格式（列名为值），断言时用 `Object.values(row)[0]` 取值。

[Project Knowledge Summary]
- Date: 2026-08-10
- Context: Discovered by Agent while fixing preload CJS 输出类型错误（electron-vite 5.0.0 + vite 5 类型不兼容）
- Category: Build Methods
- Instructions:
  - vite 必须用 ^6.0.0：electron-vite 5.0.0 的 `PreloadBuildOptions` 引用了 vite 6 才导出的 `BuildEnvironmentOptions` 类型，vite 5 会导致 `electron.vite.config.ts` 中 preload 的 `rollupOptions` 报 TS2769。`@vitejs/plugin-vue` 5.2.4 与 electron-vite 5.0.0 均兼容 vite 6，不要单独升级到 vite 7（plugin-vue 不支持）。
  - preload 强制 CJS 输出的写法：`build.rollupOptions.output = { format: 'cjs', entryFileNames: '[name].cjs' }`，产物为 `out/preload/index.cjs`。

[Project Knowledge Summary]
- Date: 2026-08-11
- Context: Discovered by Agent while running and debugging Electron E2E tests（任务 10.4）
- Category: Testing Methods
- Instructions:
  - E2E 命令：`npm run test:e2e`（先 `electron-vite build` 再 `xvfb-run -a -s "-screen 0 1280x800x24" vitest run --config vitest.e2e.config.ts`）。直接跑 `npx vitest run` 会因 `Missing X server or $DISPLAY` 启动 Electron 失败。
  - E2E 直接 `npx vitest run --config vitest.e2e.config.ts tests/e2e/app.e2e.test.ts` 时，必须先手动执行 `npx electron-vite build` 生成 `out/`，否则运行的仍是旧构建产物，改动不生效。
  - E2E 通过 `app.evaluate` 打桩主进程 `dialog.showSaveDialog/showOpenDialog`，桩必须为每次保存返回唯一路径（`BackupService.create` 目标已存在会抛 `TARGET_EXISTS`），恢复对话框用 `showOpenDialog` 返回最近一次保存的路径。
  - 备份/导出功能位于设置页「数据管理」tab，非默认 tab，E2E 需先点击 `.el-tabs__item`。
  - 分析页五个图表容器 ID：pie-chart、tag-chart、trend-chart、networth-chart、balance-chart，E2E 用 `waitForSelector('#xxx canvas')` 等待渲染。
  - 需求 2.3 启动自动打开上次账本会导致 E2E 二次运行时弹出「打开账本」解锁对话框遮挡新建按钮；E2E 开头需先检测 `.el-overlay-dialog`（含文本「打开账本」）并点击 `.el-dialog__headerbtn` 关闭（userData 的 config.json 跨运行残留）。
