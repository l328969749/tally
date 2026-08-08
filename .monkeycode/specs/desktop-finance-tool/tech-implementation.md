# 单机版桌面财务工具 - 技术实现文档

Feature Name: desktop-finance-tool
Updated: 2026-08-07

## 1. 项目概览

基于 Electron + Vue 3 + TypeScript 的跨平台单机桌面财务工具。数据通过 SQLCipher 数据库级加密存储在本地 `.ledger` 文件中，完全离线运行。本文档描述具体技术实现方案，是开发实施的技术依据。

## 2. 技术栈与依赖清单

| 类别 | 技术 | 版本建议 | 用途 |
|------|------|---------|------|
| 应用框架 | Electron | ^31 | 跨平台桌面容器 |
| 构建工具 | electron-vite | ^2 | 主进程/预加载/渲染进程统一构建 |
| 前端框架 | Vue 3 | ^3.4 | 界面 |
| 开发语言 | TypeScript | ^5.4 | 类型安全 |
| 状态管理 | Pinia | ^2.1 | 前端状态 |
| 路由 | vue-router | ^4.3 | 页面导航 |
| UI 组件库 | Element Plus | ^2.7 | 组件与中文文案 |
| 图表库 | ECharts | ^5.5 | 数据可视化 |
| 数据库 | better-sqlite3 + SQLCipher 构建 | ^11 | 加密 SQLite |
| 密钥派生 | Node.js crypto（PBKDF2） | 内置 | 密码派生 |
| 单元测试 | Vitest | ^2 | 单元/存储层/组件测试 |
| 组件测试 | @vue/test-utils | ^2.4 | Vue 组件测试 |
| E2E 测试 | Playwright | ^1.44 | Electron E2E |
| 打包 | electron-builder | ^24 | 跨平台安装包 |

## 3. 项目目录结构

```
tally/
├── electron.vite.config.ts          # electron-vite 构建配置
├── electron-builder.yml             # 打包配置
├── package.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── src/
│   ├── main/                        # 主进程
│   │   ├── index.ts                 # 应用入口、窗口管理、生命周期
│   │   ├── ipc/
│   │   │   ├── index.ts             # IPC 通道注册汇总
│   │   │   ├── ledger.handler.ts    # 账本相关通道
│   │   │   ├── transaction.handler.ts
│   │   │   ├── account.handler.ts
│   │   │   ├── asset.handler.ts
│   │   │   ├── category.handler.ts
│   │   │   ├── tag.handler.ts
│   │   │   ├── analytics.handler.ts
│   │   │   ├── backup.handler.ts
│   │   │   └── export.handler.ts
│   │   ├── services/
│   │   │   ├── ledger-manager.ts    # 账本打开/关闭/密钥生命周期
│   │   │   ├── crypto-service.ts    # 密码派生、密钥注入
│   │   │   ├── storage/
│   │   │   │   ├── connection.ts    # SQLCipher 连接管理
│   │   │   │   ├── schema.ts        # 建表与迁移
│   │   │   │   └── repositories/    # 各实体的存储仓储
│   │   │   ├── backup-service.ts
│   │   │   └── export-service.ts
│   │   ├── window.ts                # 窗口创建配置
│   │   ├── tray.ts                  # 系统托盘
│   │   └── global-shortcut.ts       # 全局快捷键
│   ├── preload/
│   │   ├── index.ts                 # contextBridge 白名单 API
│   │   └── index.d.ts               # 渲染进程 API 类型声明
│   ├── renderer/                    # 渲染进程
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts
│   │       ├── App.vue
│   │       ├── router/index.ts
│   │       ├── stores/
│   │       │   ├── ledger.ts        # 当前账本状态
│   │       │   ├── account.ts
│   │       │   ├── category.ts
│   │       │   ├── tag.ts
│   │       │   └── analytics.ts
│   │       ├── api/                 # 调用 window.api 的封装层
│   │       ├── views/
│   │       │   ├── DashboardView.vue
│   │       │   ├── TransactionsView.vue
│   │       │   ├── AccountsView.vue
│   │       │   ├── AssetsView.vue
│   │       │   ├── AnalyticsView.vue
│   │       │   ├── SettingsView.vue
│   │       │   ├── LedgerWelcome.vue   # 新建/打开账本入口
│   │       │   └── QuickEntryDialog.vue # 快速记账弹窗
│   │       ├── components/
│   │       │   ├── TransactionForm.vue
│   │       │   ├── TransactionList.vue
│   │       │   ├── AccountForm.vue
│   │       │   ├── AssetForm.vue
│   │       │   ├── TagManager.vue
│   │       │   └── CategoryManager.vue
│   │       └── styles/
│   └── shared/                      # 主进程与渲染进程共享
│       ├── types/                   # 数据模型与 DTO 类型
│       ├── ipc-channels.ts          # IPC 通道常量
│       └── validation/              # 输入校验函数
└── tests/                           # 测试
    ├── unit/
    ├── storage/
    └── e2e/
```

