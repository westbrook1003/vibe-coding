# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库构成

这是一个**文档 + 原型 + 全栈代码**三段式仓库，不是单一应用：

| 目录 | 内容 | 技术栈 |
| --- | --- | --- |
| `001.产品PRD（产品经理）/` | 产品需求文档 | Markdown |
| `002.产品UI原型（美术设计）/` | 静态高保真原型（双击 `index.html` 即可打开，零依赖） | 原生 HTML/CSS/JS |
| `003.前端代码（前端工程师）/` | 实际工程 | Vue 3 + NestJS |

**`003/` 是唯一需要编译运行的目录**，`001`/`002` 是它的需求与视觉来源。改视觉时 `003/frontend/src/assets/styles/tokens.css` 必须与 `002.产品UI原型（美术设计）/assets/theme.css` 的令牌值保持一致（配色经 `validate_palette.js` 六项检查通过，明暗双模式全 PASS）。

## 常用命令

### 聚合入口（推荐，`003/` 根目录）

`003.前端代码（前端工程师）/package.json` 聚合了前后端命令，是日常入口：

```bash
cd 003.前端代码（前端工程师）
npm run setup          # 一次性装齐前后端依赖
npm run dev:backend    # 后端 :3000  ·  接口文档 /api-docs
npm run dev:frontend   # 前端 :5173  ·  /api 已代理到 :3000
npm run seed           # 演示数据 + 库存一致性重算
npm run db:recalc      # 仅按流水重算结存
npm run typecheck      # 前后端类型检查
npm run lint           # 前端 ESLint
npm run build          # 前后端构建
```

Windows 下还有 `启动.bat`（一键起两个服务并开浏览器）与 `停止.bat`（清理 3000/5173 端口残留进程），
细节见 `003.前端代码（前端工程师）/快速开始.md`。

### 后端 `003.前端代码（前端工程师）/backend`

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run start:dev             # http://localhost:3000/api  ·  文档 /api-docs
npm run seed                  # 演示数据（幂等）+ 库存一致性重算
npm run db:recalc             # 仅按流水重算结存（校验 / 修复库存偏差）
npm run build && npm run start:prod
npm run typecheck             # tsc --noEmit
```

### 前端 `003.前端代码（前端工程师）/frontend`

```bash
npm install
npm run dev                   # http://localhost:5173  ·  /api 已代理到 :3000
npm run lint                  # eslint .
npm run lint:fix
npm run typecheck             # vue-tsc --noEmit
npm run build                 # 先 typecheck 再 vite build
```

**本仓库目前没有测试套件**（无 vitest / jest 配置，无 `*.spec.ts`）。`lint` + `typecheck` + `build` 三道关卡就是当前的验证手段；改动涉及结存计算、权限判定等逻辑时，需手动按 `001.产品PRD（产品经理）/物资系统-产品需求文档PRD-v1.0.md` 第 9 章的 TC01~TC25 验收用例回归。

### 登录账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin` | 管理员，内置账号，**首次登录强制改密** |
| `zhangsan` / `lisi` / `wangwu` | `wz123456` | 需先执行 `npm run seed` |

## 架构要点

### 分层与目录

后端按 **controller → service → entity** 分层，一个业务域一个 `modules/` 子目录，公共设施在 `common/`。前端按 **views（页面）/ components（通用组件）/ api（接口）/ stores / utils / composables** 组织，`views/` 按业务域分子目录。

### 几个跨层必须保持一致的约定

**响应结构**：后端 `TransformInterceptor` 把控制器返回值统一包成 `{ code, message, data }`；前端 `api/request.ts` 的 axios 拦截器再把 `data` 拆出来。所以**页面拿到的就是裸数据**，不需要自己解包。前端拦截器同时负责：注入 `Authorization` 头、401 清 token 跳登录、全局错误 toast（表单内联错误用 `http.post(..., { silent: true })` 关闭全局提示）。

**权限**：后端用 `@Public()` / `@Roles()` 装饰器 + 全局 `JwtAuthGuard`/`RolesGuard`；前端用路由 `meta.roles` + `router.beforeEach` 守卫 + 侧边栏的 `v-if="auth.isAdmin"`。**三处都要做**——前端隐藏只是体验，后端拦截才是边界。「人员信息」是唯一的 admin 专属模块。

**拼音码**：这是本系统的核心交互概念，规则见 PRD F2.3。一个字段可存多个码（逗号分隔，如 `wxsb,wsm`），**任一码都能检索到该物资**，且**不校验唯一**——多结果时全部列出由用户选择。检索按 `码完全相等 > 码前缀 > 品名包含` 打分排序。后端打分逻辑在 `common/utils/pinyin.util.ts` 的 `matchPinyin()`，前端检索走 `GET /items/search`。

前端用 `pinyin-pro` 自动生成首字母简拼。它有 325KB 字典，**必须保持 `composables/usePinyin.ts` 里的动态 import 写法**（`loadPinyin()` + `toPinyinCode()`），改成静态 import 会让首屏包翻三倍。`ItemFormDialog` 在弹窗打开时先 `await loadPinyin()` 预热。

