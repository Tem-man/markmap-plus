import { defineConfig } from 'vite';

const configEs = defineConfig({
  build: {
    emptyOutDir: false,
    minify: 'terser', // 使用 terser 获得更好的压缩效果
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // ES 模块版本：外部化依赖，由用户安装
      external: [
        'd3',
      ],
    },
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console，如需移除可设为 true
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.debug'], // 移除 console.debug
        passes: 2, // 多次压缩以获得更好的效果
        unsafe: true, // 启用不安全的优化（可能改变代码行为，但压缩更好）
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
      },
      format: {
        comments: false, // 移除所有注释
      },
      mangle: {
        safari10: true, // 兼容 Safari 10
      },
    },
  },
});

const configJs = defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'dist/browser',
    minify: 'terser', // 使用 terser 获得更好的压缩效果
    lib: {
      entry: 'src/index.ts',
      formats: ['iife'],
      fileName: () => 'index.js',
      name: 'markmap',
    },
    rollupOptions: {
      // 浏览器版本：只外部化 d3（需要用户通过 script 标签引入）
      external: ['d3'],
      output: {
        extend: true,
        globals: {
          d3: 'd3',
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: false, // 浏览器版本保留 console 便于调试
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.debug'], // 移除 console.debug
        passes: 2, // 多次压缩以获得更好的效果
        unsafe: true, // 启用不安全的优化
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
      },
      format: {
        comments: false, // 移除所有注释
      },
      mangle: {
        safari10: true, // 兼容 Safari 10
      },
    },
  },
});

export default process.env.TARGET === 'es' ? configEs : configJs;
