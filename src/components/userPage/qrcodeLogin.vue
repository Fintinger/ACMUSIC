<template>
  <div class="qr-login">
    <div class="qr-box" v-if="qrImg">
      <img :src="qrImg" alt="">
    </div>
    <div class="qr-box qr-box--loading" v-else>
      <div class="qr-skeleton skeleton-item"></div>
      <span class="qr-loading-text">二维码加载中...</span>
    </div>
    <div class="qr-status" :class="'qr-status--' + qrStatusClass">
      <span class="dot"></span>
      {{ qrStatusText }}
    </div>
    <el-button v-if="qrStatusCode === 800" class="qr-refresh" @click="refresh">二维码已失效，点击刷新</el-button>
  </div>
</template>

<script>
import {setLogin} from "@/utils/auth";

export default {
  name: "qrcodeLogin",
  data() {
    return {
      qrImg: "",
      created: false,
      qrStatus: "",
      qrStatusCode: "",
      unikey: ""
    }
  },
  computed: {
    qrStatusClass() {
      if (this.qrStatusCode === 803) return 'success'
      if (this.qrStatusCode === 802) return 'scan'
      if (this.qrStatusCode === 800) return 'expired'
      return 'wait'
    },
    qrStatusText() {
      switch (this.qrStatusCode) {
        case 803: return '登录成功'
        case 802: return '已扫描，请在手机上确认'
        case 800: return '二维码已失效'
        default: return '请使用网易云音乐 App 扫码登录'
      }
    }
  },
  watch: {
    created(n) {
      if (n) {
        this.qrTimer = setInterval(() => {
          this.checkQR(this.unikey)
        }, 1000)
      }
    },
    qrStatusCode(n) {
      if (n === 800) {
        clearInterval(this.qrTimer)
      }
    }
  },
  methods: {
    generateQRCode() {
      this.$axios.get('/login/qr/key', {params: {t: new Date().getTime()}}).then(res => {
        if (res.data.code === 200) {
          //存储key
          this.unikey = res.data.data.unikey

          this.$axios.get('/login/qr/create', {
            params: {key: this.unikey, qrimg: new Date().getTime()}
          }).then(res => {
            this.qrImg = res.data.data.qrimg
            //修改已经creat
            this.created = true;
          })
        }
      })
    },
    refresh() {
      this.qrStatusCode = 0
      this.qrImg = ""
      this.generateQRCode()
    },
    checkQR(key) {
      this.$axios.get('/login/qr/check', {
        params:
            {key, t: new Date().getTime()}
      }).then(res => {
        this.qrStatus = res.data.message
        this.qrStatusCode = res.data.code
        if (res.data.code === 803) {
          // 统一写入登录态, 由 setLogin 解析 cookie
          setLogin(res.data.cookie)
          this.$bus.$emit('loggedIn', res.data.cookie)
        }
      })
    }
  },
  mounted() {
    this.generateQRCode()
  },
  beforeDestroy() {
    clearInterval(this.qrTimer)
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.qr-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
}

.qr-box {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
  margin-bottom: 20px;
  img { width: 100%; height: 100%; display: block; }
}

.qr-box--loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0,0,0,.02);

  .qr-skeleton {
    width: 120px;
    height: 120px;
    border-radius: 12px;
  }
  .qr-loading-text {
    font-size: 12px;
    color: $font-black-2;
  }
}

.qr-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: $font-black-2;
  margin-bottom: 8px;

  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #c0c0c0;
    animation: pulse 1.6s infinite;
  }
  &--success { color: $color-ornament; .dot { background: $color-ornament; animation: none; } }
  &--scan { color: $color-main; .dot { background: $color-main; } }
  &--expired { color: #e6a23c; .dot { background: #e6a23c; animation: none; } }
}

.qr-refresh {
  border: none; background: transparent;
  color: $color-main; font-size: 13px; cursor: pointer;
  &:hover { text-decoration: underline; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .35; }
}
</style>