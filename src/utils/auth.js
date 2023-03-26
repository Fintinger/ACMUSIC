import Cookies from 'js-cookie';
import store from '@/store';


export function getCookie(key) {
    return Cookies.get(key) ?? localStorage.getItem(`store-cookie-${key}`);
}

export function removeCookie(key) {
    Cookies.remove(key);
    localStorage.removeItem(`store-cookie-${key}`);
}

// MUSIC_U 只有在账户登录的情况下才有
export function isLoggedIn() {
    return getCookie('MUSIC_U') !== null;
}

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