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
import {anonymousLogin, refreshLogin} from "./api/auth";
import {isLoggedIn, setLogin, doLogout} from "./utils/auth";
//Vuex
import store from './store'
//Animate.css
import "animate.css"
//ElementUI
import 'element-ui/lib/theme-chalk/index.css';
//Tools(用于过滤器)
import * as filters from './utils/filters'

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
                anonymousLogin().catch(() => {})
            }
        }
    }
}).$mount('#app')
