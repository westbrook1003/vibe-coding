<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const menuOpen = ref(false);

const currentTitle = computed(() => route.meta.title ?? '物资系统');
const initial = computed(() => auth.displayName.charAt(0) || '资');

interface NavEntry {
  name: string;
  label: string;
  icon: string;
  key?: string;
}

const quickActions: NavEntry[] = [
  { name: 'inbound-create', label: '物资入库', icon: 'plus', key: 'I' },
  { name: 'outbound-create', label: '物资出库', icon: 'minus', key: 'O' },
];

const queryMenus: NavEntry[] = [
  { name: 'dashboard', label: '库存总览', icon: 'chart' },
  { name: 'inbound-list', label: '入库记录', icon: 'list' },
  { name: 'outbound-list', label: '出库记录', icon: 'list' },
];

const baseMenus: NavEntry[] = [
  { name: 'item-list', label: '物资档案', icon: 'box' },
  { name: 'receiver-list', label: '出库对象', icon: 'user' },
];

async function handleLogout(): Promise<void> {
  auth.logout();
  toast('已退出登录');
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="app">
    <!-- ============ 侧边栏 ============ -->
    <aside class="sidebar" :class="{ open: menuOpen }">
      <div class="brand">
        <div class="brand-mark">资</div>
        <div>
          <div class="brand-name">物资系统</div>
          <div class="brand-sub">出入库管理</div>
        </div>
      </div>

      <nav class="nav">
        <div class="nav-group-label">快捷操作</div>
        <RouterLink
          v-for="entry in quickActions"
          :key="entry.name"
          class="nav-item"
          :to="{ name: entry.name }"
          @click="menuOpen = false"
        >
          <svg v-if="entry.icon === 'plus'" class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <svg v-else class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M5 12h14" />
          </svg>
          {{ entry.label }}
          <span class="tag">{{ entry.key }}</span>
        </RouterLink>

        <div class="nav-group-label">查询</div>
        <RouterLink
          v-for="entry in queryMenus"
          :key="entry.name"
          class="nav-item"
          :to="{ name: entry.name }"
          @click="menuOpen = false"
        >
          <svg v-if="entry.icon === 'chart'" class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
          <svg v-else class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          {{ entry.label }}
        </RouterLink>

        <div class="nav-group-label">基础数据</div>
        <RouterLink
          v-for="entry in baseMenus"
          :key="entry.name"
          class="nav-item"
          :to="{ name: entry.name }"
          @click="menuOpen = false"
        >
          <svg v-if="entry.icon === 'box'" class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
          </svg>
          <svg v-else class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          {{ entry.label }}
        </RouterLink>

        <!-- 人员信息：仅管理员可见（PRD F5） -->
        <template v-if="auth.isAdmin">
          <div class="nav-group-label">系统管理</div>
          <RouterLink
            class="nav-item"
            :to="{ name: 'user-list' }"
            @click="menuOpen = false"
          >
            <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
            人员信息
            <span class="tag gray">仅管理员</span>
          </RouterLink>
        </template>
      </nav>

      <div class="side-foot">v1.0</div>
    </aside>

    <!-- ============ 主区域 ============ -->
    <div class="main">
      <header class="topbar">
        <button class="menu-toggle" aria-label="菜单" @click="menuOpen = !menuOpen">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <div class="crumb">物资系统 / <b>{{ currentTitle }}</b></div>

        <RouterLink class="btn sm" :to="{ name: 'change-password' }">修改密码</RouterLink>

        <div class="usermenu" title="点击退出登录" @click="handleLogout">
          <div class="avatar">{{ initial }}</div>
          <div>
            <div class="who">{{ auth.displayName }}</div>
            <div class="role">{{ auth.isAdmin ? '管理员' : '普通用户' }}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </header>

      <main class="main-scroll">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>

    <div v-if="menuOpen" class="scrim" @click="menuOpen = false" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: var(--sidebar-w);
  flex: 0 0 var(--sidebar-w);
  background: var(--sidebar);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 40;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 16px;
  border-bottom: 1px solid var(--line);
}
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--tile-1), var(--tile-3));
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  box-shadow: var(--shadow-1);
}
.brand-name {
  font-weight: 650;
  font-size: 15px;
}
.brand-sub {
  font-size: 11px;
  color: var(--ink-3);
}

.nav {
  padding: 12px 10px;
  flex: 1;
  overflow-y: auto;
}
.nav-group-label {
  font-size: 11px;
  color: var(--ink-3);
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 14px 10px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  color: var(--ink-2);
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: 2px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.nav-item:hover {
  background: var(--wash);
  color: var(--ink-1);
  text-decoration: none;
}
.nav-item.router-link-exact-active {
  background: var(--accent-wash);
  color: var(--accent-strong);
  font-weight: 600;
}
.nav-item .ico {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  opacity: 0.85;
}
.nav-item .tag {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  background: var(--accent);
  color: #fff;
  border-radius: 20px;
  padding: 1px 7px;
}
.nav-item .tag.gray {
  background: var(--line-strong);
  color: var(--ink-1);
}

.side-foot {
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-3);
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: var(--topbar-h);
  flex: 0 0 var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  position: sticky;
  top: 0;
  z-index: 30;
}
.topbar .crumb {
  font-size: 13px;
  color: var(--ink-3);
}
.topbar .crumb b {
  color: var(--ink-1);
  font-weight: 600;
}
.menu-toggle {
  display: none;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
  padding: 4px;
}

.usermenu {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
  padding-left: 12px;
  border-left: 1px solid var(--line);
  cursor: pointer;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-wash);
  color: var(--accent-strong);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 650;
}
.usermenu .who {
  font-size: 13px;
  font-weight: 550;
  line-height: 1.2;
}
.usermenu .role {
  font-size: 11px;
  color: var(--ink-3);
}

.main-scroll {
  flex: 1;
  overflow: auto;
}

.scrim {
  display: none;
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--shadow-3);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .menu-toggle {
    display: inline-flex;
  }
  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(11, 11, 11, 0.4);
    z-index: 35;
  }
  .topbar {
    padding: 0 14px;
  }
}
</style>
