// 从解析出的 project 时间线拟合模型参数。逐参数标注 measured / assumed + 置信度。
//
// 参数口径表(与设计文档一致):
//   g        — 段内相邻轮 promptTotal 正差分的稳健中位数(排除段边界)
//   S        — 压缩后各段首轮 promptTotal 的中位数;无压缩事件 → 默认值(assumed)
//   cacheHit — Σcache_read / (Σcache_read + Σcache_creation)
//   ttl      — w1h vs w5 token 占比,取多数

const DEFAULT_S = 20000;
const G_CAP = 200000; // 单轮增长上限(超过视为未捕获的边界跳变)

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function confidence(n) {
  if (n > 50) return 'high';
  if (n >= 10) return 'medium';
  return 'low';
}

export function fitParams(project) {
  // g:段内相邻正差分
  const deltas = [];
  for (const seg of project.segments) {
    const ts = seg.turns;
    for (let i = 1; i < ts.length; i++) {
      const d = ts[i].promptTotal - ts[i - 1].promptTotal;
      if (d > 0 && d < G_CAP) deltas.push(d);
    }
  }
  const gVal = median(deltas);

  // S:压缩后段的"重建地板"= 该段前几轮里第一个有实质上下文的轮的 promptTotal。
  // (压缩后常有 0-token 的过渡轮,直接取首轮会把 S 拉到 0;跳过 < MIN_FLOOR 的轮)
  const MIN_FLOOR = 2000;
  const floors = [];
  for (const seg of project.segments) {
    if (!seg.afterCompaction) continue;
    const first = seg.turns.find((t) => t.promptTotal >= MIN_FLOOR);
    if (first) floors.push(first.promptTotal);
  }
  const sVal = median(floors);

  // cacheHit + ttl
  let sumRead = 0;
  let sumCreate = 0;
  let sumW1h = 0;
  let sumW5 = 0;
  for (const t of project.turns) {
    sumRead += t.cacheRead || 0;
    sumCreate += t.cacheCreation || 0;
    sumW1h += t.w1h || 0;
    sumW5 += t.w5 || 0;
  }
  const hit = sumRead + sumCreate > 0 ? sumRead / (sumRead + sumCreate) : null;
  const ttl = sumW1h > sumW5 ? '1h' : '5m';

  return {
    g:
      gVal != null
        ? { value: Math.round(gVal), source: 'measured', n: deltas.length, confidence: confidence(deltas.length) }
        : { value: 5000, source: 'assumed', n: 0, confidence: 'low' },
    S:
      sVal != null && sVal >= 2000
        ? { value: Math.round(sVal), source: 'measured', n: floors.length, confidence: confidence(floors.length) }
        : { value: DEFAULT_S, source: 'assumed', n: 0, confidence: 'low' },
    cacheHit: hit != null ? { value: hit, source: 'measured' } : { value: null, source: 'assumed' },
    ttl: { value: ttl, source: floors.length || deltas.length ? 'measured' : 'assumed' },
  };
}