## 4. 构建与依赖配置要点

### 4.1 原生模块处理

better-sqlite3 使用 SQLCipher 构建为原生模块，需在 `electron-vite` 中配置 `externalizeDepsPlugin` 排除打包，并在 `electron-builder.yml` 中将其声明为 `asarUnpack` 与 `npmRebuild` 目标：

```yaml
asarUnpack:
  - "**/node_modules/better-sqlite3/**"
npmRebuild: true
buildDependenciesFromSource: true
```

### 4.2 SQLCipher 启用

安装时需指定 SQLCipher 构建标志，确保数据库文件为加密格式：

```
npm install better-sqlite3 --build-from-source --sqlcipher
```

### 4.3 安全配置

- `BrowserWindow` 开启 `contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`
- 渲染进程不加载远程内容，`webSecurity` 保持默认
- `will-navigate` 与 `setWindowOpenHandler` 拦截并拒绝外部导航

## 5. 主进程实现

### 5.1 账本管理器（ledger-manager）

负责账本生命周期：

- 持有当前打开的 `Database` 实例与派生密钥（仅内存）
- `open(path, password)`：校验文件存在 → PBKDF2 派生密钥 → `PRAGMA key` 注入 → `PRAGMA cipher_migrate` → 执行 `SELECT count(*) FROM sqlite_master` 验证密码正确性 → 返回账本元数据
- `create(path, password, name)`：创建新库 → 注入密钥 → 执行 schema 建表 → 写入默认分类种子数据
- `changePassword(oldPwd, newPwd)`：`PRAGMA rekey` 重新加密
- `close()`：执行 `PRAGMA optimize` → 关闭连接 → 清除内存中的密钥引用
- 记录最近使用的账本路径到主进程数据目录下的 `config.json`（明文，仅存路径不存密码）

### 5.2 密码验证与错误处理

- 密码校验依据：错误密码时 `PRAGMA key` 后执行 `SELECT count(*) FROM sqlite_master` 会抛 `SQLITE_NOTADB` 错误
- 连续失败计数：主进程维护 `failCount`，累计 5 次失败后该会话锁定账本打开操作，需重启应用或等待重置
- 打开期间捕获所有数据库异常，向上返回结构化错误码：`INVALID_PASSWORD`、`CORRUPTED_FILE`、`FILE_NOT_FOUND`、`PERMISSION_DENIED`

### 5.3 系统托盘（tray.ts）

- 创建托盘图标与应用菜单，菜单项包含「打开主界面」「快速记账」「退出」
- 窗口最小化/关闭时最小化到托盘（首次退出行为可配置）
- 托盘菜单「快速记账」触发与全局快捷键相同的事件

### 5.4 全局快捷键（global-shortcut.ts）

- 使用 `globalShortcut.register` 注册系统级快捷键（默认 `CommandOrControl+Shift+K`，设置页可修改）
- 快捷键触发时：若应用未运行主窗口则创建，否则唤起主窗口并打开快速记账弹窗
- 注销时机：`will-quit` 事件中统一 `unregisterAll`

## 6. 预加载层（contextBridge 白名单 API）

预加载脚本通过 `contextBridge.exposeInMainWorld('api', {...})` 暴露 `window.api`，所有 IPC 使用 `ipcRenderer.invoke` 双向通道：

