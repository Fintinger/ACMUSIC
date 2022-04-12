import Vue from 'vue'
import App from './App.vue'
//ElementUI
import ElementUI from 'element-ui';
//VueRouter

import VueRouter from 'vue-router'
import router from './router'
import axios from "axios";

import 'element-ui/lib/theme-chalk/index.css';

Vue.prototype.$axios = axios
axios.defaults.baseURL = 'https://netease-cloud-music-api-nu-rosy.vercel.app'

Vue.use(ElementUI)
Vue.use(VueRouter)


Vue.config.productionTip = false
Vue.filter('Div1w', function (num) {
    return num > 10000 ? (num / 10000).toFixed(1) + 'w' : num
})

new Vue({
    render: h => h(App),
    router
}).$mount('#app')
