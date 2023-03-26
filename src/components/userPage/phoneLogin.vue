<template>
  <el-form ref="ruleForm" :model="ruleForm" :rules="rules" class="demo-ruleForm" label-width="100px" status-icon>
    <el-form-item label="手机号码" prop="phoneNumber">
      <el-input v-model.number="ruleForm.phoneNumber" class="phone"></el-input>
    </el-form-item>
    <el-form-item label="验证码" prop="verifyCode">
      <el-row>
        <el-col :span="18">
          <el-input v-model="ruleForm.verifyCode" autocomplete="off" class="verifyCode" type="text"></el-input>
        </el-col>
        <el-col :span="6">
          <el-button :disabled="isSending" class="sendCode" @click="sendCode(ruleForm.phoneNumber)"
                     v-text="tips"></el-button>
        </el-col>
      </el-row>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="submitForm('ruleForm')">提交</el-button>
      <el-button @click="resetForm('ruleForm')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  name: "phoneLogin",
  data() {
    return {
      ruleForm: {
        verifyCode: '',
        phoneNumber: ''
      },
      rules: {
        verifyCode: [
          {validator: this.verifyCode, trigger: 'click'}
        ],
        phoneNumber: [
          {validator: this.checkPhone, trigger: 'blur'}
        ]
      },
      isSending: false,
      TIP: "发送",
      tips: "发送",
    };
  },
  watch: {
    tips(n) {
      //清除定时器
      if (n === this.TIP) {
        clearInterval(this.tipsTimer)
      }
      if (n === 0) {
        this.tips = this.TIP
        this.isSending = false
      }
      if (Number.isInteger(n)) {
        clearInterval(this.tipsTimer)
        this.tipsTimer = setTimeout(() => {
          this.tips = n-- <= 0 ? 0 : n--
        }, 1000)
      }
    }
  },
  methods: {
    submitForm(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          this.login(this.ruleForm.phoneNumber, this.ruleForm.verifyCode)
          // alert('submit!');
        } else {
          console.log('error submit!!');
          return false;
        }
      });
    },
    resetForm(formName) {
      this.$refs[formName].resetFields();
    },
    checkPhone(rule, value, callback) {
      if (!value) {
        return callback(new Error('电话号码不能为空'));
      }
      setTimeout(() => {
        if (!Number.isInteger(value)) {
          callback(new Error('请输入数字值'));
        } else if (!/^1(3[0-9]|4[01456879]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])\d{8}$/.test(value)) {
          callback(new Error('请输入正确的手机号'));
        } else {
          callback()
        }
      }, 500);
    },
    verifyCode(rule, value, callback) {
      // console.log(value);
      if (value === '') {
        callback(new Error('验证码不能为空！'));
      } else {
        // console.log("验证验证码")
        this.$axios.get('/captcha/verify', {params: {phone: this.ruleForm.phoneNumber, captcha: value}})
            .then(res => {
              if (res.data.data) {
                // console.log(res.data);
                callback();
              }
            }, err => {
              console.log(err.message);
            })
      }
    },
    sendCode(phone) {
      this.$refs.ruleForm.clearValidate(['verifyCode'])
      if (!/^1(3[0-9]|4[01456879]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])\d{8}$/.test(phone)) {
        this.$refs.ruleForm.validateField('phoneNumber')
      } else {
        //发送验证码
        this.$axios.get('/captcha/sent', {params: {phone}})
            .then(res => {
              this.isSending = true
              if (this.isSending) {
                clearInterval(this.tipsTimer)
                this.tips = 60
              }
              console.log(res.data);
            }, err => {
              console.log(err.message);
            })
      }
    },
    login(phone, captcha) {
      this.$axios.post('/login/cellphone', {phone, captcha})
          .then(res => {
            this.$bus.$emit('loggedIn', res.data.cookie)
            // console.log("%cphoneLoginData:","color:#335eea;background-color:#eaeffd")
            // console.log(res.data);
          }, err => {
            console.log(err.message);
          })
    }
  },
  mounted() {
    // this.$bus.$emit('loggedIn', ' res.data')
  }
}
</script>

<style scoped>
.sendCode {
  width: 100%;
}
</style>