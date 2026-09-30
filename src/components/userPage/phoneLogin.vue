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
      <el-button type="primary" class="submit-btn" @click="submitForm('ruleForm')">登录</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
import {setLogin} from "@/utils/auth";
import * as authApi from "@/api/auth";

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
  methods: {
    /**
     * 验证码倒计时: 单一 interval 驱动 tips 60 -> 1
     * tip: 勿再改回 watch(tips) 联动, 旧实现会自我重排导致死循环
     */
    startCountdown(seconds = 60) {
      clearInterval(this.tipsTimer)
      this.isSending = true
      this.tips = seconds
      this.tipsTimer = setInterval(() => {
        if (typeof this.tips !== 'number' || this.tips <= 1) {
          clearInterval(this.tipsTimer)
          this.tipsTimer = null
          this.tips = this.TIP
          this.isSending = false
          return
        }
        this.tips = this.tips - 1
      }, 1000)
    },
    submitForm(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          this.login(this.ruleForm.phoneNumber, this.ruleForm.verifyCode)
          // alert('submit!');
        } else {
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
        authApi.captchaVerify(this.ruleForm.phoneNumber, value)
            .then(res => {
              if (res.data.data) {
                // console.log(res.data);
                callback();
              }
            }, err => {
              console.error(err.message);
            })
      }
    },
    sendCode(phone) {
      this.$refs.ruleForm.clearValidate(['verifyCode'])
      if (!/^1(3[0-9]|4[01456879]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])\d{8}$/.test(phone)) {
        this.$refs.ruleForm.validateField('phoneNumber')
      } else {
        //发送验证码
        authApi.captchaSent(phone)
            .then(() => {
              // 发送成功 -> 启动 60s 倒计时(内部自行管理 isSending)
              this.startCountdown(60)
            }, err => {
              console.error(err.message);
            })
      }
    },
    login(phone, captcha) {
      authApi.cellphoneLogin(phone, '', captcha)
          .then(res => {
            // 统一写入登录态
            setLogin(res.data.cookie)
            this.$bus.$emit('loggedIn', res.data.cookie)
            // console.log("%cphoneLoginData:","color:#335eea;background-color:#eaeffd")
            // console.log(res.data);
          }, err => {
            console.error(err.message);
          })
    }
  },
  mounted() {
    // this.$bus.$emit('loggedIn', ' res.data')
  },
  beforeDestroy() {
    // 组件卸载后定时器必须清理, 否则倒计时会继续跑
    clearInterval(this.tipsTimer)
    this.tipsTimer = null
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.sendCode {
  width: 100%;
}

.el-form-item {
  margin-bottom: 24px;
}

::v-deep .el-input__inner {
  border-radius: 12px;
  height: 44px;
  line-height: 44px;
}

::v-deep .el-input__inner:focus {
  border-color: $color-main;
}

.submit-btn {
  width: 100%;
  height: 44px;
  border-radius: 22px;
  font-size: 15px;
  background: $color-main;
  border-color: $color-main;
  transition: all .2s;
  &:hover { background: $color-main-1; border-color: $color-main-1; }
}
</style>