| 通道前缀 | 暴露方法示例 | 说明 |
|---------|------------|------|
| `ledger:` | `open/create/close/getLastUsed/changePassword/list` | 账本生命周期 |
| `transaction:` | `list/create/update/delete` | 流水 CRUD |
| `account:` | `list/create/update/delete/archive/reorder` | 账户管理 |
| `category:` | `list/create/update/delete` | 分类管理 |
| `tag:` | `list/create/update/delete` | 标签管理 |
| `asset:` | `list/create/update/delete/addValue` | 资产与估值 |
| `analytics:` | `overview/expenseByCategory/monthlyTrend/netWorth/accountBalance` | 数据分析 |
| `backup:` | `create/restore` | 备份恢复 |
| `export:` | `toCsv/toJson` | 数据导出 |
| `app:` | `window/tray/shortcut/settings` | 应用级操作 |

渲染进程类型声明位于 `src/preload/index.d.ts`，与 `src/shared/types` 保持一致。

## 7. 存储层实现

### 7.1 数据库连接（connection.ts）

- 封装 `Database` 实例创建，注入 SQLCipher 密钥参数
- 开启 `PRAGMA foreign_keys = ON`、`PRAGMA journal_mode = WAL`、`PRAGMA synchronous = NORMAL`
- 所有写入操作串行执行，通过 better-sqlite3 的同步 API 天然避免并发锁冲突

### 7.2 Schema（schema.ts）

- 启动时执行 `CREATE TABLE IF NOT EXISTS` 幂等建表
- `PRAGMA user_version` 管理 schema 版本，未来变更按版本递增执行迁移

表结构（与设计文档数据模型一致）：

```sql
CREATE TABLE account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cash','bank','alipay','wechat','other')),
  initial_balance REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  parent_id INTEGER REFERENCES category(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transaction (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  amount REAL NOT NULL CHECK(amount > 0),
  category_id INTEGER NOT NULL REFERENCES category(id),
  account_id INTEGER NOT NULL REFERENCES account(id),
  note TEXT,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_transaction_date ON transaction(date DESC);
CREATE INDEX idx_transaction_account ON transaction(account_id);
CREATE INDEX idx_transaction_category ON transaction(category_id);

CREATE TABLE tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE transaction_tag (
  transaction_id INTEGER NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);
CREATE INDEX idx_transaction_tag_tag ON transaction_tag(tag_id);

CREATE TABLE asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('fixed','investment','liquid')),
  value REAL NOT NULL DEFAULT 0,
  unit TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE asset_value (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE liability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  interest_rate REAL NOT NULL DEFAULT 0,
  note TEXT
);
```

### 7.3 仓储层（repositories）

每个实体一个 repository，统一模式：

- 纯 SQL + 参数绑定，杜绝字符串拼接
- CRUD 方法返回完整实体行
- `transaction` 仓储的 `list(filter)` 支持动态 WHERE 条件构建（时间范围、分类、账户、金额区间、备注 LIKE、标签组合），按日期倒序分页
- 涉及多表写操作（如删除流水同时重算余额）封装在事务中，任一失败整体回滚

## 8. 正确性属性实现要点

| 属性 | 实现位置 | 说明 |
|------|---------|------|
| 属性 1：金额为正 | schema CHECK 约束 + 渲染层表单校验 | 双重保障 |
| 属性 2：账户余额 = 初始 + Σ收入 - Σ支出 | `account.repository.balance(accountId)` | 按需实时聚合计算 |
| 属性 3：流水与统计原子性 | 事务包裹流水写入 | 写流水时同步更新相关聚合查询所需数据 |
| 属性 4：净资产 = Σ流动资产 + Σ固定资产 + Σ投资资产 - Σ负债 | `analytics.repository.netWorth()` | 一条聚合 SQL |
| 属性 5：流水删除后余额重算一致 | 聚合计算无缓存，天然一致 | 删除事务内无需额外状态 |
| 属性 6：未解密文件读取失败 | SQLCipher 密钥未注入时所有查询抛错 | 由 ledger-manager 保证只对已打开账本执行查询 |

