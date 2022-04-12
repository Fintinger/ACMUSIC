<template>
  <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="100px" class="demo-ruleForm">
    <el-form-item label="手机号码" prop="phoneNumber">
      <el-input v-model.number="ruleForm.phoneNumber"></el-input>
    </el-form-item>
    <el-form-item label="验证码" prop="verifyCode">
      <el-input type="password" v-model="ruleForm.verifyCode" autocomplete="off"></el-input>
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
  data(){
    var checkPhone = (rule, value, callback) => {
      if (!value) {
        return callback(new Error('电话号码不能为空'));
      }
      setTimeout(() => {
        if (!Number.isInteger(value)) {
          callback(new Error('请输入数字值'));
        } else {
          callback()
        }
      }, 1000);
    };
    var verifyCode = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入正确的验证码'));
      } else {
        if (this.ruleForm.verifyCode !== '') {
          this.$refs.ruleForm.validateField('verifyCode');
        }
        callback();
      }
    };
    return {
      ruleForm: {
        verifyCode: '',
        phoneNumber: ''
      },
      rules: {
        pass: [
          { validator: verifyCode, trigger: 'blur' }
        ],
        phoneNumber: [
          { validator: checkPhone, trigger: 'blur' }
        ]
      }
    };
  },
  methods: {
    submitForm(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          alert('submit!');
        } else {
          console.log('error submit!!');
          return false;
        }
      });
    },
    resetForm(formName) {
      this.$refs[formName].resetFields();
    }
  }
}
</script>

<style scoped>

</style>