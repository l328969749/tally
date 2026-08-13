# 需求实施计划 - 房屋出租管理（第二阶段）

- [x] 1. 数据模型与 schema 迁移
  - [x] 1.1 schema v3 迁移新增四张表
    - rental_property / tenant / lease / rent_record
    - 删除出租房级联合同，合同级联收租；租户无级联删除约束（由服务层校验）
    - SCHEMA_VERSION 2→3 增量迁移，保留既有数据
  - [x] 1.2 编写迁移单元测试
    - v2 账本升级 v3 后新增表可建、既有 account/transaction 数据完好

- [x] 2. RentalRepository 与存储层测试
  - [x] 2.1 RentalRepository CRUD
    - property/tenant/lease/rentRecord 的增删改查
    - listLeases 关联 property/tenant 信息；listRentRecords 关联流水
    - 合同聚合：累计租金收入、下一应收租日
  - [x] 2.2 删除级联与约束
    - 删除出租房级联删除合同与收租；租户存在关联合同时报错
  - [x] 2.3 编写存储层单元测试

- [x] 3. RentalService 收租记账
  - [x] 3.1 recordRent 原子事务
    - 生成 rent_record + 「租金收入」income 流水（记入用户指定账户），失败回滚
  - [x] 3.2 deleteRentRecord 原子事务
    - 删除收租记录并同步删除关联流水，失败回滚
  - [x] 3.3 编写收租记账单元测试

- [x] 4. IPC 层与 preload
  - [x] 4.1 rental.handler 注册 rental.* 通道与校验
  - [x] 4.2 preload 暴露 window.api.rental
  - [x] 4.3 编写校验函数与 IPC 单测

- [x] 5. 出租管理页面
  - [x] 5.1 出租房管理 tab（登记/编辑/删除，关联固定资产）
  - [x] 5.2 租户管理 tab（登记/编辑/删除，关联合同拦截提示）
  - [x] 5.3 合同管理 tab（创建/编辑/终止，收租记录与累计租金展示）
  - [x] 5.4 收租 tab（记录收租选择合同与收入账户，删除收租）
  - [x] 5.5 新增 /rentals 路由与侧边栏入口
  - [x] 5.6 编写 RentalsView 组件测试

- [x] 6. 仪表盘提醒
  - [x] 6.1 合同剩余 30 天到期提醒
  - [x] 6.2 应收租日（付租周期到期前 3 天）提醒
  - [x] 6.3 编写提醒逻辑纯函数单元测试

- [x] 7. E2E 验证
  - [x] 7.1 编写出租全流程 E2E
    - 登记出租房与租户 → 创建合同 → 记录收租（断言收入流水与账户余额）→ 删除收租（断言流水同步删除）

- [x] 8. 检查点 - 确保所有测试通过，如有疑问请询问用户
