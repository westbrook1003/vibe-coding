<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { inboundApi, itemApi } from '@/api';
import PinyinPicker from '@/components/PinyinPicker.vue';
import FormField from '@/components/FormField.vue';
import { toast } from '@/composables/useToast';
import { formatDateTime, formatMoney } from '@/utils/format';
import { validateQty } from '@/utils/validate';
import type { Item } from '@/types';

const router = useRouter();

const pinyin = ref('');
const selected = ref<Item | null>(null);
const qty = ref<number | null>(null);
const orderNo = ref('');
const remark = ref('');
const submitting = ref(false);
const errors = ref<Record<string, string>>({});

const recent = ref<Item[]>([]);

const amount = computed(() => {
  if (!selected.value || qty.value === null) return '¥0.00';
  return formatMoney(Number(qty.value) * selected.value.price);
});

async function loadRecent(): Promise<void> {
  const result = await itemApi.list({ page: 1, pageSize: 6, sortBy: 'lastMovedAt' });
  recent.value = result.list;
}

function onNotFound(q: string): void {
  toast(`未找到「${q}」，请先在物资档案中建档`, 'error');
}

async function submit(keepOpen: boolean): Promise<void> {
  const next: Record<string, string> = {};
  if (!selected.value) next.pinyin = '请通过拼音码选择物资';
  const qtyError = validateQty(qty.value ?? '');
  if (qtyError) next.qty = qtyError;
  if (!orderNo.value.trim()) next.orderNo = '请填写订单编号';

  errors.value = next;
  if (Object.keys(next).length) return;

  submitting.value = true;
  try {
    await inboundApi.create({
      pinyin: pinyin.value.trim(),
      qty: Number(qty.value),
      orderNo: orderNo.value.trim(),
      remark: remark.value.trim() || undefined,
    });
    toast(`入库成功：${selected.value?.name} ×${qty.value}`);
    await loadRecent();

    if (keepOpen) {
      pinyin.value = '';
      selected.value = null;
      qty.value = null;
      orderNo.value = '';
      remark.value = '';
      errors.value = {};
    } else {
      router.push({ name: 'inbound-list' });
    }
  } catch {
    /* 错误提示已由请求层统一弹出 */
  } finally {
    submitting.value = false;
  }
}

onMounted(loadRecent);
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>物资入库</h1>
        <div class="sub">输入拼音码定位物资，填写数量与订单编号即可完成一次入库</div>
      </div>
      <div class="page-actions">
        <RouterLink class="btn" :to="{ name: 'inbound-list' }">查看入库记录</RouterLink>
      </div>
    </div>

    <div class="layout">
      <!-- 录入表单 -->
      <div class="card">
        <div class="card-head">
          <h3>新增入库</h3>
          <div class="right"><span class="sub">操作人：当前登录用户</span></div>
        </div>
        <div class="card-body">
          <FormField label="拼音码" required :error="errors.pinyin" hint="↑ ↓ 选择 · Enter 选中 · 支持多码，如 wsm,sb">
            <PinyinPicker
              v-model="pinyin"
              v-model:item="selected"
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
            <span>选中物资后，这里会显示单位、零售价、购买平台与当前结存，无需重复输入。</span>
          </div>

          <div class="field-row">
            <FormField label="数量" required :error="errors.qty" hint="支持小数，最多 3 位">
              <input v-model.number="qty" class="input" type="number" min="0" step="0.001" placeholder="0" />
            </FormField>

            <FormField label="订单编号" required :error="errors.orderNo" hint="可重复（同一订单分批到货）">
              <input v-model="orderNo" class="input mono" placeholder="如 20261026T12345" />
            </FormField>
          </div>

          <FormField label="入库金额" hint="= 数量 × 零售价（只读）">
            <input class="input" :value="amount" readonly />
          </FormField>

          <FormField label="备注" hint="选填，≤100 字">
            <input v-model="remark" class="input" placeholder="选填" />
          </FormField>

          <div class="actions">
            <button class="btn primary lg" :disabled="submitting" @click="submit(false)">
              提交本条 <span class="k">Ctrl+Enter</span>
            </button>
            <button class="btn lg" :disabled="submitting" @click="submit(true)">
              提交并继续录入下一条
            </button>
            <RouterLink class="btn ghost lg" :to="{ name: 'dashboard' }" style="margin-left: auto">取消</RouterLink>
          </div>
        </div>
      </div>

      <!-- 辅助信息 -->
      <div class="side">
        <div class="card">
          <div class="card-head"><h3>录入说明</h3></div>
          <div class="card-body steps">
            <div class="step"><span class="n">1</span><span>输入<b>拼音码</b>，唯一匹配时自动选中</span></div>
            <div class="step"><span class="n">2</span><span>核对带出的<b>品名 / 单位 / 零售价 / 平台</b></span></div>
            <div class="step"><span class="n">3</span><span>填写<b>数量</b>与<b>订单编号</b>，回车提交</span></div>
            <div class="step"><span class="n">4</span><span>提交后表单清空，可<b>连续录入</b></span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>最近变动</h3>
            <div class="right"><RouterLink class="btn sm ghost" :to="{ name: 'inbound-list' }">全部</RouterLink></div>
          </div>
          <div class="card-body tight">
            <table class="tbl">
              <tbody>
                <tr v-for="row in recent" :key="row.id">
                  <td>
                    <b>{{ row.name }}</b><br />
                    <span class="muted" style="font-size: 12px">{{ formatDateTime(row.lastMovedAt) }}</span>
                  </td>
                  <td class="num strong">{{ row.stock }}</td>
                  <td class="num muted">{{ formatMoney(row.stockValue) }}</td>
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
          <span>入库记录<b>不可编辑、不可删除</b>，提交即计入结存。</span>
        </div>
      </div>
    </div>
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
.steps {
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.8;
}
.steps .step {
  display: flex;
  gap: 9px;
  margin-bottom: 9px;
}
.steps .step:last-child {
  margin-bottom: 0;
}
.steps .n {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: 50%;
  background: var(--accent-wash);
  color: var(--accent-strong);
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 650;
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
