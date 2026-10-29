# 物资系统 · 后端

NestJS 10 + TypeORM + JWT + Swagger。

## 命令

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run start:dev         # 开发模式（热重载）
npm run build             # 编译
npm run start:prod        # 运行编译产物
npm run seed              # 写入演示数据（幂等）+ 库存一致性重算
npm run db:recalc         # 仅按流水重算结存（校验 / 修复库存偏差）
npm run typecheck         # 类型检查
```

## 启动后

- 服务：http://localhost:3000/api
- 接口文档：http://localhost:3000/api-docs
- 首次启动自动创建内置账号 `admin / admin`，登录后强制改密

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | 3000 | 端口 |
| `CORS_ORIGIN` | http://localhost:5173 | 允许跨域的前端地址，逗号分隔 |
| `DB_TYPE` | sqlite | `sqlite` / `mysql` |
| `DB_DATABASE` | ./data/material-system.sqlite | sqlite 为文件路径；mysql 为库名 |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` | — | MySQL 连接参数 |
| `DB_SYNCHRONIZE` | true | 按实体自动建表，生产环境改 false 并改用 migration |
| `JWT_SECRET` | please-change-this-secret… | **生产环境必须替换** |
| `JWT_EXPIRES_IN` | 8h | Token 有效期 |
| `LOGIN_MAX_ATTEMPTS` | 5 | 连续失败次数上限 |
| `LOGIN_LOCK_MINUTES` | 15 | 锁定时长 |
| `RESET_CODE_TTL_MINUTES` | 10 | 验证码有效期 |
| `RESET_CODE_MAX_PER_HOUR` | 3 | 每小时验证码发送上限 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | admin / admin | 内置管理员 |

## 分层约定

```
controller  →  路由 + DTO 校验 + 鉴权注解，不写业务逻辑
service     →  业务规则 + 事务 + 权限校验
entity      →  表结构与关系
dto         →  入参定义 + 校验规则
```

## 关键实现说明

| 需求 | 实现 |
| --- | --- |
| 出库不超结存 | `outbound.service.ts` 在**事务内重新读取**结存，不信任前端传值 |
| 记录与结存原子性 | `inbound/outbound.service.ts` 用 `dataSource.transaction()` 包裹 |
| 历史不可被篡改 | 入库/出库实体保存品名、单位、单价、平台、出库对象的**快照字段** |
| 拼音码不唯一 | `item.service.ts` 的 `searchByPinyin()` 用 `matchPinyin()` 打分排序，前缀优先 |
| admin 保护 | `user.service.ts` 的 `assertNotLastAdmin()`；内置 admin 不可删/停/降级 |
| SQLite 数字 | `common/transformers/numeric.transformer.ts` 把 DECIMAL 读回为 number |

接口清单见 [`../docs/API.md`](../docs/API.md)。