**结存与快照**：结存 = Σ入库 − Σ出库，由 `item.stock` 冗余字段维护。出入库记录**只增不改不删**，并保存品名/单位/单价/平台/出库对象的**快照字段**（`*Snapshot` 后缀）——改物资档案不影响历史记录。写入记录与更新结存必须在**同一事务**内（`dataSource.transaction()`），且出库要在事务内**重新读取**结存而不是信任前端传值。

**数据库可切换**：`DB_TYPE=sqlite`（默认，文件落在 `backend/data/`）或 `mysql`。实体里**不能用 `enum` 列类型**（SQLite 不支持），一律用 `varchar` + TS 枚举约束；`decimal` 列要走 `common/transformers/numeric.transformer.ts` 转成 number，因为 SQLite 会把 DECIMAL 读回成字符串。

**SQL 别名**：TypeORM 的 QueryBuilder 别名**不要用 `in` / `out`**——它们是 SQL 保留字。现有代码用 `ib`/`ob`/`i`/`r` 等。

### 路由与页面跳转

前端所有页面通过 Vue Router 跳转，路由表在 `frontend/src/router/index.ts`，侧边栏菜单在 `components/AppLayout.vue`，两者靠 `name` 对应。**新增页面必须同时改这两处**（再加路由 `meta` 声明权限）。

后端 HTTP 路径与 PRD 第 7 章的页面路径一一对应（`/api/items`、`/api/inbounds`、`/api/outbounds`、`/api/receivers`、`/api/users`、`/api/stock`），接口清单见 `003.前端代码（前端工程师）/docs/API.md`。

### 设计令牌

前端不引 UI 组件库，视觉全部来自 `frontend/src/assets/styles/`：

- `tokens.css` —— 颜色 / 尺寸 / 字体变量，与 `002` 原型逐值一致，**改视觉只改这里**
- `base.css` —— 不依赖 Vue 上下文的通用类（`.btn` `.input` `.tbl` `.badge` `.banner` 等）
- 组件私有样式写在 `.vue` 的 `<style scoped>` 里

## 已知坑位（都踩过，别重复踩）

**① 千万别把 `@nestjs/swagger` 的 CLI 插件加回 `nest-cli.json`。**
`backend/nest-cli.json` 现在**故意没有** `plugins` 字段。插件会把枚举的**源码绝对路径**写进编译产物：

```js
enum: require("E:/.../backend/src/entities/user.entity").UserRole   // require 一个 .ts 文件
```

运行时必然 `MODULE_NOT_FOUND`，`nest start` 直接崩溃。作为补偿，**所有枚举字段都必须显式写
`@ApiProperty({ enum: X })` / `@ApiPropertyOptional({ enum: X })`** —— 插件没了，装饰器是唯一来源。
`pattern` 同理，插件原本会自动生成，现已手工补在 DTO 上。

**② `better-sqlite3` 必须锁 `^12`。**
v11 在 Node 24 下没有预编译包，会退回 node-gyp 编译，而本机没有 Python → 装不上。
v13 也不行：TypeORM 0.3.x 的 peer 依赖只接受到 `^12`。

**③ 实体里不能用 `enum` 列类型**（SQLite 不支持），一律 `varchar` + TS 枚举约束；
`decimal` 列要挂 `numeric.transformer`，因为 SQLite 会把 DECIMAL 读回字符串。

**④ 未登录的错误响应是 `JwtAuthGuard.handleRequest()` 覆写出来的**（`40101` / "登录已失效，请重新登录" / HTTP 401）。
Passport 默认抛的 `UnauthorizedException` 会让业务码退化成 `40001`，与 `docs/API.md` 的契约不符 —— 改这个覆写时要同步契约文档。

**⑤ Vue 的 scoped 样式够不到插槽内容。**
`AuthLayout` 里的 `.auth-row` / `.auth-alt` / `.auth-steps` 等辅助类**必须放在全局 `base.css`**，
因为它们由父组件通过插槽传入，子组件的 scoped 属性选择器匹配不到。
同理，跨组件复用的样式一律进 `base.css`，组件私有样式才写 `<style scoped>`。

**⑥ `dist/index.html` 不能双击打开。**
构建产物用绝对路径 `/assets/*` + history 路由，必须由服务器托管（要 SPA fallback），
且需要后端提供 `/api`。开发期一律用 `npm run dev:frontend` 走 http://localhost:5173。
纯看界面则用 `002.产品UI原型（美术设计）/index.html`（静态零依赖）。

---

## 约定

- 前端组件一律 `<script setup lang="ts">`，禁止 `any`（`@typescript-eslint/no-explicit-any` 为 warning，其余为 error）
- 页面不直接 `import axios`，一律走 `src/api/`
- 提示统一用 `composables/useToast.ts` 的 `toast()`
- 前端 `utils/validate.ts` 与后端 DTO 的校验规则要同步维护（用户名、密码、拼音码格式）
- 演示账号密码只写在 seed 脚本与文档里，不写进业务代码
