# 物资系统 · 接口契约（API）

> 后端实现见 `backend/`，前端调用封装见 `frontend/src/api/`。
> 在线接口文档：启动后端后访问 `http://localhost:3000/api-docs`（Swagger UI）。

## 通用约定

### 基础路径

```
开发环境：http://localhost:3000/api
前端代理：/api  →  http://localhost:3000/api（vite.config.ts 中配置）
```

### 统一响应结构

成功：

```json
{ "code": 0, "message": "success", "data": { } }
```

失败（HTTP 状态码同时反映错误类型）：

```json
{ "code": 40002, "message": "当前结存为 3，本次出库 5，超出 2", "path": "/api/outbounds", "timestamp": "2026-10-26T12:34:56.000Z" }
```

### 业务错误码

| code | 含义 | HTTP |
| --- | --- | --- |
| `0` | 成功 | 200 |
| `40001` | 参数校验失败 | 400 |
| `40002` | 业务规则不满足 | 400 |
| `40101` | 未登录 / token 失效 | 401 |
| `40102` | 用户名或密码错误 | 401 |
| `40301` | 无权限 | 403 |
| `40401` | 资源不存在 | 404 |
| `40901` | 数据冲突（用户名重复等） | 409 |
| `42901` | 账号被锁定 | 429 |
| `50001` | 服务器内部错误 | 500 |

### 认证

除标注「公开」接口外，均需携带请求头：

```
Authorization: Bearer <token>
```

Token 由 `POST /api/auth/login` 或 `POST /api/auth/register` 返回，有效期 8 小时（可配置）。

### 分页参数

列表接口通用查询参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | number | 1 | 页码，从 1 开始 |
| `pageSize` | number | 20 | 每页条数，最大 100 |
| `sortBy` | string | — | 排序字段（各接口不同） |
| `sortOrder` | `ASC`/`DESC` | `DESC` | 排序方向 |

分页响应：

```json
{ "list": [], "total": 128, "page": 1, "pageSize": 20 }
```

---

## 一、认证 `/auth`

| 方法 | 路径 | 公开 | 说明 |
| --- | --- | :---: | --- |
| POST | `/auth/login` | ✅ | 登录，返回 `{ token, user }` |
| POST | `/auth/register` | ✅ | 注册，返回 `{ token, user }`，角色固定为普通用户 |
| POST | `/auth/forgot-password` | ✅ | 发起找回密码 |
| POST | `/auth/reset-password` | ✅ | 校验验证码并重置密码 |
| POST | `/auth/change-password` | ❌ | 修改当前用户密码 |
| GET | `/auth/me` | ❌ | 获取当前登录用户 |
| POST | `/auth/logout` | ❌ | 退出登录（前端清 token 即可） |

### POST /auth/login

```json
{ "username": "admin", "password": "admin" }
```

响应 `data`：

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1, "username": "admin", "realName": "系统管理员",
    "email": null, "role": "admin", "mustChangePassword": true
  }
}
```

- 连续失败 5 次锁定账号 15 分钟，返回 `42901`
- 账号不存在与密码错误返回同一提示 `40102`，不暴露账号是否存在
- `mustChangePassword` 为 `true` 时，前端强制跳转修改密码页

### POST /auth/register

```json
{ "username": "zhangsan", "password": "wz123456", "realName": "张三", "email": "zhangsan@example.com" }
```

- 用户名 3~20 位字母/数字/下划线，全局唯一
- 密码 6~20 位，至少含字母和数字
- 邮箱选填，同一邮箱不可被多账号绑定
- 用户名重复 → `40901`

### POST /auth/forgot-password

```json
{ "usernameOrEmail": "zhangsan@example.com" }
```

响应 `data`：

```json
{ "channel": "email", "message": "验证码已发送至该账号绑定的邮箱" }
```

- `channel = "email"`：已绑定邮箱，走验证码流程
- `channel = "admin"`：未绑定邮箱，`message` 提示「该账号未绑定邮箱，请联系管理员重置密码」
- 同一账号每小时最多发送 3 次验证码，超出返回 `40002`
- 验证码 6 位数字，有效期 10 分钟

### POST /auth/reset-password

```json
{ "usernameOrEmail": "zhangsan@example.com", "code": "123456", "newPassword": "wz123456" }
```

- 验证码错误或过期 → `40002`（最多尝试 5 次）
- 重置成功后旧密码立即失效

### POST /auth/change-password

```json
{ "currentPassword": "admin", "newPassword": "wz123456" }
```

---

## 二、人员信息 `/users`　**仅 admin**

> 整个模块受 `@Roles(UserRole.ADMIN)` 保护，普通用户访问返回 `40301`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/users` | 人员列表，支持 `keyword` / `role` / `status` |
| GET | `/users/:id` | 人员详情 |
| POST | `/users` | 新增人员 |
| PATCH | `/users/:id` | 编辑人员（姓名/邮箱/角色/状态） |
| POST | `/users/:id/status` | 启用 / 停用账号 |
| POST | `/users/:id/reset-password` | 重置他人密码 |
| DELETE | `/users/:id` | 删除人员 |

**新增人员**

```json
{
  "username": "lisi", "initialPassword": "wz123456",
  "realName": "李四", "email": null, "role": "user", "status": "active"
}
```

