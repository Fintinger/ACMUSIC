<template>
  <el-container class="categoryPage">
    <el-header><h2>发现更多可能</h2></el-header>
    <el-main>
      <el-row class="categoryTitle">
        <el-col v-for="(c, index) in categories" :key="index" :span="2">
          <el-button size="small" type="primary" @click="handleClick(c.linkName)">{{ c.title }}</el-button>
        </el-col>
      </el-row>
      <keep-alive>
        <router-view/>
      </keep-alive>
    </el-main>
  </el-container>
</template>

<script>
export default {
  name: "CategoryPage",
  methods: {
    handleClick(name){
      this.$router.push({name})
    },
  },
  data() {
    return {
      categories: [
        {title: "推荐歌单", linkName:'recommendedPlaylist'},
        {title: "精品歌单", linkName:'boutiquePlaylist' },
        {title: "最新MV", linkName:'latestMV' },
        {title: "榜单", linkName:'allList' },
      ]
    }
  }
}
</script>

<style lang="scss">
.categoryPage {

  .el-main {
    width: 100%;
    margin: 0;
    .categoryTitle{
      margin-bottom: 50px;
    }
  }

}
</style>