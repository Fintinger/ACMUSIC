import request from "./request";

/**
 * 游客登录（未登录时启动调用, 获取匿名 cookie 以访问受限接口）
 * 注意: 接口拼写为 anonimous, 勿改动
 * @returns {AxiosPromise}
 */
export function anonymousLogin() {
    return request('/register/anonimous', {
        params: { timestamp: Date.now() }
    })
}

/**
 * 刷新登录状态（已登录时启动调用, 延长登录态有效期）
 * 未登录/失效时上游返回 301
 * @returns {AxiosPromise}
 */
export function refreshLogin() {
    return request('/login/refresh', {
        params: { timestamp: Date.now() }
    })
}

/**
 * 二维码登录 第一步: 获取未使用 key
 */
export function qrKey() {
    return request('/login/qr/key', {
        params: { timestamp: Date.now() }
    })
}

/**
 * 二维码登录 第二步: 用 key 生成二维码
 * @param key
 */
export function qrCreate(key) {
    return request('/login/qr/create', {
        params: { key, qrimg: Date.now(), timestamp: Date.now() }
    })
}

/**
 * 二维码登录 第三步: 轮询扫码结果
 * @param key
 */
export function qrCheck(key) {
    return request('/login/qr/check', {
        params: { key, timestamp: Date.now() }
    })
}

/**
 * 发送手机验证码
 * @param phone
 */
export function captchaSent(phone) {
    return request('/captcha/sent', {
        params: { phone, timestamp: Date.now() }
    })
}

/**
 * 校验手机验证码
 * @param phone
 * @param captcha
 */
export function captchaVerify(phone, captcha) {
    return request('/captcha/verify', {
        params: { phone, captcha, timestamp: Date.now() }
    })
}

/**
 * 手机号登录
 * @param phone
 * @param password 密码(可选, 与 captcha 二选一)
 * @param captcha 验证码(可选)
 */
export function cellphoneLogin(phone, password = '', captcha = '') {
    const data = { phone, timestamp: Date.now() }
    if (captcha) {
        data.captcha = captcha
    } else {
        data.password = password
    }
    return request('/login/cellphone', {
        method: 'post',
        data
    })
}

/**
 * 获取登录状态
 */
export function loginStatus() {
    return request('/login/status', {
        params: { timestamp: Date.now() }
    })
}
