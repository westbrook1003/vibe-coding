<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { receiverApi, type ReceiverQuery } from '@/api';
import BaseModal from '@/components/BaseModal.vue';
import BasePagination from '@/components/BasePagination.vue';
import FormField from '@/components/FormField.vue';
import EmptyState from '@/components/EmptyState.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { toast } from '@/composables/useToast';
import { formatDate } from '@/utils/format';
import type { Receiver } from '@/types';

const list = ref<Receiver[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const loading = ref(false);

const dialogVisible = ref(false);
const editing = ref<Receiver | null>(null);
const form = ref({ name: '', remark: '' });
const saving = ref(false);

const removeTarget = ref<Receiver | null>(null);
const removing = ref(false);

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const query: ReceiverQuery = {
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
    };
    const result = await receiverApi.list(query);
    list.value = result.list;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editing.value = null;
  form.value = { name: '', remark: '' };
  dialogVisible.value = true;
}

function openEdit(row: Receiver): void {
  editing.value = row;
  form.value = { name: row.name, remark: row.remark ?? '' };
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  if (!form.value.name.trim()) {
    toast('请填写名称', 'error');
    return;
  }
  saving.value = true;
  try {
    if (editing.value) {
      await receiverApi.update(editing.value.id, {
        name: form.value.name.trim(),
        remark: form.value.remark.trim() || undefined,
      });
      toast('出库对象已更新');
    } else {
      await receiverApi.create({
        name: form.value.name.trim(),
        remark: form.value.remark.trim() || undefined,
      });
      toast('出库对象已保存');
    }
    dialogVisible.value = false;
    await loadList();
  } catch {
    /* 错误提示已由请求层统一弹出 */
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: Receiver): Promise<void> {
  const next = row.status === 'active' ? 'disabled' : 'active';
  await receiverApi.update(row.id, { status: next });
  toast(next === 'active' ? '已启用' : '已停用');
  await loadList();
}

async function confirmRemove(): Promise<void> {
  if (!removeTarget.value) return;
  removing.value = true;
  try {
    await receiverApi.remove(removeTarget.value.id);
    toast('出库对象已删除');
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
        <h1>出库对象</h1>
        <div class="sub">物资发给了谁 —— 独立于系统账号的自由名称，可由任意登录用户维护</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" @click="openCreate">＋ 新增出库对象</button>
      </div>
    </div>

    <div class="banner" style="margin-bottom: 18px">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 17px">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span>
        出库对象是<b>你自己定义</b>的名字，可以是人名、部门、项目或班组，不要求对应系统账号。
        在出库页直接输入新名字提交后，会<b>自动加入本列表</b>，下次可直接选择。
      </span>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="input search"
          placeholder="名称 / 备注"
          @keyup.enter="loadList"
        />
        <button class="btn sm" @click="((page = 1), loadList())">查询</button>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width: 200px">名称</th>
              <th>备注</th>
              <th class="num" style="width: 110px">出库次数</th>
              <th style="width: 140px">创建时间</th>
              <th style="width: 90px">状态</th>
              <th style="width: 190px">操作</th>
            </tr>
          </thead>
          <tbody v-if="list.length">
            <tr v-for="row in list" :key="row.id">
              <td class="strong">{{ row.name }}</td>
              <td class="muted">{{ row.remark ?? '—' }}</td>
              <td class="num">{{ row.outboundCount ?? 0 }}</td>
              <td class="muted">{{ formatDate(row.createdAt) }}</td>
              <td>
                <span class="badge" :class="row.status === 'active' ? 'ok' : 'warn'">
                  <span class="dot" />{{ row.status === 'active' ? '启用' : '停用' }}
                </span>
              </td>
              <td>
                <div class="rowacts">
                  <button class="btn" @click="openEdit(row)">编辑</button>
                  <button class="btn" @click="toggleStatus(row)">
                    {{ row.status === 'active' ? '停用' : '启用' }}
                  </button>
                  <button
                    class="btn danger"
                    :disabled="(row.outboundCount ?? 0) > 0"
                    :title="(row.outboundCount ?? 0) > 0 ? '已有出库记录，不可删除' : '删除'"
                    @click="removeTarget = row"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <EmptyState
          v-if="!loading && list.length === 0"
          title="还没有出库对象"
          description="点右上角「新增出库对象」添加第一个人名或部门"
        >
          <button class="btn primary" @click="openCreate">新增出库对象</button>
        </EmptyState>
      </div>

      <BasePagination v-model:page="page" :page-size="pageSize" :total="total" @update:page="loadList" />
    </div>

    <BaseModal
      v-model="dialogVisible"
      :title="editing ? '编辑出库对象' : '新增出库对象'"
      :width="440"
    >
      <FormField label="名称" required hint="1~20 字符，不限于系统登录用户">
        <input v-model="form.name" class="input" placeholder="如：项目A施工组 / 张三" />
      </FormField>
      <FormField label="备注" hint="选填，如所属部门 / 项目 / 班组">
        <input v-model="form.remark" class="input" placeholder="选填" />
      </FormField>
      <template #footer>
        <button class="btn" :disabled="saving" @click="dialogVisible = false">取消</button>
        <button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog
      :model-value="Boolean(removeTarget)"
      title="删除出库对象"
      :message="`确定要删除「${removeTarget?.name}」吗？`"
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
