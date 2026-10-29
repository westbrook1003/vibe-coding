<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { itemApi } from '@/api';
import type { Item } from '@/types';

/**
 * 拼音码选择器（PRD F2.3 / F3.3 / F4.3）。
 *
 * - 输入拼音码即时联想，唯一匹配自动选中；
 * - ↑ ↓ 选择、Enter 确认、Esc 关闭；
 * - 拼音码不唯一时列出全部候选由用户选择。
 */
const props = withDefaults(
  defineProps<{
    /** 当前输入的拼音码 */
    modelValue: string;
    /** 选中的物资（v-model:item） */
    item: Item | null;
    /** 只返回有结存的物资（出库场景） */
    onlyInStock?: boolean;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    onlyInStock: false,
    placeholder: '输入拼音码，如 wsm',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [string];
  'update:item': [Item | null];
  /** 检索无结果时抛出，交由页面提示"先去建档" */
  'not-found': [string];
}>();

const keyword = ref(props.modelValue);
const results = ref<Item[]>([]);
const open = ref(false);
const highlight = ref(-1);
const loading = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.modelValue,
  (value) => {
    if (value !== keyword.value) keyword.value = value;
  },
);

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}

async function search(): Promise<void> {
  const q = keyword.value.trim();
  if (!q) {
    results.value = [];
    open.value = false;
    return;
  }
  loading.value = true;
  try {
    results.value = await itemApi.search(q, { limit: 20, onlyInStock: props.onlyInStock });
    open.value = true;
    highlight.value = results.value.length === 1 ? 0 : -1;
    if (results.value.length === 0) emit('not-found', q);
  } finally {
    loading.value = false;
  }
}

function onInput(): void {
  emit('update:modelValue', keyword.value);
  // 手动改动了拼音码，已选物资作废
  if (props.item) emit('update:item', null);
  clearTimer();
  timer = setTimeout(() => void search(), 180);
}

function pick(target: Item): void {
  keyword.value = target.pinyin.split(',')[0];
  emit('update:modelValue', keyword.value);
  emit('update:item', target);
  open.value = false;
  highlight.value = -1;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!results.value.length) return;
    open.value = true;
    highlight.value =
      event.key === 'ArrowDown'
        ? (highlight.value + 1) % results.value.length
        : (highlight.value - 1 + results.value.length) % results.value.length;
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (highlight.value >= 0 && results.value[highlight.value]) {
      pick(results.value[highlight.value]);
    } else if (results.value.length === 1) {
      pick(results.value[0]);
    }
    return;
  }
  if (event.key === 'Escape') {
    open.value = false;
  }
}

function clear(): void {
  keyword.value = '';
  results.value = [];
  open.value = false;
  emit('update:modelValue', '');
  emit('update:item', null);
}

onBeforeUnmount(clearTimer);

const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({ clear, focus: () => inputRef.value?.focus() });
</script>

<template>
  <div class="suggest-wrap">
    <input
      ref="inputRef"
      class="input mono"
      :value="keyword"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @input="onInput"
      @focus="keyword.trim() && search()"
      @keydown="onKeydown"
    />

    <div v-if="loading" class="suggest-status">
      <span class="spinner" /> 检索中…
    </div>

    <div v-show="open && results.length" class="suggest" role="listbox">
      <button
        v-for="(target, index) in results"
        :key="target.id"
        class="sitem"
        :class="{ hl: index === highlight }"
        type="button"
        role="option"
        @mousedown.prevent="pick(target)"
      >
        <span class="sc mono">{{ target.pinyin.split(',')[0] }}</span>
        <span class="sname">{{ target.name }}</span>
        <span class="sp">/ {{ target.unit }} · ¥{{ target.price.toFixed(2) }} · {{ target.platform }}</span>
        <span class="sstock">结存 {{ target.stock }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.suggest-wrap {
  position: relative;
}
.suggest {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  z-index: 40;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  max-height: 280px;
  overflow-y: auto;
}
.suggest-status {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  z-index: 39;
  padding: 9px 12px;
  font-size: 12.5px;
  color: var(--ink-3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.spinner {
  display: inline-block;
  width: 11px;
  height: 11px;
  margin-right: 6px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: -1px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sitem {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: var(--font);
}
.sitem:last-child {
  border-bottom: 0;
}
.sitem:hover,
.sitem.hl {
  background: var(--accent-wash);
}
.sitem .sc {
  font-size: 12px;
  color: var(--ink-3);
  min-width: 56px;
}
.sitem .sname {
  font-weight: 600;
  font-size: 13.5px;
}
.sitem .sp {
  font-size: 12px;
  color: var(--ink-3);
}
.sitem .sstock {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-3);
  white-space: nowrap;
}
</style>
