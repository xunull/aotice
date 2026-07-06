import { defineConfig } from 'vite';

// 相对 base,方便 `npm run build` 后直接打开 dist/index.html
export default defineConfig({
  base: './',
  server: { open: true },
});
