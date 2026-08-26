const {defineConfig} = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    //代码eslint验证
    lintOnSave: false,
    //配置全局代理
    devServer: {
        proxy: {
            'api': {
                target: 'https://music.163.com',
                changeOrigin: true,
                ws: true,
                secure: false,
                logLevel: 'debug',
                pathRewrite: {'^/api': ''}
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
