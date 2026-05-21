import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite 配置
export default defineConfig({
  // 使用 React 插件
  plugins: [react()],
  // 开发服务器配置
  server: {
    // 端口号
    port: 5173,
    // 自动打开浏览器
    open: true,
    // 代理配置
    proxy: {
      // 将 /api 请求代理到后端服务器
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 源码映射
    sourcemap: true,
    // 压缩配置
    minify: 'esbuild',
    // 块大小警告限制
    chunkSizeWarningLimit: 1000,
  },
});
