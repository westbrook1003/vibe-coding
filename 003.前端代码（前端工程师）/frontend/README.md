# 物资系统 · 前端

Vue 3 + Vite 6 + TypeScript + Vue Router + Pinia + Axios。

## 命令

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物
npm run typecheck  # 仅类型检查
npm run lint       # ESLint 检查
npm run lint:fix   # ESLint 自动修复
```

> 本工程暂无测试套件，`lint` + `typecheck` + `build` 三道关卡是当前的验证手段。

## 目录

```
src/
├── api/           接口层（request.ts 为 Axios 封装，index.ts 为接口函数）
├── assets/styles/ 设计令牌与基础样式
├── components/    通用组件
├── composables/   组合式函数（usePinyin / useToast）
├── constants/     静态字典
├── router/        路由表与全局守卫
├── stores/        Pinia 状态
├── types/         TypeScript 类型
├── utils/         格式化与校验
└── views/         页面
```

详见 [`../docs/目录结构说明.md`](../docs/目录结构说明.md)。

## 开发约定

1. **接口调用只走 `src/api/`**，页面不直接 `import axios`。
2. **所有提示走 `toast()`**；表单内的行内错误用 `FormField` 的 `error` 插槽，或给 `http` 调用传 `{ silent: true }` 关掉全局提示。
3. **组件用 `<script setup lang="ts">`**，类型不写 `any`。
4. **样式**：通用类写在 `assets/styles/base.css`，组件私有样式写在 `.vue` 的 `<style scoped>`。
5. **新增页面**：先在 `router/index.ts` 注册路由（`name` 必填），再在 `AppLayout.vue` 加菜单 —— 两处必须同时改。
6. **设计令牌**集中在 `assets/styles/tokens.css`，与 UI 原型逐值一致，不要在组件里写死颜色。
7. **`pinyin-pro` 保持动态 import**（`composables/usePinyin.ts` 的 `loadPinyin()`），静态引入会让首屏包从 167KB 涨到 480KB。

## 路由守卫

`router/index.ts` 的 `beforeEach` 依次处理：

1. 刷新后用 token 换回用户信息；
2. 公开页在已登录时回跳首页；
3. 未登录访问受保护页 → 跳 `/login?redirect=…`；
4. `mustChangePassword` 为真 → 强制跳 `/change-password`；
5. 角色不匹配 → 跳 `/forbidden`。
