<script setup lang="ts">
import { toasts } from '@/composables/useToast';
</script>

<template>
  <div class="toast-wrap">
    <div v-for="item in toasts" :key="item.id" class="toast" :class="{ err: item.type === 'error' }">
      <svg
        v-if="item.type === 'success'"
        class="ti"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <svg
        v-else
        class="ti"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>
      <span>{{ item.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--ink-1);
  color: #fff;
  padding: 9px 15px;
  border-radius: 30px;
  font-size: 13px;
  box-shadow: var(--shadow-2);
  animation: drop 0.18s ease-out;
}
.toast.err .ti {
  color: #fca5a5;
}
.toast .ti {
  width: 16px;
  height: 16px;
  color: #4ade80;
  flex: 0 0 16px;
}
@keyframes drop {
  from {
    transform: translateY(-8px);
    opacity: 0;
  }
}
</style>
