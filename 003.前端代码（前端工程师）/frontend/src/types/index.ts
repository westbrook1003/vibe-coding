/** 后端统一响应结构 */
export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

/** 分页响应结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页查询公共参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/* ---------------- 认证与用户 ---------------- */

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

export interface CurrentUser {
  id: number;
  username: string;
  realName: string;
  email: string | null;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface AuthResult {
  token: string;
  user: CurrentUser;
}

export interface User extends CurrentUser {
  status: UserStatus;
  loginFailCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  username: string;
  initialPassword: string;
  realName: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserPayload {
  realName?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

/* ---------------- 物资 ---------------- */

export type ItemStatus = 'active' | 'disabled';

export interface Item {
  id: number;
  name: string;
  unit: string;
  price: number;
  platform: string;
  pinyin: string;
  stock: number;
  totalInbound: number;
  totalOutbound: number;
  stockValue: number;
  lastMovedAt: string | null;
  status: ItemStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPayload {
  name: string;
  unit: string;
  price: number;
  platform: string;
  pinyin: string;
  remark?: string;
}

export type UpdateItemPayload = Partial<CreateItemPayload>;

/* ---------------- 出入库 ---------------- */

export interface Inbound {
  id: number;
  itemId: number;
  userId: number;
  qty: number;
  orderNo: string;
  itemName: string;
  unitSnapshot: string;
  unitPrice: number;
  amount: number;
  platformSnapshot: string;
  remark: string | null;
  createdAt: string;
  item?: Item;
  user?: Pick<CurrentUser, 'id' | 'username' | 'realName'>;
}

export interface CreateInboundPayload {
  pinyin: string;
  qty: number;
  orderNo: string;
  remark?: string;
}

export interface Outbound {
  id: number;
  itemId: number;
  userId: number;
  receiverId: number | null;
  qty: number;
  itemName: string;
  unitSnapshot: string;
  unitPrice: number;
  amount: number;
  receiverName: string;
  remark: string | null;
  createdAt: string;
  item?: Item;
  user?: Pick<CurrentUser, 'id' | 'username' | 'realName'>;
}

export interface CreateOutboundPayload {
  pinyin: string;
  qty: number;
  receiverName: string;
  remark?: string;
}

/* ---------------- 出库对象 ---------------- */

export type ReceiverStatus = 'active' | 'disabled';

export interface Receiver {
  id: number;
  name: string;
  remark: string | null;
  status: ReceiverStatus;
  outboundCount?: number;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- 库存 ---------------- */

export interface StockSummary {
  itemCount: number;
  totalValue: number;
  monthInboundAmount: number;
  monthOutboundAmount: number;
  zeroStockCount: number;
}