## 9. 数据分析实现（analytics）

- 所有分析通过 SQL 聚合在存储层完成，返回纯数据，由渲染层 ECharts 渲染
- `expenseByCategory(start, end, accountIds?, tagIds?)`：按分类聚合支出，用于饼图
- `monthlyTrend(start, end)`：按月份聚合收入/支出，用于柱状/折线图
- `netWorthTrend()`：按资产估值日期与流水日期累计计算净资产时间序列
- `accountBalance()`：各账户当前余额，用于分布图
- 筛选条件（时间范围、分类、账户、标签）作为参数传入，前端切换筛选重新调用分析接口
- 图表导出图片：使用 ECharts `getDataURL()` 生成 PNG，经 IPC 由主进程写入用户指定路径

## 10. 备份与导出

### 10.1 备份

- 方案：SQLCipher 在线备份 API `db.backup()`，可安全复制正在使用的加密数据库，备份文件保留 SQLCipher 加密
- `backup.create(path)`：执行在线备份到目标路径，返回成功状态
- `backup.restore(path, password)`：校验目标备份文件密码 → 在线备份恢复到当前账本路径 → 刷新当前连接

### 10.2 导出

- `export.toCsv`：流式写入流水/账户/资产数据到 CSV（UTF-8 BOM 以兼容 Excel 中文）
- `export.toJson`：结构化序列化全部表数据为 JSON
- 导出文件为明文，导出前弹出提示告知用户保管责任

## 11. 渲染层实现

### 11.1 路由与页面

| 路由 | 视图 | 功能 |
|------|------|------|
| `/welcome` | LedgerWelcome | 新建/打开账本 |
| `/dashboard` | DashboardView | 净资产、月度收支、最近流水 |
| `/transactions` | TransactionsView | 流水列表、筛选、记账弹窗 |
| `/accounts` | AccountsView | 账户管理 |
| `/assets` | AssetsView | 资产/负债管理 |
| `/analytics` | AnalyticsView | 图表分析 |
| `/settings` | SettingsView | 设置、标签管理、分类管理 |

未打开账本时路由守卫重定向至 `/welcome`。

### 11.2 记账交互

- 记账表单（TransactionForm）：金额输入自动格式化，分类级联选择，账户下拉，收支类型切换，标签多选
- 流水列表（TransactionList）：`el-table` + 分页，支持组合筛选与行内编辑
- 快速记账：QuickEntryDialog，由全局快捷键或托盘菜单触发，悬浮全局

### 11.3 数据获取模式

- 渲染层不直接触碰数据库，全部经 `window.api` 调用
- Pinia store 缓存列表数据，操作后主动刷新相关 store
- 金额统一以分为单位存储避免浮点误差，展示层转换为元

## 12. 国际化与样式

- 界面默认简体中文，Element Plus 引入 zh-cn locale
- 主题色、字号在全局样式变量中定义，保持视觉统一
- 窗口最小尺寸 `1024x700`，布局在 `window.ts` 中配置

## 13. 测试环境配置

- Vitest 配置 `environment: 'node'` 跑存储层与单元测试，SQLCipher 内存库（`:memory:`）作为测试数据库
- 组件测试使用 `@vue/test-utils` + `jsdom`
- E2E 使用 `playwright` 的 `_electron` 启动器，编写「新建账本→记账→图表→导出→备份恢复」全流程脚本
- CI 可配置三平台矩阵验证账本文件跨平台兼容性

## 14. 风险与对策

| 风险 | 对策 |
|------|------|
| better-sqlite3 + SQLCipher 原生构建在目标平台失败 | 提供预编译二进制回退方案与安装文档 |
| 明文数据在系统 swap / 崩溃转储中残留 | 密钥仅内存持有；不使用日志记录敏感数据；可选项支持锁定账本时清空密钥 |
| 大流水量（10 万条）下聚合查询变慢 | 关键列建索引，日期倒序索引；分析查询限定时间范围 |
| 忘记密码 | 引导页面提供「删除账本」选项；不支持密码找回（隐私优先的设计取舍） |
