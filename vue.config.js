const {defineConfig} = require('@vue/cli-service')
const {execSync} = require('child_process')

// 构建时把 commit 短 hash 注入客户端（页脚显示），用于把线上产物和仓库 commit 对上号。
// CI 里由 workflow 提供 GITHUB_SHA；本地构建自动取 git HEAD。
if (!process.env.VUE_APP_COMMIT_SHA) {
    try {
        process.env.VUE_APP_COMMIT_SHA = execSync('git rev-parse --short HEAD', {encoding: 'utf8'}).trim()
    } catch (e) {
        process.env.VUE_APP_COMMIT_SHA = ''
    }
}

module.exports = defineConfig({
    transpileDependencies: true,
    //代码eslint验证
    lintOnSave: false,
    //配置全局代理
    devServer: {
        // /api 转发到线上后端，与生产环境路由完全一致：
        //   线上 nginx：/api/* → 本机 Node 服务（剥前缀）；/api/audio-proxy、/api/ip-location 精确匹配
        //   开发 devServer：/api → https://music.archai.space（保留 /api 前缀，由线上 nginx 再分发）
        // 这样开发时不必再单独处理 CORS，前后端行为一致
        proxy: {
            '/api': {
                target: 'https://music.archai.space',
                changeOrigin: true,
                ws: true,
                secure: true,
                logLevel: 'debug'
            }
        }
    },
    chainWebpack: config => {
        if (process.env.NODE_ENV === 'production') {
            config.optimization.minimizer('terser').tap(args => {
                const c = args[0].terserOptions.compress
                c.pure_funcs = (c.pure_funcs || []).concat(['console.log', 'console.info', 'console.debug', 'console.trace'])
                c.drop_debugger = true
                return args
            })
        }
    }
})
