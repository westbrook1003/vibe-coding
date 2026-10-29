<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { itemApi, type ItemQuery } from '@/api';
import BasePagination from '@/components/BasePagination.vue';
import EmptyState from '@/components/EmptyState.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ItemFormDialog from './ItemFormDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';
import { formatMoney, formatQty } from '@/utils/format';
import type { Item } from '@/types';

const auth = useAuthStore();

const list = ref<Item[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const platform = ref('');
const status = ref('');

const loading = ref(false);
const dialogVisible = ref(false);
const editing = ref<Item | null>(null);
const removeTarget = ref<Item | null>(null);
const removing = ref(false);

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const query: ItemQuery = {
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      platform: platform.value || undefined,
      status: (status.value || undefined) as ItemQuery['status'],
    };
    const result = await itemApi.list(query);
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

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(item: Item): void {
  editing.value = item;
  dialogVisible.value = true;
}

async function toggleStatus(item: Item): Promise<void> {
  const next = item.status === 'active' ? 'disabled' : 'active';
  await itemApi.updateStatus(item.id, next);
  toast(next === 'active' ? '物资已启用' : '物资已停用');
  await loadList();
}

async function confirmRemove(): Promise<void> {
  if (!removeTarget.value) return;
  removing.value = true;
  try {
    await itemApi.remove(removeTarget.value.id);
    toast('物资已删除');
    removeTarget.value = null;
    await loadList();
  } catch {
    /* 错误提示已由请求层统一弹出 */
  } finally {
    removing.value = false;
  }
}

onMounted(loadList);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>物资档案</h1>
        <div class="sub">维护品名、单位、零售价、购买平台与拼音码；入库出库时按拼音码直接带出</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" @click="openCreate">＋ 新增物资</button>
      </div>
    </div>

    <div class="card">
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
        <select v-model="status" class="select" @change="applyFilter">
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="disabled">停用</option>
        </select>
        <button class="btn sm" @click="applyFilter">查询</button>
        <div class="right">
          <span class="badge info">拼音码不校验唯一，重复时列表全部列出</span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width: 110px">拼音码</th>
              <th>品名</th>
              <th style="width: 80px">单位</th>
              <th class="num" style="width: 100px">零售价</th>
              <th style="width: 110px">购买平台</th>
              <th class="num" style="width: 90px">当前结存</th>
              <th style="width: 80px">状态</th>
              <th style="width: 240px">操作</th>
            </tr>
          </thead>
          <tbody v-if="list.length">
            <tr v-for="row in list" :key="row.id">
              <td><span class="mono" style="color: var(--ink-2)">{{ row.pinyin }}</span></td>
              <td class="strong">{{ row.name }}</td>
              <td class="muted">{{ row.unit }}</td>
              <td class="num">{{ formatMoney(row.price) }}</td>
              <td><span class="badge">{{ row.platform }}</span></td>
              <td class="num strong">{{ formatQty(row.stock) }}</td>
              <td>
                <span class="badge" :class="row.status === 'active' ? 'ok' : 'warn'">
                  <span class="dot" />{{ row.status === 'active' ? '启用' : '停用' }}
                </span>
              </td>
              <td>
                <div class="rowacts">
                  <button class="btn" @click="openEdit(row)">编辑</button>
                  <RouterLink class="btn" :to="{ name: 'inbound-create' }">入库</RouterLink>
                  <RouterLink
                    class="btn"
                    :class="{ disabled: row.stock <= 0 }"
                    :to="row.stock > 0 ? { name: 'outbound-create' } : {}"
                    @click="row.stock <= 0 && $event.preventDefault()"
                  >
                    出库
                  </RouterLink>
                  <button
                    v-if="auth.isAdmin"
                    class="btn danger"
                    :disabled="row.totalInbound > 0 || row.totalOutbound > 0"
                    :title="row.totalInbound > 0 || row.totalOutbound > 0 ? '已有出入库记录，不可删除' : '删除'"
                    @click="removeTarget = row"
                  >
                    删除
                  </button>
                  <button
                    v-if="auth.isAdmin"
                    class="btn"
                    @click="toggleStatus(row)"
                  >
                    {{ row.status === 'active' ? '停用' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <EmptyState
          v-if="!loading && list.length === 0"
          title="还没有物资"
          description="点右上角「新增物资」开始建立档案"
        >
          <button class="btn primary" @click="openCreate">新增物资</button>
        </EmptyState>
      </div>

      <BasePagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="loadList" />
    </div>

    <ItemFormDialog
      v-model="dialogVisible"
      :item="editing"
      @saved="loadList"
    />

    <ConfirmDialog
      :model-value="Boolean(removeTarget)"
      title="删除物资"
      :message="`确定要删除「${removeTarget?.name}」吗？此操作不可撤销。`"
      confirm-text="删除"
      danger
      :loading="removing"
      @update:model-value="removeTarget = null"
      @confirm="confirmRemove"
    />
  </div>
</template>

<style scoped>
.toolbar .search {
  width: 240px;
}
</style>
