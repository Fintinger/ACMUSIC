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
    }
})
