<template>
  <div class="user-page">
    <el-row v-if="isLogin" class="user-info">
      <el-row>最后一次登录IP:{{ lastLoginInfo.IP }}，登录时间：{{ lastLoginInfo.time }}</el-row>
      <UserDetailLayout v-if="uid" ref="userDetail" :uid="uid"/>
    </el-row>
    <el-tabs v-if="!isLogin" v-model="activeName" class="loginGroup">
      <el-tab-pane label="手机登录" name="phone">
        <phoneLogin v-if="activeName==='phone'"/>
      </el-tab-pane>
      <el-tab-pane :lazy="true" label="扫码登陆" name="qrcode">
        <qrcodeLogin v-if="activeName==='qrcode'" ref="qr"/>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<script>
import phoneLogin from "@/components/userPage/phoneLogin";
import qrcodeLogin from "@/components/userPage/qrcodeLogin";
import UserDetailLayout from "@/components/layout/UserDetailLayout";
import Cookies from "js-cookie"

export default {
  data() {
    return {
      activeName: 'phone',
      uid: "",
      lastLoginInfo: {
        time: "",
        IP: ""
      }
    }
  },
  components: {phoneLogin, qrcodeLogin, UserDetailLayout},
  computed: {
    isLogin() {
      return this.$store.state.UserAbout.IS_LOGIN
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
      this.$axios('/login/status').then(res => {
        if (res.data.data.code === 200) {
          if (res.data.data.profile) {
            this.uid = res.data.data.profile.userId
            this.lastLoginInfo.IP = res.data.data.profile.lastLoginIP;
            this.lastLoginInfo.time = res.data.data.profile.lastLoginTime;

            //更新登录状态
            this.$store.dispatch('UserAbout/initProfileInfo', res.data.data.profile)
            this.$store.commit('UserAbout/UPDATE_DATA', {key: "IS_LOGIN", value: true})
            //假数据
            // console.log("8.写入完成：\n", this)
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
          // console.log('5.cookie写入完成，利用js-cookie读取cookie：\n', Cookies.gain())
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
.el-tabs {
  width: 500px;
  margin: 0 auto;
}
</style>