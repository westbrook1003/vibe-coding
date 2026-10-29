<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { outboundApi, receiverApi } from '@/api';
import PinyinPicker from '@/components/PinyinPicker.vue';
import FormField from '@/components/FormField.vue';
import BaseModal from '@/components/BaseModal.vue';
import { toast } from '@/composables/useToast';
import { formatMoney } from '@/utils/format';
import { validateQty } from '@/utils/validate';
import type { Item, Receiver } from '@/types';

const router = useRouter();

const pinyin = ref('');
const selected = ref<Item | null>(null);
const qty = ref<number | null>(null);
const receiverName = ref('');
const remark = ref('');
const submitting = ref(false);
const errors = ref<Record<string, string>>({});
const receivers = ref<Receiver[]>([]);

const receiverModal = ref(false);
const newReceiverName = ref('');
const newReceiverRemark = ref('');

/** 出库数量不得超过当前结存（PRD G2 / R4.1） */
const overStock = computed(() => {
  if (!selected.value || qty.value === null) return 0;
  const exceed = Number(qty.value) - selected.value.stock;
  return exceed > 0 ? exceed : 0;
});

const canSubmit = computed(() => {
  if (!selected.value) return false;
  if (!qty.value || qty.value <= 0) return false;
  if (overStock.value > 0) return false;
  if (!receiverName.value.trim()) return false;
  return true;
});

const amount = computed(() => {
  if (!selected.value || qty.value === null) return '¥0.00';
  return formatMoney(Number(qty.value) * selected.value.price);
});

async function loadReceivers(): Promise<void> {
  receivers.value = await receiverApi.active();
}

function onNotFound(q: string): void {
  toast(`未找到「${q}」，或该物资已无结存`, 'error');
}

async function saveReceiver(): Promise<void> {
  const name = newReceiverName.value.trim();
  if (!name) {
    toast('请填写名称', 'error');
    return;
  }
  const created = await receiverApi.create({ name, remark: newReceiverRemark.value.trim() || undefined });
  await loadReceivers();
  receiverName.value = created.name;
  newReceiverName.value = '';
  newReceiverRemark.value = '';
  receiverModal.value = false;
  toast('已添加出库对象');
}

async function submit(keepOpen: boolean): Promise<void> {
  const next: Record<string, string> = {};
  const current = selected.value;
  if (!current) {
    next.pinyin = '请通过拼音码选择物资';
  } else {
    const qtyError = validateQty(qty.value ?? '');
    if (qtyError) {
      next.qty = qtyError;
    } else if (Number(qty.value) > current.stock) {
      next.qty = `当前结存为 ${current.stock}，本次出库 ${qty.value}，超出 ${Number(qty.value) - current.stock}`;
    }
  }
  if (!receiverName.value.trim()) next.receiverName = '请填写出库对象';

  errors.value = next;
  if (Object.keys(next).length) return;

  submitting.value = true;
  try {
    await outboundApi.create({
      pinyin: pinyin.value.trim(),
      qty: Number(qty.value),
      receiverName: receiverName.value.trim(),
      remark: remark.value.trim() || undefined,
    });
    toast(`出库成功：${selected.value?.name} ×${qty.value} → ${receiverName.value}`);
    await loadReceivers();

    if (keepOpen) {
      pinyin.value = '';
      selected.value = null;
      qty.value = null;
      receiverName.value = '';
      remark.value = '';
      errors.value = {};
    } else {
      router.push({ name: 'outbound-list' });
    }
  } catch {
    /* 错误提示已由请求层统一弹出 */
  } finally {
    submitting.value = false;
  }
}

