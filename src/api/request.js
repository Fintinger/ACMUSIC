import axios from "axios";
import config from "@/config";

// 统一请求实例：所有 API 请求的唯一切口
const request = axios.create({
    baseURL: config.api.baseURL,
    timeout: config.api.timeout,
    withCredentials: config.api.withCredentials
})

// 登录态读取：刻意不引 @/utils/auth —— 它依赖 @/store，而 store 又依赖这里的 request，
// 直接 import 会形成循环依赖（构建产物里可能拿到未初始化的 store）
const LOCAL_COOKIE_PREFIX = 'store-cookie-'

/** 读一条登录态 cookie，失败或不存在返回空串 */
function readStoredCookie(key) {
    try {
        if (typeof document !== 'undefined' && document.cookie) {
            const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]*)'))
            if (m) return decodeURIComponent(m[1])
        }
        // auth.js 的备份链路：写不进 cookie 时（http + Secure）值仍留在 localStorage
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(LOCAL_COOKIE_PREFIX + key) || ''
        }
    } catch (e) { /* 隐私模式等异常按未登录处理 */ }
    return ''
}

/**
 * 拼网关认识的 cookie 串；本地没有 MUSIC_U（游客）时返回空串，不加无用参数。
 * __csrf 缺失不影响登录判定，可省略。
 */
function loginCookie() {
    const u = readStoredCookie('MUSIC_U')
    if (!u) return ''
    const csrf = readStoredCookie('__csrf')
    return 'MUSIC_U=' + u + (csrf ? '; __csrf=' + csrf : '')
}

// axios.create() 生成的实例不带 all/spread 静态方法，这里手动挂载以保持兼容
request.all = axios.all
request.spread = axios.spread

// 请求拦截：按配置附加 realIP / randomCNIP（默认关闭，避免绕过 Gateway 缓存）
request.interceptors.request.use(
    function (cfg) {
        const params = cfg.params || {}
        if (config.api.realIP) {
            params.realIP = config.api.realIP
        } else if (config.api.randomCNIP) {
            params.randomCNIP = true
        }
        // 登录态透传：只补不打脸 —— 业务侧显式传了 cookie 时以业务侧为准
        if (config.api.passthroughCookie !== false && params.cookie === undefined) {
            const ck = loginCookie()
            if (ck) params.cookie = ck
        }
        cfg.params = params
        return cfg
    },
    function (error) {
        return Promise.reject(error)
    }
)

// 响应拦截：统一错误处理 + 登录状态异常通知
request.interceptors.response.use(
    function (res) {
        // 业务层登录态失效（NeteaseCloudMusicApi 返回 code 301）
        const code = res.data && (res.data.code || res.data.status)
        if (code === 301) {
            emitUnauthorized()
        }
        return res
    },
    function (error) {
        // HTTP 401 视为登录态失效
        if (error && error.response && error.response.status === 401) {
            emitUnauthorized()
        }
        return Promise.reject(error)
    }
)

// 只派发事件，由业务层处理；禁止在此自动覆盖 cookie
function emitUnauthorized() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("api:unauthorized"))
    }
}

export default request
