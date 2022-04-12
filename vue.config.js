const {defineConfig} = require('@vue/cli-service')
module.exports = defineConfig({
    transpileDependencies: true,
    //代码eslint验证
    lintOnSave: false,
    //配置全局代理
    devServer: {
        proxy: "https://netease-cloud-music-api-nu-rosy.vercel.app"
    }
})
