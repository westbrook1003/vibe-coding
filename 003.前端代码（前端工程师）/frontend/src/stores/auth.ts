import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '@/api';
import { TOKEN_KEY } from '@/api/request';
import type { CurrentUser } from '@/types';

/**
 * 登录态与当前用户。
 * token 持久化到 localStorage，刷新页面不丢登录态。
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) ?? '');
  const user = ref<CurrentUser | null>(null);

  const isLoggedIn = computed(() => Boolean(token.value));
  const isAdmin = computed(() => user.value?.role === 'admin');
  const mustChangePassword = computed(() => user.value?.mustChangePassword === true);
  const displayName = computed(() => user.value?.realName || user.value?.username || '');

  function setSession(nextToken: string, nextUser: CurrentUser): void {
    token.value = nextToken;
    user.value = nextUser;
    localStorage.setItem(TOKEN_KEY, nextToken);
  }

  async function login(username: string, password: string): Promise<CurrentUser> {
    const result = await authApi.login(username, password);
    setSession(result.token, result.user);
    return result.user;
  }

  async function register(payload: {
    username: string;
    password: string;
    realName: string;
    email?: string;
  }): Promise<CurrentUser> {
    const result = await authApi.register(payload);
    setSession(result.token, result.user);
    return result.user;
  }

  /** 刷新页面后用 token 换回用户信息 */
  async function fetchMe(): Promise<CurrentUser | null> {
    if (!token.value) return null;
    try {
      user.value = await authApi.me();
      return user.value;
    } catch {
      logout();
      return null;
    }
  }

  function logout(): void {
    token.value = '';
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  /** 改密成功后刷新本地用户信息，清掉 mustChangePassword 标记 */
  async function refreshUser(): Promise<void> {
    await fetchMe();
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    mustChangePassword,
    displayName,
    setSession,
    login,
    register,
    fetchMe,
    refreshUser,
    logout,
  };
});
