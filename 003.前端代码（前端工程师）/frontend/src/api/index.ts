import { http } from './request';
import type {
  AuthResult,
  CreateInboundPayload,
  CreateItemPayload,
  CreateOutboundPayload,
  CreateUserPayload,
  CurrentUser,
  Inbound,
  Item,
  Outbound,
  PageQuery,
  PageResult,
  Receiver,
  StockSummary,
  UpdateItemPayload,
  UpdateUserPayload,
  User,
  UserRole,
  UserStatus,
} from '@/types';

/* ==================== 认证 ==================== */

export const authApi = {
  login: (username: string, password: string) =>
    http.post<AuthResult>('/auth/login', { username, password }, { silent: true }),

  register: (payload: {
    username: string;
    password: string;
    realName: string;
    email?: string;
  }) => http.post<AuthResult>('/auth/register', payload, { silent: true }),

  requestPasswordReset: (usernameOrEmail: string) =>
    http.post<{ channel: 'email' | 'admin'; message: string }>(
      '/auth/forgot-password',
      { usernameOrEmail },
      { silent: true },
    ),

  resetPassword: (payload: { usernameOrEmail: string; code: string; newPassword: string }) =>
    http.post<{ ok: boolean }>('/auth/reset-password', payload, { silent: true }),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<{ ok: boolean }>('/auth/change-password', { currentPassword, newPassword }),

  me: () => http.get<CurrentUser>('/auth/me', undefined, { silent: true }),

  logout: () => http.post<{ ok: boolean }>('/auth/logout'),
};

/* ==================== 人员信息（仅 admin） ==================== */

export interface UserQuery extends PageQuery {
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
}

export const userApi = {
  list: (query: UserQuery) => http.get<PageResult<User>>('/users', query),
  detail: (id: number) => http.get<User>(`/users/${id}`),
  create: (payload: CreateUserPayload) => http.post<User>('/users', payload),
  update: (id: number, payload: UpdateUserPayload) => http.patch<User>(`/users/${id}`, payload),
  updateStatus: (id: number, status: UserStatus) =>
    http.post<User>(`/users/${id}/status`, { status }),
  resetPassword: (id: number, newPassword: string) =>
    http.post<{ ok: boolean }>(`/users/${id}/reset-password`, { newPassword }),
  remove: (id: number) => http.delete<void>(`/users/${id}`),
};

/* ==================== 物资档案 ==================== */

export interface ItemQuery extends PageQuery {
  keyword?: string;
  platform?: string;
  status?: 'active' | 'disabled';
}

export const itemApi = {
  list: (query: ItemQuery) => http.get<PageResult<Item>>('/items', query),
  platforms: () => http.get<string[]>('/items/platforms'),
  /** 拼音码联想检索 */
  search: (q: string, options: { limit?: number; onlyInStock?: boolean } = {}) =>
    http.get<Item[]>('/items/search', { q, ...options }),
  detail: (id: number) => http.get<Item>(`/items/${id}`),
  create: (payload: CreateItemPayload) => http.post<Item>('/items', payload),
  update: (id: number, payload: UpdateItemPayload) => http.patch<Item>(`/items/${id}`, payload),
  updateStatus: (id: number, status: 'active' | 'disabled') =>
    http.post<Item>(`/items/${id}/status`, { status }),
  remove: (id: number) => http.delete<void>(`/items/${id}`),
};

/* ==================== 入库 ==================== */

export interface InboundQuery extends PageQuery {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  operatorId?: number;
}

export const inboundApi = {
  create: (payload: CreateInboundPayload) => http.post<Inbound>('/inbounds', payload),
  list: (query: InboundQuery) => http.get<PageResult<Inbound>>('/inbounds', query),
  detail: (id: number) => http.get<Inbound>(`/inbounds/${id}`),
};

/* ==================== 出库 ==================== */

export interface OutboundQuery extends PageQuery {
  keyword?: string;
  receiverId?: number;
  operatorId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const outboundApi = {
  create: (payload: CreateOutboundPayload) => http.post<Outbound>('/outbounds', payload),
  list: (query: OutboundQuery) => http.get<PageResult<Outbound>>('/outbounds', query),
  detail: (id: number) => http.get<Outbound>(`/outbounds/${id}`),
};

/* ==================== 出库对象 ==================== */

export interface ReceiverQuery extends PageQuery {
  keyword?: string;
  status?: 'active' | 'disabled';
}

export const receiverApi = {
  list: (query: ReceiverQuery) => http.get<PageResult<Receiver>>('/receivers', query),
  active: () => http.get<Receiver[]>('/receivers/active'),
  create: (payload: { name: string; remark?: string }) =>
    http.post<Receiver>('/receivers', payload),
  update: (
    id: number,
    payload: { name?: string; remark?: string; status?: 'active' | 'disabled' },
  ) => http.patch<Receiver>(`/receivers/${id}`, payload),
  remove: (id: number) => http.delete<void>(`/receivers/${id}`),
};

/* ==================== 库存 ==================== */

export interface StockQuery extends PageQuery {
  keyword?: string;
  platform?: string;
  onlyInStock?: boolean;
  onlyZero?: boolean;
}

export const stockApi = {
  list: (query: StockQuery) => http.get<PageResult<Item>>('/stock', query),
  summary: () => http.get<StockSummary>('/stock/summary'),
};
