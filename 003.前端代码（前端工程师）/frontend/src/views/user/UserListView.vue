<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { userApi, type UserQuery } from '@/api';
import BaseModal from '@/components/BaseModal.vue';
import FormField from '@/components/FormField.vue';
import EmptyState from '@/components/EmptyState.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/composables/useToast';
import { formatDate } from '@/utils/format';
import { ROLE_LABEL, STATUS_LABEL } from '@/constants';
import { validateEmail, validatePassword, validateUsername } from '@/utils/validate';
import type { User, UserRole, UserStatus } from '@/types';

const auth = useAuthStore();

const list = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const role = ref<UserRole | ''>('');
const status = ref<UserStatus | ''>('');
const loading = ref(false);

const dialogVisible = ref(false);
const editing = ref<User | null>(null);
const form = ref({
  username: '',
  realName: '',
  initialPassword: 'wz123456',
  email: '',
  role: 'user' as UserRole,
  status: 'active' as UserStatus,
});
const errors = ref<Record<string, string>>({});
const saving = ref(false);

const resetTarget = ref<User | null>(null);
const newPassword = ref('wz123456');
const resetting = ref(false);

const removeTarget = ref<User | null>(null);
const removing = ref(false);

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const query: UserQuery = {
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      role: role.value || undefined,
      status: status.value || undefined,
    };
    const result = await userApi.list(query);
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
  form.value = {
    username: '',
    realName: '',
    initialPassword: 'wz123456',
    email: '',
    role: 'user',
    status: 'active',
  };
  errors.value = {};
  dialogVisible.value = true;
}

