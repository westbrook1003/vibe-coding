import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { toast } from '@/composables/useToast';

export const TOKEN_KEY = 'material-system-token';

/** 业务错误：携带后端返回的业务码与文案 */
export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

/* ---------------- 请求拦截：注入 token ---------------- */
service.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- 响应拦截：拆包 + 统一错误处理 ---------------- */
service.interceptors.response.use(
  (response) => {
    const body = response.data as { code?: number; message?: string; data?: unknown };

    // 后端返回 { code, message, data }，这里把 data 拆出来给调用方
    if (body && typeof body.code === 'number') {
      if (body.code !== 0) {
        throw new ApiError(body.code, body.message ?? '操作失败', response.status);
      }
      return body.data;
    }
    return response.data;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const body = error.response?.data as { code?: number; message?: string } | undefined;

    if (status === 401) {
      // 登录态失效：清 token 并跳登录页
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return Promise.reject(new ApiError(body?.code ?? 40101, body?.message ?? '登录已失效', status));
    }

    const message =
      body?.message ??
      (status === 403
        ? '无权限访问该功能'
        : status === 404
          ? '请求的资源不存在'
          : error.code === 'ECONNABORTED'
            ? '请求超时，请检查后端服务是否已启动'
            : '网络异常，请稍后重试');

    return Promise.reject(new ApiError(body?.code ?? 50001, message, status));
  },
);

/** 请求选项：silent = true 时不弹全局错误提示，由调用方自行处理 */
export interface RequestOptions extends AxiosRequestConfig {
  silent?: boolean;
}

async function handle<T>(promise: Promise<unknown>, silent?: boolean): Promise<T> {
  try {
    return (await promise) as T;
  } catch (error) {
    if (!silent && error instanceof ApiError) {
      toast(error.message, 'error');
    }
    throw error;
  }
}

export const http = {
  get<T>(url: string, params?: object, options: RequestOptions = {}): Promise<T> {
    const { silent, ...rest } = options;
    return handle<T>(service.get(url, { params, ...rest }), silent);
  },
  post<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { silent, ...rest } = options;
    return handle<T>(service.post(url, data, rest), silent);
  },
  patch<T>(url: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { silent, ...rest } = options;
    return handle<T>(service.patch(url, data, rest), silent);
  },
  delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { silent, ...rest } = options;
    return handle<T>(service.delete(url, rest), silent);
  },
};
