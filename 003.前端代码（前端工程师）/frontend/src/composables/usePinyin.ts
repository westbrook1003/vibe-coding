/**
 * 拼音码生成。
 *
 * `pinyin-pro` 内置完整汉字字典，压缩后约 325KB，直接静态引入会让首屏包过大。
 * 这里改为**动态 import**，Vite 会把它拆成独立 chunk，仅在打开「新增物资」弹窗时按需下载。
 */

/** pinyin-pro 的函数签名（只声明我们用到的部分） */
type PinyinFn = (str: string, options: Record<string, unknown>) => string[];

let pinyinFn: PinyinFn | null = null;
let pending: Promise<void> | null = null;

/** 预加载拼音库。重复调用只会真正加载一次。 */
export function loadPinyin(): Promise<void> {
  if (pinyinFn) return Promise.resolve();
  if (!pending) {
    pending = import('pinyin-pro').then((mod) => {
      pinyinFn = mod.pinyin as unknown as PinyinFn;
    });
  }
  return pending;
}

/**
 * 生成品名的拼音简码。
 *
 * 规则见 PRD F2.3：
 * - 取每个汉字的声母字母，非汉字（数字/字母）原样保留；
 * - 例：无线鼠标 → wxsb，A4 纸 → a4z。
 *
 * @param name 品名
 * @returns 小写字母与数字组成的拼音码；拼音库尚未加载时返回空串
 */
export function toPinyinCode(name: string): string {
  if (!name) return '';
  if (!pinyinFn) {
    // 兜底：还没加载完就先触发加载，调用方通常会先 await loadPinyin()
    void loadPinyin();
    return '';
  }
  return pinyinFn(name, {
    pattern: 'first',
    toneType: 'none',
    type: 'array',
  })
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** 把多个拼音码拼成数据库存储格式：`wsm,sb` */
export function joinPinyin(codes: string[]): string {
  return codes
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)
    .join(',');
}

/** 拆分多个拼音码 */
export function splitPinyin(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,，\s]+/)
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
}
