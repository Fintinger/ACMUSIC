<template>
  <div>
    <img :src="qrImg" alt="">
    <p>状态{{ qrStatus }}</p>
  </div>
</template>

<script>
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
  watch: {
    created(n) {
      if (n) {
        this.qrTimer = setInterval(() => {
          // console.log("检查");
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

          console.log(this.unikey);

          this.$axios.get('/login/qr/create', {
            params: {key: this.unikey, qrimg: new Date().getTime()}
          }).then(res => {
            this.qrImg = res.data.data.qrimg
            //修改已经creat
            this.created = true;
/*
            //test代码
              console.log("初次登录模拟开始：")
              this.$bus.$emit('loggedIn', {ck: cookie, isCookie: true})
            //test代码*/
          })
        }
      })
    },
    checkQR(key) {
      this.$axios.get('/login/qr/check', {
        params:
            {key, t: new Date().getTime()}
      }).then(res => {
        this.qrStatus = res.data.message
        this.qrStatusCode = res.data.code
        if (res.data.code === 803) {
          console.log("%cCookie：","color:#335eea;background-color:#eaeffd")
          console.log(res.data);
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

<style scoped>

</style>