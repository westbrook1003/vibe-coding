# vibe-coding

> ai编程 —— 本仓库收录从产品需求（PRD）到高保真 UI 原型、再到可运行全栈代码的完整实践。

当前收录的项目是 **物资出入库管理系统**：一个轻量的物资出入库记录工具——**用拼音码快速录入物资的进与出，随时查到还剩多少。**

| 目录 | 内容 | 说明 |
| --- | --- | --- |
| [`001.产品PRD（产品经理）/`](001.产品PRD（产品经理）/) | 产品需求文档 | PRD v1.0，覆盖登录与账号、物资产品维护、拼音码快速出入库、出库对象、人员信息维护（仅 admin）、库存查询 |
| [`002.产品UI原型（美术设计）/`](002.产品UI原型（美术设计）/) | 高保真 UI 原型 | 12 个页面，纯静态零依赖，双击 `index.html` 即可浏览 |
| [`003.前端代码（前端工程师）/`](003.前端代码（前端工程师）/) | 可运行的全栈工程 | 前端 Vue 3 + Vite + TypeScript；后端 NestJS + TypeORM + JWT；数据库 SQLite（可切 MySQL） |

## 快速开始

```bash
cd 003.前端代码（前端工程师）

# 一键启动（Windows）：双击 启动.bat
# 或手动开两个终端：
npm run dev:backend     # http://localhost:3000/api   接口文档 /api-docs
npm run dev:frontend    # http://localhost:5173
```

初始账号 `admin` / `admin`（首次登录强制改密）。详细步骤见 [`003.前端代码（前端工程师）/快速开始.md`](003.前端代码（前端工程师）/快速开始.md)。

## 技术栈

- **前端** Vue 3 · Vite 6 · TypeScript · Vue Router · Pinia · Axios · ESLint
- **后端** NestJS 10 · TypeORM · Passport-JWT · Swagger
- **数据库** SQLite 3（默认，零配置）/ MySQL 8（改 `.env` 的 `DB_TYPE` 即可切换）

## 核心设计

- **拼音码** —— 一个字段可存多个码（`wxsb,wsm`），任一码都能检索到该物资；不校验唯一，多结果由用户选择
- **结存实时** —— 结存 = Σ入库 − Σ出库，写记录与改结存在同一事务内完成
- **历史不可篡改** —— 出入库记录只增不改不删，并保存品名/单价/平台等快照，改档案不影响历史
- **越权拦截** —— 出库数量超过结存直接阻断，并返回精确差额

## 开发约定

见 [`CLAUDE.md`](CLAUDE.md) —— 包含常用命令、目录结构与若干必须遵守的跨层约定。

## 推送到 GitHub

本仓库已配置 **SSH** 远程地址（`git@github.com:westbrook1003/vibe-coding.git`），推送免密：

```bash
git push origin main          # 推分支
git push origin v1           # 推标签
```

发布版本说明（Release）：

```bash
set GH_TOKEN=ghp_xxxxxxxx     # Windows：先设环境变量
node docs/publish-release.js  # 正文取自 docs/RELEASE-v1.md
```

## 版本

| 标签 | 内容 |
| --- | --- |
| `v1` | 首个完整版本：PRD + UI 原型 + 全栈代码 |
