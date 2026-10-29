<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { inboundApi, type InboundQuery } from '@/api';
import BasePagination from '@/components/BasePagination.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatDateTime, formatMoney, formatQty } from '@/utils/format';
import type { Inbound } from '@/types';

const list = ref<Inbound[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const loading = ref(false);

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const query: InboundQuery = {
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value ? `${dateTo.value}T23:59:59` : undefined,
    };
    const result = await inboundApi.list(query);
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
  dateFrom.value = '';
  dateTo.value = '';
  applyFilter();
}

onMounted(loadList);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>入库记录</h1>
        <div class="sub">全部历史入库流水，按时间倒序；记录不可编辑、不可删除</div>
      </div>
      <div class="page-actions">
        <RouterLink class="btn primary" :to="{ name: 'inbound-create' }">＋ 新增入库</RouterLink>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="input search"
          placeholder="拼音码 / 品名 / 订单编号"
          @keyup.enter="applyFilter"
        />
        <input v-model="dateFrom" class="input" type="date" @change="applyFilter" />
        <span style="color: var(--ink-3)">至</span>
        <input v-model="dateTo" class="input" type="date" @change="applyFilter" />
        <button class="btn sm" @click="applyFilter">查询</button>
        <button class="btn sm" @click="resetFilters">重置</button>
        <div class="right"><span class="badge warn">记录一经写入不可修改</span></div>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width: 150px">入库时间</th>
              <th style="width: 96px">拼音码</th>
              <th>品名</th>
              <th class="num" style="width: 80px">数量</th>
              <th style="width: 70px">单位</th>
              <th class="num" style="width: 96px">单价</th>
              <th class="num" style="width: 110px">金额</th>
              <th style="width: 180px">订单编号</th>
              <th style="width: 100px">平台</th>
              <th style="width: 90px">操作人</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody v-if="list.length">
            <tr v-for="row in list" :key="row.id">
              <td class="muted">{{ formatDateTime(row.createdAt) }}</td>
              <td><span class="mono" style="color: var(--ink-2)">{{ row.item?.pinyin?.split(',')[0] ?? '—' }}</span></td>
              <td class="strong">{{ row.itemName }}</td>
              <td class="num strong">{{ formatQty(row.qty) }}</td>
              <td class="muted">{{ row.unitSnapshot }}</td>
              <td class="num">{{ formatMoney(row.unitPrice) }}</td>
              <td class="num strong">{{ formatMoney(row.amount) }}</td>
              <td><span class="mono">{{ row.orderNo }}</span></td>
              <td><span class="badge">{{ row.platformSnapshot }}</span></td>
              <td>{{ row.user?.realName ?? '—' }}</td>
              <td class="muted">{{ row.remark ?? '—' }}</td>
            </tr>
          </tbody>
        </table>

        <EmptyState
          v-if="!loading && list.length === 0"
          title="没有匹配的入库记录"
          description="换个关键词或时间区间试试"
        >
          <RouterLink class="btn primary" :to="{ name: 'inbound-create' }">去录入一笔</RouterLink>
        </EmptyState>
      </div>

      <BasePagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="loadList" />
    </div>
  </div>
</template>

<style scoped>
.toolbar .search {
  width: 240px;
}
.toolbar input[type='date'] {
  width: 150px;
}
</style>
