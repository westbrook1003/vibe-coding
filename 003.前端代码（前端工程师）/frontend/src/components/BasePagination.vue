<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{ 'update:page': [number] }>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1));
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total));

/** 生成页码序列，超过 7 页时用省略号折叠 */
const pages = computed<(number | '…')[]>(() => {
  const total = totalPages.value;
  const current = props.page;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) result.push('…');
  for (let i = start; i <= end; i += 1) result.push(i);
  if (end < total - 1) result.push('…');
  result.push(total);
  return result;
});

function go(page: number): void {
  if (page < 1 || page > totalPages.value || page === props.page) return;
  emit('update:page', page);
}
</script>

<template>
  <div class="pager">
    <span>
      显示 {{ rangeStart }}–{{ rangeEnd }} 条，共 {{ total }} 条
    </span>
    <div class="pages">
      <span class="pg" @click="go(page - 1)">‹</span>
      <template v-for="(p, index) in pages" :key="`${p}-${index}`">
        <span v-if="p === '…'" class="pg ellipsis">…</span>
        <span v-else class="pg" :class="{ active: p === page }" @click="go(p)">{{ p }}</span>
      </template>
      <span class="pg" @click="go(page + 1)">›</span>
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--ink-3);
}
.pager .pages {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.pager .pg {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  display: grid;
  place-items: center;
  font-size: 12.5px;
  cursor: pointer;
  color: var(--ink-2);
  background: var(--surface-2);
}
.pager .pg:hover:not(.active) {
  background: var(--wash);
}
.pager .pg.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}
.pager .pg.ellipsis {
  border-color: transparent;
  background: transparent;
  cursor: default;
}
</style>
