# 数据库脚本 · 物资出入库管理系统

> 依据《[物资系统-产品需求文档 PRD v1.0](../001.产品PRD（产品经理）/物资系统-产品需求文档PRD-v1.0.md)》§5 数据模型，
> 与后端 TypeORM 实体（`003.前端代码（前端工程师）/backend/src/entities/`）**逐字段对齐**。

## 目录结构

```
004.数据库脚本（数据库管理员DBA）/
├── README.md                    ← 本文件：执行指南
├── mysql/
│   ├── 01_schema.sql            建库 + 5 张表 + 索引 + 外键 + CHECK 约束
│   ├── 02_seed_data.sql         演示数据（含 bcrypt 密码哈希）
│   ├── 03_objects.sql           4 个视图 + 2 个存储过程
│   └── 04_verify.sql            12 项巡检 / 验收查询
├── sqlite/
│   ├── 01_schema.sql            5 张表 + 索引 + 外键（与 TypeORM 生成结果逐字一致）
│   ├── 02_seed_data.sql         演示数据
│   ├── 03_views.sql             4 个视图 + 结存重算语句（注释状态）
│   └── 04_verify.sql            12 项巡检 / 验收查询
└── tools/
    ├── gen-seed-sql.js          从活库导出种子数据 SQL（保证与 seed.ts 不漂移）
    ├── check-schema-sync.js     校验「SQL 脚本 ↔ 后端实体」一致性（无需数据库）
    ├── test-sqlite-scripts.js   SQLite 脚本端到端测试（无需数据库）
    └── test-mysql-scripts.js    MySQL 脚本端到端测试（需 MySQL 凭据）
```

## 表结构总览

| 表名 | 说明 | 行数参考 | 关键约束 |
| --- | --- | --- | --- |
| `sys_user` | 系统用户（登录账号） | 4 | `username` 唯一；`role`/`status` CHECK |
| `receiver` | 出库对象（"物资发给了谁"） | 5 | `name` 唯一 |
| `item` | 物资档案 | 10 | `pinyin` 普通索引；`price >= 0` CHECK |
| `inbound` | 入库记录 | 12 | **只增不改不删**；`qty > 0` CHECK |
| `outbound` | 出库记录 | 6 | **只增不改不删**；`qty > 0` CHECK |

字段级定义见 PRD §5.1 ER 图，或直接看 `01_schema.sql`（含逐列 COMMENT）。

## 三条必须知道的规则

**① 结存是冗余字段，权威口径是流水**

```
结存 = Σ入库数量 − Σ出库数量        （PRD G1）
```

`item.stock` / `totalInbound` / `totalOutbound` / `stockValue` 由应用在**同一事务内**维护（PRD G7）。
`v_stock_consistency` 视图随时比对二者，可用于巡检。

**② 绝对不要为 `inbound` / `outbound` 建"自动改 `item.stock`"的触发器**

应用已经维护了 `stock`，再加触发器会**重复累加**，导致库存翻倍。
需要修库存请走 `sp_recalc_stock()`（MySQL）或 `03_views.sql` 末尾的 UPDATE 语句（SQLite）。

**③ 出入库记录里带 `*Snapshot` 后缀的字段是"历史快照"**

`itemName` / `unitSnapshot` / `unitPrice` / `platformSnapshot` / `receiverName`
保存的是**记录发生当时**的值。后来改了物资档案，这些快照不会变——这是设计使然（PRD G5），
巡检脚本第 [7] 项查出的差异属预期现象，不是故障。

## 执行指南

### MySQL 8.0+

```bash
mysql -u root -p < mysql/01_schema.sql
mysql -u root -p material_system < mysql/02_seed_data.sql
mysql -u root -p material_system < mysql/03_objects.sql
mysql -u root -p material_system < mysql/04_verify.sql
```

应用侧配置（`backend/.env`）：

```dotenv
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的密码
DB_DATABASE=material_system
DB_SYNCHRONIZE=false      # 生产环境务必 false，结构由脚本管理
```

### SQLite 3（默认，零配置）

```bash
sqlite3 backend/data/material-system.sqlite < sqlite/01_schema.sql
sqlite3 backend/data/material-system.sqlite < sqlite/02_seed_data.sql
sqlite3 backend/data/material-system.sqlite < sqlite/03_views.sql
sqlite3 backend/data/material-system.sqlite < sqlite/04_verify.sql
```

