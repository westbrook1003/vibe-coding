/**
 * 拼音码工具。
 *
 * 规则见 PRD F2.3：
 * - 一个字段内可写多个码，用逗号或空格分隔，如 `wsm,sb`；
 * - 任一码都能检索到该物资；
 * - 匹配方式为前缀优先（输入 `ws` 可匹配 `wsm`）。
 */

/** 拆分并归一化多个拼音码 */
export function normalizePinyin(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[,，\s]+/)
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
}

/** 把多个码拼成数据库存储格式：`wsm,sb` */
export function joinPinyin(codes: string[]): string {
  return codes.join(',');
}

/** 校验拼音码格式：小写字母与数字 */
export const PINYIN_PATTERN = /^[a-z0-9][a-z0-9,\s]*$/;

/**
 * 判断某个物资是否命中检索词。
 * 优先级：码完全相等 > 码前缀匹配 > 品名包含。
 */
export function matchPinyin(itemPinyin: string, itemName: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const codes = normalizePinyin(itemPinyin);
  if (codes.includes(q)) return 3;
  if (codes.some((code) => code.startsWith(q))) return 2;
  if (itemName.toLowerCase().includes(q)) return 1;
  return 0;
}
