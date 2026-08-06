import Cookies from 'js-cookie';
import store from '@/store';

export function getCookie(key) {
    return Cookies.get(key) ?? localStorage.getItem(`store-cookie-${key}`);
}

export function setCookie(key, value) {
    Cookies.set(key, value, {SameSite: 'None', Secure: true})
    // 备用持久化，避免 js-cookie 在某些情况下失效
    localStorage.setItem(`store-cookie-${key}`, value)
}

export function removeCookie(key) {
    Cookies.remove(key);
    localStorage.removeItem(`store-cookie-${key}`);
}

// MUSIC_U 只有在账户登录的情况下才有
export function isLoggedIn() {
    return getCookie('MUSIC_U') !== null;
}

/**
 * 统一登录入口
 * 解析网易云返回的 cookie 串(以 ;; 或 ; 分段), 逐条写入
 * @param {String} cookie 例如 "MUSIC_U=xxx;__csrf=yyy;; 额外标志"
 * @param {Object} profile 用户信息(可选)
 */
export function setLogin(cookie, profile = {}) {
    if (!cookie) return false
    const parts = String(cookie).split(';;').length > 1
        ? String(cookie).split(';;')
        : String(cookie).split(';')
    parts.forEach(part => {
        part = part.trim()
        if (!part) return
        const idx = part.indexOf('=')
        if (idx <= 0) return
        const key = part.substring(0, idx).trim()
        const value = part.substring(idx + 1).trim()
        if (!key) return
        // 提取值中的属性(Max-Age/Path/Expires 等忽略, 仅取纯值)
        let val = value.split(';')[0].trim()
        setCookie(key, val)
    })
    if (Object.keys(profile).length) {
        localStorage.setItem('user-profile', JSON.stringify(profile))
        store.commit('UserAbout/STORE_INFO', profile)
    }
    store.commit('UserAbout/UPDATE_DATA', {key: 'IS_LOGIN', value: true})
    return true
}

/** 统一读取当前用户信息 */
export function getLogin() {
    return JSON.parse(localStorage.getItem('user-profile')) || store.state.UserAbout.profile || {}
}

/** 统一清理登录态 */
export function doLogout() {
    removeCookie('MUSIC_U');
    removeCookie('__csrf');
    //删除本地保存的用户信息
    localStorage.removeItem("user-profile")
    // 更新状态仓库中的用户信息
    store.commit('UserAbout/UPDATE_DATA', {key: 'profile', value: {}});
    //更新登陆状态
    store.commit('UserAbout/UPDATE_DATA', {key: 'IS_LOGIN', value: false});
}