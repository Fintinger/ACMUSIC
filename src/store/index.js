//引入Vue核心库
import Vue from 'vue'
//引入Vuex
import Vuex from "vuex";
//应用Vuex插件
Vue.use(Vuex);

//引入相关模块
import UserAbout from "@/store/modules/User"
import TracksAbout from "@/store/modules/Tracks"
import StatusAbout from "@/store/modules/Status"



//创建并暴露store
export default new Vuex.Store({
    modules: {
        UserAbout,
        TracksAbout,
        StatusAbout
    }
})
