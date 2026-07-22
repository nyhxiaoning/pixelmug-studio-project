import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import Inspector from "vite-plugin-vue-inspector"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载当前 mode 对应的环境变量
  const env = loadEnv(mode, process.cwd(), '')

  console.log('VITE_APP_ENV:', env?.VITE_APP_ENV)

  return {
    base: './',
    plugins: [
      // useInspector(),
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: [
          'vue',
          'vue-router',
          'pinia',
          'vue-i18n'
        ],
        dts: true
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: true
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@@': resolve(__dirname, 'src/common')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/common/assets/styles/variables.scss" as *;`
        }
      }
    },
    server: {
      port: 3034,
      open: true,
      // 👇 多环境动态代理（统一格式）
      proxy: {
        '/api': {
          // target: env.VITE_API_URL.replace(/\/api$/, ''),
          target: env.VITE_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})