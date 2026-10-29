<script setup lang="ts">
/** 指标卡：label + value + 可选说明与趋势缩略线（PRD 首页 KPI 行） */
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    unit?: string;
    note?: string;
    /** 12 点趋势线，值为 0~1 的相对高度 */
    trend?: number[];
  }>(),
  { unit: '', note: '', trend: undefined },
);

/** 把 0~1 的数组转成 SVG 折线路径 */
function buildPath(points: number[]): string {
  if (points.length < 2) return '';
  const width = 240;
  const height = 26;
  const step = width / (points.length - 1);
  return points
    .map((value, index) => {
      const x = index * step;
      const y = height - value * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function lastPoint(points: number[]): { x: number; y: number } {
  const width = 240;
  const height = 26;
  const x = width;
  const y = height - points[points.length - 1] * (height - 4) - 2;
  return { x, y };
}
</script>

<template>
  <div class="stat-tile">
    <div class="label">{{ label }}</div>
    <div class="value">
      {{ value }}<span v-if="unit" class="unit">{{ unit }}</span>
    </div>

    <div v-if="trend && trend.length > 1" class="spark">
      <svg viewBox="0 0 240 26" fill="none" aria-hidden="true">
        <path
          :d="buildPath(trend)"
          stroke="var(--spark)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          :cx="lastPoint(trend).x"
          :cy="lastPoint(trend).y"
          r="4"
          fill="var(--series-1)"
          stroke="var(--surface)"
          stroke-width="2"
        />
      </svg>
    </div>

    <div v-if="note" class="note">{{ note }}</div>
  </div>
</template>

<style scoped>
.stat-tile {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 15px 16px 13px;
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
  min-height: 108px;
}
.stat-tile .label {
  font-size: 12.5px;
  color: var(--ink-3);
  font-weight: 550;
}
.stat-tile .value {
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -0.02em;
  margin-top: 6px;
  line-height: 1.15;
  color: var(--ink-1);
}
.stat-tile .value .unit {
  font-size: 14px;
  font-weight: 550;
  color: var(--ink-3);
  margin-left: 3px;
}
.stat-tile .spark {
  margin-top: 10px;
}
.stat-tile .spark svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.stat-tile .note {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: auto;
  padding-top: 8px;
}
</style>
