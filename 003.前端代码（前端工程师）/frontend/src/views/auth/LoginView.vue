<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthLayout from '@/components/AuthLayout.vue';
import FormField from '@/components/FormField.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const username = ref('admin');
const password = ref('admin');
const loading = ref(false);
const error = ref('');

async function handleSubmit(): Promise<void> {
  error.value = '';
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  loading.value = true;
  try {
    const user = await auth.login(username.value.trim(), password.value);
    toast('登录成功');
    // 首次登录强制改密（PRD F1.1）
    if (user.mustChangePassword) {
      router.push({ name: 'change-password' });
      return;
    }
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout
    title="登录"
    lead="请使用您的账号登录物资系统"
    :features="[
      '拼音码快速检索，入库 / 出库不再翻找',
      '品名、单位、零售价、购买平台一次建档',
      '结存实时计算，库存去向逐笔可查',
    ]"
  >
    <form @submit.prevent="handleSubmit">
      <FormField label="用户名" required>
        <input v-model="username" class="input" autocomplete="username" placeholder="请输入用户名" />
      </FormField>

      <FormField label="密码" required>
        <input
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          placeholder="请输入密码"
        />
      </FormField>

      <div class="auth-row">
        <label style="display: flex; gap: 7px; align-items: center; cursor: pointer; color: var(--ink-2)">
          <input type="checkbox" checked style="accent-color: var(--accent)" /> 记住我
        </label>
        <RouterLink :to="{ name: 'forgot-password' }">忘记密码？</RouterLink>
      </div>

      <div v-if="error" class="banner crit" style="margin-bottom: 14px">{{ error }}</div>

      <button class="btn primary lg block" type="submit" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </form>

    <div class="banner neutral" style="margin-top: 18px; align-items: center">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 16px">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span>初始账号 <b class="mono">admin</b> / 密码 <b class="mono">admin</b>，首次登录后需修改密码。</span>
    </div>

    <p class="auth-alt">还没有账号？<RouterLink :to="{ name: 'register' }">注册新账号</RouterLink></p>
  </AuthLayout>
</template>
