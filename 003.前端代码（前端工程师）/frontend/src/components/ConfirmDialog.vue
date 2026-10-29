<script setup lang="ts">
import BaseModal from './BaseModal.vue';

/** 破坏性操作二次确认（删除、停用、重置等） */
withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    loading?: boolean;
  }>(),
  { title: '请确认', confirmText: '确认', danger: false, loading: false },
);

const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [] }>();

function cancel(): void {
  emit('update:modelValue', false);
}

function confirm(): void {
  emit('confirm');
}
</script>

<template>
  <BaseModal :model-value="modelValue" :title="title" :width="420" @update:model-value="emit('update:modelValue', $event)">
    <p style="margin: 0; font-size: 13.5px; color: var(--ink-2); line-height: 1.7">{{ message }}</p>
    <slot />
    <template #footer>
      <button class="btn" :disabled="loading" @click="cancel">取消</button>
      <button
        class="btn"
        :class="danger ? 'danger' : 'primary'"
        :disabled="loading"
        @click="confirm"
      >
        {{ loading ? '处理中…' : confirmText }}
      </button>
    </template>
  </BaseModal>
</template>
