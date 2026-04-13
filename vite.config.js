import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      /**
       * 勿开 importStyle：项目已在 main.js 全量引入 vant/lib/index.css。
       * 按需样式会打进异步 chunk，与全量样式顺序冲突时，函数式弹窗（showConfirmDialog 等）
       * teleport 到 body 后会出现变窄、样式异常（dev 下往往不明显）。
       */
      resolvers: [VantResolver({ importStyle: false })],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => {
          if (path.startsWith('/api/v1/') || path === '/api/v1') return path
          return path.replace(/^\/api/, '/api/v1')
        },
      },
    },
  },
})
