import { ValueTransformer } from 'typeorm';

/**
 * 金额 / 数量在数据库中统一用 DECIMAL 存储。
 * SQLite 会把 DECIMAL 读回为字符串，这里统一转成 number，避免前端拿到 "12.900" 这种脏值。
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) => {
    if (value === null || value === undefined) return null;
    return typeof value === 'number' ? value : Number(value);
  },
};

/** 数量：最多 3 位小数 */
export const quantityTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) => {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? null : n;
  },
};
