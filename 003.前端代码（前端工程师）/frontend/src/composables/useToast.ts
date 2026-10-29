import { reactive } from 'vue';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let seed = 0;

/** 全局消息队列，由 <ToastHost /> 渲染 */
export const toasts = reactive<ToastItem[]>([]);

function push(message: string, type: ToastType): void {
  const id = ++seed;
  toasts.push({ id, message, type });
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index >= 0) toasts.splice(index, 1);
  }, 2800);
}

/** 轻量全局提示：成功 / 错误 */
export function toast(message: string, type: ToastType = 'success'): void {
  push(message, type);
}

export function useToast() {
  return { toast, toasts };
}