> 不手动执行也行：`cd backend && npm run seed` 会自动建表 + 灌数据（TypeORM synchronize）。

## 演示账号

| 账号 | 密码 | 角色 | 说明 |
| --- | --- | --- | --- |
| `admin` | `admin` | 管理员 | 内置账号，**首次登录强制改密** |
| `zhangsan` | `wz123456` | 管理员 | |
| `lisi` | `wz123456` | 普通用户 | 看不到「人员信息」菜单 |
| `wangwu` | `wz123456` | 普通用户 | |

密码以 bcrypt（cost=10）哈希存储，脚本里是随机盐，**每次重新生成都会不同**，但都能校验通过。

## 巡检清单（`04_verify.sql`）

| # | 检查 | 期望 |
| --- | --- | --- |
| 1 | 数据概览 | 5 张表均有数据 |
| 2 | **结存一致性** | **0 行**（核心） |
| 3 | 负结存 | 0 行 |
| 4 | 孤儿记录（外键完整性） | 均为 0 |
| 5 | 金额 = 数量 × 单价 | 0 行 |
| 6 | 库存金额 = 结存 × 零售价 | 0 行 |
| 7 | 快照 vs 档案差异 | **有差异属预期**，仅供参考 |
| 8 | 账号健康度（锁定 / 待改密） | 可查询 |
| 9 | 采购分析（按平台） | 可查询 |
| 10 | 物资消耗排行 | 可查询 |
| 11 | 物资去向（按出库对象） | 可查询 |
| 12 | 库存健康度（有结存/零结存/负结存/总值） | 负结存 = 0 |

**发现不一致时的处理流程**：

```
1. 跑 04_verify.sql 第 [2] 项 → 列出偏差物资
2. 排查原因（人工改过库？导入过旧数据？）
3. 执行 sp_recalc_stock()（MySQL）或 03_views.sql 末尾的 UPDATE（SQLite）
4. 再跑第 [2] 项确认已一致
```

## 自动化校验工具

改代码后请跑这三条，防止「脚本与代码漂移」：

```bash
# 1. SQL 脚本 ↔ 后端实体一致性（不需要数据库，最快）
node 004.数据库脚本（数据库管理员DBA）/tools/check-schema-sync.js

# 2. SQLite 脚本端到端（新建临时库跑全流程，跑完即删）
node 004.数据库脚本（数据库管理员DBA）/tools/test-sqlite-scripts.js

# 3. MySQL 脚本端到端（需要凭据）
set MYSQL_PASSWORD=你的密码
node 004.数据库脚本（数据库管理员DBA）/tools/test-mysql-scripts.js
```

第 3 条默认会 `DROP` 掉 `material_system_script_test` 测试库，**别把 `MYSQL_DATABASE` 指向生产库**。

> **依赖说明**：`tools/` 下的脚本复用后端已安装的 `better-sqlite3` / `bcryptjs` / `mysql2`，
> 不在本目录单独 `npm install`。若运行时提示找不到模块，先设一下 `NODE_PATH`：
>
> ```cmd
> set NODE_PATH=..\003.前端代码（前端工程师）\backend\node_modules
> ```
>
> （`check-schema-sync.js` 和 `check-seed-sql.js` 只用内置模块，无需额外依赖。）

## 重新生成种子数据

当演示数据需要更新时，从运行中的库导出（保证与后端 `seed.ts` 完全一致）：

```bash
node 004.数据库脚本（数据库管理员DBA）/tools/gen-seed-sql.js
```

它会同时重写 `mysql/02_seed_data.sql` 和 `sqlite/02_seed_data.sql`。

## 与后端的关系

| 关注点 | 说明 |
| --- | --- |
| 建表方式 | 开发期 `DB_SYNCHRONIZE=true` 由 TypeORM 自动同步；**生产期必须 false**，改用本目录脚本 |
| 类型兼容 | 实体里**不用 `enum` 列**（SQLite 不支持），统一 `varchar` + TS 枚举约束；MySQL 侧额外加了 CHECK 兜底 |
| 数字精度 | `decimal(12,3)` 存数量、`decimal(12,2)` 存单价、`decimal(14,2)` 存金额。SQLite 会把 DECIMAL 读回字符串，后端用 `numeric.transformer` 转成 number |
| 时间精度 | MySQL `datetime(6)`，SQLite `datetime`（存 UTC 字符串） |
| 索引命名 | 沿用 TypeORM 生成的 `IDX_<hash>`，开启 synchronize 时不会触发重建 |
