<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/components/AuthLayout.vue';
import FormField from '@/components/FormField.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';
import { validateEmail, validatePassword, validateUsername } from '@/utils/validate';

const router = useRouter();
const auth = useAuthStore();

const form = ref({ username: '', realName: '', password: '', confirmPassword: '', email: '' });
const errors = ref<Record<string, string>>({});
const loading = ref(false);

function validate(): boolean {
  const next: Record<string, string> = {};
  const usernameError = validateUsername(form.value.username);
  if (usernameError) next.username = usernameError;
  if (!form.value.realName.trim()) next.realName = '请填写姓名';
  const passwordError = validatePassword(form.value.password);
  if (passwordError) next.password = passwordError;
  if (form.value.password !== form.value.confirmPassword) next.confirmPassword = '两次输入的密码不一致';
  const emailError = validateEmail(form.value.email);
  if (emailError) next.email = emailError;

  errors.value = next;
  return Object.keys(next).length === 0;
}

async function handleSubmit(): Promise<void> {
  if (!validate()) return;
  loading.value = true;
  try {
    await auth.register({
      username: form.value.username.trim(),
      password: form.value.password,
      realName: form.value.realName.trim(),
      email: form.value.email.trim() || undefined,
    });
    toast('注册成功，已为你登录');
    router.push({ name: 'dashboard' });
  } catch (err) {
    errors.value.username = err instanceof Error ? err.message : '注册失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout
    title="注册新账号"
    lead="请填写以下信息完成注册"
    :features="[
      '填写邮箱后，可自助找回密码',
      '注册后立即可用，无需等待审核',
      '默认普通用户权限，可维护物资与出入库',
    ]"
  >
    <form @submit.prevent="handleSubmit">
      <FormField label="用户名" required :error="errors.username" hint="登录名，注册后不可修改">
        <input v-model="form.username" class="input" autocomplete="username" placeholder="3~20 位，字母 / 数字 / 下划线" />
      </FormField>

      <FormField label="姓名" required :error="errors.realName">
        <input v-model="form.realName" class="input" placeholder="显示名，如 张三" />
      </FormField>

      <FormField label="密码" required :error="errors.password" hint="6~20 位，至少包含字母和数字">
        <input v-model="form.password" class="input" type="password" autocomplete="new-password" placeholder="请设置密码" />
      </FormField>

      <FormField label="确认密码" required :error="errors.confirmPassword">
        <input v-model="form.confirmPassword" class="input" type="password" autocomplete="new-password" placeholder="请再次输入密码" />
      </FormField>

      <FormField label="邮箱" :error="errors.email" hint="选填，用于找回密码">
        <input v-model="form.email" class="input" type="email" placeholder="选填，用于找回密码" />
      </FormField>

      <button class="btn primary lg block" type="submit" :disabled="loading">
        {{ loading ? '注册中…' : '注册并登录' }}
      </button>
    </form>

    <p class="auth-alt">已有账号？<RouterLink :to="{ name: 'login' }">返回登录</RouterLink></p>
  </AuthLayout>
</template>
