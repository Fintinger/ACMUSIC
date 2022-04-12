<template>
  <el-form :model="ruleForm" status-icon :rules="rules" ref="ruleForm" label-width="100px" class="demo-ruleForm">
    <el-form-item label="邮箱地址" prop="emailAddress">
      <el-input v-model.number="ruleForm.emailAddress"></el-input>
    </el-form-item>
    <el-form-item label="密码" prop="password">
      <el-input type="password" v-model="ruleForm.password" autocomplete="off"></el-input>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="submitForm('ruleForm')">提交</el-button>
      <el-button @click="resetForm('ruleForm')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  name: "mailLogin",
  data(){
    var checkPhone = (rule, value, callback) => {
      if (!value) {
        return callback(new Error('输入正确的邮箱'));
      }
      setTimeout(() => {
        //处理邮箱地址验证逻辑
        /*if (!Number.isInteger(value)) {
          callback(new Error('请输入数字值'));
        } else {
          callback()
        }*/
      }, 1000);
    };
    var password = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入正确的验证码'));
      } else {
        if (this.ruleForm.password !== '') {
          this.$refs.ruleForm.validateField('password');
        }
        callback();
      }
    };
    return {
      ruleForm: {
        password: '',
        emailAddress: ''
      },
      rules: {
        pass: [
          { validator: password, trigger: 'blur' }
        ],
        emailAddress: [
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