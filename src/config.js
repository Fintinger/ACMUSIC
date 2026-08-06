export default {
    imgUrl: {
        logo: "https://picgo-jqf.oss-cn-beijing.aliyuncs.com/img/202206101302266.png",

        LP: "https://picgo-jqf.oss-cn-beijing.aliyuncs.com/img/202206121121695.png"
    },
    api: {
        // ACMUSIC 自部署 API Gateway（环境变量覆盖，勿硬编码）
        baseURL: process.env.VUE_APP_API_BASE_URL,
        // 请求超时(ms)
        timeout: 10000,
        // 是否携带 cookie（登录态）
        withCredentials: true,
        // 随机国内 IP，默认关闭（会绕过 Gateway/服务端缓存导致高频请求 460）
        randomCNIP: false,
        // 手动指定国内 IP（优先于 randomCNIP），默认空
        realIP: ''
    },
    player: {
        // 音质等级: standard | higher | exhigh | lossless | hires | jyeffect
        level: 'exhigh'
    }
}
