<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/components/AuthLayout.vue';
import FormField from '@/components/FormField.vue';
import { authApi } from '@/api';
import { toast } from '@/composables/useToast';
import { validatePassword } from '@/utils/validate';

const router = useRouter();

/** 步骤 1：发起找回；步骤 2：校验验证码并重置 */
const step = ref<1 | 2>(1);
const usernameOrEmail = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

async function handleRequest(): Promise<void> {
  error.value = '';
  if (!usernameOrEmail.value.trim()) {
    error.value = '请输入用户名或邮箱';
    return;
  }
  loading.value = true;
  try {
    const result = await authApi.requestPasswordReset(usernameOrEmail.value.trim());
    if (result.channel === 'admin') {
      // 路径 B：未绑定邮箱，请联系管理员（PRD F1.4）
      error.value = result.message;
      return;
    }
    toast(result.message);
    step.value = 2;
    startCountdown();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败';
  } finally {
    loading.value = false;
  }
}

function startCountdown(): void {
  countdown.value = 60;
  clearInterval(timer);
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearInterval(timer);
  }, 1000);
}

async function handleReset(): Promise<void> {
  error.value = '';
  if (!/^\d{6}$/.test(code.value)) {
    error.value = '请输入 6 位数字验证码';
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
    await authApi.resetPassword({
      usernameOrEmail: usernameOrEmail.value.trim(),
      code: code.value,
      newPassword: newPassword.value,
    });
    toast('密码重置成功，请用新密码登录');
    router.push({ name: 'login' });
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重置失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout
    title="找回密码"
    lead="两步重置密码。已绑定邮箱的用户可自助找回；未绑定邮箱请联系管理员重置。"
    :features="[
      '验证码 10 分钟内有效，仅可使用一次',
      '重置成功后，账号原有登录会话立即失效',
      '重置密码后旧密码即刻作废',
    ]"
  >
    <!-- 第 1 步 -->
    <div v-if="step === 1">
      <div class="auth-steps">
        <span class="auth-step on"><span class="n">1</span>验证身份</span>
        <span class="bar" />
        <span class="auth-step"><span class="n">2</span>重置密码</span>
      </div>

      <form @submit.prevent="handleRequest">
        <FormField label="用户名或邮箱" required>
          <input v-model="usernameOrEmail" class="input" placeholder="请输入用户名或注册邮箱" />
        </FormField>

        <div v-if="error" class="banner crit" style="margin-bottom: 14px">{{ error }}</div>

        <button class="btn primary lg block" type="submit" :disabled="loading">
          {{ loading ? '处理中…' : '发送验证码' }}
        </button>
      </form>
    </div>

    <!-- 第 2 步 -->
    <div v-else>
      <div class="auth-steps">
        <span class="auth-step"><span class="n">✓</span>验证身份</span>
        <span class="bar" />
        <span class="auth-step on"><span class="n">2</span>重置密码</span>
      </div>

      <form @submit.prevent="handleReset">
        <FormField label="验证码" required>
          <input
            v-model="code"
            class="input mono"
            maxlength="6"
            inputmode="numeric"
            placeholder="6 位数字验证码"
            style="letter-spacing: 0.35em; font-weight: 600"
          />
          <div class="hint">
            <span v-if="countdown > 0">{{ countdown }} 秒后可重新获取</span>
            <button v-else type="button" class="btn sm" @click="handleRequest">重新获取验证码</button>
          </div>
        </FormField>

        <FormField label="新密码" required>
          <input v-model="newPassword" class="input" type="password" placeholder="6~20 位，至少含字母和数字" />
        </FormField>

        <FormField label="确认新密码" required>
          <input v-model="confirmPassword" class="input" type="password" placeholder="请再次输入新密码" />
        </FormField>

        <div v-if="error" class="banner crit" style="margin-bottom: 14px">{{ error }}</div>

        <button class="btn primary lg block" type="submit" :disabled="loading">
          {{ loading ? '处理中…' : '重置密码并登录' }}
        </button>
        <button class="btn block" type="button" style="margin-top: 9px" @click="step = 1">上一步</button>
      </form>
    </div>

    <p class="auth-alt"><RouterLink :to="{ name: 'login' }">← 返回登录</RouterLink></p>
  </AuthLayout>
</template>
