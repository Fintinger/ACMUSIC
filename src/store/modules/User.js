import {isLoggedIn} from "@/utils/auth";

export default {
    namespaced: true,//开启命名空间
    actions: {//登录之后初始化用户信息
        initProfileInfo(context, value) {
            localStorage.setItem('user-profile', JSON.stringify(value))
            context.commit('STORE_INFO', value)
        },
    },
    mutations: {
        //更新state中用户数据的方法
        UPDATE_DATA(state, val) {
            state[val.key] = val.value
        },
        //存储用户信息的方法
        STORE_INFO(state, value) {
            state.profile = value
        },
    },
    state: {
        profile: {},
        IS_LOGIN: false,
    },
    getters: {//判断是否登入
        isLogin(state) {
            state.IS_LOGIN = isLoggedIn()
            return state.IS_LOGIN
        },
        //从localstorage或者vuex中读取用户信息
        userProfile(state) {
            return JSON.parse(localStorage.getItem('user-profile')) || state.profile
        }
    }
}