**保护性约束**

- 不能删除 / 停用 / 降级自己 → `40002`
- 系统内至少保留 1 个启用状态的 admin，否则 → `40002`
- 有出入库记录的用户不可删除，提示「该用户有操作记录，请改为停用」
- 重置密码后该用户所有会话立即失效

---

## 三、物资档案 `/items`

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/items` | 全部 | 列表，支持 `keyword` / `platform` / `status` |
| GET | `/items/platforms` | 全部 | 全部购买平台（筛选下拉） |
| GET | `/items/search?q=ws` | 全部 | **拼音码联想检索** |
| GET | `/items/:id` | 全部 | 详情 |
| POST | `/items` | 全部 | 新增 |
| PATCH | `/items/:id` | 全部 | 编辑 |
| POST | `/items/:id/status` | 全部 | 启用 / 停用 |
| DELETE | `/items/:id` | **admin** | 删除（无出入库记录时） |

**新增物资**

```json
{
  "name": "无线鼠标", "unit": "个", "price": 29.9,
  "platform": "淘宝", "pinyin": "wsm", "remark": null
}
```

**拼音码联想** `GET /items/search`

| 参数 | 说明 |
| --- | --- |
| `q` | 检索词（必填） |
| `limit` | 返回条数上限，默认 20，最大 50 |
| `onlyInStock` | 只返回有结存的物资（出库场景） |

- 输入即模糊匹配，**前缀命中优先**（码完全相等 > 码前缀 > 品名包含）
- 只返回**启用状态**的物资
- 拼音码**不校验唯一**，多个物资可共用一个码，检索时全部列出

---

## 四、入库 `/inbounds`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/inbounds` | 新增入库记录 |
| GET | `/inbounds` | 列表，支持 `keyword` / `dateFrom` / `dateTo` / `operatorId` |
| GET | `/inbounds/:id` | 详情 |

**新增入库**

```json
{ "pinyin": "wsm", "qty": 2, "orderNo": "20261026T12345", "remark": null }
```

- 拼音码必须匹配到**启用状态**的物资，否则 `40401`
- 数量 > 0，最多 3 位小数
- 订单编号必填，**允许重复**（同一订单分批到货）
- 记录写入与结存更新在**同一事务**内完成（PRD G7）
- 记录保存品名/单位/单价/平台**快照**，后续改档案不影响历史
- 记录**不可编辑、不可删除**

---

## 五、出库 `/outbounds`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/outbounds` | 新增出库记录 |
| GET | `/outbounds` | 列表，支持 `keyword` / `receiverId` / `operatorId` / `dateFrom` / `dateTo` |
| GET | `/outbounds/:id` | 详情 |

**新增出库**

```json
{ "pinyin": "wsm", "qty": 1, "receiverName": "张三", "remark": null }
```

- **出库数量不得超过当前结存**，超出返回 `40002`，提示「当前结存为 N，本次出库 M，超出 X」
- 结存在**事务内重新读取**，不信任前端传来的值，避免并发超卖
- 出库对象为新名字时**自动创建**到出库对象列表
- 记录保存品名/单位/单价/出库对象**快照**
- 记录**不可编辑、不可删除**

---

## 六、出库对象 `/receivers`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/receivers` | 列表，支持 `keyword` / `status` |
| GET | `/receivers/active` | 全部启用对象（出库页下拉） |
| GET | `/receivers/:id` | 详情 |
| POST | `/receivers` | 新增 |
| PATCH | `/receivers/:id` | 编辑 |
| DELETE | `/receivers/:id` | 删除 |

- 名称唯一，重复 → `40901`
- 已有出库记录引用的对象**不可删除**，仅可停用

---

## 七、库存 `/stock`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/stock` | 库存清单，支持 `keyword` / `platform` / `onlyInStock` / `onlyZero` |
| GET | `/stock/summary` | 首页指标汇总 |

**GET /stock/summary**

```json
{
  "itemCount": 128,
  "totalValue": 12486.00,
  "monthInboundAmount": 3210.00,
  "monthOutboundAmount": 860.00,
  "zeroStockCount": 15
}
```

- 结存 = Σ入库数量 − Σ出库数量
- 库存金额 = 结存 × **当前**零售价（改价会影响库存金额；历史记录中的单价快照不受影响）

---

## 附录：与 PRD 的对应关系

| PRD 条目 | 实现位置 |
| --- | --- |
| F1 登录与账号 | `backend/src/modules/auth/` |
| F2 物资产品维护 | `backend/src/modules/item/` |
| F3 物资入库 | `backend/src/modules/inbound/` |
| F4 物资出库 | `backend/src/modules/outbound/` + `receiver/` |
| F5 人员信息维护（仅 admin） | `backend/src/modules/user/` + `@Roles(UserRole.ADMIN)` |
| F6 库存查询 | `backend/src/modules/stock/` |
| G2 出库不超结存 | `outbound.service.ts` 事务内校验 |
| G5 快照 | `inbound.entity.ts` / `outbound.entity.ts` 快照字段 |
| G7 事务 | `inbound/outbound.service.ts` `dataSource.transaction()` |
| G9 拼音码不唯一 | `item.service.ts` `searchByPinyin()` |
| G10 admin 保护 | `user.service.ts` `assertNotLastAdmin()` |
