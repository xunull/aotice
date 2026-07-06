// 语言检测 + 消息渲染。
// 检测信号是系统 locale(LANG/LC_*),不是地理定位、不是国籍——零网络、零上传,
// 符合工具"100% 本地"的承诺,测的正是用户系统真正设定的语言。
import { MESSAGES } from './messages.js';

// 优先级(高→低):--lang 显式 > AOTICE_LANG 环境 > LC_ALL > LC_MESSAGES > LANG > 默认 en。
// locale 以 zh 开头(zh / zh_CN / zh_CN.UTF-8 / zh-Hans …)→ 'zh',其余(含 C/POSIX/空)→ 'en'。
export function detectLang({ override, env = {} } = {}) {
  const s = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const raw = s(override) || s(env.AOTICE_LANG) || s(env.LC_ALL) || s(env.LC_MESSAGES) || s(env.LANG) || 'en';
  return /^zh/i.test(raw) ? 'zh' : 'en';
}

// 查表渲染。缺 key → 返回 key 字面量(可见的漏翻标记);缺某语言 → 回落 en。
export function t(lang, key, ...args) {
  const entry = MESSAGES[key];
  if (!entry) return key;
  const v = entry[lang] ?? entry.en;
  return typeof v === 'function' ? v(...args) : v;
}

// 绑定语言,给渲染层用:const _ = translator(lang); _('projectHeader', name)
export function translator(lang) {
  return (key, ...args) => t(lang, key, ...args);
}
