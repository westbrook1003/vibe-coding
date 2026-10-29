/** 用户名：3~20 位字母、数字、下划线 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/** 密码：6~20 位，至少包含字母和数字 */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[\S]{6,20}$/;

/** 拼音码：小写字母与数字，多个码用逗号分隔 */
export const PINYIN_PATTERN = /^[a-z0-9][a-z0-9,\s]*$/;

export function validateUsername(value: string): string | null {
  if (!value) return '请输入用户名';
  if (!USERNAME_PATTERN.test(value)) return '用户名需为 3~20 位字母、数字或下划线';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return '请输入密码';
  if (!PASSWORD_PATTERN.test(value)) return '密码需 6~20 位，且至少包含字母和数字';
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '邮箱格式不正确';
  return null;
}

export function validatePinyin(value: string): string | null {
  if (!value) return '请填写拼音码';
  if (!PINYIN_PATTERN.test(value)) return '拼音码只能包含小写字母、数字，多个码用逗号分隔';
  return null;
}

export function validateQty(value: number | string): string | null {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) {
    return '请填写数量';
  }
  if (num <= 0) return '数量必须大于 0';
  if (num > 9999999) return '数量超出范围';
  return null;
}
