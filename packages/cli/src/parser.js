// 解析 Claude Code 的 ~/.claude/projects/**/*.jsonl 会话记录。
//
// 设计约束(可审计):本解析器**只**读取 usage / compactMetadata / 路由元数据,
// **从不**读取 message.content 正文。数据需求本就如此,升格为硬约束与卖点。
//
// 流水线:发现文件(mtime 预过滤)→ 流式逐行(坏行跳过并计数)→ 抽取 usage 轮次
//        → 按 (msgId, requestId) 去重保留最后 → 隔离 sidechain → 按 compaction/
//        session/负差分分段 → 按 project 归组。
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, basename, dirname } from 'node:path';
import { homedir } from 'node:os';

export function defaultRoot() {
  return join(homedir(), '.claude', 'projects');
}

// 从一条 JSONL 记录抽取轮次(仅 usage/元数据,不碰正文)。
// 返回 turn | { compaction: {...} } | null。
function extractRecord(obj) {
  // 压缩事件:isCompactSummary 或带 compactMetadata
  if (obj && (obj.isCompactSummary === true || obj.compactMetadata)) {
    const pre = obj.compactMetadata?.preTokens ?? null;
    const trigger = obj.compactMetadata?.trigger ?? null; // 'auto' | 'manual' | null
    return { kind: 'compaction', preTokens: pre, trigger, ts: tsMs(obj.timestamp) };
  }
  // 只关心带 usage 的 assistant 轮次
  if (!obj || obj.type !== 'assistant') return null;
  const u = obj.message?.usage;
  if (!u) return null;

  const cacheRead = u.cache_read_input_tokens || 0;
  const cacheCreation = u.cache_creation_input_tokens || 0;
  let w1h = u.cache_creation?.ephemeral_1h_input_tokens;
  let w5 = u.cache_creation?.ephemeral_5m_input_tokens;
  if (w1h == null && w5 == null) {
    // 旧格式无 TTL 细分:全部按 5m 处理
    w5 = cacheCreation;
    w1h = 0;
  } else {
    w1h = w1h || 0;
    w5 = w5 || 0;
  }
  const input = u.input_tokens || 0;
  const output = u.output_tokens || 0;
  const promptTotal = input + cacheRead + cacheCreation;

  return {
    kind: 'turn',
    ts: tsMs(obj.timestamp),
    model: obj.message?.model || null,
    sessionId: obj.sessionId || null,
    isSidechain: obj.isSidechain === true,
    msgId: obj.message?.id || null,
    requestId: obj.requestId || null,
    input,
    cacheRead,
    cacheCreation,
    w5,
    w1h,
    output,
    promptTotal,
  };
}

function tsMs(ts) {
  if (!ts) return 0;
  const t = Date.parse(ts);
  return Number.isNaN(t) ? 0 : t;
}

// 流式解析单个文件 → { turns, compactions, badLines }
async function parseFile(path, skipped) {
  const dedup = new Map(); // key -> {turn, order}
  const compactions = [];
  let order = 0;
  let badLines = 0;

  let rl;
  try {
    rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  } catch {
    skipped.filesUnreadable++;
    return { turns: [], compactions: [] };
  }

  try {
    for await (const line of rl) {
      if (!line || !line.trim()) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        badLines++; // 写了一半的行 / 损坏行:跳过并计数
        continue;
      }
      const rec = extractRecord(obj);
      if (!rec) continue;
      if (rec.kind === 'compaction') {
        compactions.push({ preTokens: rec.preTokens, trigger: rec.trigger, ts: rec.ts, order: order++ });
        continue;
      }
      if (rec.isSidechain) continue; // sidechain 属独立时间线,主线不计入 g 拟合
      const key = `${rec.msgId || 'nil'}|${rec.requestId || 'nil'}|${order}`;
      const dkey = `${rec.msgId || 'nil'}|${rec.requestId || 'nil'}`;
      if (rec.msgId || rec.requestId) {
        // 有稳定键:去重保留最后
        const prev = dedup.get(dkey);
        dedup.set(dkey, { turn: rec, order: prev ? prev.order : order++ });
      } else {
        dedup.set(key, { turn: rec, order: order++ });
      }
    }
  } catch {
    skipped.filesUnreadable++;
    return { turns: [], compactions: [] };
  }

  skipped.badLines += badLines;
  const turns = [...dedup.values()]
    .sort((a, b) => a.turn.ts - b.turn.ts || a.order - b.order)
    .map((e) => e.turn);
  // compaction 事件按 order 融合进时间线(用 order 近似位置)
  return { turns, compactions: compactions.sort((a, b) => a.ts - b.ts || a.order - b.order) };
}

