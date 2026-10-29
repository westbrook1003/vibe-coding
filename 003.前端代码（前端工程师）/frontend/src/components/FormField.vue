<script setup lang="ts">
/** 表单项：统一标签、必填星号、错误与提示的排版 */
defineProps<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}>();
</script>

<template>
  <div class="field">
    <label>
      {{ label }}<span v-if="required" class="req">*</span>
    </label>
    <slot />
    <div v-if="error" class="err">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>
      {{ error }}
    </div>
    <div v-else-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>
