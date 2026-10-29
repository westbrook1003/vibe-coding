<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseModal from '@/components/BaseModal.vue';
import FormField from '@/components/FormField.vue';
import { itemApi } from '@/api';
import { PLATFORM_OPTIONS, UNIT_OPTIONS } from '@/constants';
import { toPinyinCode, loadPinyin } from '@/composables/usePinyin';
import { toast } from '@/composables/useToast';
import { validatePinyin } from '@/utils/validate';
import type { CreateItemPayload, Item } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  /** 传入则为编辑模式 */
  item?: Item | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  saved: [Item];
}>();

const form = ref({
  name: '',
  unit: '个',
  price: 0,
  platform: '淘宝',
  pinyin: '',
  remark: '',
});
const errors = ref<Record<string, string>>({});
const saving = ref(false);
const isEdit = computed(() => Boolean(props.item));

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return;
    // 预加载拼音库（325KB 独立 chunk），保证用户输入品名时能立刻生成拼音码
    await loadPinyin();
    errors.value = {};
    form.value = props.item
      ? {
          name: props.item.name,
          unit: props.item.unit,
          price: props.item.price,
          platform: props.item.platform,
          pinyin: props.item.pinyin,
          remark: props.item.remark ?? '',
        }
      : { name: '', unit: '个', price: 0, platform: '淘宝', pinyin: '', remark: '' };
  },
);

/** 品名变化 → 自动生成拼音码（用户手动改过之后不再覆盖） */
function onNameInput(): void {
  form.value.pinyin = toPinyinCode(form.value.name);
}

function regenerate(): void {
  form.value.pinyin = toPinyinCode(form.value.name);
}

async function handleSave(): Promise<void> {
  const next: Record<string, string> = {};
  if (!form.value.name.trim()) next.name = '请填写品名';
  if (!form.value.unit.trim()) next.unit = '请选择单位';
  if (form.value.price === null || Number.isNaN(Number(form.value.price)) || Number(form.value.price) < 0) {
    next.price = '请填写正确的零售价';
  }
  if (!form.value.platform.trim()) next.platform = '请选择购买平台';
  const pinyinError = validatePinyin(form.value.pinyin);
  if (pinyinError) next.pinyin = pinyinError;

  errors.value = next;
  if (Object.keys(next).length) return;

  saving.value = true;
  try {
    const payload: CreateItemPayload = {
      name: form.value.name.trim(),
      unit: form.value.unit.trim(),
      price: Number(form.value.price),
      platform: form.value.platform.trim(),
      pinyin: form.value.pinyin.trim().toLowerCase(),
      remark: form.value.remark.trim() || undefined,
    };
    const saved = props.item
      ? await itemApi.update(props.item.id, payload)
      : await itemApi.create(payload);
    toast(props.item ? '物资已更新' : '物资已保存');
    emit('saved', saved);
    emit('update:modelValue', false);
  } catch (err) {
    errors.value.name = err instanceof Error ? err.message : '保存失败';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="isEdit ? '编辑物资' : '新增物资'"
    :width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSave">
      <FormField label="品名" required :error="errors.name" hint="同名物资允许存在多条（如不同规格）">
        <input v-model="form.name" class="input" placeholder="如：无线鼠标" @input="onNameInput" />
      </FormField>

      <div class="field-row">
        <FormField label="单位" required :error="errors.unit">
          <select v-model="form.unit" class="select">
            <option v-for="unit in UNIT_OPTIONS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </FormField>

        <FormField label="零售价" required :error="errors.price" hint="用于计算入库金额">
          <input v-model.number="form.price" class="input" type="number" min="0" step="0.01" placeholder="0.00" />
        </FormField>
      </div>

      <FormField label="购买平台" required :error="errors.platform">
        <select v-model="form.platform" class="select">
          <option v-for="platform in PLATFORM_OPTIONS" :key="platform" :value="platform">
            {{ platform }}
          </option>
        </select>
      </FormField>

      <FormField
        label="品名拼音码"
        required
        :error="errors.pinyin"
        hint="录入品名后自动生成首字母简拼，可手动修改；多个码用逗号分隔，如 wsm,sb"
      >
        <div style="display: flex; gap: 8px">
          <input v-model="form.pinyin" class="input mono" placeholder="如 wsm" />
          <button class="btn" type="button" @click="regenerate">重新生成</button>
        </div>
      </FormField>

      <FormField label="备注" hint="选填，≤100 字">
        <textarea v-model="form.remark" class="textarea" placeholder="选填" />
      </FormField>
    </form>

    <template #footer>
      <button class="btn" :disabled="saving" @click="emit('update:modelValue', false)">取消</button>
      <button class="btn primary" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </template>
  </BaseModal>
</template>
