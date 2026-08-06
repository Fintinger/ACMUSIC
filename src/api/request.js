import axios from "axios";
import config from "@/config";

// 统一请求实例：所有 API 请求的唯一切口
const request = axios.create({
    baseURL: config.api.baseURL,
    timeout: config.api.timeout,
    withCredentials: config.api.withCredentials
})

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
