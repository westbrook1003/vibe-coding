import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/types';

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，显示在顶栏与浏览器标签 */
    title?: string;
    /** 是否为公开页面（无需登录） */
    public?: boolean;
    /** 仅这些角色可访问 */
    roles?: UserRole[];
    /** 是否需要登录 */
    requiresAuth?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  /* ---------------- 公开页面 ---------------- */
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { public: true, title: '注册' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { public: true, title: '找回密码' },
  },

  /* ---------------- 登录后页面（统一挂在 AppLayout 下） ---------------- */
  {
    path: '/',
    component: () => import('@/components/AppLayout.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/StockDashboardView.vue'),
        meta: { title: '库存总览', requiresAuth: true },
      },
      {
        path: 'inbound/new',
        name: 'inbound-create',
        component: () => import('@/views/inbound/InboundCreateView.vue'),
        meta: { title: '物资入库', requiresAuth: true },
      },
      {
        path: 'inbound',
        name: 'inbound-list',
        component: () => import('@/views/inbound/InboundListView.vue'),
        meta: { title: '入库记录', requiresAuth: true },
      },
      {
        path: 'outbound/new',
        name: 'outbound-create',
        component: () => import('@/views/outbound/OutboundCreateView.vue'),
        meta: { title: '物资出库', requiresAuth: true },
      },
      {
        path: 'outbound',
        name: 'outbound-list',
        component: () => import('@/views/outbound/OutboundListView.vue'),
        meta: { title: '出库记录', requiresAuth: true },
      },
      {
        path: 'items',
        name: 'item-list',
        component: () => import('@/views/item/ItemListView.vue'),
        meta: { title: '物资档案', requiresAuth: true },
      },
      {
        path: 'receivers',
        name: 'receiver-list',
        component: () => import('@/views/receiver/ReceiverListView.vue'),
        meta: { title: '出库对象', requiresAuth: true },
      },
      {
        path: 'users',
        name: 'user-list',
        component: () => import('@/views/user/UserListView.vue'),
        meta: { title: '人员信息', requiresAuth: true, roles: ['admin'] },
      },
      {
        path: 'change-password',
        name: 'change-password',
        component: () => import('@/views/auth/ChangePasswordView.vue'),
        meta: { title: '修改密码', requiresAuth: true },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
        meta: { title: '无权限', requiresAuth: true },
      },
    ],
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

/**
 * 全局前置守卫
 * 1. 需要登录的页面，未登录 → 跳登录页并带上 redirect
 * 2. 已登录的用户访问登录/注册页 → 跳回首页
 * 3. 首次登录（mustChangePassword）→ 强制跳修改密码页
 * 4. 角色不匹配 → 跳无权限页
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // 刷新页面后用 token 换回用户信息
  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchMe();
  }

  if (to.meta.public) {
    if (auth.isLoggedIn && (to.name === 'login' || to.name === 'register')) {
      return { name: 'dashboard' };
    }
    return true;
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (auth.mustChangePassword && to.name !== 'change-password') {
    return { name: 'change-password' };
  }

  if (to.meta.roles?.length && auth.user && !to.meta.roles.includes(auth.user.role)) {
    return { name: 'forbidden' };
  }

  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 物资系统` : '物资系统';
});
