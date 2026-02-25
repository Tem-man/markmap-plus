import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { analyzer } from 'vite-bundle-analyzer'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    analyzer({
      analyzerMode: 'static',  // 生成静态 HTML 文件
      fileName: 'report',       // 输出文件名
      openAnalyzer: true
    })
  ],
  resolve: {
    alias: {
      // 配置 workspace 包的别名，指向编译后的 ES 模块文件
      'markmap-lib': resolve(__dirname, '../../packages/markmap-lib/dist/index.mjs'),
      'markmap-view-plus': resolve(__dirname, '../../packages/markmap-view-plus/dist/index.js'),
      'markmap-common': resolve(__dirname, '../../packages/markmap-common/dist/index.mjs'),
      'markmap-toolbar': resolve(__dirname, '../../packages/markmap-toolbar/dist/index.mjs'),
    }
  },
  optimizeDeps: {
    // 排除 workspace 包，避免预构建
    exclude: ['markmap-lib', 'markmap-view-plus', 'markmap-common', 'markmap-toolbar']
  }
})
