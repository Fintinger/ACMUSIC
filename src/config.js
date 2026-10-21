export default {
    imgUrl: {
        logo: require("@/assets/logo.png")
    },
    // 站点元信息（页脚 / 免责声明使用）
    site: {
        name: 'ACMUSIC',
        // 与 package.json 的 version 保持同步
        version: '0.2.0',
        // 构建时的 commit 短 hash（vue.config.js 注入），用于核对线上产物对应哪个提交
        commit: process.env.VUE_APP_COMMIT_SHA || '',
        // 本站源码仓库（公开）
        repo: 'https://github.com/Fintinger/ACMUSIC',
        issues: 'https://github.com/Fintinger/ACMUSIC/issues',
        // 接口来源：开源项目（页脚展示 + 免责声明引用）
        apiRepo: 'https://github.com/neteasecloudmusicapienhanced/api-enhanced',
        apiDocs: 'https://docs-neteasecloudmusicapi.focalors.ltd'
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
        realIP: '',
        // 登录态显式透传：把本地保存的 MUSIC_U 拼到请求 query 的 cookie 参数上。
        // 仅靠 withCredentials 是不够的 —— 它依赖浏览器自动携带「目标域」的 cookie：
        //   1) http 页面（localhost 开发）写不进 Secure cookie → document.cookie 里没有 MUSIC_U
        //   2) devServer 跨域代理时，浏览器也只发 localhost 域的 cookie
        // 结果就是网关按游客处理：/vip/info 返回全 0 → 会员被误判成非会员；
        // /song/url/v1 也拿不到无损地址。
        // 实测网关认这个参数（/login/refresh 带 cookie 参数返回 301「需要登录」，不带返回 302）。
        passthroughCookie: true
    },
    player: {
        // 音质等级: standard | higher | exhigh | lossless | hires | jyeffect
        level: initPlayerLevel(),
        // 降级链：请求失败时依次尝试 lower level
        qualityLevels: ['hires', 'lossless', 'exhigh', 'higher', 'standard'],
        // 需要黑胶VIP 才能用的音质：非会员选了必然降级，菜单里直接拦下
        vipOnlyLevels: ['lossless', 'hires', 'jyeffect'],
        // 是否启用多级 fallback
        fallbackLevels: true,
        // 是否启用 /song/url?br= 老接口兜底。实测该接口的 br 参数被上游忽略（恒 128k），
        // 多一次请求收益接近 0，默认关闭；解灰也失败时直接提示"无音源"
        legacyBrFallback: false,
        // 音质选项（顺序必须与 qualityLevels 一致：由高到低）
        qualityOptions: [
            { key: 'hires', label: '高清臻音', short: 'HD', desc: 'Spatial Audio', bitrate: '96kHz/24bit' },
            { key: 'lossless', label: '高解析度无损', short: 'SQ', desc: 'Hi-Res', bitrate: '192kHz/24bit' },
            { key: 'exhigh', label: '极高', short: 'HQ', desc: 'HQ', bitrate: '320kbps' },
            { key: 'higher', label: '较高', short: '192', desc: 'HQ', bitrate: '192kbps' },
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
