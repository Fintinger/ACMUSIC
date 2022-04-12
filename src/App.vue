<template>
  <div id="app">
    <el-container>
      <el-header class="el-header">
        <el-row>
          <!--左侧-->
          <el-col :span="8">
            <div class="grid-content">LOGO</div>
          </el-col>
          <!--中间-->
          <el-col :span="8">
            <div class="grid-content">
              <el-row>
                <el-col :span="8">
                  <router-link to="/home">首 页</router-link>
                </el-col>
                <el-col :span="8">
                  <router-link to="/category/recommendedPlaylist">发 现</router-link>
                </el-col>
                <el-col :span="8">
                  <router-link to="/user">我 的</router-link>
                </el-col>
              </el-row>
            </div>
          </el-col>
          <!--右侧-->
          <el-col :span="8">
            <el-row>
              <el-col :span="20">
                <input placeholder="输入进行搜索" type="text">
              </el-col>
              <el-col :span="4">
                用户头像
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </el-header>
      <el-main class="el-main">
        <keep-alive>
          <router-view/>
        </keep-alive>
      </el-main>
    </el-container>
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {}
}
</script>

<style lang="scss">
#app {
  text-align: center;

  .el-main {
    margin: 0 auto;
    overflow: hidden;
    width: 90%;
  }

}

.gridLayout {
  display: grid;
  grid-template-columns: repeat(4, 24%);
  grid-gap: 20px 20px;
  width: 100%;
}

</style>