function openEdit(row: User): void {
  editing.value = row;
  form.value = {
    username: row.username,
    realName: row.realName,
    initialPassword: 'wz123456',
    email: row.email ?? '',
    role: row.role,
    status: row.status,
  };
  errors.value = {};
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  const next: Record<string, string> = {};
  if (!editing.value) {
    const usernameError = validateUsername(form.value.username);
    if (usernameError) next.username = usernameError;
    const passwordError = validatePassword(form.value.initialPassword);
    if (passwordError) next.initialPassword = passwordError;
  }
  if (!form.value.realName.trim()) next.realName = '请填写姓名';
  const emailError = validateEmail(form.value.email);
  if (emailError) next.email = emailError;

  errors.value = next;
  if (Object.keys(next).length) return;

  saving.value = true;
  try {
    if (editing.value) {
      await userApi.update(editing.value.id, {
        realName: form.value.realName.trim(),
        email: form.value.email.trim() || undefined,
        role: form.value.role,
        status: form.value.status,
      });
      toast('人员信息已更新');
    } else {
      await userApi.create({
        username: form.value.username.trim(),
        initialPassword: form.value.initialPassword,
        realName: form.value.realName.trim(),
        email: form.value.email.trim() || undefined,
        role: form.value.role,
        status: form.value.status,
      });
      toast('人员已创建，请把初始密码转告本人');
    }
    dialogVisible.value = false;
    await loadList();
  } catch (err) {
    errors.value.username = err instanceof Error ? err.message : '保存失败';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: User): Promise<void> {
  const next: UserStatus = row.status === 'active' ? 'disabled' : 'active';
  await userApi.updateStatus(row.id, next);
  toast(next === 'active' ? '账号已启用' : '账号已停用');
  await loadList();
}

async function confirmReset(): Promise<void> {
  if (!resetTarget.value) return;
  const passwordError = validatePassword(newPassword.value);
  if (passwordError) {
    toast(passwordError, 'error');
    return;
  }
  resetting.value = true;
  try {
    await userApi.resetPassword(resetTarget.value.id, newPassword.value);
    toast('密码已重置');
    resetTarget.value = null;
  } finally {
    resetting.value = false;
  }
}

async function confirmRemove(): Promise<void> {
  if (!removeTarget.value) return;
  removing.value = true;
  try {
    await userApi.remove(removeTarget.value.id);
    toast('人员已删除');
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
        <h1>人员信息</h1>
        <div class="sub">维护登录账号、角色与状态 —— 本模块仅管理员可见</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" @click="openCreate">＋ 新增人员</button>
      </div>
    </div>

    <div class="banner warn" style="margin-bottom: 18px">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 17px">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span><b>仅管理员可访问本页面。</b>普通用户登录后菜单中不显示「人员信息」入口，直接访问 URL 将返回无权限。</span>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="input search"
          placeholder="用户名 / 姓名 / 邮箱"
          @keyup.enter="applyFilter"
        />
        <select v-model="role" class="select" @change="applyFilter">
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="user">普通用户</option>
        </select>
        <select v-model="status" class="select" @change="applyFilter">
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="disabled">停用</option>
        </select>
        <button class="btn sm" @click="applyFilter">查询</button>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width: 150px">用户名</th>
              <th style="width: 120px">姓名</th>
              <th style="width: 130px">角色</th>
              <th style="width: 220px">邮箱</th>
              <th style="width: 90px">状态</th>
              <th style="width: 140px">创建时间</th>
              <th style="width: 250px">操作</th>
            </tr>
          </thead>
          <tbody v-if="list.length">
            <tr v-for="row in list" :key="row.id">
              <td><span class="mono" style="color: var(--ink-1); font-weight: 600">{{ row.username }}</span></td>
              <td class="strong">{{ row.realName }}</td>
              <td>
                <span class="badge" :class="row.role === 'admin' ? 'info' : ''">
                  {{ ROLE_LABEL[row.role] ?? row.role }}
                </span>
              </td>
              <td class="muted">{{ row.email ?? '—' }}</td>
              <td>
                <span class="badge" :class="row.status === 'active' ? 'ok' : 'warn'">
                  <span class="dot" />{{ STATUS_LABEL[row.status] ?? row.status }}
                </span>
              </td>
              <td class="muted">{{ formatDate(row.createdAt) }}</td>
              <td>
                <div class="rowacts">
                  <button class="btn" @click="((resetTarget = row), (newPassword = 'wz123456'))">重置密码</button>
                  <button class="btn" @click="openEdit(row)">编辑</button>
                  <button
                    class="btn"
                    :disabled="row.id === auth.user?.id"
                    :title="row.id === auth.user?.id ? '不能停用自己' : ''"
                    @click="toggleStatus(row)"
                  >
                    {{ row.status === 'active' ? '停用' : '启用' }}
                  </button>
                  <button
                    class="btn danger"
                    :disabled="row.id === auth.user?.id"
                    :title="row.id === auth.user?.id ? '不能删除自己' : '删除'"
                    @click="removeTarget = row"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <EmptyState v-if="!loading && list.length === 0" title="没有匹配的人员" description="换个关键词试试" />
      </div>

      <div class="pager"><span>共 {{ total }} 条</span></div>
    </div>

    <!-- 新增 / 编辑 -->
    <BaseModal v-model="dialogVisible" :title="editing ? '编辑人员' : '新增人员'" :width="520">
      <FormField label="用户名" required :error="errors.username" :hint="editing ? '用户名创建后不可修改' : '登录名，创建后不可修改'">
        <input v-model="form.username" class="input mono" :disabled="Boolean(editing)" placeholder="3~20 位，字母 / 数字 / 下划线" />
      </FormField>

      <FormField
        v-if="!editing"
        label="初始密码"
        required
        :error="errors.initialPassword"
        hint="6~20 位，至少含字母和数字；创建后由管理员转告本人，首次登录提示修改"
      >
        <input v-model="form.initialPassword" class="input" placeholder="初始密码" />
      </FormField>

      <FormField label="姓名" required :error="errors.realName">
        <input v-model="form.realName" class="input" placeholder="显示名，如 张三" />
      </FormField>

      <FormField label="邮箱" :error="errors.email" hint="绑定后该用户可自助找回密码">
        <input v-model="form.email" class="input" type="email" placeholder="选填" />
      </FormField>

      <div class="field-row">
        <FormField label="角色" required>
          <select v-model="form.role" class="select" :disabled="editing?.id === auth.user?.id">
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </FormField>
        <FormField label="状态" required>
          <select v-model="form.status" class="select" :disabled="editing?.id === auth.user?.id">
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </FormField>
      </div>

      <template #footer>
        <button class="btn" :disabled="saving" @click="dialogVisible = false">取消</button>
        <button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : editing ? '保存' : '创建' }}
        </button>
      </template>
    </BaseModal>

    <!-- 重置密码 -->
    <BaseModal :model-value="Boolean(resetTarget)" title="重置密码" :width="420" @update:model-value="resetTarget = null">
      <div class="banner warn" style="margin-bottom: 16px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 17px">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>重置后该用户的<b>旧密码立即失效</b>，所有已登录会话同时失效。</span>
      </div>
      <FormField label="新密码" required hint="6~20 位，至少含字母和数字">
        <input v-model="newPassword" class="input" placeholder="新密码" />
      </FormField>
      <template #footer>
        <button class="btn" :disabled="resetting" @click="resetTarget = null">取消</button>
        <button class="btn primary" :disabled="resetting" @click="confirmReset">
          {{ resetting ? '处理中…' : '确认重置' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog
      :model-value="Boolean(removeTarget)"
      title="删除人员"
      :message="`确定要删除「${removeTarget?.realName}」吗？此操作不可撤销。`"
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
.pager {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--ink-3);
}
</style>
