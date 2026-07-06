// 把 CLI 及其 workspace 依赖(@aotice/compaction-model)打成单个自包含 ESM 文件。
// 发布的 `aotice` 因此零运行时依赖,npx 无需解析 workspace 包。
import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.js'],
  outfile: 'dist/cli.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  // banner 必须是 { js } 对象,字符串会抛配置错。注入 shebang 使 bin 可直接执行。
  banner: { js: '#!/usr/bin/env node' },
});

console.log('bundled → dist/cli.mjs');
