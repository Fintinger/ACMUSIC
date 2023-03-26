import Vue from 'vue'
import App from './App.vue'
//ElementUI
import ElementUI from 'element-ui';
import "./assets/scss/base/element-variables.scss"
//VueRouter
import VueRouter from 'vue-router'
import router from './router'
//Axios
import axios from "axios";
//Vuex
import store from './store'
//Animate.css
import "animate.css"
//ElementUI
import 'element-ui/lib/theme-chalk/index.css';
//Tools(用于过滤器)
import * as filters from './utils/filters'

//axios处理
Vue.prototype.$axios = axios
axios.defaults.baseURL = 'https://netease-cloud-music-api-nu-rosy.vercel.app'
axios.defaults.withCredentials = true;

//vue插件
Vue.use(ElementUI)
Vue.use(VueRouter)


Vue.config.productionTip = false

//全局过滤器
Vue.filter('Div1w', filters.formatCount)
Vue.filter('formatMs', filters.formatMs)
Vue.filter('formatS', filters.format_s)
Vue.filter('fromNow', filters.fromNow)

new Vue({
    render: h => h(App),
    beforeCreate() {
        Vue.prototype.$bus = this//全局事件总线，$bus就是当前应用的vm
    },
    router,
    store,
}).$mount('#app')
