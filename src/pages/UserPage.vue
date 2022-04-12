<template>
  <el-tabs v-model="activeName" @tab-click="handleClick">
    <el-tab-pane label="手机登录" name="phone">
      <phoneLogin/>
    </el-tab-pane>
    <el-tab-pane label="邮箱登录" name="mail">
      <mailLogin/>
    </el-tab-pane>
    <el-tab-pane label="扫码登陆" name="qrcode">
      <qrcodeLogin/>
    </el-tab-pane>

  </el-tabs>
</template>

<script>
import phoneLogin from "@/pages/phoneLogin";
import mailLogin from "@/pages/mailLogin";
import qrcodeLogin from "@/pages/qrcodeLogin";

export default {
  data() {
    return {
      activeName: 'phone',
    }
  },
  components: {phoneLogin, mailLogin, qrcodeLogin},
  methods: {
    handleClick(tab, event) {
      console.log(tab, event);
    }
  }
};
</script>

<style>
.el-tabs {
  width: 500px;
  margin: 0 auto;
}

</style>