onMounted(loadReceivers);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>物资出库</h1>
        <div class="sub">输入拼音码定位物资，填写数量与出库对象；出库数量不可超过当前结存</div>
      </div>
      <div class="page-actions">
        <RouterLink class="btn" :to="{ name: 'outbound-list' }">查看出库记录</RouterLink>
        <RouterLink class="btn" :to="{ name: 'receiver-list' }">出库对象管理</RouterLink>
      </div>
    </div>

    <div class="layout">
      <div class="card">
        <div class="card-head">
          <h3>新增出库</h3>
          <div class="right"><span class="sub">操作人：当前登录用户</span></div>
        </div>
        <div class="card-body">
          <FormField label="拼音码" required :error="errors.pinyin" hint="仅显示有结存的物资 · ↑ ↓ 选择 · Enter 选中">
            <PinyinPicker
              v-model="pinyin"
              v-model:item="selected"
              only-in-stock
              @not-found="onNotFound"
            />
          </FormField>

          <div v-if="selected" class="picked">
            <span class="pico">{{ selected.name.charAt(0) }}</span>
            <span class="pmain">
              <span class="pn">{{ selected.name }}</span>
              <span class="pp">
                单位 <b>{{ selected.unit }}</b> · 零售价 <b>{{ formatMoney(selected.price) }}</b> ·
                购买平台 <b>{{ selected.platform }}</b>
              </span>
            </span>
            <span class="pstock">
              <span class="pv">{{ selected.stock }}</span>
              <span class="pl">当前结存</span>
            </span>
          </div>
          <div v-else class="banner neutral" style="margin-bottom: 18px">
            <span>选中物资后，这里会显示当前结存，超出结存时提交按钮会自动置灰。</span>
          </div>

          <div class="field-row">
            <FormField
              label="数量"
              required
              :error="errors.qty"
              :hint="selected ? `最大可出 ${selected.stock}` : undefined"
            >
              <input
                v-model.number="qty"
                class="input"
                :class="{ error: overStock > 0 }"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
              />
            </FormField>

            <FormField label="出库到（个人）" required :error="errors.receiverName" hint="可直接输入新名字，提交后自动加入列表">
              <div style="display: flex; gap: 8px">
                <input
                  v-model="receiverName"
                  class="input"
                  list="receiver-options"
                  placeholder="选择或输入名字"
                />
                <datalist id="receiver-options">
                  <option v-for="row in receivers" :key="row.id" :value="row.name" />
                </datalist>
                <button class="btn" type="button" @click="receiverModal = true">＋</button>
              </div>
            </FormField>
          </div>

          <FormField label="出库金额" hint="= 数量 × 零售价（只读）">
            <input class="input" :value="amount" readonly />
          </FormField>

          <FormField label="备注" hint="选填，如：项目现场使用 / 借用">
            <input v-model="remark" class="input" placeholder="选填" />
          </FormField>

          <div class="actions">
            <button class="btn primary lg" :disabled="submitting || !canSubmit" @click="submit(false)">
              提交本条 <span class="k">Ctrl+Enter</span>
            </button>
            <button class="btn lg" :disabled="submitting || !canSubmit" @click="submit(true)">
              提交并继续录入下一条
            </button>
            <RouterLink class="btn ghost lg" :to="{ name: 'dashboard' }" style="margin-left: auto">取消</RouterLink>
          </div>
        </div>
      </div>

      <div class="side">
        <div class="card">
          <div class="card-head">
            <h3>出库对象</h3>
            <div class="right"><RouterLink class="btn sm ghost" :to="{ name: 'receiver-list' }">管理</RouterLink></div>
          </div>
          <div class="card-body tight">
            <table class="tbl">
              <tbody>
                <tr v-for="row in receivers.slice(0, 6)" :key="row.id">
                  <td>{{ row.name }}</td>
                  <td class="muted text-right">{{ row.remark ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="banner neutral">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 16px">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>出库对象<b>独立于系统账号</b>，可自由定义；出库记录同样<b>不可编辑、不可删除</b>。</span>
        </div>

        <div class="banner warn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="flex: 0 0 16px">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          <span><b>出库数量不可超过当前结存</b>，超出时提交按钮会置灰并提示超出数量。</span>
        </div>
      </div>
    </div>

    <BaseModal v-model="receiverModal" title="新增出库对象" :width="440">
      <FormField label="名称" required hint="1~20 字符，不限于系统登录用户">
        <input v-model="newReceiverName" class="input" placeholder="如：项目A施工组 / 张三" />
      </FormField>
      <FormField label="备注" hint="选填，如所属部门 / 项目 / 班组">
        <input v-model="newReceiverRemark" class="input" placeholder="选填" />
      </FormField>
      <template #footer>
        <button class="btn" @click="receiverModal = false">取消</button>
        <button class="btn primary" @click="saveReceiver">保存</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}
.side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.picked {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 15px;
  border-radius: var(--r);
  background: var(--accent-wash);
  border: 1px solid var(--accent-line);
  margin-bottom: 18px;
}
.picked .pico {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex: 0 0 38px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  color: var(--accent-strong);
  border: 1px solid var(--accent-line);
}
.picked .pmain {
  display: block;
}
.picked .pn {
  font-size: 14.5px;
  font-weight: 650;
  display: block;
}
.picked .pp {
  font-size: 12px;
  color: var(--ink-2);
  margin-top: 2px;
  display: block;
}
.picked .pstock {
  margin-left: auto;
  text-align: right;
}
.picked .pv {
  font-size: 20px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.picked .pl {
  font-size: 11.5px;
  color: var(--ink-3);
}
.actions {
  display: flex;
  gap: 9px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  flex-wrap: wrap;
}
@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
