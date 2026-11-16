<template>
  <div class="user-page">
    <template v-if="isLogin">
      <UserDetailLayout v-if="uid" ref="userDetail" :uid="uid"/>
      <!-- 登录态成立但 uid 还没到位（老会话本地没有 profile，要等 /login/status 那 200-300ms）：
           给一块轻量占位，别让内容区空着 -->
      <div v-else class="user-page-skel">
        <div class="ups-hero"></div>
        <div class="ups-card"></div>
        <div class="ups-card"></div>
      </div>
    </template>

    <div v-else class="login-wrap">
      <div class="login-hero">
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-subtitle">登录网易云音乐，同步你的歌单与收藏</p>
      </div>
      <div class="login-card glass-panel">
        <div class="login-tabs ac-tabs">
          <button
              v-for="tab in tabs"
              :key="tab.name"
              class="login-tab"
              :class="{ active: activeName === tab.name }"
              :aria-pressed="activeName === tab.name"
              type="button"
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
import { getLogin, isLoggedIn } from "@/utils/auth";
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
      /**
       * store 的 IS_LOGIN 要等启动期异步流程（refreshLogin / getLoginStatus）才置 true，
       * 只读它会让「已登录用户整页刷新 /me」先闪一下登录表单再切到主页。
       * cookie 是同步可读的，两者取或：既立刻正确，又保留 store 的响应性（登录/登出后会重算）。
       */
      return this.$store.state.UserAbout.IS_LOGIN || isLoggedIn()
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
        // 原来是 alert —— 阻塞式弹窗且视觉与项目完全脱节
        this.$toast.error('登录状态获取失败，请刷新页面重试')
        console.error(err.message)
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
  created() {
    /**
     * uid 本地优先：localStorage 里的 user-profile 已经有 userId，
     * 没必要为了拿它先等一次 /login/status 再挂载主页（那是 200-300ms 的纯串行等待）。
     * 这里只用于「先把主页壳挂起来」，登录态是否有效仍由 getLoginStatus() 校验。
     */
    if (!isLoggedIn()) return
    const cached = getLogin() || {}
    if (cached.userId) this.uid = String(cached.userId)
  },
  beforeMount() {
    /**
     * 判据从 store 的 IS_LOGIN 换成 cookie（isLoggedIn）。
     * 原来写 `if (this.isLogin)`：IS_LOGIN 初值是 false，只有 setLogin 才会置 true，
     * 所以整页硬刷新 /me 时这里必然跳过 → uid 永远是空 → 内容区空白。
     * cookie 是同步可读的，不依赖任何启动期异步流程。
     */
    if (isLoggedIn()) {
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
  // 容器由外层 el-main 统一（max-width 1200 + 24 padding）
  padding-bottom: 80px;
}

/* ---------- 登录页 ---------- */
.login-wrap {
  // 显式撑满内容区：flex 容器的 align-items 只在"容器本身够宽"时才谈得上居中，
  // 一旦被父级收紧成 fit-content，"欢迎回来"就会贴左
  width: 100%;
  box-sizing: border-box;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;

  .login-hero {
    // 标题区自己再居中一次：不依赖外层是 flex 还是 block
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 32px;
    .login-title { font-size: $fs-page; font-weight: 700; line-height: 1.3; color: $font-black; margin: 0 0 $sp-2; text-align: center; }
    .login-subtitle { font-size: 15px; color: $font-black-2; margin: 0; text-align: center; }
  }

  .login-card {
    width: 100%;
    max-width: 460px;
    box-sizing: border-box;
    padding: 32px 40px 40px;
  }

  .login-tabs { margin-bottom: 28px; }
}

/* 等 uid 期间的轻量占位（尺寸与真实 hero / 卡片接近，避免出现再塌陷） */
.user-page-skel {
  .ups-hero { height: 208px; border-radius: 24px; background: var(--c-bg-sunken); margin-bottom: 28px; }
  .ups-card { height: 240px; border-radius: 24px; background: var(--c-bg-sunken); margin-bottom: 28px; }
}

.glass-panel {
    background: var(--c-bg-elevated);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid var(--c-border-strong);
  box-shadow: 0 12px 40px rgba(0,0,0,.06);
}
</style>
