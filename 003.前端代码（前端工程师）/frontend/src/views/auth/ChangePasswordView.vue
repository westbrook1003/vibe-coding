<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import FormField from '@/components/FormField.vue';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';
import { validatePassword } from '@/utils/validate';

const router = useRouter();
const auth = useAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit(): Promise<void> {
  error.value = '';
  if (!currentPassword.value) {
    error.value = '请输入当前密码';
    return;
  }
  const passwordError = validatePassword(newPassword.value);
  if (passwordError) {
    error.value = passwordError;
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致';
    return;
  }
  loading.value = true;
  try {
    await authApi.changePassword(currentPassword.value, newPassword.value);
    await auth.refreshUser();
    toast('密码修改成功');
    router.push({ name: 'dashboard' });
  } catch (err) {
    error.value = err instanceof Error ? err.message : '修改失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="wrap">
    <div class="head">
      <div class="brand-mark">资</div>
      <div>
        <div class="brand-name">物资系统</div>
        <div class="brand-sub">出入库管理</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>修改密码</h3>
        <span v-if="auth.mustChangePassword" class="badge info" style="margin-left: auto">首次登录</span>
      </div>
      <div class="card-body">
        <div v-if="auth.mustChangePassword" class="banner warn" style="margin-bottom: 18px">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 17px">
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>你正在使用初始密码登录，为保障账号安全，<b>必须修改密码</b>后才能使用其他功能。</span>
        </div>

        <form @submit.prevent="handleSubmit">
          <FormField label="当前密码" required>
            <input v-model="currentPassword" class="input" type="password" placeholder="请输入当前密码" />
          </FormField>

          <FormField label="新密码" required hint="6~20 位，至少含字母和数字，不要与其他网站相同">
            <input v-model="newPassword" class="input" type="password" placeholder="请设置新密码" />
          </FormField>

          <FormField label="确认新密码" required>
            <input v-model="confirmPassword" class="input" type="password" placeholder="请再次输入新密码" />
          </FormField>

          <div v-if="error" class="banner crit" style="margin-bottom: 14px">{{ error }}</div>

          <div style="display: flex; gap: 9px; margin-top: 4px">
            <button class="btn primary" style="flex: 1" type="submit" :disabled="loading">
              {{ loading ? '保存中…' : '保存并进入系统' }}
            </button>
            <button
              v-if="!auth.mustChangePassword"
              class="btn"
              type="button"
              @click="router.push({ name: 'dashboard' })"
            >
              返回
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--plane);
  padding: 24px;
  align-content: center;
  gap: 18px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--tile-1), var(--tile-3));
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}
.brand-name {
  font-weight: 650;
  font-size: 15px;
}
.brand-sub {
  font-size: 11px;
  color: var(--ink-3);
}
</style>
