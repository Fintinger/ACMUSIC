<template>
  <el-container class="categoryPage">
    <el-header><h2>发现更多可能</h2></el-header>
    <el-main>
      <el-row class="sort-title">
        <el-col v-for="(c, index) in sort" :key="index" :span="2">
          <el-button type="primary" @click="handleClick(c.linkName)">{{ c.title }}</el-button>
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
    handleClick(name) {
      this.$router.push({name})
    },
    showArtistList() {
      this.$router.push({name: "artistList"})
    }
  },
  data() {
    return {
      sort: [
        {title: "歌单", linkName: 'allList'},
        {title: "MV", linkName: 'mvList'},
        {title: "视频", linkName: 'videoList'},
        {title: "榜单", linkName: 'leaderBoard'},
      ]
    }
  },
  mounted() {
    this.$bus.$on('showArtistList', this.showArtistList)
  }
}
</script>

<style lang="scss">
.categoryPage {

  .el-main {
    width: 100%;
    margin: 0;

    .categoryTitle {
      margin-bottom: 50px;
    }
  }

}
</style>