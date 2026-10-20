<template>
  <div class="qr-login">
    <div class="qr-box" v-if="qrImg">
      <img :src="qrImg" alt="">
    </div>
    <div class="qr-box qr-box--loading" v-else>
      <div class="qr-skeleton skeleton-item"></div>
      <span class="qr-loading-text">{{ qrError ? '二维码未加载' : '二维码加载中...' }}</span>
    </div>
    <div class="qr-status" :class="'qr-status--' + qrStatusClass">
      <span class="dot"></span>
      {{ qrStatusText }}
    </div>
    <el-button v-if="qrStatusCode === 800" class="qr-refresh" @click="refresh">二维码已失效，点击刷新</el-button>
    <el-button v-else-if="qrError" class="qr-refresh" @click="refresh">点击重试</el-button>
  </div>
</template>

<script>
import {setLogin} from "@/utils/auth";
import * as authApi from "@/api/auth";

// 轮询间隔(ms)
const POLL_INTERVAL = 1000
// 连续失败上限：1s 一次轮询，连续失败满 3 次说明不是偶发抖动（如网关 502），
// 必须停止轮询并给用户可见的重试入口，否则界面会永远停在"请扫码"，看起来像卡死。
const MAX_POLL_FAILS = 3

export default {
  name: "qrcodeLogin",
  data() {
    return {
      qrImg: "",
      created: false,
      qrStatus: "",
      qrStatusCode: "",
      unikey: "",
      // 连续请求失败次数（任一成功即清零）
      pollFails: 0,
      // 网络/网关异常提示，非空时覆盖默认状态文案
      qrError: ""
    }
  },
  computed: {
    qrStatusClass() {
      if (this.qrStatusCode === 803) return 'success'
      if (this.qrStatusCode === 802) return 'scan'
      if (this.qrStatusCode === 800) return 'expired'
      if (this.qrError) return 'error'
      return 'wait'
    },
    qrStatusText() {
      if (this.qrError) return this.qrError
      switch (this.qrStatusCode) {
        case 803: return '登录成功'
        case 802: return '已扫描，请在手机上确认'
        case 800: return '二维码已失效'
        default: return '请使用网易云音乐 App 扫码登录'
      }
    }
  },
  watch: {
    qrStatusCode(n) {
      if (n === 800) {
        // 二维码失效 -> 停止轮询, 等待用户点击刷新
        this.stopPolling()
      }
      if (n === 803) {
        // 登录成功 -> 停止轮询
        this.stopPolling()
      }
    }
  },
  methods: {
    /**
     * 启动轮询。注意: 不能只靠 watch(created) 触发 ——
     * refresh() 时 created 已经是 true, watcher 不会再次触发, 导致刷新后永远不再轮询。
     */
    startPolling() {
      this.stopPolling()
      if (!this.unikey) return
      if (this.qrError) return
      this.qrTimer = setInterval(() => {
        this.checkQR(this.unikey)
      }, POLL_INTERVAL)
    },
    stopPolling() {
      if (this.qrTimer) {
        clearInterval(this.qrTimer)
        this.qrTimer = null
      }
    },
    /**
     * 把 axios 错误翻译成人话。
     * 502 是网关级故障（后端正常但 nginx 上游响应异常），必须让用户看见而不是静默重试。
     */
    describeError(err) {
      const status = err && err.response && err.response.status
      if (status) return `服务异常（HTTP ${status}），点击重试`
      if (err && (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || ''))) {
        return '请求超时，点击重试'
      }
      return '网络异常，点击重试'
    },
    /** 连续失败累计，达到上限就停轮询并暴露错误 */
    markPollFail(err) {
      this.pollFails += 1
      if (this.pollFails >= MAX_POLL_FAILS) {
        this.stopPolling()
        this.qrError = this.describeError(err)
      }
    },
    generateQRCode() {
      this.stopPolling()
      this.created = false
      this.qrError = ""
      this.pollFails = 0
      authApi.qrKey().then(res => {
        if (res.data.code === 200) {
          //存储key
          this.unikey = res.data.data.unikey

          return authApi.qrCreate(this.unikey).then(res => {
            this.qrImg = res.data.data.qrimg
            //修改已经creat
            this.created = true
            // 生成成功后显式启动轮询(不依赖 watcher)
            this.startPolling()
          })
        }
        // 拿不到 key：不要停在"二维码加载中"的假加载态
        this.created = false
        this.qrError = `二维码获取失败（code ${res.data.code}），点击重试`
      }).catch(err => {
        this.created = false
        this.qrError = this.describeError(err)
      })
    },
    refresh() {
      this.qrStatusCode = 0
      this.qrStatus = ""
      this.qrImg = ""
      this.pollFails = 0
      this.qrError = ""
      this.generateQRCode()
    },
    checkQR(key) {
      authApi.qrCheck(key).then(res => {
        // 一次成功就认为链路恢复，重置失败计数
        this.pollFails = 0
        this.qrStatus = res.data.message
        this.qrStatusCode = res.data.code
        if (res.data.code === 803) {
          // 统一写入登录态, 由 setLogin 解析 cookie
          setLogin(res.data.cookie)
          this.$bus.$emit('loggedIn', res.data.cookie)
        }
      }).catch(err => {
        // 单个请求失败不改业务状态，但连续失败必须停轮询 + 提示，
        // 否则 502 时界面会永远停在"请扫码"，用户只看到控制台报错
        this.markPollFail(err)
      })
    }
  },
  mounted() {
    this.generateQRCode()
  },
  // UserPage 在 keep-alive 里，离开页面不会触发 beforeDestroy，
  // 不显式停轮询就会以 1 次/秒 永久打接口
  deactivated() {
    this.stopPolling()
  },
  activated() {
    // keep-alive 回显时恢复轮询（首次挂载时 unikey 还是空，这里自然跳过）
    if (this.unikey && !this.qrError && this.qrStatusCode !== 800 && this.qrStatusCode !== 803) {
      this.startPolling()
    }
  },
  beforeDestroy() {
    this.stopPolling()
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
  &--error { color: #f56c6c; .dot { background: #f56c6c; animation: none; } }
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