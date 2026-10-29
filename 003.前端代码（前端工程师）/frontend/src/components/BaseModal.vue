<script setup lang="ts">
import { watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    width?: number;
  }>(),
  { width: 520 },
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

function close(): void {
  emit('update:modelValue', false);
}

watch(
  () => props.modelValue,
  (visible) => {
    document.body.style.overflow = visible ? 'hidden' : '';
  },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="modal" :style="{ width: `${width}px` }" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>{{ title }}</h3>
          <span class="x" @click="close">&times;</span>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(11, 11, 11, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  backdrop-filter: blur(2px);
}
.modal {
  background: var(--surface-2);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-3);
  max-width: 100%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  animation: pop 0.16s ease-out;
}
@keyframes pop {
  from {
    transform: translateY(8px) scale(0.985);
    opacity: 0;
  }
}
.modal-head {
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
}
.modal-head h3 {
  font-size: 16px;
}
.modal-head .x {
  margin-left: auto;
  cursor: pointer;
  color: var(--ink-3);
  font-size: 20px;
  line-height: 1;
}
.modal-body {
  padding: 20px 22px;
  overflow-y: auto;
}
.modal-foot {
  padding: 14px 22px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 9px;
  justify-content: flex-end;
  background: var(--surface);
  border-radius: 0 0 var(--r-xl) var(--r-xl);
}
</style>