// 把一个 session 的 turns 切成干净段。边界:段首、压缩后、负差分(/clear、重开)。
// 上下文分段只看有实质上下文的轮:0-token 轮(input=read=creation=0,常为过渡/续接)
// 不携带上下文信息,会污染分段与 S/g 拟合,故此处排除(其成本在 analyze 中仍全计)。
const CTX_MIN = 100;
function segmentize(turns, compactions) {
  const ctxTurns = turns.filter((t) => t.promptTotal >= CTX_MIN);
  const segments = [];
  let cur = [];
  let afterCompaction = false;
  let prevTotal = null;

  // 某轮 promptTotal 骤降(< 上一轮的一半且绝对降幅大)即视为压缩/清空 → 段边界
  for (let i = 0; i < ctxTurns.length; i++) {
    const t = ctxTurns[i];
    const drop = prevTotal != null && t.promptTotal < prevTotal * 0.5 && prevTotal - t.promptTotal > 20000;
    if (drop && cur.length) {
      segments.push({ turns: cur, afterCompaction });
      cur = [];
      afterCompaction = true; // 新段紧跟一次上下文重置
    }
    cur.push(t);
    prevTotal = t.promptTotal;
  }
  if (cur.length) segments.push({ turns: cur, afterCompaction });
  return segments;
}

async function discoverFiles(root, paths, sinceMs, skipped) {
  const files = [];
  const candidates = [];

  if (paths && paths.length) {
    for (const p of paths) {
      try {
        const st = await stat(p);
        if (st.isDirectory()) {
          for (const f of await readdir(p)) if (f.endsWith('.jsonl')) candidates.push(join(p, f));
        } else if (p.endsWith('.jsonl')) {
          candidates.push(p);
        }
      } catch {
        skipped.filesUnreadable++;
      }
    }
  } else {
    let projDirs = [];
    try {
      const entries = await readdir(root, { withFileTypes: true });
      projDirs = entries.filter((e) => e.isDirectory()).map((e) => join(root, e.name));
    } catch {
      return files; // 根目录不存在 → 空(调用方给"数据不足"报告)
    }
    for (const d of projDirs) {
      try {
        for (const f of await readdir(d)) if (f.endsWith('.jsonl')) candidates.push(join(d, f));
      } catch {
        skipped.filesUnreadable++;
      }
    }
  }

  for (const f of candidates) {
    skipped.filesScanned++;
    try {
      const st = await stat(f);
      if (sinceMs && st.mtimeMs < sinceMs) {
        skipped.filesSkippedMtime++; // mtime 早于窗口起点 → 整文件跳过(mtime 只增不减,安全)
        continue;
      }
      files.push(f);
    } catch {
      skipped.filesUnreadable++;
    }
  }
  return files;
}

/**
 * @param {object} opts
 * @param {string} [opts.root]      默认 ~/.claude/projects
 * @param {string[]} [opts.paths]   显式文件/目录(覆盖 root 扫描)
 * @param {number} [opts.sinceMs]   只读 mtime ≥ 此时间戳的文件
 * @param {boolean} [opts.dryRun]   只返回将读取的文件清单,不解析
 */
export async function parseTranscripts(opts = {}) {
  const root = opts.root || defaultRoot();
  const skipped = { filesScanned: 0, filesSkippedMtime: 0, filesUnreadable: 0, badLines: 0 };
  const files = await discoverFiles(root, opts.paths, opts.sinceMs, skipped);

  if (opts.dryRun) {
    return { dryRun: true, files, skipped };
  }

  const projects = new Map(); // name -> { name, turns, segments, compactions, models }
  for (const f of files) {
    const name = basename(dirname(f));
    const { turns, compactions } = await parseFile(f, skipped);
    if (!turns.length && !compactions.length) continue;
    if (!projects.has(name)) {
      projects.set(name, { name, turns: [], segments: [], compactions: [], models: {} });
    }
    const proj = projects.get(name);
    proj.turns.push(...turns);
    proj.compactions.push(...compactions);
    for (const seg of segmentize(turns, compactions)) proj.segments.push(seg);
    for (const t of turns) if (t.model) proj.models[t.model] = (proj.models[t.model] || 0) + t.promptTotal;
  }

  return { projects: [...projects.values()], skipped };
}

// 主模型 = 该 project 内 token 占比最大的模型 id
export function dominantModel(models) {
  let best = null;
  let max = -1;
  for (const [id, tok] of Object.entries(models)) {
    if (tok > max) {
      max = tok;
      best = id;
    }
  }
  return best;
}
