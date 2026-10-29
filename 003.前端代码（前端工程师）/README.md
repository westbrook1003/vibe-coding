# 物资出入库管理系统 · 全栈代码

> 依据《[物资系统-产品需求文档 PRD v1.0](../001.产品PRD（产品经理）/物资系统-产品需求文档PRD-v1.0.md)》实现，
> 视觉沿用《[UI 原型](../002.产品UI原型（美术设计)/index.html)》。

| 层 | 技术栈 | 目录 |
| --- | --- | --- |
| 前端 | Vue 3 + Vite 6 + TypeScript + Vue Router + Pinia + Axios | [`frontend/`](frontend/) |
| 后端 | NestJS 10 + TypeORM + JWT + Swagger | [`backend/`](backend/) |
| 数据库 | SQLite（默认，零配置）/ MySQL 8（一行切换） | — |

---

## 30 秒跑起来

### 1️⃣ 启动后端

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run seed                # 可选：写入演示数据 + 库存一致性重算
npm run start:dev
```

- 服务地址：http://localhost:3000/api
- 接口文档：http://localhost:3000/api-docs
- 首次启动自动创建内置账号 **admin / admin**（最高权限，登录后强制改密）

### 2️⃣ 启动前端

```bash
cd frontend
npm install
npm run dev
```

- 打开 http://localhost:5173
- `/api` 已由 Vite 代理到后端，无需处理跨域

### 3️⃣ 登录

| 账号 | 密码 | 角色 | 说明 |
| --- | --- | --- | --- |
| `admin` | `admin` | 管理员 | 内置账号，**首次登录强制改密** |
| `zhangsan` | `wz123456` | 管理员 | 演示数据（执行过 `npm run seed` 才有） |
| `lisi` | `wz123456` | 普通用户 | 演示数据，登录后看不到「人员信息」菜单 |

---

## 核心操作路径

| 场景 | 路径 |
| --- | --- |
| 快速入库 | 首页 →「物资入库」→ 输入拼音码 → 自动带出物资 → 填数量 + 订单编号 → `Ctrl+Enter` 提交（提交后表单清空，可连续录入） |
| 快速出库 | 首页 →「物资出库」→ 拼音码（**只列有结存的物资**）→ 填数量 + 出库对象 → 提交；**超结存会实时拦截并置灰按钮** |
| 物资建档 | 「物资档案」→ 新增物资 → 输入品名 → 拼音码自动生成（`无线鼠标` → `wsm`），可手动改成 `wsm,sb` |
| 人员维护 | 「人员信息」（仅 admin 可见）→ 新增 / 编辑 / 重置密码 / 停用 / 删除 |
| 出库对象 | 出库页直接输入新名字提交后自动入库；也可在「出库对象」页维护 |

---

## 已实现的 PRD 条目

| PRD | 功能 | 实现位置 |
| --- | --- | --- |
| F1 | 登录 / 注册 / 找回密码 / 首次强制改密 / 5 次失败锁定 | `backend/src/modules/auth/` |
| F2 | 物资档案（品名、单位、零售价、平台、拼音码） | `backend/src/modules/item/` |
| F3 | 拼音码入库（数量 + 订单编号） | `backend/src/modules/inbound/` |
| F4 | 拼音码出库（数量 + 出库到个人） | `backend/src/modules/outbound/` `receiver/` |
| F5 | 人员信息维护（**仅 admin**） | `backend/src/modules/user/` |
| F6 | 库存查询 + 首页指标 | `backend/src/modules/stock/` |
| G2 | 出库数量不超结存（事务内校验） | `outbound.service.ts` |
| G5 | 记录保存快照，改档案不影响历史 | `inbound/outbound.entity.ts` |
| G7 | 记录写入与结存更新同事务 | `dataSource.transaction()` |
| G10 | 内置 admin 保护 + 至少保留 1 个管理员 | `user.service.ts` |

> 库存一致性可随时用 `npm run db:recalc` 按流水重算校验（权威口径：结存 = Σ入库 − Σ出库）。

---

## 切换到 MySQL

默认 SQLite，**开箱即用**。需要 MySQL 时：

```dotenv
# backend/.env
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的密码
DB_DATABASE=material_system
DB_SYNCHRONIZE=true
```

并执行：

```sql
CREATE DATABASE material_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> `DB_SYNCHRONIZE=true` 会按实体自动建表，仅适合开发环境。
> 生产环境请改用 TypeORM migration，并把 `DB_SYNCHRONIZE` 设为 `false`。

---

## 目录

```
003.前端代码（前端工程师）/
├── frontend/     前端工程
├── backend/      后端工程
├── docs/
│   ├── API.md            接口契约（路径 / 入参 / 出参 / 错误码）
│   └── 目录结构说明.md    工程结构与分层约定
└── README.md
```

---

## 已知边界

| 项 | 说明 |
| --- | --- |
| 找回密码验证码 | 存于进程内存，服务重启即失效；验证码生成在服务端日志中（未接入邮件服务）。多实例部署需换 Redis |
| 数据同步 | 记录写入与结存更新同事务，但未做接口幂等键，重复提交会重复记账（前端按钮提交后禁用） |
| 导出 | PRD 本期明确不做 Excel 导出，故未实现 |
| 附件 | 本期不做订单截图上传 |
| 鉴权 | Token 为无状态 JWT，未实现服务端主动踢下线；停用账号后其请求会在下次校验时被拒 |
