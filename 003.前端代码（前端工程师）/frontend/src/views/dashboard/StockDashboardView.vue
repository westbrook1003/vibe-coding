<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { stockApi, type StockQuery } from '@/api';
import StatCard from '@/components/StatCard.vue';
import BasePagination from '@/components/BasePagination.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { Item, StockSummary } from '@/types';
import { formatDateTime, formatMoney, formatQty } from '@/utils/format';

const summary = ref<StockSummary | null>(null);
const list = ref<Item[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const platform = ref('');
const onlyInStock = ref(true);

const loading = ref(false);

const stockQuery = computed<StockQuery>(() => ({
  page: page.value,
  pageSize,
  keyword: keyword.value.trim() || undefined,
  platform: platform.value || undefined,
  onlyInStock: onlyInStock.value || undefined,
}));

async function loadSummary(): Promise<void> {
  summary.value = await stockApi.summary();
}

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const result = await stockApi.list(stockQuery.value);
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function applyFilter(): void {
  page.value = 1;
  void loadList();
}

function resetFilters(): void {
  keyword.value = '';
  platform.value = '';
  onlyInStock.value = true;
  applyFilter();
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadList()]);
});
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>库存总览</h1>
        <div class="sub">全部物资结存 · 结存 = 累计入库 − 累计出库</div>
      </div>
      <div class="page-actions">
        <RouterLink class="btn" :to="{ name: 'item-list' }">物资档案</RouterLink>
        <RouterLink class="btn" :to="{ name: 'outbound-create' }">物资出库</RouterLink>
        <RouterLink class="btn primary" :to="{ name: 'inbound-create' }">＋ 物资入库</RouterLink>
      </div>
    </div>

    <!-- KPI 行 -->
    <div class="stat-row">
      <StatCard
        label="在库物资"
        :value="summary?.itemCount ?? 0"
        unit="种"
        :note="`其中 ${summary?.zeroStockCount ?? 0} 种结存为 0`"
      />
      <StatCard
        label="库存总值"
        :value="formatMoney(summary?.totalValue ?? 0)"
        note="按当前零售价计算"
      />
      <StatCard
        label="本月入库"
        :value="formatMoney(summary?.monthInboundAmount ?? 0)"
        note="按业务日期归集"
      />
      <StatCard
        label="本月出库"
        :value="formatMoney(summary?.monthOutboundAmount ?? 0)"
        note="按业务日期归集"
      />
    </div>

    <!-- 快捷入口 -->
    <div class="quick-grid">
      <RouterLink class="quick" :to="{ name: 'inbound-create' }">
        <span class="qi in">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span class="qtext">
          <span class="qt">物资入库</span>
          <span class="qs">拼音码 → 数量 + 订单编号</span>
        </span>
        <span class="qk">I</span>
      </RouterLink>

      <RouterLink class="quick" :to="{ name: 'outbound-create' }">
        <span class="qi out">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M5 12h14" />
          </svg>
        </span>
        <span class="qtext">
          <span class="qt">物资出库</span>
          <span class="qs">拼音码 → 数量 + 出库到个人</span>
        </span>
        <span class="qk">O</span>
      </RouterLink>

      <RouterLink class="quick" :to="{ name: 'item-list' }">
        <span class="qi item">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
          </svg>
        </span>
        <span class="qtext">
          <span class="qt">物资档案</span>
          <span class="qs">品名 / 单位 / 零售价 / 平台 / 拼音码</span>
        </span>
        <span class="qk">N</span>
      </RouterLink>
    </div>

    <!-- 库存清单 -->
    <div class="card">
      <div class="card-head">
        <h3>库存清单</h3>
        <span class="sub">共 {{ total }} 条</span>
        <div class="right">
          <RouterLink class="btn sm" :to="{ name: 'inbound-list' }">全部入库记录</RouterLink>
          <RouterLink class="btn sm" :to="{ name: 'outbound-list' }">全部出库记录</RouterLink>
        </div>
      </div>

      <div class="toolbar">
        <input
          v-model="keyword"
          class="input search"
          placeholder="拼音码 / 品名"
          @keyup.enter="applyFilter"
        />
        <select v-model="platform" class="select" @change="applyFilter">
          <option value="">全部平台</option>
          <option>淘宝</option><option>天猫</option><option>京东</option>
          <option>拼多多</option><option>1688</option><option>线下</option>
        </select>
        <span class="chip" :class="{ on: onlyInStock }" @click="onlyInStock = !onlyInStock; applyFilter()">
          只看有结存
        </span>
        <button class="btn sm" @click="resetFilters">重置</button>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width: 100px">拼音码</th>
              <th>品名</th>
              <th style="width: 70px">单位</th>
              <th class="num" style="width: 90px">结存</th>
              <th class="num" style="width: 96px">零售价</th>
              <th class="num" style="width: 110px">库存金额</th>
              <th style="width: 100px">购买平台</th>
              <th style="width: 140px">最近变动</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody v-if="list.length">
            <tr v-for="row in list" :key="row.id">
              <td><span class="mono" style="color: var(--ink-2)">{{ row.pinyin.split(',')[0] }}</span></td>
              <td class="strong">{{ row.name }}</td>
              <td class="muted">{{ row.unit }}</td>
              <td class="num strong">{{ formatQty(row.stock) }}</td>
              <td class="num">{{ formatMoney(row.price) }}</td>
              <td class="num">{{ formatMoney(row.stockValue) }}</td>
              <td><span class="badge">{{ row.platform }}</span></td>
              <td class="muted">{{ formatDateTime(row.lastMovedAt) }}</td>
              <td>
                <div class="rowacts">
                  <RouterLink class="btn" :to="{ name: 'inbound-create' }">入库</RouterLink>
                  <RouterLink
                    class="btn"
                    :class="{ disabled: row.stock <= 0 }"
                    :to="row.stock > 0 ? { name: 'outbound-create' } : {}"
                    @click="row.stock <= 0 && $event.preventDefault()"
                  >
                    出库
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <EmptyState
          v-if="!loading && list.length === 0"
          title="没有匹配的物资"
          description="换个拼音码或品名试试"
        >
          <RouterLink class="btn" :to="{ name: 'item-list' }">去物资档案</RouterLink>
        </EmptyState>
      </div>

      <BasePagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="loadList" />
    </div>
  </div>
</template>

<style scoped>
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}
.quick {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  transition: border-color 0.14s ease, transform 0.1s ease, box-shadow 0.14s ease;
}
.quick:hover {
  border-color: var(--accent-line);
  transform: translateY(-1px);
  box-shadow: var(--shadow-2);
  text-decoration: none;
}
.quick .qi {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex: 0 0 38px;
  display: grid;
  place-items: center;
  color: #fff;
}
.qi.in {
  background: var(--tile-1);
}
.qi.out {
  background: var(--tile-2);
}
.qi.item {
  background: var(--tile-3);
}
.quick .qtext {
  display: block;
}
.quick .qt {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-1);
  display: block;
}
.quick .qs {
  font-size: 12px;
  color: var(--ink-3);
  display: block;
  margin-top: 1px;
}
.quick .qk {
  margin-left: auto;
  font-size: 11px;
  color: var(--ink-3);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 1px 5px;
}
.toolbar .search {
  width: 240px;
}

@media (max-width: 1100px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px) {
  .stat-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
