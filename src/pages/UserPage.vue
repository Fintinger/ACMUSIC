<template>
  <div class="user-page">
    <template v-if="isLogin">
      <UserDetailLayout v-if="uid" ref="userDetail" :uid="uid"/>
    </template>

    <div v-else class="login-wrap">
      <div class="login-hero">
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-subtitle">登录网易云音乐，同步你的歌单与收藏</p>
      </div>
      <div class="login-card glass-panel">
        <div class="login-tabs">
          <button
              v-for="tab in tabs"
              :key="tab.name"
              class="login-tab"
              :class="{ active: activeName === tab.name }"
              @click="activeName = tab.name"
          >{{ tab.label }}</button>
        </div>
        <div class="login-body">
          <phoneLogin v-if="activeName==='phone'"/>
          <qrcodeLogin v-else-if="activeName==='qrcode'"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import phoneLogin from "@/components/userPage/phoneLogin";
import qrcodeLogin from "@/components/userPage/qrcodeLogin";
import UserDetailLayout from "@/components/layout/UserDetailLayout";
import { formatMs } from "@/utils/filters";
import { getIpLocation } from "@/utils/ipLocation";
import Cookies from "js-cookie"
import * as authApi from "@/api/auth";

export default {
  data() {
    return {
      activeName: 'phone',
      tabs: [
        { name: 'phone', label: '手机登录' },
        { name: 'qrcode', label: '扫码登录' },
      ],
      uid: "",
      lastLoginInfo: {
        time: "",
        IP: "",
        location: ""
      }
    }
  },
  components: {phoneLogin, qrcodeLogin, UserDetailLayout},
  computed: {
    isLogin() {
      return this.$store.state.UserAbout.IS_LOGIN
    },
    loginTimeText() {
      return this.lastLoginInfo.time ? formatMs(this.lastLoginInfo.time, 'YYYY年MM月DD日 HH:mm') : ''
    }
  },
  methods: {
    t() {
      return new Date().getTime()
    },
    loggedIn(data) {
      this.storeLoginStatus(data).then(() => {
        this.getLoginStatus()
      })
    },
    //存储登录状态
    async storeLoginStatus(data) {
      await this.storeCookie(data)
      //更新仓库中数据
    },
    //获取登陆状态
    getLoginStatus() {
      authApi.loginStatus().then(res => {
        if (res.data.data.code === 200) {
          if (res.data.data.profile) {
            this.uid = res.data.data.profile.userId
            this.lastLoginInfo.IP = res.data.data.profile.lastLoginIP;
            this.lastLoginInfo.time = res.data.data.profile.lastLoginTime;
            // IP → 地理位置(异步)
            getIpLocation(this.lastLoginInfo.IP).then(loc => {
              this.lastLoginInfo.location = loc
            })

            //更新登录状态
            this.$store.dispatch('UserAbout/initProfileInfo', res.data.data.profile)
            this.$store.commit('UserAbout/UPDATE_DATA', {key: "IS_LOGIN", value: true})
          } else {
            console.error("获取登陆状态失败");
          }
        }
      }).catch(err => {
        alert("登陆失败")
        console.log(err.message)
      })
    },
    //设置cookie
    async storeCookie(ck) {
      await new Promise(resolve => {
        const cookies = ck.split(';;');
        cookies.map(cookie => {
          //DOCUMENT
          document.cookie = cookie;
          //COOKIE
          cookie.split(/HTTPOnly;/g).map(val => {
            let ckey = "", cval = "", cpar = {};
            val.trim().replace(/\s+/g, "").split(";").map((val, ind) => {
              if (val.split("=")[0]) {
                if (ind === 0) {
                  ckey = val.split("=")[0]
                  cval = val.split("=")[1]
                } else {
                  cpar[val.split("=")[0]] = val.split("=")[1]
                }
              }
            })
            Cookies.set(ckey, cval, {...cpar})
            if (ckey === "MUSIC_U") {
              localStorage.setItem(`store-cookie-${ckey}`, cval)
            }
          })
        });
        resolve();
      })
    }
  },
  beforeMount() {
    if (this.isLogin) {
      this.getLoginStatus()
    }
  },
  mounted() {
    this.$bus.$on('loggedIn', this.loggedIn);
  },
  beforeDestroy() {
    this.$bus.$off('loggedIn')
  },
};
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.user-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

/* ---------- 登录页 ---------- */
.login-wrap {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;

  .login-hero {
    text-align: center;
    margin-bottom: 32px;
    .login-title { font-size: 32px; font-weight: 700; color: $font-black; margin: 0 0 8px; }
    .login-subtitle { font-size: 15px; color: $font-black-2; margin: 0; }
  }

  .login-card {
    width: 100%;
    max-width: 460px;
    box-sizing: border-box;
    padding: 32px 40px 40px;
  }

  .login-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 28px;
    border-bottom: 1px solid rgba(0,0,0,.06);

    .login-tab {
      padding: 10px 24px;
      border: none;
      background: transparent;
      color: $font-black-2;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color .2s, border-color .2s;
      &:hover { color: $font-black-1; }
      &.active { color: $color-main; font-weight: 600; border-bottom-color: $color-main; }
    }
  }
}

.glass-panel {
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,.45);
  box-shadow: 0 12px 40px rgba(0,0,0,.06);
}
</style>
