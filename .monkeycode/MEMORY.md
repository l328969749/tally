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
