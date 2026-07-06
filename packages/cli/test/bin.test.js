// 回归:npx/npm 经符号链接(.bin/aotice → cli 入口)执行 bin。
// 曾经用 `import.meta.url === file://argv[1]` 做入口守卫,经符号链接时
// import.meta.url 解析成真实路径、argv[1] 是符号链接路径 → 永不相等 →
// main 不跑 → `npx aotice` 零输出。此测试固定该行为。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { symlinkSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliEntry = join(here, '..', 'src', 'cli.js');

function runHelp(entryPath) {
  return execFileSync('node', [entryPath, '--help'], { encoding: 'utf8' });
}

test('entry runs when invoked directly', () => {
  const out = runHelp(cliEntry);
  assert.match(out, /prescriptive compaction audit/);
});

test('entry runs when invoked through a symlink (npx / .bin case)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aotice-bin-'));
  const link = join(dir, 'aotice');
  try {
    symlinkSync(cliEntry, link); // 模拟 node_modules/.bin/aotice → cli 入口
    const out = runHelp(link);
    // 修复前这里是空字符串(main 从不执行);修复后应打印帮助
    assert.match(out, /prescriptive compaction audit/, 'symlink 调用必须真正运行 main');
    assert.ok(out.includes('USAGE'), 'help 正文缺失');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
