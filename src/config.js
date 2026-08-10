export default {
    imgUrl: {
        logo: require("@/assets/logo.png"),

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
        level: initPlayerLevel(),
        // 降级链：请求失败时依次尝试 lower level
        qualityLevels: ['hires', 'lossless', 'exhigh', 'higher', 'standard'],
        // 是否启用多级 fallback
        fallbackLevels: true,
        // 音质选项
        qualityOptions: [
            { key: 'hires', label: '高清臻音', short: 'HD', desc: 'Spatial Audio', bitrate: '96kHz/24bit' },
            { key: 'lossless', label: '高解析度无损', short: 'SQ', desc: 'Hi-Res', bitrate: '192kHz/24bit' },
            { key: 'exhigh', label: '极高', short: 'HQ', desc: 'HQ', bitrate: '320kbps' },
            { key: 'standard', label: '标准', short: '标', bitrate: '128kbps' },
        ]
    }
}

function initPlayerLevel() {
    try {
        const saved = JSON.parse(localStorage.getItem('acmusic_player_quality') || '{}')
        if (saved.level) return saved.level
    } catch (e) { /* ignore */ }
    return 'standard'
}
