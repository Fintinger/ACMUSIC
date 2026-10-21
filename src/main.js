import Vue from 'vue'
import App from './App.vue'
//ElementUI
import ElementUI from 'element-ui';
import "./assets/scss/base/element-variables.scss"
//VueRouter
import VueRouter from 'vue-router'
import router from './router'
//Axios
import request from "./api/request";
//登录体系
import {anonymousLogin, refreshLogin, loginStatus} from "./api/auth";
import {isLoggedIn, setLogin, doLogout} from "./utils/auth";
//Vuex
import store from './store'
//Animate.css
import "animate.css"
//ElementUI
import 'element-ui/lib/theme-chalk/index.css';
//Tools(用于过滤器)
import * as filters from './utils/filters'
//Icon 系统
import BaseIcon from "./components/common/BaseIcon"
import "./assets/scss/icon.scss"
import "./assets/scss/base/motion.scss"

//axios处理
Vue.prototype.$axios = request

//vue插件
Vue.use(ElementUI)
Vue.use(VueRouter)


Vue.config.productionTip = false

//全局过滤器
Vue.filter('Div1w', filters.formatCount)
Vue.filter('formatMs', filters.formatMs)
Vue.filter('formatS', filters.format_s)
Vue.filter('fromNow', filters.fromNow)
Vue.filter('formatDuration', filters.formatDurationMs)
Vue.filter('imgParam', filters.imgParam)
// http → https（只对网易云 CDN 域名生效），用于不走 imgParam 的原图/头像
Vue.filter('https', filters.toHttpsUrl)
//全局图标组件
Vue.component('BaseIcon', BaseIcon)

// 全局登录失效处理 (api:unauthorized 事件由 request.js 拦截器在 code 301 时发射)
// ⚠️ 原来收到 301 就直接 doLogout：上游偶发 301（风控抖动、单接口异常、cookie 短暂失效）
//    会把明明还在线的用户踢下线。这里先用 /login/status 二次确认，且加时间锁防 301 风暴递归。
let unauthorizedLockUntil = 0
window.addEventListener('api:unauthorized', () => {
    if (!isLoggedIn()) return
    const now = Date.now()
    if (now < unauthorizedLockUntil) return
    unauthorizedLockUntil = now + 5000
    loginStatus()
        .then(res => {
            const d = (res && res.data && res.data.data) || {}
            // 网关侧仍认这份登录态 → 只是个别接口炸了，不登出
            if (d.profile || d.account) return
            doLogout()
            ElementUI.Message.warning('登录状态已失效，请重新登录')
        })
        .catch(() => { /* 网络异常不断定为登录失效，保持现状 */ })
})

// 全局渲染错误边界
// 默认 Vue 会把 render / 生命周期 / watcher 里的异常打到 console 后继续执行，结果往往是某块区域
// 静默空白。这里统一兜一层：留全量日志 + 限频提示，同时把最近 10 条塞进 window.__acmusicErrors，
// 出问题时在控制台执行 __acmusicErrors 就能直接拿到栈（本项目无单测、无 CI，这是唯一的现场证据）。
window.__acmusicErrors = []
let errorToastAt = 0
Vue.config.errorHandler = (err, vm, info) => {
    const msg = (err && err.message) || String(err)
    const opts = (vm && vm.$options) || {}
    window.__acmusicErrors.push({
        time: new Date().toISOString(),
        info,
        component: opts.name || opts._componentTag || '',
        message: msg,
        stack: (err && err.stack) || ''
    })
    if (window.__acmusicErrors.length > 10) window.__acmusicErrors.shift()
    console.error('[VueError]', info, err)
    // 浏览器自身噪声（ResizeObserver 循环告警）不打扰用户
    if (/ResizeObserver/i.test(msg)) return
    const now = Date.now()
    if (now - errorToastAt < 8000) return
    errorToastAt = now
    const brief = msg.length > 60 ? msg.slice(0, 60) + '…' : msg
    ElementUI.Message.error({ message: `页面渲染异常：${brief}`, duration: 6000, showClose: true })
}

new Vue({
    render: h => h(App),
    beforeCreate() {
        Vue.prototype.$bus = this//全局事件总线，$bus就是当前应用的vm
    },
    router,
    store,
    created() {
        this.initAuth()
    },
    methods: {
        // 启动登录初始化: 已登录->刷新; 未登录->游客登录
        initAuth() {
            if (isLoggedIn()) {
                refreshLogin()
                    .then(res => {
                        // refresh 成功后 cookie 会更新, 重新写入(保留用户 profile)
                        const cookie = res.data && (res.data.cookie || res.data.data)
                        const ck = typeof cookie === 'string'
                            ? cookie
                            : (cookie ? cookie.cookie : null)
                        if (typeof ck === 'string') {
                            const profile = JSON.parse(localStorage.getItem('user-profile') || '{}')
                            setLogin(ck, profile)
                        }
                    })
                    .catch(() => {
                        // refresh 失败(301) -> 登录态失效, 清理进入游客模式
                        doLogout()
                        anonymousLogin().catch(() => {})
                    })
            } else {
                // 未登录 -> 游客登录获取匿名 cookie
                anonymousLogin()
                    .then(res => {
                        // 游客 cookie 在响应体里, 写入浏览器供受限接口(如 /video/group)使用
                        const cookie = res.data && (res.data.cookie || res.data.data)
                        const ck = typeof cookie === 'string'
                            ? cookie
                            : (cookie ? cookie.cookie : null)
                        if (typeof ck === 'string') {
                            setLogin(ck, {})
                        }
                    })
                    .catch(() => {})
            }
        }
    }
}).$mount('#app')
