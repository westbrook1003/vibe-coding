<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { outboundApi, receiverApi, type OutboundQuery } from '@/api';
import BasePagination from '@/components/BasePagination.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatDateTime, formatMoney, formatQty } from '@/utils/format';
import type { Outbound, Receiver } from '@/types';

const list = ref<Outbound[]>([]);
const receivers = ref<Receiver[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const receiverId = ref<number | ''>('');
const dateFrom = ref('');
const dateTo = ref('');
const loading = ref(false);

async function loadReceivers(): Promise<void> {
  receivers.value = await receiverApi.active();
}

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const query: OutboundQuery = {
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      receiverId: receiverId.value === '' ? undefined : Number(receiverId.value),
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value ? `${dateTo.value}T23:59:59` : undefined,
    };
    const result = await outboundApi.list(query);
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
  receiverId.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  applyFilter();
}

onMounted(async () => {
  await Promise.all([loadReceivers(), loadList()]);
});
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>出库记录</h1>
        <div class="sub">物资去向逐笔可查；出库对象为自由定义的名称</div>
      </div>
      <div class="page-actions">
        <RouterLink class="btn primary" :to="{ name: 'outbound-create' }">＋ 新增出库</RouterLink>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="input search"
          placeholder="拼音码 / 品名 / 出库对象"
          @keyup.enter="applyFilter"
        />
        <select v-model="receiverId" class="select" @change="applyFilter">
          <option value="">全部出库对象</option>
          <option v-for="row in receivers" :key="row.id" :value="row.id">{{ row.name }}</option>
        </select>
        <input v-model="dateFrom" class="input" type="date" @change="applyFilter" />
        <span style="color: var(--ink-3)">至</span>
        <input v-model="dateTo" class="input" type="date" @change="applyFilter" />
        <button class="btn sm" @click="applyFilter">查询</button>
        <button class="btn sm" @click="resetFilters">重置</button>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width: 150px">出库时间</th>
              <th style="width: 96px">拼音码</th>
              <th>品名</th>
              <th class="num" style="width: 80px">数量</th>
              <th style="width: 70px">单位</th>
              <th class="num" style="width: 96px">单价</th>
              <th class="num" style="width: 110px">金额</th>
              <th style="width: 150px">出库到</th>
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
              <td><span class="badge info">{{ row.receiverName }}</span></td>
              <td>{{ row.user?.realName ?? '—' }}</td>
              <td class="muted">{{ row.remark ?? '—' }}</td>
            </tr>
          </tbody>
        </table>

        <EmptyState
          v-if="!loading && list.length === 0"
          title="没有匹配的出库记录"
          description="换个关键词或时间区间试试"
        >
          <RouterLink class="btn primary" :to="{ name: 'outbound-create' }">去录入一笔</RouterLink>
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
